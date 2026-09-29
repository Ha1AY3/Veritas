import { callDeepseek } from "../deepseek/deepseek.service.js";


function processPdfCitationBuffer({getText, setText, pdfEvidence, pdfDocument, onText, onCitation}){
    let text = getText();

    const citationRegex =  /\[PDF Page (\d+)\]\s*(?:\([^)]*\))?/;

    const match = text.match(citationRegex);

    if (!match) {
        const citationPrefix = "[PDF Page";

        const possibleStart = text.lastIndexOf(citationPrefix);

        if (possibleStart !== -1) {

            const possibleCitation = text.slice(possibleStart);

            if (!possibleCitation.includes("]")) {

                const safeText = text.slice(0, possibleStart);

                if (safeText) {
                    onText?.(safeText);
                }

                setText(possibleCitation);

                return;
            }
        }

        if (text.length > 100) {

            const safeLength = text.length - 50;

            onText?.(text.slice(0, safeLength));

            setText(text.slice(safeLength));

        }

        return;
    }

    const matchIndex = match.index;

    const before = text.slice(0, matchIndex);

    if (before) {
        onText?.(before);
    }

    const pageNumber = Number(match[1]);

    const evidence = pdfEvidence.find(item => Number(item.pageNumber) === pageNumber);

    if (!evidence) {
        onText?.(match[0]);

    } else {

        const citation = {
            pageNumber: evidence.pageNumber,
            chunkIndex: evidence.chunkIndex
        };

        onCitation?.(citation);

        const fileUrl =
            pdfDocument?.fileUrl || "";

        const citationMarkdown = fileUrl
                ? `[PDF Page ${pageNumber}](${fileUrl}#page=${pageNumber})`
                : `[PDF Page ${pageNumber}]`;

        onText?.(citationMarkdown);
    }

    const after = text.slice( matchIndex + match[0].length );

    setText(after);
}

export async function generatePdfAnswer({question, pdfEvidence, previousMessages = [], pdfDocument = null, options = {}}){

    const {
        stream = false,
        onText,
        onCitation,
        onDone
    } = options;

    if (!question?.trim()) {
        throw new Error("Question is required");
    }

    if (!Array.isArray(pdfEvidence) || pdfEvidence.length === 0) {
        throw new Error("PDF evidence is required");
    }

    const evidenceText = pdfEvidence.map((item, index) => {
            return `
SOURCE ${index + 1}
PDF Page: ${item.pageNumber}
Chunk: ${item.chunkIndex}
Similarity Score: ${item.score}

CONTENT:
${item.text}
`;
        })
        .join("\n-------------------------\n");

    const systemPrompt = `
You are the PDF research assistant inside Veritas.

Your job is to answer the user's question using ONLY the provided PDF evidence.

Rules:

1. Use only the provided PDF evidence.
2. Do not use outside knowledge.
3. Do not invent or assume facts.
4. Every factual claim must be supported by the provided PDF evidence.
5. When making a factual claim, cite the relevant page using this exact format:
   [PDF Page X]
6. Only cite page numbers that actually appear in the provided evidence.
7. Do not mention similarity scores, chunk numbers, or internal retrieval details.
8. Do not mention that you are using "evidence" unless it is natural to the answer.
9. Do not repeat the same information unnecessarily.
10. Keep the answer concise but informative.
11. Prefer short paragraphs, bullet points, and numbered sections when they improve readability.
12. Use Markdown formatting when appropriate.
13. For questions asking about multiple components, methods, metrics, steps, categories, or comparisons, organize the answer into clear sections or numbered points.
14. Do not force headings for very simple questions.
15. Keep each paragraph focused on one idea.
16. Put citations naturally at the end of the sentence or group of sentences they support.
17. Do not put citations in separate citation lists inside the answer.
18. Do not add Markdown links yourself. Only use [PDF Page X] as citation markers.
19. If the PDF does not contain enough information to answer the question, clearly say so.
20. Return valid JSON only.

Answer formatting guidelines:

- Start with a direct answer to the user's question.
- For simple factual questions, use a short paragraph followed by bullets if useful.
- For questions involving components or categories, use numbered sections.
- For questions involving several aspects, use concise headings.
- Avoid long walls of text.
- Avoid repeating the question.
- Avoid unnecessary introductory phrases.

Required JSON format:

{
  "answer": "Your well-structured Markdown answer with [PDF Page X] citations",
  "citations": [
    {
      "pageNumber": 2,
      "chunkIndex": 1
    }
  ]
}
`;

    const userPrompt = `
USER QUESTION:
${question}

PDF EVIDENCE:
${evidenceText}

PREVIOUS CONVERSATION:
${previousMessages.length ? JSON.stringify(previousMessages) : "None"}

Answer the question using only the PDF evidence.
`;

    const finalSystemPrompt = stream
        ? `${systemPrompt}

STREAMING MODE:

The response is being streamed token-by-token.

For this streaming response, the instructions below override
the JSON output instructions above.

Return ONLY the answer text.

Do NOT return JSON.

Do NOT return the citations array.

Do NOT return metadata.

Do NOT generate URLs yourself.

Do NOT generate Markdown links yourself.

Use PDF citations in exactly this format:

[PDF Page X]

X must be an actual page number present in the supplied PDF evidence.

Place each citation immediately after the factual claim it supports.

Keep the answer clear, concise, and well structured.

Use Markdown formatting when useful.

For questions involving multiple components, methods, metrics,
steps, categories, or comparisons, organize the answer into
clear sections, numbered lists, or bullet points.

Avoid long walls of text.

Do not repeat information unnecessarily.

FINAL OUTPUT:

Return only the answer itself.
`
        : systemPrompt;

    if (stream) {

        const streamResponse = await callDeepseek(
            [
                {
                    role: "system",
                    content: finalSystemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],
            {
                model: "deepseek-v4-flash",
                temperature: 0.1,
                maxTokens: 1200,
                stream: true
            }
        );

        let buffer = "";
        let pending = "";
        let fullAnswer = "";

        const streamedCitations = [];

        const pdfCitationRegex = /\[PDF Page (\d+)\]/;


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

                const data = trimmed.replace(
                    /^data:\s*/,
                    ""
                );

                if (data === "[DONE]") {
                    continue;
                }

                let parsed;

                try {
                    parsed = JSON.parse(data);
                } catch {
                    continue;
                }

                const delta =
                    parsed.choices?.[0]?.delta?.content || "";

                if (!delta) {
                    continue;
                }

                pending += delta;

                processPdfCitationBuffer({
                    getText: () => pending,

                    setText: (value) => {
                        pending = value;
                    },

                    pdfEvidence,

                    pdfDocument,

                    onText: (text) => {
                        fullAnswer += text;
                        onText?.(text);
                    },

                    onCitation: (citation) => {
                        streamedCitations.push(citation);
                        onCitation?.(citation);
                    }
                });

                
            }
        }
        
        if (buffer) {
            pending += buffer;
        }

        if (pending) {
            fullAnswer += pending;
            onText?.(pending);
        }

        onDone?.();

        console.log(" PDF answer streaming completed");

        return {
            answer: fullAnswer,
            citations: streamedCitations
        };
    }

    const response = await callDeepseek(
        [
            {
                role: "system",
                content: finalSystemPrompt
            },
            {
                role: "user",
                content: userPrompt
            }
        ],
        {
            model: "deepseek-v4-flash",
            temperature: 0.1,
            maxTokens: 1200,
            stream: false,
            responseFormat: {
                type: "json_object"
            }
        }
    );

    const content = response?.choices?.[0]?.message?.content?.trim();

    if (!content) {
        console.log("Full DeepSeek response:", response);
        throw new Error("DeepSeek returned empty PDF answer");
    }

    let parsed;

    try {

        parsed = JSON.parse(content);

    } catch (error) {

        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Failed to parse PDF answer JSON");
        }

        parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed?.answer) {
        throw new Error("PDF answer was not generated");
    }

    const validEvidence = new Set( pdfEvidence.map(
            item =>`${item.pageNumber}-${item.chunkIndex}`
        )
    );

    const citations = Array.isArray(parsed.citations) ? parsed.citations.filter(
                citation => validEvidence.has(`${citation.pageNumber}-${citation.chunkIndex}`)
            ) : [];

    return {
        answer: parsed.answer,
        citations
    };
}