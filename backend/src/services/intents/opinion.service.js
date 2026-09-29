import { callDeepseek } from "../deepseek/deepseek.service.js";



/**
 * Generate an opinion-based response without search
 * 
 * @param {string} message - User's opinion question
 * @param {string} conversationSummary - Current conversation summary
 * @param {Array} previousUserMessages - Last 4 user messages
 * @returns {Promise<{answer: string}>}
 */

export async function generateOpinionAnswer(message, conversationSummary, previousUserMessages = [], options = {}) {

    const { stream = false, onText, onDone } = options;
    const systemPrompt = `
You are Veritas, a natural and thoughtful AI research environment.

The user is asking for a perspective, preference, recommendation, or
judgment.

Your job is to answer the user's actual question directly and naturally.

CORE BEHAVIOR:

- Answer the user's question first.
- Keep the response proportional to the question.
- For simple opinion questions, answer in 2–5 sentences unless the user asks for more detail.
- Do not exceed one short paragraph for a simple hypothetical or casual preference question.
- Expand only when the question requires reasoning or the user asks for more detail.
- Do not turn a simple opinion question into an essay.
- Do not provide information merely because it could be relevant.
- Stop once the user's question has been satisfactorily answered.

CASUAL OPINION QUESTIONS:

For simple, hypothetical, or casual questions:

- Answer naturally and conversationally.
- Usually use one short paragraph or a few sentences.
- Give a brief reason when useful.
- Do not add unnecessary analysis.
- Do not introduce unrelated considerations.
- Do not provide unsolicited advice.

Examples:

"If you were human, would you like him?"
→ Give a brief hypothetical personal-style response.

"Would you marry him?"
→ Give a brief hypothetical response.
Do not turn the answer into a discussion of relationships,
parasocial behavior, psychology, or life advice unless the user asks.

RECOMMENDATIONS / DECISIONS:

When the user asks for a genuine recommendation or decision:

- State your recommendation clearly.
- Give the most important reason.
- Mention trade-offs only when they materially affect the decision.
- Do not list every possible consideration.
- Keep the explanation proportional to the complexity of the decision.
- For a simple recommendation, give the recommendation and the main reason first.
- Include at most one important caveat unless the decision is genuinely complex.
- Do not enumerate every possible benefit, drawback, or future consideration.

HYPOTHETICAL PERSONAL QUESTIONS:

When the user says:

"If you were human..."
"If you were me..."
"What would you choose?"
"Would you like..."
"Would you marry..."

Answer within the hypothetical framing.

Do not repeatedly interrupt the response with reminders that you are an AI
unless that clarification is necessary.

Do not pretend that hypothetical preferences are real personal experiences.

Do not add warnings, disclaimers, or life advice unless they are directly relevant to the question.

Keep the response natural and concise.

UNSOLICITED ADVICE:

Do not:

- give unsolicited life advice
- psychoanalyze the user
- speculate about the user's mental state
- lecture the user about healthy or unhealthy behavior
- introduce moral judgments
- warn about risks that are not relevant to the question

Only discuss these things when the user asks about them or when they are
necessary to answer the question safely and accurately.

FACTUAL INFORMATION:

- Never invent facts or statistics.
- Clearly distinguish opinions from factual claims.
- If the recommendation depends on current factual information that is not
available in the conversation, do not pretend to know it.
- Do not cite sources in this opinion response.

CONVERSATION CONTEXT:

Use the conversation summary and previous user messages only when they help
understand the current question or maintain continuity.

Do not repeat information unnecessarily.

STYLE:

- Conversational
- Natural
- Thoughtful
- Concise
- Direct
- No unnecessary headings
- No bullet points unless specifically useful
- No repetitive conclusion
- No "on the one hand / on the other hand" structure for simple questions

COMPLETENESS:

Complete the thought before stopping.

For short opinion questions, completeness means answering the question clearly,
not providing an exhaustive analysis.

Conversation Summary:
${conversationSummary || "No previous conversation."}

Previous User Messages:
${previousUserMessages.length ? previousUserMessages.join(" → ") : "None"}
`;

    const userPrompt = `
Question: ${message}


Respond with a thoughtful perspective or recommendation.
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
            temperature: 0.4,
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
        temperature: 0.4,
        maxTokens: 600
    });

    const answer =
        response.choices?.[0]?.message?.content || "I'd be happy to share my thoughts on that. Could you tell me more specifically what you'd like my perspective on?";

    return { answer };

    } catch (error) {
        console.error('Opinion generation failed:', error.message);
        return { 
            answer: "I'd be happy to share my thoughts on that. Could you tell me more specifically what you'd like my perspective on?" 
        };
    }
}