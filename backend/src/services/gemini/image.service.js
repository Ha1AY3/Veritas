import { callDeepseek } from "../deepseek/deepseek.service.js";

export async function generateImageAnswer(message, imageAnalysis, conversationSummary, recentUserMessages = [], options = {},){
    const { stream = false, onText, onDone } = options;

    if (!imageAnalysis) {
        return {
            answer: "I don't have enough information from the image to answer that confidently. Could you ask about another part of the image or upload a clearer version?",
        };
    }

    const subject = imageAnalysis.subject || "Unknown";
    const entities = (imageAnalysis.entities || []).join(", ") || "None detected";
    const keywords = (imageAnalysis.keywords || []).join(", ") || "None detected";
    const visibleText = (imageAnalysis.visibleText || []).join(" ") || "No visible text detected";

    const summaryContext = conversationSummary ? `Conversation Summary: ${conversationSummary}` : "Conversation Summary: None";
    const userMessagesContext = recentUserMessages.length > 0 ? `Previous User Messages: ${recentUserMessages.join(" → ")}` : "Previous User Messages: None";

    const systemPrompt = `
You are Veritas, a helpful AI research assistant.

The user uploaded an image and is asking a question about it.

The image has already been analyzed by a vision model.

Image Analysis:

- Subject: ${subject}
- Objects/Entities: ${entities}
- Keywords: ${keywords}
- Detected Text: ${visibleText}

${summaryContext}
${userMessagesContext}

Instructions:
- Answer the user's question using the provided image analysis as the PRIMARY source.
- You may use your general knowledge to explain, interpret, or expand on the analysis.
- Do NOT invent details that are not supported by the image analysis.
- If the analysis does not contain enough information, say what is missing instead of guessing.
- If the user refers to "this", "that", "it", "the image", or "the diagram", assume they mean the uploaded image.
- Do NOT mention that you're using image analysis.
- Do NOT cite sources.
- Do NOT use markdown.
- Be conversational and helpful.

Remember: It's better to say "I can't be certain from the image alone" than to make a confident but unsupported claim.
`;

    const userPrompt = message;

    try {
        const messages = [
            {
                role: "system",
                content: systemPrompt,
            },
            {
                role: "user",
                content: userPrompt,
            },
        ];

        if (stream) {
            const streamResponse = await callDeepseek(messages, {
                model: "deepseek-v4-flash",
                temperature: 0.3,
                maxTokens: 500,
                stream: true,
            });

            let buffer = "";
            let fullAnswer = "";

            for await (const chunk of streamResponse) {
                buffer += chunk.toString();

                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();

                    if (!trimmed || trimmed.startsWith(":")) {
                        continue;
                    }

                    if (!trimmed.startsWith("data:")) {
                        continue;
                    }

                    const data = trimmed.replace(/^data:\s*/, "");

                    if (data === "[DONE]") {
                        continue;
                    }

                    let parsed;

                    try {
                        parsed = JSON.parse(data);
                    } catch {
                        continue;
                    }

                    const delta = parsed.choices?.[0]?.delta?.content || "";

                    if (!delta) {
                        continue;
                    }

                    fullAnswer += delta;

                    onText?.(delta);
                }
            }

            onDone?.();

            return {
                answer: fullAnswer,
            };
        }

        const response = await callDeepseek(messages, {
            model: "deepseek-v4-flash",
            temperature: 0.3,
            maxTokens: 500,
        });

        const answer = response.choices?.[0]?.message?.content || "I don't have enough information from the image to answer that confidently. Could you ask about another part of the image or upload a clearer version?";

        return { answer };
    } catch (error) {
        console.error("Image answer generation failed:", error.message);
        return {
            answer: "I don't have enough information from the image to answer that confidently. Could you ask about another part of the image or upload a clearer version?",
        };
    }
}
