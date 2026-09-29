import { extractPageImages } from "./pageImageExtracter.service.js";


const BLOCKED_TERMS = [
    "logo",
    "avatar",
    "icon",
    "favicon",
    "profile",
    "thumbnail",
    "placeholder",
    "loading",
    "spinner",
    "banner",
    "advertisement",
    "social-preview",
    "open-graph",
    "og-image",
    "twitter-card"
];

const VISUAL_KEYWORDS = [
    "diagram",
    "architecture",
    "workflow",
    "flowchart",
    "pipeline",
    "process",
    "lifecycle",
    "structure",
    "schema",
    "visualization",
    "infographic",
    "map",
    "figure"
];

export async function collectVisualCandidates(sourcePages, visualQuery){

    if (!Array.isArray(sourcePages)) {
        return [];
    }
    const pageImages = await Promise.all(sourcePages.slice(0, 10).map(page => extractPageImages(page.url)));
    const allImages = pageImages.flat();

    const unique = [];

    const seen = new Set();

    for (const image of allImages) {

        if (!image?.imageUrl) {
            continue;
        }

        if(seen.has(image.imageUrl)){
            continue;
        }

        seen.add(image.imageUrl);

        unique.push(image);
    }

    const queryTerms = tokenize(visualQuery);

    const scored = unique.filter(isUsableImage)
            .map(image => {

                let score = 0;

                const text = `
                    ${image.title || ""}
                    ${image.alt || ""}
                    ${image.nearbyText || ""}
                `.toLowerCase();

                for(const keyword of VISUAL_KEYWORDS){
                    if(text.includes(keyword)){
                        score += 5;
                    }
                }
                
                for(const term of queryTerms){
                    if(text.includes(term)){
                        score += 3;
                    }
                }

                if(image.width >= 800 && image.height >= 600){
                    score += 5;
                }

                return {
                    ...image,
                    candidateScore: score
                };
            }).sort((a, b) => b.candidateScore - a.candidateScore);

    return scored.slice(0, 10);
}

function isUsableImage(image) {

    const text = ` ${image.imageUrl || ""} ${image.title || ""} ${image.alt || ""}`.toLowerCase();

    return !BLOCKED_TERMS.some(
        term => text.includes(term)
    );
}

function tokenize(text = "") {

    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter(
            word => word.length > 2
        );
}