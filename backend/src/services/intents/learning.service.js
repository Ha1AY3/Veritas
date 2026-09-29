import { callDeepseek } from "../deepseek/deepseek.service.js";

export async function generateLearningSupport(message, previousAnswer, conversationSummary, previousUserMessages = [], options = {}) {
    const { stream = false, onText, onDone } = options;
    if (!previousAnswer || previousAnswer.trim() === '') {
        const fallbackAnswer = "I don't have a previous answer to build on. Could you ask your question again, and I'll explain it clearly?";

        if (stream) {
            onText?.(fallbackAnswer);
            onDone?.();
        }

        return {
            answer: fallbackAnswer
        };
    }

    const systemPrompt = `
You are Veritas, a patient, supportive, and clear AI research assistant.

The user wants help understanding a previous explanation.

Your job is to improve the user's understanding, not answer the topic from scratch.

Guidelines:
- Build upon the previous explanation.
- Explain only what the user is asking about.
- Use clear, simple language.
- Break complex ideas into smaller steps when needed.
- If the user asks for an example, provide a simple real-world example.
- If the user asks to simplify, remove jargon and technical terms.
- If the user asks to explain like a beginner or "ELI5", use easy analogies.
- If the user asks for more detail, expand only the relevant part.
- If the user asks for a shorter explanation, summarize the key idea.
- Avoid repeating the entire previous explanation unless necessary.
- Stay consistent with the previous explanation.
- Do not introduce unrelated concepts.
- Do not invent new facts.
- Keep the response conversational and encouraging.
- Use markdown only when it improves clarity.
- Use headings, bullets, numbered steps, or code blocks when appropriate.
- Avoid excessive formatting.
- Keep explanations natural and easy to read.
- Do not cite sources.

Context:
${conversationSummary ? `Topic: ${conversationSummary}` : 'No previous context.'}

${previousUserMessages.length > 0 ? `User's previous questions: ${previousUserMessages.join(' → ')}` : ''}
`;

    const userPrompt = `
Previous explanation summary:
${previousAnswer}

User's request:
${message}

Provide a clear, simple, and helpful response.
`;

    try {
        const messages = [
        {
            role: "system",
            content: systemPrompt
        },
        {
            role: "user",
            content: userPrompt
        }
    ];

    if (stream) {
        const streamResponse = await callDeepseek(messages, {
            model: "deepseek-v4-flash",
            temperature: 0.5,
            maxTokens: 600,
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

                const delta =  parsed.choices?.[0]?.delta?.content || "";

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
        temperature: 0.5,
        maxTokens: 600
    });

    const answer =
        response.choices?.[0]?.message?.content || "I want to help you understand this better. Could you tell me specifically what's confusing, and I'll explain it in a simpler way?";

    return { answer };

    } catch (error) {
        console.error('Learning support generation failed:', error.message);
        return { 
            answer: "I want to help you understand this better. Could you tell me specifically what's confusing, and I'll explain it in a simpler way?" 
        };
    }
}
