import { formatResourceTitle } from "../../utils/mergeResults.js";

export function detectResourceFilter(message) {
    const msg = message.toLowerCase().trim();

    function containsAny(msg, keywords) {
        return keywords.some(keyword =>
            msg.includes(keyword.toLowerCase())
        );
    }

    const documentationKeywords = [
        "documentation",
        "docs",
        "official docs",
        "official documentation",
        "api docs",
        "api documentation",
        "api reference",
        "developer documentation",
        "developer docs"

    ];

    if (containsAny(msg, documentationKeywords)) {
        return { type: "documentation" };
    }

    const videoKeywords = [
        "video",
        "videos",
        "youtube",
        "tutorial",
        "tutorials",
        "playlist",
        "course",
        "watch"

    ];

    if (containsAny(msg, videoKeywords)) {
        return { type: "video" };
    }

    const paperKeywords = [
        "research paper",
        "research papers",
        "academic paper",
        "academic papers",
        "journal",
        "journal article",
        "paper",
        "papers",
        "publication",
        "publications"

    ];

    if (containsAny(msg, paperKeywords)) {
        return { type: "research_paper" };
    }

    return { type: "all" };
}

export function rankResources(resources = []) {

    if (!Array.isArray(resources)) {
        return [];
    }

    const seenUrls = new Set();
    const seenTitles = new Set();

    const cleaned = [];

    for (const resource of resources) {

        if (!resource?.url) continue;

        const url = resource.url.trim();

        const hostname = (resource.hostname || new URL(url).hostname.replace("www.", "")).toLowerCase();

        const title = (resource.title || "").trim();

        if (!title) continue;

        if (seenUrls.has(url)) continue;

        seenUrls.add(url);

        const normalizedTitle = title.toLowerCase();

        if (seenTitles.has(normalizedTitle)) continue;

        seenTitles.add(normalizedTitle);

        const genericTitles = [
            "home",
            "homepage",
            "documentation",
            hostname,
            hostname.replace(".com", ""),
            hostname.replace(".org", ""),
            hostname.replace(".dev", "")
        ];

        if (genericTitles.includes(normalizedTitle)) {
            continue;
        }

        cleaned.push({
            ...resource,
            hostname
        });
    }

    cleaned.sort((a, b) => {

        const score = (item) => {

            let score = 0;

            score += Math.min(item.title.length, 60);

            if (item.hostname.includes("react.dev")) score += 15;
            if (item.hostname.includes("docs.")) score += 10;
            if (item.hostname.includes("developer.")) score += 10;
            if (item.hostname.includes("official")) score += 10;

            if (item.url.endsWith("/")) score -= 5;

            return score;
        };

        return score(b) - score(a);
    });

    return cleaned;
}

function formatDocumentation(sources) {

    return sources.map(source => ({
        title: source.title || source.hostname || "Documentation",
        displayTitle: formatResourceTitle({ 
            title: source.title || source.hostname || "Documentation", 
            source_type: "documentation"}),
        url: source.url,
        hostname: source.hostname,
        source_type: "documentation"
    }));

}

function formatVideos(sources) {

    return sources.map(source => ({
        title: source.title || source.hostname || "Video",
        displayTitle: formatResourceTitle({ 
            title:source.title || source.hostname || "Video" , 
            source_type: "video"}),
        url: source.url,
        hostname: source.hostname,
        source_type: "video"
    }));

}

function formatResearchPapers(sources) {

    return sources.map(source => ({
        title: source.title || source.hostname || "Research Paper",
        displayTitle: formatResourceTitle({ 
            title: source.title || source.hostname || "Research Paper", 
            source_type: "research_paper" }),
        url: source.url,
        hostname: source.hostname,
        source_type: "research_paper"
    }));

}

export function formatResources(sources, resourceFilter) {

    const rankedSources = rankResources(sources);

    switch (resourceFilter.type) {

        case "documentation":
            return formatDocumentation(rankedSources);

        case "video":
            return formatVideos(rankedSources);

        case "research_paper":
            return formatResearchPapers(rankedSources);

        default:
            return null;
    }

}