import { callDeepseek } from "../deepseek/deepseek.service.js";

export async function generateDirectAnswer(message, conversationSummary = "", previousUserMessages = [], options = {}) {
    const { stream = false, onText, onDone } = options;

    const systemPrompt = `
You are Veritas, a friendly and helpful AI research assistant.

The user is greeting you or having a casual conversation.

Be warm, welcoming, and conversational.

Keep your response brief (1-3 sentences) unless the user asks a longer question.

Conversation Summary:
${conversationSummary || "No previous conversation."}

Recent User Messages:
${previousUserMessages.length ? previousUserMessages.join(" → ") : "None"}

Use the conversation context to understand pronouns like it, this, that, they, and them.

Do NOT use citations.
Do NOT use markdown.
Do NOT mention that you are an AI unless asked.
`;

    const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: message
        }
    ];

    if (stream) {
        const streamResponse = await callDeepseek(messages, {
            model: "deepseek-v4-flash",
            temperature: 0.7,
            maxTokens: 150,
            stream: true
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
            answer: fullAnswer
        };
    }

    const response = await callDeepseek(messages, {
        model: "deepseek-v4-flash",
        temperature: 0.7,
        maxTokens: 150
    });

    const answer = response.choices?.[0]?.message?.content || "Hello! How can I help you today?";

    return { answer };
}

