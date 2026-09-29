import { callDeepseek } from "../deepseek/deepseek.service.js";

export async function generateResearchRoadmap(conversationSummary, researchHistory = []) {

    if ((!conversationSummary || !conversationSummary.trim()) && researchHistory.length === 0) {
        throw new Error("Conversation history is required to generate a research roadmap");
    }

    const historyContext = researchHistory
        .map((item, index) => {
            return `
Research Turn ${index + 1}

User Question:
${item.question || ""}

Answer Summary:
${item.answerSummary || "No answer summary available."}
`;
        }).join("\n");

    const systemPrompt = `
You are Veritas, a trustworthy AI research environment.

Your task is to generate a research roadmap for an entire conversation.

The roadmap must represent the subjects and concepts that were actually
explored throughout the conversation.

You are given:

1. The conversation summary
2. Every user question
3. The answer summary corresponding to each question

Use these to identify the major research areas, their subtopics,
and the relationships between them.

ROADMAP PURPOSE:

The roadmap is NOT a summary of the conversation.

It is a structured research map that shows how the explored concepts
are connected.

The roadmap should help the user understand:

- what they have already explored
- how the explored concepts are organized
- which concepts belong under larger subjects
- how topics relate to each other

STRUCTURE:

Create a research roadmap with a level of detail appropriate to
the breadth and depth of the conversation.

The number of nodes must NOT be fixed.

Determine the appropriate number of nodes by considering:

- how many distinct research areas were actually explored
- how deeply those areas were discussed
- whether multiple concepts can be meaningfully grouped together
- whether a concept is important enough to deserve its own node

A narrow conversation should produce a smaller roadmap.
A broad conversation may produce a larger roadmap.

HARD LIMITS:

- Minimum total nodes: 5
- Maximum total nodes: 15
- Exactly one root node.

Do not try to reach the maximum just because it is available.
Use only as many nodes as are genuinely useful for representing
the conversation.

The roadmap should be detailed enough to capture the important
research areas, but compact enough to remain readable and usable
as a visual mind map.

Use a hierarchy such as:

Root
 ├── Major Topic
 │    ├── Subtopic
 │    └── Subtopic
 ├── Major Topic
 │    ├── Subtopic
 │    └── Subtopic
 └── Major Topic

Maximum hierarchy depth:

root → branch → subtopic/concept

Do not create deeper levels.

Combine closely related concepts when they can reasonably be
represented by one node.

Create separate nodes when concepts represent meaningfully
different research areas.

The roadmap must reflect the actual conversation rather than
a generic roadmap for the subject.

NODE RULES:

Each node must have:

- id
- label
- type
- parentId

Allowed node types:

- root
- branch
- subtopic
- concept

Rules:

- Keep labels short.
- Prefer 1–5 words per label.
- Do not write paragraphs inside nodes.
- Do not duplicate concepts.
- Do not create nodes for conversational filler.
- Do not create nodes for greetings or unrelated casual messages.
- Do not invent major topics that were never discussed.
- Do not force every user question into a separate node.
- Combine closely related questions under the same concept when appropriate.
- Do not create unnecessary intermediate nodes.
- Do not split one concept into multiple nodes merely to increase detail.
- Do not create nodes solely for papers, videos, documentation,resources, or resource requests.
- Resources will be attached later when the user clicks a node.

EVIDENCE / ACCURACY:

The roadmap must be grounded ONLY in the supplied conversation data.

Do not introduce new research topics simply because they are related
to the subject.

Do not assume that a topic was studied if it was not discussed.

The roadmap represents the conversation's research journey.

FINAL GRANULARITY CHECK:

Before returning the JSON, review the entire roadmap as a whole.

Ask:

1. Does every node represent a meaningful research area?
2. Can any closely related nodes be combined?
3. Would removing a node lose an important part of the research?
4. Is the roadmap unnecessarily detailed?
5. Is the roadmap too broad and missing important areas?
6. Is the total node count between 10 and 30?

Adjust the structure before returning the final JSON.

The final roadmap MUST contain at least 10 nodes
and MUST NOT contain more than 30 nodes.

OUTPUT:

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "Short roadmap title",
  "nodes": [
    {
      "id": "root",
      "label": "Main Topic",
      "type": "root",
      "parentId": null
    },
    {
      "id": "node-1",
      "label": "Major Topic",
      "type": "branch",
      "parentId": "root"
    }
  ]
}

Do NOT return edges.

Edges will be generated by the application from parentId.

Do NOT return:

- explanations
- Markdown
- code fences
- related questions
- resources
- URLs
- coordinates
- x/y positions
- Mermaid
- diagrams

CONVERSATION:

Conversation Summary:
${conversationSummary || "None"}

${historyContext}
`;

    const messages = [
        {
            role: "system",
            content: systemPrompt
        }
    ];

    try {

        const response = await callDeepseek(messages, {
            model: "deepseek-v4-flash",
            temperature: 0.2,
            maxTokens: 1800,
            responseFormat: {
                type: "json_object"
            }
        });

        const rawContent = response.choices?.[0]?.message?.content || "";

        if (!rawContent) {
            throw new Error("DeepSeek returned an empty roadmap response");
        }

        let parsed;

        try {
            parsed = JSON.parse(rawContent);
        } catch (error) {
            console.error("Failed to parse roadmap JSON:", error.message);
            console.error("Raw roadmap response:", rawContent);
            throw new Error("DeepSeek returned invalid roadmap JSON");
        }

        const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "Research Roadmap";

        if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
            throw new Error("Roadmap must contain at least one node");
        }

        const allowedTypes = new Set([
            "root",
            "branch",
            "subtopic",
            "concept"
        ]);

        const seenIds = new Set();

        const nodes = parsed.nodes.filter(node => {
                if (!node || typeof node.id !== "string" || typeof node.label !== "string") {
                    return false;
                }

                if (seenIds.has(node.id)) {
                    return false;
                }

                seenIds.add(node.id);

                return true;
            })
            .map(node => ({
                id: node.id.trim(),
                label: node.label.trim().slice(0, 100),
                type: allowedTypes.has(node.type) ? node.type : "concept",
                parentId: typeof node.parentId === "string" && node.parentId.trim() ? node.parentId.trim() : null,
                related_questions: [],
                resources: [],
                enrichmentStatus: "not_loaded"
            }));

        const rootNodes = nodes.filter(node => node.type === "root");

        if (rootNodes.length !== 1) {
            throw new Error("Roadmap must contain exactly one root node");
        }

        const nodeIds = new Set(
            nodes.map(node => node.id)
        );

        nodes.forEach(node => {
            if (node.parentId && !nodeIds.has(node.parentId)) {
                node.parentId = "root";
            }
        });

        const rootNode = rootNodes[0];
        rootNode.parentId = null;

        const edges = nodes.filter(node => node.parentId)
            .map(node => ({
                id: `edge-${node.parentId}-${node.id}`,
                source: node.parentId,
                target: node.id
            }));

        return { title, nodes, edges };

    } catch (error) {

        console.error("Research roadmap generation failed:", error.message);

        throw error;
    }
}