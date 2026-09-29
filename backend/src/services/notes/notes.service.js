import chatModel from "../../models/chat.model.js";
import messagesModel from "../../models/messages.model.js";
import { callDeepseek } from "../deepseek/deepseek.service.js";
import { getCombinedExploreMore } from "../exa/exa.service.js";


export async function getNotesSourceData(chatId, userId) {

    const chat = await chatModel.findOne({
        _id: chatId,
        userId
    }).lean();

    if (!chat) {
        throw new Error("Chat not found");
    }

    const messages = await messagesModel.find({
        chat_id: chatId
    }).sort({ createdAt: 1 }).lean();

    const userQuestions = messages
        .filter(message => message.role === "user")
        .map(message => message.content)
        .filter(Boolean);

    const answerSummaries = messages
        .filter(message => message.role === "assistant")
        .map(message => message.answer_summary)
        .filter(Boolean);

    const citations = [];
    const seenCitations = new Set();

    for (const message of messages) {

        if (message.role !== "assistant") {
            continue;
        }

        for (const citation of message.citations || []) {

            if (!citation.url) {
                continue;
            }

            if (seenCitations.has(citation.url)) {
                continue;
            }

            seenCitations.add(citation.url);

            citations.push({
                url: citation.url,
                title: citation.title || "",
                hostname: citation.hostname || ""
            });
        }
    }

    const exploreMore = [];
    const seenExploreMore = new Set();

    for (const message of messages) {

        if (message.role !== "assistant") {
            continue;
        }

        for (const resource of message.explore_more || []) {

            if (!resource.url) {
                continue;
            }

            if (seenExploreMore.has(resource.url)) {
                continue;
            }

            seenExploreMore.add(resource.url);

            exploreMore.push(resource);
        }
    }

    return {
        conversationSummary: chat.summary || "",
        userQuestions,
        answerSummaries,
        citations,
        exploreMore
    };
}

export async function generateNotesPlan(notesSourceData) {

    const { conversationSummary, userQuestions, answerSummaries, citations } = notesSourceData;

    if (!citations?.length) {
        throw new Error("No saved citations found for this conversation");
    }

    const formattedSources = citations.map((citation, index) => ({
        id: `source_${index + 1}`,
        title: citation.title,
        hostname: citation.hostname,
        url: citation.url
    }));

    const messages = [
        {
            role: "system",
            content: `
You are the planning stage of Veritas Notes.

Veritas creates trustworthy research notes from a user's conversation.

Your job is ONLY to create a notes plan.

The conversation summary, user questions, and answer summaries
describe what the user researched. They are CONTEXT ONLY.

They are NOT evidence and must NOT be used as factual sources.

The provided sources are the ONLY sources that may later be used
as evidence for the notes.

Rules:

1. Understand the overall research topic from the conversation.
2. Identify the major concepts actually explored by the user.
3. Organize them into a coherent set of notes sections.
4. Do not create unnecessary sections.
5. Do not introduce unrelated topics.
6. Every section must reference one or more source IDs from the provided source list.
7. NEVER invent a source ID.
8. NEVER invent a URL.
9. Do not write the actual notes content.
10. Return JSON only.

The response MUST follow this exact structure:

{
  "title": "A concise title for the research notes",
  "sections": [
    {
      "title": "Section title",
      "sourceIds": [
        "source_1",
        "source_2"
      ]
    }
  ]
}

Requirements:

- "title" is required.
- "sections" is required.
- Every section must have "title".
- Every section must have "sourceIds".
- "sourceIds" must be an array.
- Every source ID must exactly match one of the provided source IDs.
- Do not use "source_ids".
- Do not omit the top-level "title".
- Do not add any other top-level fields.

The final notes will later be written from the actual content
retrieved from these sources.
            `
        },
        {
            role: "user",
            content: JSON.stringify({
                conversationSummary,
                userQuestions,
                answerSummaries,
                availableSources: formattedSources
            })
        }
    ];

    const response = await callDeepseek(messages, {
        model: "deepseek-v4-flash",
        temperature: 0.2,
        maxTokens: 3000,
        stream: false,
        responseFormat: {
            type: "json_object"
        }
    }
    );

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("DeepSeek returned an empty notes plan");
    }

    let plan;

    try {
        plan = JSON.parse(content);

        if (!plan || typeof plan.title !== "string" || !Array.isArray(plan.sections)) {
            throw new Error("Invalid notes plan structure");
        }

        const validSourceIds = new Set(formattedSources.map(source => source.id));

        for (const section of plan.sections) {

            if (!section.title || !Array.isArray(section.sourceIds)) {
                throw new Error("Invalid notes section structure");
            }

            for (const sourceId of section.sourceIds) {

                if (!validSourceIds.has(sourceId)) {
                    throw new Error(`Invalid source ID returned: ${sourceId}`);
                }
            }
        }
    } catch (error) {
        console.error("Failed to parse notes plan:", content);
        console.error("Parse error:", error.message );
        console.error("Raw content:", JSON.stringify(content));

        throw new Error("Invalid JSON returned by notes planner");
    }

    return plan;
}

function extractKeywords(text = "") {
    const stopWords = new Set([
        "the", "and", "for", "with", "from", "that", "this", "into",
        "what", "when", "where", "which", "how", "why", "does", "are",
        "was", "were", "their", "they", "about", "your", "have", "has",
        "using", "used", "between", "through", "during", "into", "than",
        "then", "also", "only", "more", "less", "very", "such", "system"
    ]);

    return [...new Set(
        text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .map(word => word.trim())
            .filter(word => word.length >= 3)
            .filter(word => !stopWords.has(word))
    )];
}

function splitTextIntoChunks(text = "", maxChunkSize = 2500) {
    if (!text) return [];

    const normalizedText = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    if (!normalizedText) return [];

    const paragraphs = normalizedText.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);

    const chunks = [];
    let currentChunk = "";

    for (const paragraph of paragraphs) {

        if (!currentChunk) {
            if (paragraph.length <= maxChunkSize) {
                currentChunk = paragraph;
            } else {
                for (let i = 0; i < paragraph.length; i += maxChunkSize) {
                    chunks.push(
                        paragraph.slice(i, i + maxChunkSize).trim()
                    );
                }
            }

            continue;
        }

        const candidate = `${currentChunk}\n\n${paragraph}`;

        if (candidate.length <= maxChunkSize) {
            currentChunk = candidate;
        } else {
            chunks.push(currentChunk.trim());

            if (paragraph.length <= maxChunkSize) {
                currentChunk = paragraph;
            } else {
                for (let i = 0; i < paragraph.length; i += maxChunkSize) {
                    chunks.push(
                        paragraph.slice(i, i + maxChunkSize).trim()
                    );
                }

                currentChunk = "";
            }
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

function selectRelevantEvidence(text, sectionTitle, planTitle, maxChunks = 2, maxChunkSize = 1800){
    const chunks = splitTextIntoChunks(text, maxChunkSize);

    if (!chunks.length) {
        return [];
    }

    const keywords = extractKeywords(sectionTitle);

    if (!keywords.length) {
        return [];
    }

    const scoredChunks = chunks.map((chunk, index) => {
        const lowerChunk = chunk.toLowerCase();

        const matchedKeywords = keywords.filter(keyword =>
            new RegExp(`\\b${keyword}\\b`, "g").test(lowerChunk)
        );

        let score = 0;

        for (const keyword of matchedKeywords) {
            const matches = lowerChunk.match(
                new RegExp(`\\b${keyword}\\b`, "g")
            );

            if (matches) {
                score += matches.length;
            }
        }

        if (matchedKeywords.length >= 2) {
            score += matchedKeywords.length * 3;
        }

        return {
            chunk,
            index,
            score,
            matchedKeywords
        };
    });

    const relevantChunks = scoredChunks.filter(item =>
            item.score >= 2 &&
            item.matchedKeywords.length >= 1
        ).sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.index - b.index;
        }).slice(0, maxChunks);

    if (!relevantChunks.length) {
        return [];
    }

    return relevantChunks.sort((a, b) => a.index - b.index).map(item => item.chunk);
}

export async function generateNotesFromEvidence(plan, evidenceData, exaResponse) {

    if (!plan?.title || !Array.isArray(plan.sections)) {
        throw new Error("Invalid notes plan");
    }

    const results = exaResponse?.results || [];

    if (!results.length) {
        throw new Error("No evidence returned by Exa");
    }

    const sourceMap = new Map(evidenceData.sources.map(source => [
        source.sourceId,
        source
    ])
    );

    const exaMap = new Map(results.filter(result => result.url && result.text)
        .map(result => [
            result.url,
            result
        ])
    );

    const sectionsWithEvidence = [];
    const evidenceSources = new Map();

    for (const section of plan.sections) {

        const availableSourceIds = [];
        const sectionEvidence = [];

        for (const sourceId of section.sourceIds) {

            const savedSource = sourceMap.get(sourceId);

            if (!savedSource) {
                throw new Error(`Saved source not found: ${sourceId}`);
            }

            const retrievedSource = exaMap.get(savedSource.url);

            if (!retrievedSource) {
                continue;
            }

            const originalLength = retrievedSource.text.length;

            const selectedChunks = selectRelevantEvidence(
                retrievedSource.text,
                section.title,
                plan.title,
                4,
                1800
            );
            const selectedContent = selectedChunks.join("\n\n");

            const MAX_SECTION_SOURCE_CHARS = 5000;

            const limitedContent = selectedContent.slice(0, MAX_SECTION_SOURCE_CHARS);

            if (!selectedChunks.length) {
                continue;
            }

            availableSourceIds.push(sourceId);

            if (!evidenceSources.has(sourceId)) {
                evidenceSources.set(sourceId, {
                    sourceId,
                    url: savedSource.url,
                    title: savedSource.title,
                    hostname: savedSource.hostname,
                    originalLength
                });
            }

            sectionEvidence.push({
                sourceId,
                content: limitedContent
            });
        }

        sectionsWithEvidence.push({
            title: section.title,
            sourceIds: availableSourceIds,
            evidence: sectionEvidence
        });
    }

    const uniqueEvidenceSources = [...evidenceSources.values()];

    const totalSelectedEvidenceChars = sectionsWithEvidence.reduce(
        (total, section) => {
            return total + section.evidence.reduce(
                (sectionTotal, evidence) => {
                    return sectionTotal + evidence.content.length;
                },
                0
            );
        },
        0
    );


    const messages = [
        {
            role: "system",
            content: `
You are the evidence-grounded writing stage of Veritas Notes.

Your job is to transform supplied research evidence into
CLEAR, SIMPLE, STRUCTURED STUDY MATERIAL.

The final notes must help a learner UNDERSTAND the topic,
REMEMBER the important ideas, and REVISE them later.

These are STUDY NOTES, not documentation, not a source summary,
and not a condensed research article.

CORE PRINCIPLE:

Write as a good teacher explaining the topic to a learner.

The reader should finish a section understanding:

- What is the concept?
- Why does it matter?
- How does it work?
- What are the important ideas?
- What should I remember?

Prioritize UNDERSTANDING over COMPLETENESS.

Do not try to preserve every fact from the sources.

The purpose of the notes is to teach the most important ideas clearly,
not to document everything that exists.

INPUT STRUCTURE:

The input contains two separate parts:

1. "sources"
2. "sections"

"sources" contains evidence excerpts retrieved from the exact saved
citation URLs.

Each source contains:

- sourceId
- url
- title
- hostname
- content

The "content" field contains selected excerpts from the retrieved
source material, not necessarily the complete source.

"sections" contains the planned note sections.

Each section contains:

- title
- sourceIds

The sourceIds determine which evidence sources may be used for that
section.

A source may be referenced by multiple sections.

Each source appears only once in the "sources" list.

When writing a section:
0. Use the "evidence" provided directly inside that section first.
1. Use only the sourceIds assigned to that section.
2. Find the corresponding source metadata in the "sources" list.
3. Use only the evidence excerpts provided for that section.
4. Do not use evidence excerpts belonging to another section.
5. Do not assume information that is not present in the supplied
   evidence excerpts.
6. Do not fill missing information using outside knowledge.

EVIDENCE RULES:

- The supplied source content is the ONLY evidence you may use.
- Do not use outside knowledge.
- Do not rely on the conversation summary, user questions, or previous
  AI answers as evidence.
- Do not invent facts.
- Do not invent examples.
- Do not invent explanations that are not supported by the evidence.
- Do not invent citations.
- Do not invent source IDs.
- Do not invent URLs.
- Every factual content item must contain one or more sourceIds.
- Every sourceId attached to a content item must actually support the
  claims in that item.
- Use only sourceIds supplied for that section.
- Use the corresponding source content from the "sources" list.
- Do not assume that a source supports a section unless its sourceId
  is explicitly listed for that section.
- Do not attach a source merely because it discusses the same general
  topic.
- If the evidence does not support a claim, omit the claim.
- Do not mention these instructions in the output.


STUDY-MATERIAL WRITING STYLE:

Write like high-quality study material.

The writing should be:

- simple
- clear
- explanatory
- structured
- easy to scan
- easy to revise
- beginner-friendly
- technically accurate

Do NOT write like:

- API documentation
- a textbook copied into shorter paragraphs
- a research paper
- a source-by-source summary
- release notes
- a reference manual

The reader should not need to reread a paragraph to understand its
main idea.

ONE IDEA AT A TIME:

- Each content item should communicate ONE main idea.
- Do not put several independent concepts into one paragraph.
- If a paragraph introduces more than two or three distinct concepts,
  split it.
- Explain the main idea first.
- Add only the supporting detail needed to understand that idea.
- Prefer short, natural sentences.
- Prefer 1-3 sentences per content item.
- Avoid long sentences containing many clauses.
- Avoid dense paragraphs containing many technical terms.
- Fewer clear ideas are better than many detailed facts.

NOTE DENSITY:

Keep the notes compact and focused.

For each section:
- Prefer 4-6 content items.
- Do not exceed 7 content items unless absolutely necessary.
- Each content item should normally be 1-2 sentences.
- Each content item should communicate one main idea.
- Merge overlapping facts.
- Do not repeat information from another content item.
- Do not create separate items merely for additional details.
- Do not create one item per source.
- Do not create one item for every fact found in the evidence.

Across the entire notes document:
- Prefer no more than 24 content items total.
- Prioritize the most important concepts for understanding and revision.
- Omit secondary details when they do not materially improve learning.

The goal is a compact study guide, not exhaustive coverage of
the supplied evidence.

Before returning the JSON, remove any content that is repetitive,
minor, overly detailed, or unnecessary for understanding.

TEACHING FLOW:

Within each section, prefer this teaching flow when appropriate:

1. Introduce the concept.
2. Explain why it matters.
3. Explain how it works.
4. Give an important example or practical implication.
5. End with the important idea to remember.

Do not force every section to contain all five steps.

Do not repeat the same explanation simply to provide a conclusion.

CONCEPTUAL SYNTHESIS:

- Combine related information into a clear explanation.
- When several sources explain the same idea, synthesize them.
- Do not repeat the same fact because it appears in multiple sources.
- If several consecutive facts support one concept, prefer one coherent
  content item.
- If two content items explain essentially the same idea, merge them.
- Create a new content item only when it introduces a genuinely different
  concept, mechanism, example, comparison, or practical implication.
- Do not create one content item per source.
- Do not create one content item per sentence from the source.
- Do not create one content item per API.
- Do not create one content item merely because the source changed.

WHAT TO INCLUDE:

Prioritize:

1. Core concepts
2. Definitions
3. Purpose and motivation
4. Important relationships between concepts
5. How a process works
6. Important mechanisms
7. Short useful examples
8. Practical implications
9. Important formulas or code when they improve understanding

Prefer explaining relationships such as:

problem → solution

input → process → output

concept → purpose → behavior

rather than listing disconnected facts.

WHAT TO OMIT:

Omit information when it does not materially improve understanding.

Usually omit:

- minor API options
- exhaustive configuration fields
- version-specific details
- package history
- rare edge cases
- internal implementation details
- repeated definitions
- source metadata
- low-value technical trivia
- details that are only useful when reading documentation

Do not include a detail merely because it appeared in the source.

When choosing between a complete explanation and an easier-to-understand
explanation, prefer the easier-to-understand explanation unless important
accuracy would be lost.

TECHNICAL TOPICS:

Technical topics must remain accurate, but they should still read like
study material.

When introducing a technical concept:

1. Say what it does.
2. Say why it is useful.
3. Explain the important behavior.
4. Give a short example only when it improves understanding.

Do not explain every available API option.

For a collection of related APIs, prefer a compact study-style list:

\`configureStore\` — creates a Redux store with useful defaults.

\`createSlice\` — creates reducers and action creators for a feature.

\`createAsyncThunk\` — simplifies common async request logic.

Do not turn the section into API reference documentation.

PROGRAMMING CODE:

When referring to programming identifiers, functions, methods, packages,
commands, variables, filenames, or short code expressions, use Markdown
inline-code backticks.

Examples:

\`configureStore\`
\`createSlice\`
\`createAsyncThunk\`
\`@reduxjs/toolkit\`
\`npm install @reduxjs/toolkit\`

For useful multi-line code examples, use fenced code blocks.

Example:

\`\`\`js
const store = configureStore({
    reducer: rootReducer
});
\`\`\`

Code rules:

- Include code only when it materially improves understanding.
- Prefer short, meaningful examples.
- Preserve useful code when the supplied evidence contains it.
- Do not invent code.
- Do not reconstruct missing code.
- Do not reproduce large code listings unnecessarily.
- Never replace code with a placeholder.
- NEVER output the word "canvas".

MATHEMATICAL CONTENT:

Treat equations as important study material.

The supplied evidence may contain corrupted mathematical text caused by
PDF or webpage extraction.

Examples include:

"9G‚"
"9Gb"
"”t"
broken fractions
duplicated symbols
missing operators

NEVER copy corrupted mathematical strings into the notes.

- Use a clear representation when the same equation is explicitly and
  reliably represented elsewhere in the supplied evidence.
- If a reliable representation is not available, omit the equation.
- Never guess an equation.
- Never use outside knowledge to repair an equation.

Use ASCII-safe notation:

- \`v0\` for initial velocity
- \`x0\` for initial position
- \`v^2\` for squared velocity
- \`x^2\` for squared position
- \`a^2\` for squared acceleration
- \`1/2\` for one-half
- \`-\` for subtraction
- \`*\` for explicit multiplication
- \`sqrt(...)\` for square root

For short equations inside a sentence, use inline code:

\`v = v0 + at\`

For important standalone equations, use a math block:

\`\`\`math
v = v0 + at
\`\`\`

When several closely related equations belong to the same concept,
put them together in ONE math block.

Example:

\`\`\`math
x = x0 + v0t + (1/2)at^2
v = v0 + at
v^2 = v0^2 + 2a(x - x0)
x - x0 = (1/2)(v0 + v)t
\`\`\`

Do not create a separate math block for every equation.

When explaining a derivation, include only the important mathematical
steps needed for understanding.

Do not reproduce every intermediate algebraic manipulation.

ASCII-SAFE SYMBOLS:

The PDF renderer may not support all Unicode symbols.

Use plain ASCII symbols in normal explanatory text.

Use:
- -> for an arrow
- <-> for a two-way arrow
- => for implication
- <= for less than or equal to
- >= for greater than or equal to
- - for a simple dash or minus

Examples:

Prompt -> LLM -> Output parsing

Retriever -> Response synthesizer

Do not use decorative Unicode arrows or symbols in normal explanatory
text.

EXAMPLES AND PRACTICAL UNDERSTANDING:

Use examples when they make a concept easier to understand.

Prefer:

"Suppose a dragster starts from rest and accelerates at a constant rate.
The position equation can then be used to find how far it travels."

over reproducing a long worked example with every arithmetic step.

Only include numerical calculations when they materially help explain
the concept.

Do not invent examples that are not supported by the supplied evidence.

LISTS AND STRUCTURE:

Use short lists when they genuinely improve learning.

Use lists for things such as:

- characteristics
- steps in a process
- related concepts
- comparisons
- groups of APIs
- important points to remember

Do not turn normal explanatory paragraphs into long bullet lists.

Do not use a list merely because the source used one.

MEMORY AND REVISION:

The notes should be useful for revision.

Prioritize information that helps the learner remember:

- the central idea
- important relationships
- cause-and-effect
- differences between related concepts
- important formulas
- common patterns
- practical meaning

When a section naturally has a key takeaway, finish with a concise
statement of what the reader should remember.

Do not add a "Key Takeaway" to every section just for consistency.

CITATION GRANULARITY:

- Every factual content item must contain sourceIds.
- sourceIds must represent sources that actually support the content.
- Do not attach unrelated sources.
- When several related facts share the same evidence, combine them.
- When several consecutive facts have the same source or source set,
  prefer one synthesized content item.
- Do not split ideas into separate items merely to increase citation
  granularity.
- Do not repeat the same sourceId within one content item.

SECTION QUALITY CHECK:

Before returning the notes, mentally check each section:

- Does it explain the concept clearly?
- Is the main idea easy to identify?
- Is each content item focused on one idea?
- Could a beginner understand it without rereading it?
- Did I remove unnecessary technical details?
- Did I avoid documentation-style writing?
- Did I avoid repeating the same information?
- Are examples actually useful?
- Are equations accurate and readable?
- Does every factual item have the correct sourceIds?

Revise any section that feels like documentation rather than study
material.

RAW URLs:

- Do not write raw URLs in note text.
- Do not fabricate URLs.
- Do not manually create citation labels.
- Source links will be attached separately from sourceIds.

OUTPUT FORMAT:

Return JSON only.

Use exactly this structure:

{
  "title": "Notes title",
  "sections": [
    {
      "title": "Section title",
      "content": [
        {
          "text": "A clear study note.",
          "sourceIds": ["source_1"]
        }
      ]
    }
  ]
}

Requirements:

- "title" is required.
- "sections" is required.
- Every section must have "title".
- Every section must have "content".
- "content" must be an array.
- Every content item must have "text".
- Every content item must have "sourceIds".
- "sourceIds" must be an array.
- Use only sourceIds supplied for that section.
- Return valid JSON only.
`
        },
        {
            role: "user",
            content: JSON.stringify({
                title: plan.title,
                sources: uniqueEvidenceSources,
                sections: sectionsWithEvidence
            })
        }
    ];

    const response = await callDeepseek(messages, {
        model: "deepseek-v4-flash",
        temperature: 0.2,
        maxTokens: 6000,
        stream: false,
        responseFormat: {
            type: "json_object"
        }
    }
    );

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("DeepSeek returned empty notes");
    }

    let notes;

    try {

        notes = JSON.parse(content);

    } catch (error) {

        console.error("Failed to parse generated notes:", content);

        throw error;
    }

    if (!notes || typeof notes.title !== "string" || !Array.isArray(notes.sections)){
        throw new Error("Invalid generated notes structure");
    }

    if (notes.sections.length !== sectionsWithEvidence.length) {
        throw new Error("Generated notes section count does not match notes plan");
    }

    for(const section of notes.sections) {

        const plannedSection = sectionsWithEvidence.find(
            planned => planned.title === section.title
        );

        if (!plannedSection) {
            throw new Error(`Generated section not found in notes plan: ${section.title}`);
        }

        if (!Array.isArray(section.content)) {
            throw new Error(`Invalid content array for section: ${section.title}`);
        }

        const allowedSourceIds = new Set(evidenceData.sources.map(source => source.sourceId));

        for (const item of section.content) {

            if (!item.text || !Array.isArray(item.sourceIds)) {
                throw new Error("Invalid notes content item");
            }

            for (const sourceId of item.sourceIds) {

                if (!allowedSourceIds.has(sourceId)) {
                    throw new Error(`Invalid source ID in notes: ${sourceId}`);
                }

            }
        }
    }


    return notes;
}

export function attachCitationMetadata(notes, evidenceData) {

    if(!notes || !Array.isArray(notes.sections) || !evidenceData || !Array.isArray(evidenceData.sources)){
        throw new Error("Invalid notes or evidence data");
    }

    const sourceMap = new Map(evidenceData.sources.map(source => [
            source.sourceId,
            source
        ])
    );

    return {
        ...notes,

        sections: notes.sections.map(section => ({

            ...section,

            content: section.content.map(item => {

                const citations = item.sourceIds.map(sourceId => {

                    const source = sourceMap.get(sourceId);

                    if(!source){
                        throw new Error(`Citation source not found: ${sourceId}`);
                    }

                    return {
                        sourceId: source.sourceId,
                        title: source.title,
                        hostname: source.hostname,
                        url: source.url
                    };
                });

                return { ...item, citations};
            })
        }))
    };
}

export async function generateNotesFurtherReading(plan) {

    if (!plan?.title) {
        throw new Error("Invalid notes plan");
    }

    const furtherReading = await getCombinedExploreMore(plan.title, 5, plan.title, "general", "");

    return furtherReading.map(resource => ({
        url: resource.url,
        title: resource.title,
        displayTitle: resource.displayTitle,
        hostname: resource.hostname,
        source_type: resource.source_type === "reference" ? "documentation" : resource.source_type
    }));

    return furtherReading;
}