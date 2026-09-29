export function mergeAndDeduplicate(searchResults) {
    const seen = new Set();
    const merged = [];

    for (const result of searchResults) {
        for (const item of result.formatted || []) {
            if (!seen.has(item.url)) {
                seen.add(item.url);
                merged.push(item);
            }
        }
    }
    return merged;
}


export function formatResourceTitle({ title, source_type }) {
    if (!title) {
        return "Untitled Resource";
    }

    if (source_type === "documentation") {
        let cleaned = title
            .replace(/\.(md|mdx|txt|html?)$/i, "")
            .replace(/\.(md|mdx)\s*-\s*/i, " - ");

        cleaned = cleaned.replace(/\s*-\s*GitHub\s*$/i, "");

        if (cleaned.includes(" - ")) {
            const parts = cleaned.split(" - ");

            if (parts.length >= 2) {
                const fileName = parts[0].replace(/[-_]+/g, " ").trim();

                const repo = parts[1].replace(/[-_]+/g, " ").trim();

                return `${capitalizeWords(fileName)} — ${capitalizeWords(repo)} Documentation`;
            }
        }

        return capitalizeWords(
            cleaned.split("/").pop().replace(/[-_]+/g, " ")
        );
    }

    if (source_type === "video") {
        return title.replace(/\s*\|\s*(YouTube|YouTube Video)$/i, "").replace(/\s*-\s*YouTube$/i, "").trim();
    }

    if (source_type === "research_paper") {
        return title.replace(/\s*\|\s*(ResearchGate|ScienceDirect|Springer)$/i, "").trim();
    }

    if (source_type === "reference") {
        return title
            .replace(/selectfont.*?n:\s*/i, "")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    return title;
}

function capitalizeWords(text) {
    return text.replace(/\b\w/g, char => char.toUpperCase());
}