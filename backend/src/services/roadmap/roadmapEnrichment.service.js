import axios from "axios";
import { callDeepseek } from "../deepseek/deepseek.service.js";
import { getTutorialSources } from "../exa/exa.service.js";

const EXA_API_URL = "https://api.exa.ai/search";

const EXA_API_KEY = process.env.EXA_API_KEY;

function buildNodePath(nodes, nodeId) {

    const nodeMap = new Map(nodes.map(node => [
        node.id,
        node
    ])
    );

    const path = [];

    let currentNode = nodeMap.get(nodeId);

    while (currentNode) {

        path.unshift(currentNode.label);

        if (!currentNode.parentId) {
            break;
        }

        currentNode = nodeMap.get(currentNode.parentId);
    }


    return path;
}

async function generateNodeQuestions({ roadmapTitle, researchPath,nodeLabel}){

    const systemPrompt = `
You are Veritas, a trustworthy AI research environment.

Generate exactly 2 useful research questions for a selected
research roadmap node.

The questions must help the user explore the selected node further.

Use the roadmap context to understand what the node means.

Do not answer the questions.

CONTEXT:

Research Roadmap:
${roadmapTitle}

Research Path:
${researchPath.join(" → ")}

Selected Node:
${nodeLabel}

RULES:

- Generate exactly 2 questions.
- Questions must be directly related to the selected node.
- Questions should be useful for deeper research.
- Avoid generic questions.
- Do not repeat the node label unnecessarily.
- Do not introduce unrelated topics.
- Consider the parent topics when interpreting the selected node.

Return ONLY valid JSON:

{
  "questions": [
    "Question 1",
    "Question 2"
  ]
}
`;


    const response = await callDeepseek(
        [
            {
                role: "system",
                content: systemPrompt
            }
        ],
        {
            model: "deepseek-v4-flash",
            temperature: 0.2,
            maxTokens: 500,
            responseFormat: {
                type: "json_object"
            }
        }
    );


    const content = response.choices?.[0]?.message?.content || "";


    if (!content) {
        throw new Error("DeepSeek returned an empty node-question response");
    }


    let parsed;

    try {

        parsed = JSON.parse(content);

    } catch (error) {

        console.error("Failed to parse node questions:",content);

        throw new Error("DeepSeek returned invalid node-question JSON");

    }


    if(!Array.isArray(parsed.questions) || parsed.questions.length < 2){

        throw new Error("DeepSeek must return exactly 2 research questions");

    }


    return parsed.questions.slice(0, 2)
        .map(question => String(question).trim())
        .filter(Boolean);

}


async function searchExa({query, numResults = 5,includeDomains = []}){

    if (!EXA_API_KEY) {
        throw new Error("EXA_API_KEY is not configured");
    }


    const body = {query, numResults, type: "auto"};


    if (includeDomains.length) {
        body.includeDomains = includeDomains;
    }


    try {

        const response = await axios.post(
            EXA_API_URL,
            body,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": EXA_API_KEY
                }
            }
        );


        return response.data?.results || [];

    } catch (error) {

        console.error("Exa search error:",error.response?.data || error.message);

        throw error;

    }

}


function pickResource(results,sourceType){

    if (!results?.length) {
        return null;
    }


    const result = results.find(item =>
            item?.url &&
            item?.title
    );


    if (!result) {
        return null;
    }


    return {
        url: result.url,
        title: result.title,
        hostname: (() => {

            try {
                return new URL(result.url).hostname;
            } catch {
                return "";
            }

        })(),
        source_type: sourceType
    };

}

function pickYouTubeResource(results) {

    if (!results?.length) {
        return null;
    }

    const video = results.find(item => item?.videoId || item?.id?.videoId);

    if (!video) {
        return null;
    }


    const videoId = video.videoId || video.id.videoId;


    const title = video.title || video.snippet?.title || "YouTube Video";


    return {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        hostname: "youtube.com",
        source_type: "video"
    };
}


async function generateNodeResources({ roadmapTitle, researchPath, nodeLabel }) {

    const context =
        `
Research roadmap:
${roadmapTitle}

Research path:
${researchPath.join(" → ")}

Selected topic:
${nodeLabel}
`.trim();

    const documentationResults =
        await searchExa({
            query: `${context}

Find authoritative documentation or official technical guides
for this topic. Prefer primary or official documentation sources.`,
            numResults: 5
        });


    const videoResults = await getTutorialSources(
        `${roadmapTitle} ${researchPath.join(" ")} ${nodeLabel}`,
        1,
        `${roadmapTitle} ${researchPath.join(" ")} ${nodeLabel}`
    );

    const paperResults = await searchExa({
        query: `${context}

Find a research paper directly related to this topic.
Prefer scholarly sources and original research.`,
        numResults: 5,
        includeDomains: [
            "arxiv.org",
            "aclanthology.org",
            "openreview.net"
        ]
    });


    const documentation = pickResource(documentationResults, "documentation");
    const video = videoResults[0] || null;
    const researchPaper = pickResource(paperResults, "research_paper");
    const resources = [documentation, video, researchPaper].filter(Boolean);

    return resources;

}


export async function enrichResearchRoadmapNode({roadmap,nodeId}){

    if (!roadmap) {
        throw new Error("Roadmap is required");
    }


    const node = roadmap.nodes.find(
            item => item.id === nodeId
        );


    if (!node) {
        throw new Error("Roadmap node not found");
    }

    if (node.enrichmentStatus === "ready" && node.related_questions?.length && node.resources?.length){

        return {
            node,
            cached: true
        };

    }

    const researchPath = buildNodePath(roadmap.nodes, nodeId);

    const [questions,resources] = await Promise.all([

        generateNodeQuestions({
            roadmapTitle:roadmap.title,
            researchPath,
            nodeLabel: node.label

        }),

        generateNodeResources({
            roadmapTitle: roadmap.title,
            researchPath,
            nodeLabel: node.label

        })

    ]);

    if (resources.length < 3) {

        throw new Error("Could not find all required node resources" );

    }

    node.related_questions = questions;
    node.resources = resources;
    node.enrichmentStatus ="ready";


    return {node, cached: false};

}