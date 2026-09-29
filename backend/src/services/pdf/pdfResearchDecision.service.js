import { callDeepseek } from "../deepseek/deepseek.service.js";

export async function decidePdfResearch({ question, pdfEvidence }) {
    if (!question?.trim()) {
        throw new Error("Question is required");
    }

    if (!Array.isArray(pdfEvidence) || pdfEvidence.length === 0) {
        throw new Error("PDF evidence is required");
    }

    const evidenceText = pdfEvidence
        .map((item, index) => {
            return `
PDF EVIDENCE ${index + 1}
Page: ${item.pageNumber}
Chunk: ${item.chunkIndex}

${item.text}
`;
        })
        .join("\n-------------------------\n");

    const systemPrompt = `
You are the research-decision component of Veritas PDF Hybrid Research.

Your task is to determine whether the uploaded PDF evidence is sufficient
to answer the user's question without external web research.

Return ONLY valid JSON:

{
  "requiresResearch": true,
  "reason": "short explanation"
}

Decision rules:

requiresResearch = false when:
- The PDF contains enough relevant information to answer the question.
- The user is asking about information explicitly covered by the PDF.
- No current or external information is required.

requiresResearch = true when:
- The PDF does not contain enough information.
- The question asks for information outside the PDF.
- The user asks for current, latest, recent, or updated information.
- The user asks for external verification or comparison with outside information.
- The answer requires facts that cannot be supported by the PDF.

Important:
- Do not answer the user's question.
- Do not use outside knowledge to fill gaps.
- Judge ONLY from the question and supplied PDF evidence.
- Be conservative: when the PDF is insufficient, choose true.
`;

    const userPrompt = `
USER QUESTION:
${question}

UPLOADED PDF EVIDENCE:
${evidenceText}
`;

    const response = await callDeepseek(
        [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        {
            model: "deepseek-v4-flash",
            temperature: 0.0,
            maxTokens: 300,
            stream: false,
            responseFormat: {
                type: "json_object"
            }
        }
    );

    const content = response?.choices?.[0]?.message?.content?.trim();

    if (!content) {
        throw new Error("DeepSeek returned empty research decision");
    }

    let parsed;

    try {
        parsed = JSON.parse(content);
    } catch (error) {
        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Failed to parse PDF research decision");
        }

        parsed = JSON.parse(jsonMatch[0]);
    }

    if (typeof parsed.requiresResearch !== "boolean") {
        throw new Error("Invalid PDF research decision");
    }

    return {
        requiresResearch: parsed.requiresResearch,
        reason: typeof parsed.reason === "string" ? parsed.reason.trim() : ""
    };
}