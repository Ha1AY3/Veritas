import axios from "axios";
import { getCombinedExploreMore, searchAndFormatExa } from "../exa/exa.service.js";
import { convertCitationsToMarkdown, normalizeCitations, normalizeCodeBlocks } from "../../utils/citationFormatter.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const API_KEY = process.env.DEEPSEEK_API_KEY;

export async function callDeepseek(messages, options = {}) {
    const {
        model = "deepseek-v4-flash",
        temperature = 0.3,
        maxTokens = 2000,
        stream = false,
        responseFormat = null
    } = options;

    if (!messages || messages.length === 0) {
        throw new Error("Messages are required for deepseek");
    }

    try {
        const response = await axios.post(DEEPSEEK_API_URL,{
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
                stream,
                thinking: {
                    type: "disabled",
                },
                ...(responseFormat && { response_format: responseFormat})
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${API_KEY}`,
                },
                responseType: stream ? "stream" : "json",
            },
        );

        return response.data;
    } catch (error) {
        console.error("DeepSeek API error:", error.message);

        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }

        throw error;
    }
}

export async function generateAnswer(query, searchResults, previousMessages = [], confidence = "MEDIUM", intent = "research", options = {},){
    const { stream = false, onText, onCitation, onDone } = options;
    let context = "";
    const citationMap = new Map();

    searchResults.forEach((result, index) => {
        const highlights = result.highlights || [];
        const content = highlights.slice(0, 3).join(" ");

        if (content) {
            context += `\n[${index + 1}] Source: ${result.title}\n`;
            context += `Hostname: ${result.hostname}\n`;
            context += `Content: ${content}\n\n`;

            if (!citationMap.has(result.hostname)) {
                citationMap.set(result.hostname, {
                    url: result.url,
                    title: result.title,
                    hostname: result.hostname,
                    index: index + 1,
                });
            }
        }
    });

    if (!context) {
        throw new Error("No content found in search results to generate answer");
    }

    const confidenceMessages = {
        HIGH: `
The retrieved sources are comprehensive.

1. Answer confidently while remaining faithful to the provided evidence.
2.Synthesize information from multiple sources whenever possible.
`,

        MEDIUM: `
The retrieved sources provide partial coverage.

1. Answer using only the available evidence.
2. Clearly mention uncertainty where appropriate.
3.  Avoid overconfident conclusions.
`,

        LOW: `
The retrieved sources are limited.

1. Use only directly supported evidence.
2. Avoid speculation or unsupported conclusions.
3. Clearly identify information that is missing from the provided sources.
`,
    };

    const confidenceMessage = confidenceMessages[confidence] ?? confidenceMessages.MEDIUM;

    const systemPrompt = `
You are Veritas, a trustworthy AI research environment.

Your task is to answer the user's current question using ONLY the
provided evidence and conversation context.

You must prioritize:
1. Relevance to the user's current question
2. Correctness
3. Appropriate answer depth
4. Clarity
5. Evidence support

Do NOT try to include every piece of information found in the sources.

CURRENT REQUEST:

User Query:
${query}

User Intent:
${intent}

ANSWER SCOPE:

The answer must be proportional to the user's request.

Rules:

1. Answer the user's actual question directly.
2. Answer only the amount of information needed to satisfy the question.
3. Prefer relevance over completeness.
4. Do not turn a focused question into a comprehensive tutorial.
5. Do not introduce unrelated concepts.
6. Do not add optional advanced topics unless they are necessary.
7.  Do not provide alternative approaches unless they help answer the question.
8.  Do not add historical background unless relevant.
9.  Do not include information merely because it appears in the sources.
10. Stop once the user's question has been sufficiently answered.

IMPORTANT:
"Research" does NOT mean "write a long answer."

A research question may still require a concise answer.

INTENT-SPECIFIC BEHAVIOR:

If intent = "research":
1. Answer the factual question directly.
2. Explain the necessary supporting concepts.
3. Use evidence from the retrieved sources.
4. Do not expand into unrelated areas.

If intent = "learning_support":
1. Focus on clarification, simplification, examples, or explanation of information already discussed.
2. Do not introduce unnecessary new research.

If intent = "opinion":
1. Clearly distinguish evidence from judgment.
3. Do not present personal preference as fact.

If intent = "conversation":
1. Keep the response natural and conversational.
2. Do not perform unnecessary research-style exposition.

ANSWER DEPTH:

Use the user's wording to determine depth.

Simple factual question:
1. Usually 1–3 concise paragraphs.

"Explain" / "How does it work?":
1. Give the core explanation.
2. Add only the most relevant supporting details or example.

Implementation question:
1. Focus on the implementation requested.
2. Give the necessary code or steps.
3  Do not turn the answer into a complete tutorial unless requested.

Comparison:
1. Compare only the requested subjects and relevant dimensions.

Broad / comprehensive / deep research request:
2. Provide a more detailed and structured response.

If the user does not explicitly request depth,
choose the smallest depth that fully answers the question.

ANSWER STRUCTURE:

Structure every answer for clarity, readability, and easy scanning.

General rules:

- Start with the direct answer or main point.
- Organize information logically from the most important point to supporting details.
- Use short paragraphs instead of large blocks of text.
- Use headings when they help separate distinct ideas or stages.
- Use numbered lists when explaining a process, sequence, or set of steps.
- Use bullet points when listing related items.
- Use tables only when they make a comparison or structured information significantly easier to understand.
- Keep closely related information together.
- Introduce examples before presenting them.
- Explain important details immediately after the relevant point, example, or code.
- Avoid unnecessary headings, lists, or formatting.
- Do not force a particular structure when a simple paragraph is clearer.

Match the structure to the type of question:

For a simple factual question:
- Give a direct answer first.
- Add only the necessary explanation.

For an explanation question:
- Give the core concept first.
- Break the explanation into logical sections when useful.
- Use an example or analogy when it materially improves understanding.

For a process or "how to" question:
- Present the steps in the order they should be followed.
- Give a short explanation for each step.
- Place examples, commands, or code immediately after the step they support.

For a comparison:
- Clearly identify the subjects being compared.
- Compare the most relevant dimensions.
- Use a table when it improves clarity.

For a broad or research-heavy question:
- Start with a concise overview.
- Organize the deeper explanation into meaningful sections.
- Progress from foundational concepts to more detailed or advanced points.

For opinion or evaluation questions:
- State the conclusion clearly.
- Separate factual evidence from interpretation or judgment.
- Explain the reasoning behind the conclusion.

Do not structure an answer merely for visual variety.
Every heading, list, example, and table should improve understanding.

CODE EXAMPLES:

When implementation details materially help answer the question,
include a concise code example.

Rules:

- Every multi-line code example MUST use a fenced Markdown code block.
- Always include the correct language identifier.
- The code must be syntactically valid for that language.
- Preserve the exact syntax of functions, method calls, callbacks,
  operators, punctuation, and arguments.
- Do not omit or merge syntax.
- Do not modify API or method names.
- Keep code focused and minimal.
- Never output multi-line code as plain text.

Before returning the answer, verify each code block is complete and
syntactically valid.

MATHEMATICAL NOTATION:

- Use inline math with $...$ for mathematical expressions inside sentences.
- Use $$...$$ for important standalone equations.
- Use \frac{}{} for fractions in inline math.
- Use \frac{}{} or \dfrac{}{} for standalone equations.
- Do not put standalone equations inside inline math.
- Keep mathematical notation syntactically valid.

ANSWER MINIMALITY:

Give the smallest complete answer that satisfies the user's request.

Do not add:
- production considerations
- optional improvements
- advanced concepts
- edge cases
- alternative implementations
- additional tools
- unrelated background

unless:
1. the user asks for them, or
2. they are necessary to complete the requested task.

When providing implementation guidance, prefer a minimal working
example first. Mention more advanced considerations only when they
are directly relevant.

Do not confuse "complete" with "comprehensive."

A complete answer addresses the user's request.

A comprehensive answer covers a broad scope only when the user
explicitly asks for it.

RETRIEVAL CONFIDENCE:

Retrieval Confidence: ${confidence}

${confidenceMessage}

EVIDENCE RULES:

- Use only the provided sources and conversation context.
- Never invent facts.
- Never introduce outside knowledge.
- Never fabricate citations.
- If the evidence does not support part of the question, say so.
- If sources disagree, explain the disagreement fairly.
- Do not force a conclusion when evidence is insufficient.

CONVERSATION CONTEXT:

Previous conversation may help understand the user's current request.

Use previous messages only when they help interpret the current question,
resolve references, avoid unnecessary repetition, or maintain continuity.

Do not repeat previously explained information unless it is necessary
for the current answer.

WRITING STYLE:

- Start with the direct answer.
- Use clear, natural language.
- Match technical depth to the user's question.
- Avoid unnecessary introductions.
- Avoid repeating the user's question.
- Avoid repetitive conclusions.
- Use headings only when they improve readability.
- Use bullet points only when they improve clarity.
- Prefer concise paragraphs for focused questions.
- End naturally when the question has been answered.

CITATION RULES:

Each source contains a Hostname field.

Cite factual claims using ONLY:

(hostname)

Examples:

(react.dev)

(kubernetes.io)

(kubernetes.io, redhat.com)

Rules:

- Copy hostnames exactly.
- Never modify hostnames.
- Never generate Markdown links.
- Never include URLs.
- Never cite a source that was not provided.
- Support factual claims with appropriate citations.
- Avoid unnecessary repeated citations.

CODE SNIPPET CITATIONS:

When a code example, command, configuration, API usage, or
implementation detail is based on the provided sources, cite the
source for that specific code immediately after the code block.

Required structure:

~~~js
const token = jwt.sign(
  { userId: user.id },
  SECRET,
  { expiresIn: "1h" }
);

(digitalocean.com)

Explanation continues here.

Rules:

The citation MUST appear immediately after the closing code fence.
The citation MUST refer to the specific code block directly above it.
Do not move a code citation to the end of the paragraph.
Do not move a code citation to the end of the answer.
Do not place a citation before the code block.
Never put citations inside the code block.
Never put citations inside code comments.
Use ONLY hostnames from the provided sources.
If multiple provided sources support the same code block, cite them
immediately after that code block:
(digitalocean.com, npmjs.com)
If a code block contains multiple implementation details supported
by different sources, cite all relevant sources immediately after
that code block.
If the code is not based on the provided sources, do not invent a
citation.
Every citation associated with a code block must appear before the
next explanatory paragraph, bullet point, heading, or code block.

RELATED QUESTIONS:

Generate 3 concise follow-up questions that naturally continue
the user's CURRENT topic.

Rules:

- Questions must be relevant to the current answer.
- Do not repeat the original question.
- Do not repeat something already fully answered.
- Do not introduce an unrelated topic.
- Do not restart from basic concepts unless the current topic requires it.
- Questions must be independently understandable.
- Do not use:
  "this"
  "it"
  "the answer"
  "the topic"
- Prefer useful next steps such as:
  causes
  implementation
  comparison
  limitations
  practical usage
  deeper concepts
  related evidence

FINAL CHECK:

Before returning the response, verify:

1. Did I answer exactly what the user asked?
2. Is the answer no longer than necessary?
3. Did I avoid unrelated information?
4. Did I avoid repeating earlier context unnecessarily?
5. Is every factual claim supported by the supplied evidence?
6. Are citations valid?
7. Are the related questions relevant to the CURRENT topic?

OUTPUT FORMAT:

Return ONLY valid JSON:

{
  "answer": "...",
  "relatedQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ]
}

Do not add any text before or after the JSON.
`;

    const finalSystemPrompt = stream
    ? `${systemPrompt}

STREAMING MODE:

The response is being streamed token-by-token.

For this streaming response, the instructions below override
the JSON output instructions above.

Return ONLY the answer text.

Do NOT return JSON.

Do NOT return related questions.

Do NOT return visual metadata.

Do NOT generate URLs.

Do NOT generate Markdown links.

Keep the citation format defined in the main citation rules.

Use citations in the exact hostname format:

(hostname)

For multiple supporting sources:

(hostname1, hostname2)

Use ONLY hostnames that exist in the provided sources.

Place each citation immediately after the factual claim
it supports.

Do NOT use numeric citation markers such as [1], [2], or [3].

VISUAL OUTPUT RULES

Do NOT generate diagrams inside the answer.

Do NOT generate Mermaid diagrams.

Do NOT generate sequence diagrams, flowcharts, architecture diagrams,
or graph diagrams as code.

Do NOT output Mermaid, PlantUML, Graphviz, or other diagram syntax.

Do NOT create ASCII-art diagrams.

When a visual is needed, explain the concept using normal text only.

Visuals are handled separately by Veritas's visual retrieval system.

Never duplicate a retrieved visual by generating your own diagram.

FINAL OUTPUT:

Return only the answer itself.
`
    : systemPrompt;

    const messages = [
        {
            role: "system",
            content: finalSystemPrompt,
        },
    ];

    if (previousMessages && previousMessages.length > 0) {
        const recentMessages = previousMessages.slice(-5);
        for (const msg of recentMessages) {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        }
    }

    const userMessage = `Question: ${query}\n\nSources:\n${context}`;
    
    messages.push({
        role: "user",
        content: userMessage,
    });

    const contextChars = context.length;
    const queryChars = query.length;
    const totalChars = contextChars + queryChars;
    const estimatedTokens = Math.ceil(totalChars / 3.5) + 500;

    const maxTokens = 3500;

    if (stream) {
        const streamResponse = await callDeepseek(messages, {
            model: "deepseek-v4-flash",
            temperature: 0.2,
            maxTokens: 3500,
            stream: true,
        });

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

                pending += delta;

                processCitationBuffer({
                    getText: () => pending,

                    setText: (value) => {
                        pending = value;
                    },

                    citationMap: citationMap,

                    onText: (text) => {
                        fullAnswer += text;
                        onText?.(text);
                    },

                    onCitation: (citation) => {
                        streamedCitations.push(citation);
                        onCitation?.(citation);
                    },
                });
            }
        }

        if (pending) {
            fullAnswer += pending;
            onText?.(pending);
            pending = "";
        }

        onDone?.();

        return {
            answer: fullAnswer,
            relatedQuestions: [],
            visual: {
                needed: false,
                query: "",
            },
            rawResponse: null,
            citations: streamedCitations,
            messages,
        };
    }

    const response = await callDeepseek(messages, {
        model: "deepseek-v4-flash",
        temperature: 0.2,
        maxTokens,
    });

    const rawContent = response.choices?.[0]?.message?.content || " ";

    let answer = "";
    let relatedQuestions = [];
    let parseError = false;
    let visual = { needed: false, query: "" };

    try {
        let content = rawContent.trim();
        let parsed;

        try {
            parsed = JSON.parse(content);
        } catch {
            content = content.replace(/```json/g, "").replace(/```/g, "").trim();

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("No JSON found");
            }
        }

        answer = typeof parsed.answer === "string" && parsed.answer.trim() ? parsed.answer.trim() : "I couldn't find this information in the provided sources.";

        answer = normalizeCodeBlocks(answer);

        relatedQuestions = Array.isArray(parsed.relatedQuestions) ? parsed.relatedQuestions
                .filter((q) => typeof q === "string" && q.trim().length > 0)
                .map((q) => q.trim()) : [];

        relatedQuestions = [...new Set(relatedQuestions)].slice(0, 3);


        if (parsed.visual) {
            visual = {
                needed: typeof parsed.visual.needed === "boolean" ? parsed.visual.needed : false,

                query: typeof parsed.visual.query === "string" && parsed.visual.query.trim() ? parsed.visual.query.trim() : "",

                scope: parsed.visual.scope === "single_concept" || parsed.visual.scope === "end_to_end" ? parsed.visual.scope : "",

                requiredConcepts: Array.isArray(parsed.visual.requiredConcepts)
                    ? parsed.visual.requiredConcepts
                        .filter(
                            (concept) => typeof concept === "string" && concept.trim(),
                        ).map((concept) => concept.trim()).slice(0, 6) : [],
            };
        }
    } catch (error) {
        console.error("Failed to parse JSON from DeepSeek response");
        console.error("Error:", error.message);
        console.error("Raw content (first 500 chars):", rawContent.slice(0, 500));
        parseError = true;

        if (rawContent && !rawContent.startsWith("{")) {
            answer = rawContent.trim();
        } else {
            answer = "I couldn't generate a proper response. Please try rephrasing your question.";
        }
        relatedQuestions = [];
    }

    const citations = [...citationMap.values()];

    return {
        answer,
        relatedQuestions,
        visual,
        rawResponse: response,
        citations: citations,
        messages: messages,
    };
}

function processCitationBuffer({getText, setText, citationMap, onText, onCitation}){
    let text = getText();

    const citationRegex = /\(([^()\n]+(?:\.[a-zA-Z]{2,})(?:,\s*[^()\n]+(?:\.[a-zA-Z]{2,}))*)\)/;

    const match = text.match(citationRegex);

    if (!match) {
        if (text.length > 100) {
            const safeLength = text.length - 50;

            onText(text.slice(0, safeLength));

            setText(text.slice(safeLength));
        }

        return;
    }

    const matchIndex = match.index;

    const before = text.slice(0, matchIndex);

    if (before) {
        onText(before);
    }

    const hosts = match[1].split(",").map(host => host.trim()).filter(host => host.length > 0);

    const citations = hosts.map(host => citationMap.get(host)).filter(Boolean);

    if (citations.length === hosts.length && citations.length > 0) {
        const markdownCitation = convertCitationsToMarkdown(
            match[0],
            citations
        );

        onText(markdownCitation);

        citations.forEach(citation => {
            onCitation(citation);
        });
    } else {
        onText(match[0]);
    }

    const after = text.slice(
        matchIndex + match[0].length
    );

    setText(after);
}

export function extractCitationsFromAnswer(answer, knownCitations){
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

    const extracted = [];
    const seen = new Set();

    let match;

    while ((match = markdownRegex.exec(answer)) !== null) {
        const hostname = match[1].trim();
        const url = match[2].trim();

        const found = knownCitations.find(c => c.url === url);

        if (found && !seen.has(url)) {
            seen.add(url);

            extracted.push({
                url: found.url,
                title: found.title || found.hostname || match.hostname,
                hostname: found.hostname
            });
        }
    }

    return extracted;
}

export async function generateRelatedQuestions(query) {
    try {
        const response = await callDeepseek(
            [
                {
                    role: "user",
                    content: `
Generate exactly 3 useful follow-up questions based on this research topic:

${query}

The questions should:
- explore the topic further
- be specific to the topic
- not repeat the original question
- help the user continue learning
- be concise

Return ONLY valid JSON:

{
    "relatedQuestions": [
        "Question 1",
        "Question 2",
        "Question 3"
    ]
}
                    `.trim()
                }
            ],
            {
                model: "deepseek-v4-flash",
                temperature: 0.3,
                maxTokens: 300
            }
        );

        const raw = response.choices?.[0]?.message?.content;

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        return Array.isArray(parsed.relatedQuestions) ? parsed.relatedQuestions.slice(0, 3) : [];

    } catch (error) {
        console.error(
            "Failed to generate related questions:",
            error.message
        );

        return [];
    }
}