import { callDeepseek } from "../deepseek/deepseek.service.js";

export async function handleDirectRequest(query, message, imageAnalysis = null, options = {}) {
    const { stream = false, onText, onDone } = options;
    const directResult = computeDirectly(query);

    if (directResult !== null) {
        const answer = `${query} = ${directResult}`;

        if (stream) {
            onText?.(answer);
            onDone?.();
        }

        return {
            answer,
            type: "calculation"
        };
    }

    const prompt = `
Solve the following problem clearly and accurately.

Problem:
${query}

Instructions:
- Provide a step-by-step solution.
- Explain the reason for each important mathematical operation so the learner understands what is happening.
- Keep explanations concise and directly related to the solution.
- Use mathematical equations alongside short explanations.
- Do not use conversational filler.
- Do not praise or encourage the user.
- Do not say things like "Great job", "Of course", "Let's solve this together", or "You're doing great".
- Do not ask follow-up questions.
- Do not suggest another problem.
- Do not add unrelated information.
- Do not repeat the problem unnecessarily.
- End after the solution is complete.
- Do not cite sources

For example:

3x - 7 = 20
3x = 27
x = 9

Return only the solution.
`;

    const messages = [
        {
            role: "system",
            content: "You are Veritas. Answer questions directly and accurately. Do not cite sources."
        },
        {
            role: "user",
            content: prompt
        }
    ];

    try {

        if (stream) {
            const streamResponse = await callDeepseek(messages, {
                model: "deepseek-v4-flash",
                temperature: 0.0,
                maxTokens: 400,
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
                answer: fullAnswer,
                type: "general"
            };
        }

        const response = await callDeepseek(messages, {
            model: "deepseek-v4-flash",
            temperature: 0.0,
            maxTokens: 400
        });

        return {
            answer: response.choices?.[0]?.message?.content || "I couldn't answer that question.",
            type: "general"
        };

    } catch (error) {
        console.error("Direct answer generation failed:", error.message);

        return {
            answer: "I couldn't answer that question.",
            type: "general"
        };
    }

}

function computeDirectly(query) {

    const expr = query.replace(/\s/g, '');
 
    const match = expr.match(/^(\d+)([+\-*/])(\d+)$/);
    if (!match) return null;
    
    const num1 = parseFloat(match[1]);
    const operator = match[2];
    const num2 = parseFloat(match[3]);
    
    switch (operator) {
        case '+': return num1 + num2;
        case '-': return num1 - num2;
        case '*': return num1 * num2;
        case '/': return num2 !== 0 ? num1 / num2 : null;
        default: return null;
    }
}