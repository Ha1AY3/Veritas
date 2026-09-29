import { callDeepseek } from "./deepseek.service.js";


export async function generateAnswerSummary(userMessage, assistantAnswer) {
    if (!assistantAnswer || assistantAnswer.trim() === '') {
        return {
            summary: "",
            title: ""
        }
    }

    const prompt = `
You are generating two pieces of conversation metadata from a user question and an assistant answer.

USER QUESTION:
${userMessage}

ASSISTANT ANSWER:
${assistantAnswer}

Return ONLY valid JSON in exactly this format:

{
    "title": "string",
    "summary": "string"
}

TITLE RULES:
- 2 to 5 words
- Maximum 45 characters
- Describe the main topic of the conversation
- Do not answer the question
- Do not use quotation marks
- Do not use a period at the end
- Do not begin with "What", "How", "Why", "Can", "Does", etc. unless absolutely necessary
- Prefer a natural topic title such as:
  "React Fundamentals"
  "JWT Authentication"
  "Understanding Mitochondria"
  "Heart Structure"
  "React Native Architecture"

SUMMARY RULES:
- 80 to 100 words
- Do not produce fewer than 80 words
- Capture the key information from the assistant answer
- Focus on what the user asked
- Include important entities, technologies, people, and concepts
- Do NOT include citations
- Do NOT include markdown
- Do NOT use bullet points
- Write as one paragraph
- Do not repeat the assistant answer word-for-word
`;

    try {
        const response = await callDeepseek([
            {
                role: "system",
                content: "You summarize AI answers concisely. Return only the summary."
            },
            {
                role: "user",
                content: prompt
            }
        ], {
            model: "deepseek-v4-flash",
            temperature: 0.0,
            maxTokens: 300
        });

         const finishReason = response.choices?.[0]?.finish_reason;

        if (finishReason !== "stop" && finishReason !== "length") {
            console.warn(`Metadata generation incomplete: ${finishReason}`);

            return {
                summary: "",
                title: ""
            };
        }

        let content = response.choices?.[0]?.message?.content?.trim() || "";

        if (!content) {
            console.warn("Empty metadata response");

            return {
                summary: "",
                title: ""
            };
        }

        content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

        let parsed;

        try {
            parsed = JSON.parse(content);
        } catch (error) {
            console.warn("Metadata JSON parsing failed");

            const jsonMatch = content.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("No valid JSON found");
            }

            parsed = JSON.parse(jsonMatch[0]);
        }

        let title = typeof parsed.title === "string" ? parsed.title.trim() : "";

        title = title.replace(/^["'`]+|["'`]+$/g, "").replace(/[.!?:;]+$/, "").replace(/\s+/g, " ").trim();

        if (title.length > 45) {
            title = title.slice(0, 45).trim();
        }

        const titleWords = title ? title.split(/\s+/).filter(Boolean) : [];

        if (titleWords.length > 5) {
            title = titleWords.slice(0, 5).join(" ");
        }

        let summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";

        summary = summary.replace(/\s+/g, " ").trim();

        if (!summary || summary.length < 20) {
            console.warn("Generated summary too short, using fallback");

            const sentences = assistantAnswer.match(/[^.!?]+[.!?]+/g) || [];

            const firstTwo = sentences.slice(0, 2).join(" ");

            summary = firstTwo.replace(/\([^)]*\)/g, "").trim().slice(0, 350);
        }

        if (summary.length > 600) {
            summary = summary.slice(0, 597).trim() + "...";
        }

        const wordCount = summary.split(/\s+/).filter(Boolean).length;

        return {
            summary,
            title
        };

    } catch (error) {
        console.error("Answer metadata generation failed:", error.message);

        const sentences = assistantAnswer.match(/[^.!?]+[.!?]+/g) || [];

        const firstTwo = sentences.slice(0, 2).join(" ");

        const summary = firstTwo.replace(/\([^)]*\)/g, "").trim().slice(0, 350);

        const title = userMessage.replace(/\s+/g, " ").trim().replace(/[?!.]+$/, "");

        return {
            summary: summary || "",
            title: title.length > 45 ? title.slice(0, 45).trim() + "..." : title
        };
    }
}

export async function updateConversationSummary(oldSummary, userMessage, answerSummary) {
     if (!answerSummary || answerSummary.trim() === '') {
        return oldSummary || '';
    }

    const isFirstSummary = !oldSummary || oldSummary.trim() === '';

    const prompt = `
Previous Conversation Summary:
${oldSummary || 'No previous summary.'}

Latest User Message:
${userMessage}

Latest Answer Summary:
${answerSummary}

Update the conversation summary.

Requirements:
- Produce one paragraph.
- Keep it between 80 and 150 words.
- Preserve important entities and ongoing topics.
- Incorporate the latest exchange.
- Remove redundant information.
- Return only the updated summary.
${isFirstSummary ? '\n- Start with: "The conversation is about..."' : ''}
- Return only the updated summary.
`;

    try {
        const response = await callDeepseek([
            {
                role: "system",
                content: "You are the conversation memory manager for Veritas, a trustworthy AI research assistant. Your job is to maintain a concise, persistent memory of the conversation. Return only the updated summary."
            },
            {
                role: "user",
                content: prompt
            }
        ], {
            model: "deepseek-v4-flash",
            temperature: 0.0,
            maxTokens: 350
        });

        const finishReason = response.choices?.[0]?.finish_reason;
        
        if(finishReason !== "stop" && finishReason !== "length"){
            console.warn(`Conversation summary incomplete: ${finishReason}`);
            return oldSummary || '';
        }

        let summary = response.choices[0].message.content.trim();

        const wordCount = summary ? summary.trim().split(/\s+/).filter(Boolean).length : 0;

        if (!summary || wordCount < 20) {
            console.warn(`Summary too short (${wordCount} words), keeping previous memory`);
            return oldSummary || '';
        }

        if (wordCount > 150) {
            const words = summary.split(/\s+/);
            summary = words.slice(0, 150).join(' ') + '...';
        }

        return summary;

    } catch (error) {
        console.error('Conversation summary update failed:', error.message);
        return oldSummary || '';
    }
}