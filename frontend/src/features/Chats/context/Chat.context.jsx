import { createContext, useEffect, useState } from "react";
import { createNewChat, deleteChat, getChatById, getChats, getVisualStatus, sendMessage, uploadPdf } from "../services/chat.api";
import { useRef } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [chats, setChats] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const uploadedPdfRef = useRef({
        file: null,
        documentId: null
    });

    async function loadChats() {
        setLoading(true);

        try {
            const data = await getChats();
            if (data.success) {
                setChats(data.chats || []);
            }

            return data;
        } catch (err) {
            setError("Failed to load chats");
        } finally {
            setLoading(false);
        }
    }

    async function loadChat(chatId) {
        setLoading(true);

        try {
            const data = await getChatById(chatId);
            if (data.success) {

                setCurrentChat(data.chat);

                const formattedMessages = (data.messages || []).map(msg => {
                    const image = msg.images?.[0];

                    return {
                        role: msg.role,
                        content: msg.content,
                        citations: msg.citations || [],
                        resources: msg.resources || [],
                        relatedQuestions: msg.related_questions || [],
                        exploreMore: msg.explore_more || [],
                        hasImage: !!image?.url,
                        imagePreview: image?.url || null,
                        pdf: msg.pdf || null,
                        visual: Array.isArray(msg.visual) ? msg.visual : [],
                        visualStatus: msg.visualStatus || "none",
                        messageId: msg._id
                    };
                });

                setMessages(formattedMessages);
            }

            return data;
        } catch (err) {
            setError("Failed to load a chat");
        } finally {
            setLoading(false);
        }
    }

    async function createChat() {
        try {
            const data = await createNewChat();
            if (data.success) {
                setChats(prev => [data.chat, ...prev]);
            }

            return data.chat;
        } catch (err) {
            setError("Failed to create a chat");
        }
    }

    async function removeChat(chatId) {
        try {
            const data = await deleteChat(chatId);
            if (data.success) {
                setChats(prev => prev.filter(c => c._id !== chatId));
            }

            if (currentChat?._id === chatId) {
                setCurrentChat(null);
                setMessages([]);
            }

            return data;
        } catch (err) {
            setError("Failed to delete a chat");
        }
    }

    async function sendMessages(message, conversationId, imageBase64 = null, pdfFile = null) {
        let completedData = null;
        let userMessage = null;
        let assistantMessageId = null;

        setLoading(true);
        setError("");

        const userMessageId = `temp-user-${Date.now()}`;

        userMessage = {
            role: "user",
            content: message,
            hasImage: !!imageBase64,
            imagePreview: imageBase64,
            pdf: pdfFile ? {
                    documentId: null,
                    fileName: pdfFile.name,
                    fileUrl: "",
                    pageCount: 0
                } : null,
            messageId: userMessageId
        };

        setMessages(prev => [
            ...prev,
            userMessage
        ]);

        assistantMessageId = `temp-${Date.now()}`;

        const assistantMessage = {
            role: "assistant",
            content: "",
            citations: [],
            resources: [],
            relatedQuestions: [],
            exploreMore: [],
            visual: [],
            visualStatus: "none",
            messageId: assistantMessageId
        };

        setMessages(prev => [
            ...prev,
            assistantMessage
        ]);

        try {
            let pdfDocumentId = null;

            if (pdfFile) {
                if(uploadedPdfRef.current?.file === pdfFile && uploadedPdfRef.current?.documentId){
                    pdfDocumentId = uploadedPdfRef.current.documentId;

                } else {
                    const pdfData = await uploadPdf(pdfFile);

                    pdfDocumentId = pdfData.documentId;

                    uploadedPdfRef.current = {
                        file: pdfFile,
                        documentId: pdfDocumentId,
                        fileName: pdfData.fileName || pdfFile.name,
                        fileUrl: pdfData.fileUrl || "",
                        pageCount: pdfData.pageCount || 0
                    };
                }

                setMessages(prev => prev.map(msg => msg.messageId === userMessageId ? {
                                ...msg, pdf: {
                                    documentId: uploadedPdfRef.current.documentId,
                                    fileName: uploadedPdfRef.current.fileName,
                                    fileUrl: uploadedPdfRef.current.fileUrl,
                                    pageCount: uploadedPdfRef.current.pageCount
                                }
                            } : msg
                    )
                );
            }

            await sendMessage(
                message,
                conversationId,
                imageBase64,
                pdfDocumentId,

                (text) => {

                    setMessages(prev =>
                        prev.map(msg =>
                            msg.messageId === assistantMessageId ? {
                                    ...msg,
                                    content: msg.content + text
                                } : msg
                        )
                    );
                },

                (citation) => {

                    setMessages(prev => prev.map(msg =>
                            msg.messageId === assistantMessageId ? {
                                    ...msg,
                                    citations: [
                                        ...(msg.citations || []),
                                        citation
                                    ]
                                } : msg
                        )
                    );
                },

                (questions) => {

                    setMessages(prev => prev.map(msg => msg.messageId === assistantMessageId ? {
                                    ...msg,
                                    relatedQuestions: questions || []
                                } : msg
                        )
                    );
                },

                (resources) => {

                    setMessages(prev => prev.map(msg => msg.messageId === assistantMessageId
                                ? {
                                    ...msg,
                                    exploreMore:  resources || []
                                } : msg
                        )
                    );
                },

                (data) => {
                    completedData = data;

                    setMessages(prev => prev.map(msg => msg.messageId === assistantMessageId ? {
                                    ...msg,
                                    messageId: data.messageId || msg.messageId,
                                    resources: data.resources || [],
                                    visual: data.visual || [],
                                    visualStatus: data.visualStatus || "none"
                                } : msg
                        )
                    );

                    if( data.visualStatus === "processing" && data.messageId){
                        pollVisualStatus(
                            data.messageId
                        );
                    }

                    if (data.conversationId) {

                        loadChats();

                        setTimeout(() => {
                            loadChats();
                        }, 1500);
                    }

                    setLoading(false);
                },
                (error) => {

                    console.error("Streaming failed:", error);

                    setError(error.message || "Failed to send message");

                    setMessages(prev => prev.filter(
                            msg => msg.messageId !== assistantMessageId && msg !== userMessage
                        )
                    );

                    setLoading(false);
                }
            );

            return completedData;

        } catch (err) {

            console.error("sendMessages error:",err);

            setError("Failed to send message");
            
            setMessages(prev =>prev.filter(
                    msg => msg.messageId !== assistantMessageId && msg !== userMessage
                )
            );

            setLoading(false);
        }
    }


    function updateVisualMessage(messageId, visualStatus, visual = []) {
        setMessages(prev => prev.map(msg => {
            return msg.messageId === messageId ? { ...msg, visualStatus, visual } : msg
        }
        )
        );
    }

    async function pollVisualStatus(messageId) {
        const maxAttempts = 30;
        let attempts = 0;

        async function checkStatus() {
            if (attempts >= maxAttempts) {
                return;
            }

            attempts++;

            try {
                const data = await getVisualStatus(messageId);
                updateVisualMessage(
                    messageId,
                    data.visualStatus,
                    data.visual || []
                );

                if (data.visualStatus === "processing") {
                    setTimeout(checkStatus, 1000);
                }

            } catch (error) {
                console.error( "Visual status polling failed:", error.message);

                setTimeout(checkStatus, 2000);
            }
        }

        checkStatus();
    }

    function clearMessages() {
        setMessages([]);
        setCurrentChat(null);
    }

    useEffect(() => {
        loadChats();
    }, []);


    return (
        <ChatContext.Provider value={{ chats, messages, currentChat, loading, error, loadChats, loadChat, createChat, removeChat, sendMessages, clearMessages, updateVisualMessage }}>
            {children}
        </ChatContext.Provider>
    )
}
