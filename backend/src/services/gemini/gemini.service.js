import "dotenv/config"
import axios from "axios";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
const API_KEY = process.env.GEMINI_API_KEY;

async function retryWithBackoff(fn, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            const status = error.response?.status;
            if ((status === 503 || status === 429) && attempt < maxRetries - 1) {
                const waitTime = Math.min(1000 * Math.pow(2, attempt), 4000);
                console.log(`⏳ Gemini busy. Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            } else {
                throw error;
            }
        }
    }
    throw new Error("Max retries exceeded for Gemini API");
}


export async function analyzeImage(imageBase64, userQuestion = ""){
    if(!imageBase64){
        throw new Error("Image is required for analysis");
    }

    let rawBase64 = imageBase64;
    if (imageBase64.startsWith('data:image')) {
        rawBase64 = imageBase64.split(',')[1];
    }

    const mimeMatch = imageBase64.match(/^data:(image\/[^;]+);base64,/);

    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const prompt = `
    You are helping Veritas, a trustworthy AI research assistant.

The user asked:
"${userQuestion}"

Analyze the uploaded image.

Return ONLY valid JSON.

{
    "subject": "",
    "entities": [],
    "keywords": [],
    "visibleText": [],
    "searchQuery": "",
    "needsResearch": false
}

Rules:

1. subject
- Describe the main subject of the image.
- Focus on what is visibly present.
- Do not invent details.

2. entities
- Important people
- Organizations
- Places
- Products
- Books
- Landmarks
- Other identifiable entities visible in the image

3. keywords
- 5-10 important visual keywords.

4. visibleText
- Copy every visible line exactly as it appears.
- Do NOT fix spelling.
- Do NOT improve grammar.
- Preserve the visible text faithfully.

5. needsResearch

Determine whether answering the user's question requires external factual information or verification.

Set needsResearch = false when:
- The question can be answered reliably from what is visibly shown in the image.
- The user only wants a visual description.
- The user asks about visible objects, colors, layout, appearance, or visible text.
- The user asks what is shown on the screen without asking for external information.

Set needsResearch = true when:
- The image contains a recognizable landmark, monument, building, artwork, historical site, public figure, branded product, company, technical device, document, or other identifiable entity AND the user is asking about its identity or factual background.
- The user asks "what is this?" and identifying the specific entity requires external verification.
- The user asks about the history, background, significance, creator, usage, technical details, specifications, or other facts not contained in the image.
- The user asks to verify or investigate something shown in the image.
- The user asks for current information, sources, documentation, or research papers.
- The user asks about a website, application, product, error, technical interface, or software shown in the image and answering requires information beyond what is visibly displayed.
- The user asks how to fix, use, configure, or understand something technical shown in the image.

Examples:

Image: cat
Question: "What is this?"
→ needsResearch = false

Image: Taj Mahal
Question: "What is this?"
→ needsResearch = true

Image: Eiffel Tower
Question: "What building is this?"
→ needsResearch = true

Image: ordinary chair
Question: "What is this?"
→ needsResearch = false

Image: medicine package
Question: "What is this medicine used for?"
→ needsResearch = true

Image: website screenshot
Question: "What is shown on this screen?"
→ needsResearch = false

Image: website screenshot
Question: "What website is this?"
→ needsResearch = true

Image: website screenshot
Question: "What does this error mean?"
→ needsResearch = true

Image: website screenshot
Question: "How do I fix this?"
→ needsResearch = true

IMPORTANT:
Do not decide needsResearch based only on the image.
Use BOTH:
1. What is visible in the image.
2. What the user is asking about it.

If the question can be answered from visual evidence alone, prefer false.
If external factual knowledge or verification is needed, use true.

6. searchQuery

- Generate ONE concise web search query only when needsResearch is true.
- Include the user's question and the relevant image subject/entity.
- Make the query suitable for web search.
- Do not generate a research query when needsResearch is false.
- When needsResearch is false, return an empty string.

Return JSON only.
Do NOT wrap it inside Markdown.
Do NOT use json fences.
Do NOT include explanations before or after the JSON.
`;

    const makeRequest = async () => {
        const response = await axios.post(`${GEMINI_API_URL}?key=${API_KEY}`, {
            contents:[{
                parts: [{
                    text: prompt
                }, {
                    inline_data: {
                        mime_type: mimeType,
                        data: rawBase64
                    }
                }]
            }]
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });

        const raw =  response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        try{
            const jsonMatch = raw.match(/\{[\s\S]*\}/);

            if (!jsonMatch) {
                throw new Error("JSON not found");
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                subject: parsed.subject?.trim() || "",
                entities: Array.isArray(parsed.entities) ? parsed.entities : [],
                keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
                visibleText: Array.isArray(parsed.visibleText) ? parsed.visibleText : [],
                searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery.trim() : "",
                needsResearch: typeof parsed.needsResearch === "boolean" ? parsed.needsResearch : false
            };
        }catch(err){
            console.error("Gemini JSON Parse Error:", err.message);
            console.error(raw);

            return {
                subject: "",
                entities: [],
                keywords: [],
                visibleText: [],
                searchQuery: "",
                needsResearch: false
            };

        }
    }

     return await retryWithBackoff(makeRequest);

}
