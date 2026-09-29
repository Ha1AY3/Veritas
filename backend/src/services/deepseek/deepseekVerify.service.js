import "dotenv/config";
import OpenAI from "openai";

const deepseek = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com"
});

export async function decideVisualNeed(userQuestion, conversationSummary = "", recentUserMessages = []){
    
    const recentContext = recentUserMessages.length > 0 ? recentUserMessages.join("\n") : "None";

    const prompt = `
You decide whether a web-sourced visual would materially improve a research answer.

Resolved user question:
${userQuestion}

Conversation summary:
${conversationSummary || "None"}

Recent user messages:
${recentContext}

Return needed=true ONLY when a visual would materially improve understanding.

Usually return false for:
- simple definitions
- simple factual questions
- casual questions
- opinion questions
- straightforward explanations

Usually return true for:
- architecture
- workflows
- pipelines
- lifecycles
- network flows
- system processes
- scientific mechanisms
- sequence diagrams
- technical relationships
- step-by-step processes where a visual clarifies the relationships between stages

When needed=true, determine the visual scope:

"single_concept":
Use when the question focuses mainly on one concept, mechanism,
component, relationship, or process.

"end_to_end":
Use when the question asks what happens across multiple stages,
such as a workflow, lifecycle, request flow, system process,
or beginning-to-end sequence.

Also identify the required concepts that the visual should directly
represent.

Rules for requiredConcepts:
- Extract them from the user's actual question.
- Include only concepts that materially matter to understanding the question.
- Prefer 3–6 concepts.
- Do not add unrelated concepts.
- For an end-to-end question, include the major stages that the visual
  should cover.
- For a single-concept question, include the key components or steps
  that should appear in the visual.

The visual search query must describe the EXACT visual needed,
not merely the general topic.

Examples:

"What is an API?"
=> {
  "needed": false,
  "visualType": "diagram",
  "query": "",
  "scope": "",
  "requiredConcepts": [],
  "reason": "A visual would not materially improve this simple definition."
}

"Explain how an API request flows from the browser to the server."
=> {
  "needed": true,
  "visualType": "sequence",
  "query": "browser to server API request response flow diagram",
  "scope": "end_to_end",
  "requiredConcepts": [
    "browser",
    "HTTP request",
    "server",
    "HTTP response"
  ],
  "reason": "The request-response flow is easier to understand visually."
}

"Explain the TCP three-way handshake."
=> {
  "needed": true,
  "visualType": "sequence",
  "query": "TCP three-way handshake SYN SYN-ACK ACK sequence diagram",
  "scope": "single_concept",
  "requiredConcepts": [
    "SYN",
    "SYN-ACK",
    "ACK",
    "client",
    "server"
  ],
  "reason": "The packet sequence is naturally represented as a diagram."
}

"Explain how HTTPS works when I open a website, including DNS, TCP, TLS, and HTTP."
=> {
  "needed": true,
  "visualType": "sequence",
  "query": "HTTPS browser request lifecycle DNS TCP TLS HTTP sequence diagram",
  "scope": "end_to_end",
  "requiredConcepts": [
    "DNS",
    "TCP",
    "TLS",
    "HTTP"
  ],
  "reason": "The question asks for an end-to-end sequence across multiple networking layers."
}

When uncertain, return false.

Return ONLY valid JSON:

{
  "needed": true,
  "visualType": "diagram",
  "query": "precise visual search query",
  "scope": "single_concept",
  "requiredConcepts": ["concept1", "concept2"],
  "reason": "brief explanation"
}
`;

    try {
        const response = await deepseek.chat.completions.create({
                model: "deepseek-v4-flash-vision-exp",

                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],

                response_format: {
                    type: "json_object"
                },

                temperature: 0
            });

        const raw = response.choices?.[0]?.message?.content;

        if (!raw) {
            return {
                needed: false,
                visualType: "",
                query: "",
                reason: "No visual decision returned."
            };
        }

        return JSON.parse(raw);

    } catch (error) {
        console.error(
            "DeepSeek visual decision failed:",
            error.message
        );

        return {
            needed: false,
            visualType: "",
            query: "",
            reason: "Visual decision failed."
        };
    }
}


export async function verifyVisualsWithDeepSeek(userQuestion, visualQuery, candidates, visualDecision){
    if (!candidates?.length) {
        return [];
    }

    async function prepareImage(candidate) {
        try {
            const response = await fetch(candidate.imageUrl, {
                signal: AbortSignal.timeout(10000),
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "image/jpeg,image/png,image/webp,image/gif"
                }
            });

            if (!response.ok) {
                console.log(`Failed to fetch image: ${response.status} ${candidate.imageUrl}`);
                return null;
            }

            const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();

            const supportedTypes = [
                "image/jpeg",
                "image/png",
                "image/webp",
                "image/gif"
            ];

            if (!supportedTypes.includes(contentType)) {
                console.log(`Skipping unsupported image: ${contentType}`);
                return null;
            }

            const buffer = Buffer.from(
                await response.arrayBuffer()
            );

            const base64 = buffer.toString("base64");

            return {
                ...candidate,
                deepSeekImageUrl: `data:${contentType};base64,${base64}`
            };

        } catch (error) {
            console.log(`Could not prepare image: ${candidate.imageUrl}`, error.message);

            return null;
        }
    }

    const preparedCandidates = (await Promise.all(
            candidates.map(prepareImage)
        )).filter(Boolean);

    if (!preparedCandidates.length) {
        return [];
    }

    const content = [
        {
            type: "text",
            text: `
You are selecting the best web-sourced visual for a research answer.

Your PRIMARY goal is not to find an image that is merely related to the topic.

Your PRIMARY goal is:

"Does this specific image directly help the user understand the exact concept, process, mechanism, relationship, or workflow asked in the USER QUESTION?"

USER QUESTION:
${userQuestion}

VISUAL SEARCH QUERY:
${visualQuery}

VISUAL SCOPE:
${visualDecision?.scope || "unknown"}

REQUIRED CONCEPTS:
${
    visualDecision?.requiredConcepts?.length ? visualDecision.requiredConcepts.join(", ") : "None specified"
}

Evaluate every candidate image independently.

SELECTION PRIORITY:

Rank candidates using this priority:

1. DIRECTLY ANSWERS THE USER QUESTION
2. Clearly explains the exact concept or process being asked about
3. Easy for a learner to understand
4. Technically accurate and visually meaningful
5. Relevant supporting detail

An image should receive a high score ONLY when the main visual content directly corresponds to the user's question.

Do NOT give a high score merely because:
- the image contains related keywords
- the image belongs to the same broad topic
- the image shows another part of the same system
- the image is technically sophisticated
- the image comes from an authoritative website

For example:

USER QUESTION:
"How does hybrid search combine vector and keyword retrieval in a RAG pipeline?"

A diagram showing:
User Query → Vector Search
User Query → Keyword/BM25 Search
        ↓
   Score Fusion
        ↓
    Top-k Results

is an excellent match.

A diagram showing:
Document Upload → Chunking → Embeddings → Vector Storage → BM25 Index

is only indirectly related because it explains document indexing rather than how hybrid retrieval combines the two search methods.

Therefore, the second image must score significantly higher.

VISUAL REQUIREMENTS:

The candidate must match the requested visual scope and required concepts.

If VISUAL SCOPE is "single_concept":
- Prefer an image that directly explains the requested concept,
  mechanism, relationship, or process.
- A broader diagram is acceptable only when the requested concept
  is clearly represented.

If VISUAL SCOPE is "end_to_end":
- Prefer an image that represents the complete workflow, lifecycle,
  or sequence requested by the user.
- The image should cover most of the REQUIRED CONCEPTS.
- Do not give a high score to an image that explains only one stage
  when the question asks for the full process.

REQUIRED CONCEPTS are important matching signals.

An image that is generally related to the topic but misses most of
the REQUIRED CONCEPTS should receive a low score.

For example:

USER QUESTION:
"Explain how HTTPS works when I open a website, including DNS,
TCP, TLS, and HTTP."

VISUAL SCOPE:
end_to_end

REQUIRED CONCEPTS:
DNS, TCP, TLS, HTTP

A TLS-only handshake diagram is related to the question, but it does
not cover the requested end-to-end process. It should therefore score
below a diagram showing DNS → TCP → TLS → HTTP.

PREFER:

Prefer:
- diagrams
- architecture diagrams
- workflow diagrams
- flowcharts
- sequence diagrams
- process diagrams
- system diagrams
- technical illustrations
- scientific figures
- explanatory infographics

Prefer visuals whose MAIN STRUCTURE matches the user's question.

For process questions, prefer visuals that show the actual steps and relationships.

For comparison questions, prefer visuals that directly compare the requested concepts.

For architecture questions, prefer visuals that show the requested components and their connections.

For mechanism questions, prefer visuals that show how the mechanism works.

REJECT:

Reject:
- logos
- avatars
- decorative images
- generic stock photos
- advertisements
- branding-only graphics
- unrelated screenshots
- charts that do not explain the requested concept
- images that are only loosely related to the topic
- diagrams explaining a different stage of the system
- overly generic diagrams when a more specific candidate exists

SCORING:

Use this scale:

9-10:
Directly explains the exact question and would substantially improve the user's understanding.

7-8:
Strongly relevant and useful, but missing some important aspect of the question.

5-6:
Related to the topic, but does not directly explain what the user asked.

3-4:
Weakly related or mostly indirect.

0-2:
Irrelevant, decorative, or unrelated.

IMPORTANT:
When assigning the score, consider all of the following:

1. Direct relevance to the exact user question
2. Coverage of REQUIRED CONCEPTS
3. Match with VISUAL SCOPE
4. Technical accuracy
5. Learner usefulness
6.Do NOT give 7+ simply because an image is about the same general subject.

A candidate that is technically related but answers a different question should usually score 5 or below when a more direct candidate exists.

OUTPUT:

For every candidate return:

- candidate number
- relevant true/false
- score from 0 to 10
- concise reason explaining how directly the image answers the user's question

Return ONLY valid JSON:

{
  "results": [
    {
      "candidate": 1,
      "relevant": true,
      "score": 9,
      "reason": "Directly shows the two retrieval paths and how their results are combined through score fusion."
    }
  ]
}
`.trim()
        }
    ];

    preparedCandidates.forEach((candidate, index) => {
        content.push({
            type: "text",
            text: `Candidate ${index + 1}: ${
                candidate.title || "Untitled image"
            }`
        });

        content.push({
            type: "image_url",
            image_url: {
                url: candidate.deepSeekImageUrl
            }
        });
    });

    try {
        const response = await deepseek.chat.completions.create({
                model: "deepseek-v4-flash-vision-exp",

                messages: [
                    {
                        role: "user",
                        content
                    }
                ],

                response_format: {
                    type: "json_object"
                },

                temperature: 0
            });

        const raw = response.choices?.[0]?.message?.content;

        if (!raw) {
            console.log("DeepSeek returned no verification result");
            return [];
        }

        const parsed = JSON.parse(raw);

        return parsed.results || [];

    } catch (error) {
        console.error("DeepSeek Vision verification failed:", error.message);

        return [];
    }
}