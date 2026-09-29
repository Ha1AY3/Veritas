import { callDeepseek } from "../deepseek/deepseek.service.js";

function processHybridCitationBuffer({getText, setText, pdfEvidence, webEvidence, pdfDocument, onText, onCitation}){
    let text = getText();

    const pdfMatch = text.match(/\[PDF Page (\d+)\]/);

    const webMatch = text.match(/\[WEB:\s*([^\]]+)\]/);

    let match = null;
    let type = null;

    if (pdfMatch && webMatch) {

        if (pdfMatch.index < webMatch.index) {
            match = pdfMatch;
            type = "pdf";
        } else {
            match = webMatch;
            type = "web";
        }

    } else if (pdfMatch) {

        match = pdfMatch;
        type = "pdf";

    } else if (webMatch) {

        match = webMatch;
        type = "web";
    }

    if (!match) {

        const pdfStart =  text.lastIndexOf("[PDF Page");

        const webStart =  text.lastIndexOf("[WEB:");

        const partialStart = Math.max(pdfStart, webStart);

        if (partialStart !== -1) {

            const possibleCitation = text.slice(partialStart);

            if (!possibleCitation.includes("]")) {

                const safeText = text.slice(0, partialStart);

                if (safeText) {
                    onText?.(safeText);
                }

                setText(possibleCitation);

                return;
            }
        }

        if (text.length > 100) {

            const safeLength = text.length - 50;

            onText?.( text.slice(0, safeLength));

            setText( text.slice(safeLength));
        }

        return;
    }

    const matchIndex = match.index;

    const before = text.slice(0, matchIndex);

    if (before) {
        onText?.(before);
    }

    if (type === "pdf") {

        const pageNumber = Number(match[1]);

        const evidence = pdfEvidence.find(
                item =>
                    Number(item.pageNumber) ===
                    pageNumber
            );

        if (!evidence) {

            onText?.(match[0]);

        } else {

            const citation = {
                evidenceId: evidence.evidenceId,
                sourceType: "pdf",
                documentId: evidence.documentId,
                pageNumber: evidence.pageNumber,
                chunkIndex: evidence.chunkIndex
            };

            onCitation?.(citation);

            const fileUrl = pdfDocument?.fileUrl || "";

            const citationMarkdown = fileUrl ? `[PDF Page ${pageNumber}](${fileUrl}#page=${pageNumber})` : `[PDF Page ${pageNumber}]`;

            onText?.(citationMarkdown);
        }
    }

    if (type === "web") {

        const hostname = match[1].trim();

        const evidence = webEvidence.find( item => item.hostname ===  hostname );

        if (!evidence) {

            onText?.(match[0]);

        } else {

            const citation = {
                evidenceId: evidence.evidenceId,
                sourceType: "web",
                url: evidence.url,
                title: evidence.title,
                hostname: evidence.hostname
            };

            onCitation?.(citation);

            const citationMarkdown = evidence.url ? `[${hostname}](${evidence.url})` : `[${hostname}]`;

            onText?.(citationMarkdown);
        }
    }
    const after = text.slice(
            matchIndex + match[0].length
        );

    setText(after);
}

export async function generatePdfHybridAnswer({ question, hybridEvidence, previousMessages = [], pdfDocument = null, options = {} }) {
    const {
        stream = false,
        onText,
        onCitation,
        onDone
    } = options;

    if (!question?.trim()) {
        throw new Error("Question is required");
    }

    if (!hybridEvidence) {
        throw new Error("Hybrid evidence is required");
    }

    const pdfEvidence = hybridEvidence.pdf || [];
    const webEvidence = hybridEvidence.web || [];

    if (!pdfEvidence.length && !webEvidence.length) {
        throw new Error("No hybrid evidence available");
    }

    const pdfContext = pdfEvidence
        .map(item => {
            return `
[${item.evidenceId}]
SOURCE TYPE: PDF
Page: ${item.pageNumber}
Chunk: ${item.chunkIndex}

${item.text}
`;
        })
        .join("\n-------------------------\n");


    const webContext = webEvidence
        .map(item => {
            return `
[${item.evidenceId}]
SOURCE TYPE: WEB
Title: ${item.title}
Hostname: ${item.hostname}
URL: ${item.url}

${item.text}
`;
        })
        .join("\n-------------------------\n");

    const systemPrompt = `
You are Veritas, an evidence-backed research assistant.

Answer the user's question using ONLY the supplied PDF and web evidence.

CORE RULES:

- Answer exactly what the user asked.
- Prefer relevance over completeness.
- Use only information supported by the supplied evidence.
- Do not use outside knowledge.
- Do not invent facts, capabilities, results, citations, page numbers,
  hostnames, or URLs.
- Stop once the question has been sufficiently answered.
- Do not turn a focused question into a broad tutorial or research report.
- Use evidence selectively; more evidence does not require a longer answer.

CITATIONS:

PDF claims:
[PDF Page X]

Web claims:
[WEB: hostname]

Rules:
- PDF page numbers must exist in the supplied PDF evidence.
- Web hostnames must exactly match supplied web sources.
- Cite factual claims near the claim they support.
- Use both citation types when both support the same claim.
- Do not create Markdown links or URLs yourself.
- Avoid unnecessary repeated citations.

QUESTION FOCUS:

Answer the exact question before adding anything else.

When the user names a specific tool, framework, benchmark, paper,
metric, library, or methodology:

- Address that named entity directly when supported by the evidence.
- Do not replace it with a generic discussion of the field.
- Do not invent information about it.
- If the evidence does not cover it, say so briefly.

For comparison questions, compare only the entities or criteria
the user asked about.

Do NOT automatically use sections such as:
"What the PDF says"
"Current practice"
"Comparison"
unless the question actually requires that structure.

ACTION / MODIFICATION QUESTIONS:

When the user asks how to reduce, prevent, improve, mitigate, or modify
something:

- Lead with the concrete approaches supported by the evidence.
- Explain briefly what failure mode each approach addresses.
- Do not spend more than one short sentence explaining evidence gaps.
- Do not turn the answer into a literature review.
- Keep study-specific results attributed to the cited study.
- Prefer a concise numbered or bulleted list when multiple approaches
  are requested.

ANSWER LENGTH AND STYLE:

- Start with the direct answer.
- Keep answers concise and evidence-focused.
- Simple/focused question: usually 80–180 words.
- Moderately complex question: usually 180–300 words.
- Use more detail only when necessary to answer multiple distinct parts.

MARKDOWN STRUCTURE:

Make complex answers visually easy to scan.

Use Markdown structure deliberately.

For a simple question:
- Prefer one or two short paragraphs.
- Do not add unnecessary headings.

For a moderately complex or multi-part question:
- Use clear ### headings for the major dimensions.
- Keep each section focused on one idea.
- Prefer short paragraphs of 1–3 sentences.
- Use bullets when presenting multiple distinct items.
- Use numbered lists for ordered steps or processes.

For comparison questions:
- Organize the answer around the criteria being compared.
- Use headings for the major comparison dimensions.
- Use bold labels when contrasting entities within a section.

Example:

### Attention mechanisms

**Original Transformer**
- ...
- ...

**Modern architectures**
- ...
- ...

### Scalability

**Original Transformer**
- ...

**Modern approaches**
- ...

### Training efficiency

**Original Transformer**
- ...

**Modern approaches**
- ...

Do not force this exact structure when it does not fit the question.

READABILITY:

- Avoid large blocks of continuous prose.
- Do not place several independent ideas in the same paragraph.
- Prefer whitespace between major sections.
- Keep headings concise and descriptive.
- Avoid creating a heading for every small point.
- Do not repeat the same information in multiple formats.
- Do not use excessive bullets for information that is clearer as prose.
- Do not add a "Sources", "References", or "Citations" section.
- Keep citations immediately after the claim they support.
- Do not place citations on their own separate lines unless required by the content.

For hybrid answers specifically:
- Present the PDF evidence and web evidence as one coherent answer.
- Do not mechanically separate the answer into "PDF" and "Web" sections.
- Use the PDF for claims about the uploaded document.
- Use web evidence for external, newer, or comparative information.
- Clearly distinguish the source through natural wording and citations.
- When the PDF provides the historical/original context and the web provides
  later developments, make that progression clear.

For complex questions, end with a brief synthesis only when it adds useful
information. Do not add a generic conclusion to every answer.

Do not repeat the user's question.
Do not add unnecessary background, implications, examples, or tangents.

SOURCE DISCIPLINE:

Prefer stronger sources when several supplied sources support the same claim:

1. Original research / peer-reviewed or conference papers
2. Official documentation or project sources
3. Reputable technical or institutional sources
4. Secondary sources
5. Informal repositories or personal pages

Do not treat weaker sources as equivalent to primary research.

When a claim comes from one study, keep its scope:
"One study found..."
"The cited evaluation reports..."
"In the evaluated setting..."

Do not turn study-specific findings into universal claims.

PDF AND WEB BOUNDARIES:

- Use the PDF for what the uploaded paper/survey actually states.
- Use web sources for additional, newer, or external information.
- Do not attribute web findings to the PDF.
- Do not attribute PDF findings to web sources.
- When sources use different terminology or definitions, preserve those
  differences instead of silently combining them.
- Do not assume terms such as intrinsic, extrinsic, contextual,
  faithfulness, groundedness, or factual hallucination are synonymous
  unless the supplied evidence explicitly connects them.

FINAL CHECK:

Before answering, verify:

1. Did I directly answer the user's question?
2. Did I address every named entity that the evidence supports?
3. Is every factual claim supported by the supplied evidence?
4. Are PDF and web claims correctly distinguished?
5. Did I preserve important terminology differences?
6. Did I avoid unsupported generalizations?
7. Is the answer no longer than necessary?
8. Did I avoid repeating information?

OUTPUT:

Return ONLY valid JSON:

{
  "answer": "Markdown answer with [PDF Page X] and [WEB: hostname] citations",
  "citations": [
    {
      "evidenceId": "pdf_1",
      "sourceType": "pdf",
      "pageNumber": 2,
      "chunkIndex": 1
    },
    {
      "evidenceId": "web_1",
      "sourceType": "web",
      "hostname": "arxiv.org"
    }
  ]
}

Do not add text outside the JSON.
`;
    const userPrompt = `
USER QUESTION:
${question}

PDF EVIDENCE:
${pdfContext || "None"}

WEB EVIDENCE:
${webContext || "None"}

PREVIOUS CONVERSATION:
${previousMessages.length ? JSON.stringify(previousMessages) : "None"}

Answer using only the supplied evidence.
`;

    const finalSystemPrompt = stream
        ? `${systemPrompt}

STREAMING MODE:

The answer is being streamed token-by-token.

The JSON output instructions above are overridden for this response.

Return ONLY the answer text.

Do NOT return JSON.

Do NOT return a citations array.

Do NOT return metadata.

Do NOT generate URLs.

Use PDF citations exactly like:

[PDF Page X]

Use web citations exactly like:

[WEB: hostname]

Place each citation immediately after the factual claim it supports.

Keep the same answer structure and writing rules defined above.

Do not use numeric citations such as [1], [2], or [3].


Return only the answer itself.

TERMINOLOGY SAFETY DURING STREAMING:

Preserve source-specific terminology exactly as instructed above.

Do not collapse different hallucination taxonomies into a single label
merely to make the answer shorter.

STREAMING QUALITY RULES:

The same question-specific, source-discipline, evidence-boundary,
and answer-depth rules from the main prompt apply during streaming.

Do not sacrifice factual precision or question coverage for streaming
speed.

When the question names specific systems, tools, benchmarks, or metrics,
address those named entities explicitly.

Return only the answer text.
`
        : systemPrompt;

    const messages = [
        {
            role: "system",
            content: finalSystemPrompt
        }
    ];

    if (previousMessages?.length) {

        const recentMessages = previousMessages.slice(-5);

        for (const msg of recentMessages) {

            messages.push({
                role: msg.role,
                content: msg.content
            });
        }
    }

    messages.push({
        role: "user",
        content: userPrompt
    });

    if (stream) {

        const streamResponse = await callDeepseek( messages, {
                    model: "deepseek-v4-flash",
                    temperature: 0.1,
                    maxTokens: 1800,
                    stream: true
                }
            );

        let buffer = "";
        let pending = "";
        let fullAnswer = "";

        const streamedCitations = [];

        for await (const chunk of streamResponse) {

            buffer += chunk.toString();

            const lines = buffer.split("\n");

            buffer = lines.pop() || "";

            for (const line of lines) {

                const trimmed = line.trim();

                if (!trimmed || trimmed.startsWith(":")){
                    continue;
                }

                if(!trimmed.startsWith("data:")){
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

                pending += delta;

                processHybridCitationBuffer({
                    getText: () => pending,

                    setText: value => {
                        pending = value;
                    },

                    pdfEvidence,
                    webEvidence,
                    pdfDocument,

                    onText: text => {
                        fullAnswer += text;
                        onText?.(text);
                    },

                    onCitation: citation => {
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

            pending = "";
        }

        onDone?.();

        return {
            answer: fullAnswer,
            citations: streamedCitations
        };
    }

    const response = await callDeepseek(messages, {
                model: "deepseek-v4-flash",
                temperature: 0.1,
                maxTokens: 1800,
                stream: false,
                responseFormat: {
                    type: "json_object"
                }
            }
        );

    const content = response?.choices?.[0]?.message?.content?.trim();

    if (!content) {
        throw new Error("DeepSeek returned empty hybrid answer");
    }

    let parsed;

    try {
        parsed = JSON.parse(content);
    } catch {

        const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonMatch =  cleaned.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error("Failed to parse hybrid answer JSON");
        }

        parsed = JSON.parse(jsonMatch[0]);
    }

    if (!parsed?.answer) {
        throw new Error("Hybrid answer was not generated");
    }

    const validEvidence = new Map(
            hybridEvidence.all.map(item => [
                item.evidenceId,
                item
            ])
        );

    const citations = Array.isArray(parsed.citations) ? parsed.citations
                .filter(citation =>
                    citation?.evidenceId &&
                    validEvidence.has(
                        citation.evidenceId
                    )
                ).map(citation => {

                    const evidence = validEvidence.get( citation.evidenceId);

                    if(evidence.sourceType === "pdf"){
                        return {
                            evidenceId: evidence.evidenceId,
                            sourceType: "pdf",
                            documentId: evidence.documentId,
                            pageNumber: evidence.pageNumber,
                            chunkIndex: evidence.chunkIndex
                        };
                    }

                    return {
                        evidenceId: evidence.evidenceId,
                        sourceType: "web",
                        url: evidence.url,
                        title: evidence.title,
                        hostname: evidence.hostname
                    };
                }) : [];

    return {
        answer: parsed.answer,
        citations
    };
}