import { verifyVisualsWithDeepSeek } from "../deepseek/deepseekVerify.service.js";
import { exaSearch } from "../exa/exa.service.js";
import { collectVisualCandidates } from "./visualCandidate.service.js";

export async function retrieveVisual(userQuestion, visualQuery, visualDecision) {

    if (!visualQuery?.trim()) {
        return [];
    }

    try {
        const response = await exaSearch(visualQuery, {
            numResults: 10,
            type: "auto"
        }
        );

        const sourcePages = response.results || [];

        if (!sourcePages.length) {
            return [];
        }

        const candidates = await collectVisualCandidates(sourcePages, visualQuery);

        if (!candidates.length) {
            return [];
        }

        const verificationCandidates = candidates.filter(candidate => candidate.sourceUrl).slice(0, 10);

        const verificationResults = await verifyVisualsWithDeepSeek(userQuestion, visualQuery, verificationCandidates, visualDecision);

        const verifiedCandidates = verificationCandidates.map((candidate, index) => {
            const verification = verificationResults.find(result => result.candidate === index + 1);

            if (!verification) {
                return null;
            }

            return {
                ...candidate,
                verification
            };
        }).filter(Boolean);

        const maxVisuals = 1;

        const selected = verifiedCandidates.filter(candidate => candidate.verification.relevant === true && candidate.verification.score >= 7)
            .sort((a, b) => b.verification.score - a.verification.score)
            .slice(0, maxVisuals)
            .map(candidate => ({
                imageUrl: candidate.imageUrl,
                title: candidate.title || "Research Visual",
                sourceUrl: candidate.sourceUrl || "",
                hostname: candidate.hostname || "",
                sourceType: "diagram"
            }));

        return selected;

    } catch (error) {
        console.error("Visual retrieval failed:", error.message);
        return [];
    }
}

