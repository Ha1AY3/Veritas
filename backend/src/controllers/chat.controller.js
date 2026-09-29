import chatModel from "../models/chat.model.js";
import messagesModel from "../models/messages.model.js";
import pdfChunkModel from "../models/pdfChunk.model.js";
import pdfDocumentModel from "../models/pdfDocument.model.js";
import researchRoadmapModel from "../models/roadmap.model.js";
import { extractCitationsFromAnswer, generateAnswer, generateRelatedQuestions } from "../services/deepseek/deepseek.service.js";
import { decideVisualNeed } from "../services/deepseek/deepseekVerify.service.js";
import { generateDirectAnswer } from "../services/intents/directAnswer.service.js";
import { handleDirectRequest } from "../services/intents/directHandler.service.js";
import { getCombinedExploreMore } from "../services/exa/exa.service.js";
import { analyzeImage } from "../services/gemini/gemini.service.js";
import { generateImageAnswer } from "../services/gemini/image.service.js";
import { uploadImage } from "../services/gemini/imageUpload.service.js";
import { generateLearningSupport } from "../services/intents/learning.service.js";
import { generateOpinionAnswer } from "../services/intents/opinion.service.js";
import { generatePdfAnswer } from "../services/pdf/pdfAnswer.service.js";
import { formatPdfCitations } from "../services/pdf/pdfCitations.service.js";
import { formatPdfAnswerForVeritas } from "../services/pdf/pdfCitations.service.js";
import { generatePdfHybridAnswer } from "../services/pdf/pdfHybridAnswer.service.js";
import { buildPdfHybridEvidence } from "../services/pdf/pdfHybridEvidence.service.js";
import { decidePdfResearch } from "../services/pdf/pdfResearchDecision.service.js";
import { retrievePdfEvidence } from "../services/pdf/pdfRetrieval.service.js";
import { detectResourceFilter, formatResources } from "../services/exa/resourceFilter.service.js";
import { retrieve } from "../services/exa/retrieval.service.js";
import { classifyRequest } from "../services/routing/router.service.js";
import { generateAnswerSummary, updateConversationSummary } from "../services/deepseek/summary.service.js";
import { retrieveVisual } from "../services/visuals/visual.service.js";
import { persistVisual } from "../services/visuals/visualStorage.service.js";
import { rewriteQuery } from "../utils/rewriteQuery.js";
import { isExplicitVisualRequest } from "../utils/visualIntent.js";

export async function sendMessageController(req, res) {
    try {
        const { message, conversationId, imageBase64, pdfDocumentId } = req.body;
        const userId = req.user.id;

        let formattedAnswer = "";
        let citations = [];
        let relatedQuestions = [];
        let exploreMore = [];
        let resources = [];
        let imageUrl = null;
        let visualDecision = null;
        let usePdf = false;

        const explicitlyAttachedPdf = !!pdfDocumentId;

        if (imageBase64 && imageBase64.length > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "Image is too large. Please upload image under 10MB"
            })
        }

        if (!message || message.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Message is required"
            })
        }

        let pdfDocument = null;

        if (pdfDocumentId) {
            pdfDocument = await pdfDocumentModel.findOne({
                _id: pdfDocumentId,
                userId,
                status: "ready"
            });

            if (!pdfDocument) {
                return res.status(404).json({
                    success: false,
                    message: "PDF document not found or not ready"
                });
            }
        }

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");

        res.flushHeaders();

        if (imageBase64) {
            imageUrl = await uploadImage(imageBase64);
        }

        const title = message.length > 50 ? message.slice(0, 50) + "..." : message;

        let imageAnalysis = null;
        if (imageBase64) {
            try {
                imageAnalysis = await analyzeImage(imageBase64, message);
            } catch (error) {
                console.error("Image analysis failed:", error);
            }
        }

        let chat = null;
        let isNewConversation = false;

        if (conversationId) {
            chat = await chatModel.findOne({
                _id: conversationId,
                userId
            });
        }

        if (!chat) {
            isNewConversation = true;

            chat = await chatModel.create({
                userId,
                title: "New Chat"
            });
        }

        if (!pdfDocument && chat) {
            const previousPdfMessage = await messagesModel.findOne({
                    chat_id: chat._id,
                    role: "user",
                    "pdf.documentId": { $ne: null }
                }).sort({ createdAt: -1 }).lean();

            if (previousPdfMessage?.pdf?.documentId) {
                pdfDocument = await pdfDocumentModel.findOne({
                    _id: previousPdfMessage.pdf.documentId,
                    userId,
                    status: "ready"
                });
            }
        }

        const recentUserMessages = await messagesModel.find({
            chat_id: chat._id,
            role: "user"
        }).sort({ createdAt: -1 }).limit(4).lean().then(messages => messages.reverse().map(m => m.content));

        const conversationSummary = chat.summary || '';

        let finalIntent;
        let rewrittenQuery = message;
        let requiresResearch = true;

        if (imageBase64) {
            finalIntent = "image";
        } else {
            const initialRoute = classifyRequest(message, !!imageBase64);

            const contextResult = await rewriteQuery(message, initialRoute.intent, conversationSummary, recentUserMessages, pdfDocument);

            finalIntent = contextResult.intent;
            rewrittenQuery = contextResult.query;
            requiresResearch = contextResult.requiresResearch;
            usePdf = contextResult.usePdf ?? false;
        }

        let result = null;

        switch (finalIntent) {
            case "image": {

                if (!imageAnalysis) {
                    formattedAnswer = "I couldn't analyze the uploaded image. Please try uploading it again or use a clearer image.";

                    citations = [];
                    exploreMore = [];
                    break;
                }

                if (!imageAnalysis.needsResearch) {
                    sendSSE(res, "start", {
                        conversationId: chat._id.toString()
                    });

                    result = await generateImageAnswer(message, imageAnalysis, conversationSummary, recentUserMessages,
                        {
                            stream: true,

                            onText: (text) => {
                                sendSSE(res, "text", {
                                    text
                                });
                            }
                        }
                    );

                    formattedAnswer = result.answer;
                    citations = [];
                    exploreMore = [];
                    resources = [];

                    break;
                }

                const searchQuery = imageAnalysis.searchQuery || rewrittenQuery || message;

                const llmQuery = `
                    Question: ${message}

                    Image Subject: ${imageAnalysis.subject}

                    Keywords: ${imageAnalysis.keywords.join(", ")}

                    Visible Text: ${(imageAnalysis.visibleText || []).join(" ")}
                `;

                const imageResourceFilter = { type: "all" };

                const { sources, evaluation, videoQuery, topic } = await retrieve(searchQuery, conversationSummary, recentUserMessages, imageResourceFilter);

                sendSSE(res, "start", {
                    conversationId: chat._id.toString()
                });

                result = await generateAnswer(llmQuery, sources, [], evaluation.confidence, "research",
                    {
                        stream: true,

                        onText: (text) => {
                            sendSSE(res, "text", {
                                text
                            });
                        },

                        onCitation: (citation) => {
                            sendSSE(res, "citation", {
                                citation
                            });
                        }
                    }
                );

                formattedAnswer = result.answer;

                citations = extractCitationsFromAnswer(formattedAnswer, result.citations || []);

                relatedQuestions = await generateRelatedQuestions(searchQuery);

                sendSSE(res, "relatedQuestions", {
                    questions: relatedQuestions
                });

                exploreMore = await getCombinedExploreMore(searchQuery, 5, videoQuery, topic, message);

                sendSSE(res, "exploreMore", {
                    resources: exploreMore
                });

                resources = [];

                break;
            }

            case "conversation": {

                sendSSE(res, "start", {
                    conversationId: chat._id.toString()
                });

                result = await generateDirectAnswer(
                    rewrittenQuery,
                    conversationSummary,
                    recentUserMessages,
                    {
                        stream: true,

                        onText: (text) => {
                            sendSSE(res, "text", {
                                text
                            });
                        }
                    }
                );

                formattedAnswer = result.answer;
                citations = [];
                exploreMore = [];
                break;
            }


            case "opinion":

                sendSSE(res, "start", {
                    conversationId: chat._id.toString()
                });

                result = await generateOpinionAnswer(
                    message,
                    conversationSummary,
                    recentUserMessages,
                    {
                        stream: true,

                        onText: (text) => {
                            sendSSE(res, "text", {
                                text
                            });
                        }
                    }
                );
                formattedAnswer = result.answer;
                citations = [];
                exploreMore = [];
                break;


            case "learning_support":

                const lastAssistantMessage = await messagesModel.findOne({
                    chat_id: chat._id,
                    role: "assistant"
                }).sort({ createdAt: -1 }).lean();

                const previousExplanation = lastAssistantMessage?.answer_summary || lastAssistantMessage?.content || "";

                sendSSE(res, "start", {
                    conversationId: chat._id.toString()
                });

                result = await generateLearningSupport(
                    message,
                    previousExplanation,
                    conversationSummary,
                    recentUserMessages,
                    {
                        stream: true,

                        onText: (text) => {
                            sendSSE(res, "text", {
                                text
                            });
                        }
                    }
                );

                formattedAnswer = result.answer;
                citations = [];
                exploreMore = [];
                break;


            case "research": {

                const resourceFilter = detectResourceFilter(message);

                const explicitVisualRequest = isExplicitVisualRequest(message);

                let searchQuery = rewrittenQuery || message;
                let llmQuery = searchQuery;

                if (resourceFilter.type !== "all") {
                    formattedAnswer = "Here are the requested resources.";

                    const { sources } = await retrieve(searchQuery, conversationSummary, recentUserMessages, resourceFilter);

                    resources = formatResources(sources, resourceFilter);

                    relatedQuestions = await generateRelatedQuestions(searchQuery);

                    citations = [];

                    exploreMore = [];

                    break;

                }

                if (pdfDocument && usePdf) {

                    const searchQuery = rewrittenQuery || message;

                    const pdfEvidence = await retrievePdfEvidence({
                        question: searchQuery,
                        documentId: pdfDocument._id,
                        userId,
                        limit: 5
                    });

                    sendSSE(res, "start", {
                        conversationId: chat._id.toString()
                    });

                    if (!pdfEvidence.length) {

                        formattedAnswer = "I couldn't find enough relevant information in the uploaded PDF to answer this question.";

                        citations = [];

                        relatedQuestions = await generateRelatedQuestions(searchQuery);

                        exploreMore = [];

                        resources = [];

                        sendSSE(res, "text", {
                            text: formattedAnswer
                        });

                        sendSSE(res, "relatedQuestions", {
                            questions: relatedQuestions
                        });

                        sendSSE(res, "exploreMore", {
                            resources: exploreMore
                        });

                        break;
                    }

                    const pdfDecision = await decidePdfResearch({
                        question: searchQuery,
                        pdfEvidence
                    });
                    if (pdfDecision.requiresResearch) {

                        const { sources, videoQuery, topic } = await retrieve(
                            searchQuery,
                            conversationSummary,
                            recentUserMessages,
                            resourceFilter
                        );

                        const hybridEvidence = buildPdfHybridEvidence({
                            pdfEvidence,
                            webSources: sources
                        });

                        const hybridResult = await generatePdfHybridAnswer({
                            question: searchQuery,
                            hybridEvidence,
                            pdfDocument,
                            options: {
                                stream: true,

                                onText: (text) => {
                                    sendSSE(res, "text", {
                                        text
                                    });
                                },

                                onCitation: (citation) => {
                                    sendSSE(res, "citation", {
                                        citation
                                    });
                                },

                                onDone: () => {
                                    console.log("Hybrid answer stream finished");
                                }
                            }
                        });

                        const citedPdfEvidence = pdfEvidence.filter(item =>
                                hybridResult.citations?.some(
                                    citation =>
                                        citation.sourceType === "pdf" &&
                                        Number(citation.pageNumber) === Number(item.pageNumber) &&
                                        Number(citation.chunkIndex) === Number(item.chunkIndex)
                                )
                        );

                        const pdfCitations = formatPdfCitations(
                            citedPdfEvidence,
                            pdfDocument
                        );

                        const webCitations = [...new Map((hybridResult.citations || [])
                                    .filter(citation =>
                                            citation.sourceType === "web" &&
                                            citation.url
                                        ).map(citation => [citation.url, {
                                            url: citation.url,
                                            title: citation.title || citation.hostname || "Source",
                                            hostname: citation.hostname
                                        }
                                    ])).values()
                        ];

                        citations = [ ...pdfCitations, ...webCitations];

                        formattedAnswer = hybridResult.answer;

                        relatedQuestions = await generateRelatedQuestions(searchQuery);

                        exploreMore = await getCombinedExploreMore( searchQuery, 5, videoQuery, topic, message);

                        resources = [];

                        citations.forEach(citation => {
                            sendSSE(res, "citation", {
                                citation
                            });
                        });

                        sendSSE(res, "relatedQuestions", {
                            questions: relatedQuestions
                        });

                        sendSSE(res, "exploreMore", {
                            resources: exploreMore
                        });

                        break;
                    }

                    const pdfResult = await generatePdfAnswer({
                        question: searchQuery,
                        pdfEvidence,
                        pdfDocument,
                        options: {
                            stream: true,

                            onText: (text) => {
                                sendSSE(res, "text", {
                                    text
                                });
                            },

                            onCitation: (citation) => {
                                sendSSE(res, "citation", {
                                    citation
                                });
                            },

                            onDone: () => {
                                console.log("PDF answer stream finished");
                            }
                        }
                    });

                    const citedEvidence = pdfEvidence.filter(item =>
                            pdfResult.citations?.some(
                                citation =>
                                    Number(citation.pageNumber) === Number(item.pageNumber) &&
                                    Number(citation.chunkIndex) === Number(item.chunkIndex)
                            )
                    );

                    citations = formatPdfCitations(citedEvidence, pdfDocument);

                    formattedAnswer = formatPdfAnswerForVeritas({
                        answer: pdfResult.answer,
                        citations: pdfResult.citations,
                        pdfDocument
                    });

                    relatedQuestions = await generateRelatedQuestions(searchQuery);

                    exploreMore =  await getCombinedExploreMore(searchQuery, 5, searchQuery, "general", message);

                    resources = [];

                    citations.forEach(citation => {
                        sendSSE(res, "citation", {
                            citation
                        });
                    });

                    sendSSE(res, "relatedQuestions", {
                        questions: relatedQuestions
                    });

                    sendSSE(res, "exploreMore", {
                        resources: exploreMore
                    });

                    break;
                }

                if (requiresResearch) {
                    const { sources, evaluation, videoQuery, topic } = await retrieve(searchQuery, conversationSummary, recentUserMessages, resourceFilter);

                    const visualDecisionPromise = explicitVisualRequest ? Promise.resolve({
                        needed: true,
                        visualType: "diagram",
                        query: rewrittenQuery,
                        reason: "User explicitly requested a visual."
                    }) : decideVisualNeed(rewrittenQuery, conversationSummary, recentUserMessages);

                    sendSSE(res, "start", {
                        conversationId: chat._id.toString()
                    });

                    const answerPromise = generateAnswer(llmQuery, sources, [], evaluation.confidence, "research", {
                            stream: true,

                            onText: (text) => {
                                sendSSE(res, "text", {
                                    text
                                });
                            },

                            onCitation: (citation) => {
                                sendSSE(res, "citation", {
                                    citation
                                });
                            }
                        }
                    );

                    const [result, decision] = await Promise.all([answerPromise, visualDecisionPromise]);

                    visualDecision = decision;

                    formattedAnswer = result.answer;

                    citations = extractCitationsFromAnswer(formattedAnswer, result.citations || []);

                    relatedQuestions = await generateRelatedQuestions(searchQuery);


                    sendSSE(res, "relatedQuestions", {
                        questions: relatedQuestions
                    });

                    exploreMore = await getCombinedExploreMore(searchQuery, 5, videoQuery, topic, message);

                    sendSSE(res, "exploreMore", {
                        resources: exploreMore
                    });

                    resources = [];

                    break;
                }

                sendSSE(res, "start", {
                    conversationId: chat._id.toString()
                });

                const directResult = await handleDirectRequest(rewrittenQuery, message, null, {
                        stream: true,

                        onText: (text) => {
                            sendSSE(res, "text", {
                                text
                            });
                        }
                    }
                );

                formattedAnswer = directResult.answer;
                citations = [];
                exploreMore = [];
                resources = [];

                break;
            }
            default: {
                throw new Error(`Unsupported intent: ${finalIntent}`);

            }
        }


        await messagesModel.create({
            chat_id: chat._id,
            role: "user",
            content: message,
            images: imageUrl ? [{
                url: imageUrl,
                description: imageAnalysis?.subject || ""
            }] : [],

            pdf: explicitlyAttachedPdf && pdfDocument ? {
                documentId: pdfDocument._id,
                fileName: pdfDocument.fileName,
                fileUrl: pdfDocument.fileUrl,
                pageCount: pdfDocument.pageCount
            } : null
        });


        const assistantMessage = await messagesModel.create({
            chat_id: chat._id,
            role: "assistant",
            content: formattedAnswer,
            answer_summary: null,
            citations: citations,
            resources: resources,
            explore_more: exploreMore,
            related_questions: relatedQuestions,
            visual: [],
            visualStatus: visualDecision?.needed ? "processing" : "none"
        });


        await chatModel.findByIdAndUpdate(chat._id, {
            $inc: { message_count: 2 },
            last_message_preview: message.slice(0, 100)
        });

        sendSSE(res, "done", {
            title,
            conversationId: chat._id.toString(),
            messageId: assistantMessage._id.toString(),
            relatedQuestions,
            exploreMore,
            resources,
            visual: [],
            visualStatus: visualDecision?.needed ? "processing" : "none",
        });

        res.end();

        if (finalIntent === "research" && visualDecision?.needed) {
            (async () => {
                try {
                    const visuals = await retrieveVisual(message, visualDecision.query, visualDecision);

                    if (!visuals.length) {

                        await messagesModel.findByIdAndUpdate(assistantMessage._id,
                            {
                                visual: [],
                                visualStatus: "failed"
                            }
                        );

                        return;
                    }

                    const persistedVisuals = await Promise.all(
                        visuals.slice(0, 2).map((visual) => persistVisual(visual)));

                    const finalVisuals = persistedVisuals.filter(Boolean);

                    if (finalVisuals.length > 0) {
                        await messagesModel.findByIdAndUpdate(assistantMessage._id, {
                            visual: finalVisuals,
                            visualStatus: "ready",
                        });

                    } else {
                        await messagesModel.findByIdAndUpdate(assistantMessage._id, {
                            visual: [],
                            visualStatus: "failed",
                        });
                    }
                } catch (error) {
                    console.error("Background visual processing failed:", error.message);

                    await messagesModel.findByIdAndUpdate(assistantMessage._id,
                        {
                            visualStatus: "failed"
                        }
                    );
                }
            })();
        }

        const summaryContent = result?.answer || formattedAnswer;

        if (assistantMessage._id) {
            (async () => {
                try {
                    const metadata = await generateAnswerSummary(message, summaryContent);

                    const answerSummary = metadata?.summary || "";
                    const generatedTitle = metadata?.title || "";

                    await messagesModel.findByIdAndUpdate(assistantMessage._id, {
                        answer_summary: answerSummary
                    });

                    if (isNewConversation && generatedTitle) {
                        await chatModel.findByIdAndUpdate(chat._id, {
                            title: generatedTitle,
                        });
                    }

                    const updatedSummary = await updateConversationSummary(conversationSummary, message, answerSummary || '');

                    if (updatedSummary && updatedSummary !== conversationSummary) {
                        await chatModel.findByIdAndUpdate(chat._id, {
                            summary: updatedSummary
                        });
                    } else {
                        console.log(`No change to conversation summary for chat ${chat._id}`);
                    }

                } catch (error) {
                    console.error('Background summary update failed:', error.message);
                }
            })();
        }

        return;
    } catch (error) {
        console.error("Chat error:", error);

        if (res.headersSent) {
            sendSSE(res, "error", {
                message: error.message || "Streaming failed"
            });

            return res.end();
        }
        res.status(500).json({
            success: false,
            message: "Failed to send the message",
            error: error.message
        })
    }
}

function sendSSE(res, event, data) {
    if (res.writableEnded) {
        return;
    }

    res.write(
        `event: ${event}\n` +
        `data: ${JSON.stringify(data)}\n\n`
    );
}

export async function getVisualStatus(req, res) {
    try {

        const { messageId } = req.params;

        const message = await messagesModel.findById(messageId).select("visual visualStatus").lean();

        if (!message) {

            return res.status(404).json({
                success: false,
                message: "Message not found"
            });
        }

        return res.status(200).json({
            success: true,
            visual: message.visual || [],
            visualStatus: message.visualStatus || "none"
        });

    } catch (error) {

        console.error(
            "Failed to get visual status:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to get visual status"
        });
    }
}

export async function createChatController(req, res) {
    try {

        const userId = req.user.id;

        const chat = await chatModel.create({
            userId,
            title: "New Chat"
        });

        res.status(201).json({
            success: true,
            message: "Chat created successfully",
            chat
        })

    } catch (error) {
        console.error("Create chat error: ", error);
        res.status(500).json({
            success: false,
            message: "Failed to create chat",
            error: error.message
        })
    }
}

export async function getChatsController(req, res) {
    try {
        const userId = req.user.id;

        const chats = await chatModel.find({ userId }).sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            message: "Chats fetched successfully",
            chats
        })
    } catch (error) {
        console.error("Get chat error: ", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chats",
            error: error.message
        })
    }
}

export async function getChatByIdController(req, res) {
    try {
        const id = req.params.id;
        const userId = req.user.id;

        const chat = await chatModel.findOne({
            _id: id,
            userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            })
        }

        const messages = await messagesModel.find({ chat_id: id }).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            chat,
            messages
        })
    } catch (error) {
        console.error("Failed to get chats by id: ", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch specific chat",
            error: error.message
        })
    }
}

export async function deleteChatController(req, res) {
    try {
        const id = req.params.id;
        const userId = req.user.id;

        const chat = await chatModel.findOne({
            _id: id,
            userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            })
        }

        const chatMessages = await messagesModel.find({
            chat_id: id
        }).lean();

        const pdfDocumentIds = [
            ...new Set(
                chatMessages
                    .map(message => message.pdf?.documentId)
                    .filter(Boolean)
                    .map(documentId => documentId.toString())
            )
        ];

        if (pdfDocumentIds.length > 0) {
            await pdfChunkModel.deleteMany({
                documentId: {
                    $in: pdfDocumentIds
                },
                userId
            });

            await pdfDocumentModel.deleteMany({
                _id: { $in: pdfDocumentIds },
                userId
            });
        }

        await messagesModel.deleteMany({ chat_id: id });

        await researchRoadmapModel.deleteMany({ chat_id: id });

        await chatModel.deleteOne({
            _id: id,
            userId
        });

        res.status(200).json({
            success: true,
            message: "Chat deleted successfully",
            chat
        })
    } catch (error) {
        console.error("Failed to delete chat: ", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete a chat",
            error: error.message
        })
    }
}