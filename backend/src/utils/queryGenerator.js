import { callDeepseek } from "../services/deepseek/deepseek.service.js";

const STOP_WORDS = [
    'what', 'is', 'the', 'of', 'to', 'for', 'on', 'with', 'at', 'by', 'from',
    'up', 'about', 'into', 'through', 'during', 'including', 'etc',
    'how', 'when', 'where', 'which', 'can', 'does', 'will', 'would', 'should',
    'could', 'may', 'might', 'has', 'have', 'had', 'was', 'were', 'been',
    'being', 'am', 'are', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt',
    'havent', 'hadnt', 'doesnt', 'dont', 'didnt', 'wont', 'wouldnt', 'shouldnt',
    'couldnt', 'mustnt', 'lets', 'thats', 'whos', 'whats', 'heres', 'theres'
];

const ALLOWED_TOPICS = new Set([
    'programming', 'medical', 'history', 'science', 'general'
]);

function getFallbackQueries(query, resourceFilter) {
    switch (resourceFilter.type) {

        case "documentation":
            return [
                `${query} documentation`,
                `${query} official docs`,
                `${query} api reference`
            ];

        case "video":
            return [
                `${query} tutorial`,
                `${query} youtube tutorial`,
                `${query} course`
            ];

        case "research_paper":
            return [
                `${query} research paper`,
                `${query} academic paper`,
                `${query} arxiv`
            ];

        default:
            return [
                query,
                `${query} overview`,
                `${query} documentation`
            ];
    }
}

export async function generateQueries(standaloneQuery, conversationSummary, previousUserMessages, resourceFilter) {
    let resourceInstruction = "";

    switch (resourceFilter.type) {

        case "documentation":
            resourceInstruction = `
The user explicitly wants DOCUMENTATION.

Generate search queries that prioritize:
- Official documentation
- Official API references
- Developer documentation
- Official guides

Do NOT generate tutorial queries.
Do NOT generate research paper queries.
`;
            break;

        case "video":
            resourceInstruction = `
The user explicitly wants VIDEOS.

Generate search queries that prioritize:
- YouTube tutorials
- Video courses
- Walkthroughs
- Educational videos

Do NOT generate documentation queries.
Do NOT generate research paper queries.
`;
            break;

        case "research_paper":
            resourceInstruction = `
The user explicitly wants RESEARCH PAPERS.

Generate search queries that prioritize:
- Academic papers
- Scholarly articles
- arXiv papers
- Journal publications

Do NOT generate documentation queries.
Do NOT generate tutorial queries.
`;
            break;

        default:
            resourceInstruction = `
The user did not request a specific resource type.

Generate diverse search queries covering:
- Official documentation
- General web resources
- Educational material

Prioritize relevance to the user's exact question over breadth.
Do not broaden the query into adjacent topics unless they are necessary
to answer the question.
`;
    }


    const prompt = `
You generate search queries for a research assistant.

Conversation Summary:
${conversationSummary || 'No previous context.'}

Previous User Messages:
${previousUserMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

Current Query:
${standaloneQuery}

${resourceInstruction}
Generate 3 search queries that retrieve only the information necessary
to answer the current user question.

Return ONLY valid JSON:
{
  "retrieval": {
    "queries": [
      "exact user wording",
      "common terminology",
      "academic terminology"
    ]
  },
  "video": {
    "query": "shortest natural search query for educational videos",
    "topic": "programming | medical | history | science | general"
  }
}

Rules:

- Preserve the user's intent.
- Do NOT broaden or narrow the scope.
- The three queries should be different.
- Prefer official terminology.
- Topic must be one of:
  programming
  medical
  history
  science
  general

Return JSON only.
`;

    try {
        const response = await callDeepseek([
            { role: "system", content: "You are a deterministic JSON generator." },
            { role: "user", content: prompt }
        ], {
            model: "deepseek-v4-flash",
            temperature: 0.0,
            maxTokens: 400
        });

        let content = response.choices[0].message.content.trim();

        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch {
            content = content.replace(/```json/g, "").replace(/```/g, "").trim();

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error("No JSON found");
            }
            parsed = JSON.parse(jsonMatch[0]);
        }

        const retrievalQueries = parsed.retrieval?.queries;
        if (!Array.isArray(retrievalQueries) || retrievalQueries.length !== 3) {
            throw new Error("Invalid retrieval queries");
        }

        const cleanedQueries = retrievalQueries.map(q =>
            typeof q === 'string' ? q.trim() : ''
        );
        if (cleanedQueries.some(q => q.length === 0)) {
            throw new Error("Empty retrieval query");
        }

        const uniqueQueries = new Set(cleanedQueries);
        if (uniqueQueries.size < 2) {
            throw new Error("Retrieval queries are not diverse enough");
        }

        const topic = parsed.video?.topic || 'general';
        if (!ALLOWED_TOPICS.has(topic)) {
            throw new Error(`Invalid topic: ${topic}`);
        }

        const videoQuery = typeof parsed.video?.query === "string" && parsed.video.query.trim()
                ? parsed.video.query.trim()
                : standaloneQuery;

        return {
            retrieval: {
                queries: cleanedQueries
            },
            video: {
                query: videoQuery,
                topic: topic
            }
        };

    } catch (error) {
        console.error("Query generation failed:", error.message);

        const fallbackQueries = getFallbackQueries(standaloneQuery, resourceFilter);
        return {
            retrieval: {
                queries: fallbackQueries
            },
            video: {
                query: standaloneQuery,
                topic: "general"
            }
        };
    }
}