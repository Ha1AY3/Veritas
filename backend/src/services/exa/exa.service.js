import "dotenv/config";
import axios from "axios";
import { searchYouTubeVideos } from "./youtube.service.js";
import { detectResourceFilter } from "./resourceFilter.service.js";
import { formatResourceTitle } from "../../utils/mergeResults.js";

const EXA_API_URL = "https://api.exa.ai/search";
const API_KEY = process.env.EXA_API_KEY;

export async function exaSearch(query, options = {}){
    if(!query){
        throw new Error("Query is required for exa search");
    }

    const {
        numResults = 20 , 
        highlights = true, 
        type = "auto", 
        category = null, 
        startPublishedDate = null, 
        includeDomains = null, 
        excludeDomains = null,
        extras = null ,
        outputSchema = null
    } = options;

    const contents = { highlights };

    if(extras){
        contents.extras = extras;
    }

    const payload = {query, numResults, type, contents};


    if(category){
        payload.category = category;
    }

    if(startPublishedDate){
        payload.startPublishedDate = startPublishedDate;
    }

    if(includeDomains){
        payload.includeDomains = includeDomains;
    }

    if(excludeDomains){
        payload.excludeDomains = excludeDomains;
    }

    if(outputSchema){
        payload.outputSchema = outputSchema;
    }

    try{
        const response = await axios.post(EXA_API_URL, payload, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            }
        })       

        return response.data;
    }catch(error){
        console.error("Exa Search API error:", error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        }
        throw error;
    }
}

export function formatExaResults(searchResponse){
    const results = searchResponse?.results || [];

    return results.map((result) => ({
        url: result.url || null,
        title: result.title || null,
        highlights: result.highlights || [],
        publishedDate: result.publishedDate || null,
        score: result.score || null,

        hostname: result.url ? new URL(result.url).hostname.replace("www.", "") : null,
        author: result.author || null,
        id: result.id || null
    }))
}

export async function retryWithBackoff(fn, maxRetries = 3) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.response?.status === 429;
            if (isRateLimit && attempt < maxRetries - 1) {
                const waitTime = Math.min(1000 * Math.pow(2, attempt), 8000);
                console.log(`Rate limited. Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            } else {
                throw error;
            }
        }
    }
    throw new Error("Max retries exceeded for Exa API");
}

export async function searchAndFormatExa(query, options = {}){
    const rawResponse = await retryWithBackoff(() => {
        return exaSearch(query, options);
    });

    const formattedResults = formatExaResults(rawResponse);

    return {
        raw: rawResponse,
        formatted: formattedResults,
        count: formattedResults.length,

        structured: {
            results: formattedResults.map((r) => ({
                url: r.url,
                title: r.title,
                content:  r.highlights?.join(" ") || "",

                metadata: {
                    hostname: r.hostname,
                    publishedDate: r.publishedDate,
                    score: r.score
                }
            }))
        }
    }
}

export async function getAuthoritativeSources(query, limit = 3) {

    const { formatted } = await searchAndFormatExa(query, {
        numResults: 10,
        type: "auto",
        highlights: true
    });

    function normalizeUrl(url = "") {
        return url
            .toLowerCase()
            .replace(/^https?:\/\//, "")
            .replace(/^www\./, "")
            .replace(/\/$/, "");
    }


    const scoreResult = (result) => {
        let score = result.score || 0;

        const hostname = (result.hostname || "").toLowerCase();
        const url = (result.url || "").toLowerCase();

        if (hostname.endsWith(".gov")) score += 5;
        if (hostname.endsWith(".edu")) score += 5;

        if (
            hostname.includes("doi.org") ||
            hostname.includes("arxiv.org") ||
            hostname.includes("ieee.org") ||
            hostname.includes("acm.org") ||
            hostname.includes("nature.com") ||
            hostname.includes("springer.com") ||
            hostname.includes("sciencedirect.com") ||
            hostname.includes("pubmed.ncbi.nlm.nih.gov")
        ) {
            score += 5;
        }

        if (
            hostname.startsWith("docs.") ||
            hostname.startsWith("developer.") ||
            url.includes("/docs") ||
            url.includes("/documentation") ||
            url.includes("/guide") ||
            url.includes("/manual") ||
            url.includes("/reference")
        ) {
            score += 4;
        }

        if (hostname.endsWith(".org")) score += 2;

        if (hostname.includes("wikipedia.org")) score += 2;

        if (url.startsWith("https://")) score += 1;

        if (
            hostname.includes("medium.com") ||
            hostname.includes("dev.to") ||
            hostname.includes("hashnode.") ||
            hostname.includes("substack.com")
        ) {
            score -= 2;
        }

        return score;
    };

    const scored = formatted.map(result => ({
        ...result,
        authorityScore: scoreResult(result)
    }));

    const seenUrls = new Set();

    const uniqueUrls = scored.filter(result => {
        const normalized = normalizeUrl(result.url);

        if (seenUrls.has(normalized)) {
            return false;
        }

        seenUrls.add(normalized);
        return true;
    });

    uniqueUrls.sort((a, b) => {
        if (b.authorityScore !== a.authorityScore) {
            return b.authorityScore - a.authorityScore;
        }

        return (b.score || 0) - (a.score || 0);
    });

    const seenHostnames = new Set();
    const diversified = [];

    for (const result of uniqueUrls) {
        const hostname = (result.hostname || "").toLowerCase();

        if (!hostname) {
            continue;
        }

        if (seenHostnames.has(hostname)) {
            continue;
        }

        diversified.push(result);
        seenHostnames.add(hostname);

        if (diversified.length >= limit) break;
    }

    return diversified.map((r) => ({
        url: r.url,
        title: r.title,
        hostname: r.hostname,
        authorityScore: r.authorityScore,
        source_type: "reference"
    }));
}

export async function getTutorialSources(query, limit = 3, videoQuery = query, topic = "general"){

    try {
        const videos = await searchYouTubeVideos(videoQuery, topic, limit);
        if (videos && videos.length > 0) {
            return videos.map(v => ({
                url: v.url,
                title: v.title,
                hostname: 'youtube.com',
                source_type: "video",
                channel: v.channel,
                views: v.views,
                thumbnail: v.thumbnail,
                publishedAt: v.publishedAt
            }));
        }
    } catch (error) {
        console.error('YouTube API failed, falling back to Exa:', error.message);
    }

    const {formatted} = await searchAndFormatExa(query, {
        numResults: 10,
        type: "auto",
        includeDomains: ["youtube.com", "youtu.be"],
        highlights: true
    });

    return formatted.slice(0, limit).map((r) => ({
        url: r.url,
        title: r.title || "Youtube video", 
        hostname: "youtube.com",
        source_type: "video"
    }));
}

export async function getAcademicSources(query, limit = 3){
    const researchQuery = `${query} research`
    const {formatted} = await searchAndFormatExa(researchQuery,  {
        numResults: 10,
        type: "auto",
        category: "research paper",
        highlights: true
    });

    return formatted.slice(0, limit).map((r) => ({
        url: r.url,
        title: r.title,
        hostname: r.hostname,
        source_type: "research_paper"
    }));
}

export async function getCombinedExploreMore(query, limit = 5, videoQuery = query, topic = "general", message = ""){
    const filter = detectResourceFilter(message);

    let authoritative = [];
    let tutorials = [];
    let academic = [];

    if(filter.type === "documentation"){
        authoritative = await getAuthoritativeSources(query, 5);
        tutorials = [];
        academic = [];
    }else if(filter.type === "video"){
        tutorials = await getTutorialSources(query, 5, videoQuery, topic);
        authoritative = [];
        academic = [];
    }else if(filter.type === "research_paper"){
        academic = await getAcademicSources(query, 5);
        authoritative = [];
        tutorials = [];
    }else {
        authoritative = await getAuthoritativeSources(query, 2);

        tutorials = await getTutorialSources(query, 2, videoQuery, topic);

        academic = await getAcademicSources(query, 1);
    }

    const combined = [];
    const maxLength = Math.max(authoritative.length, tutorials.length, academic.length);

    for (let i = 0; i < maxLength; i++) {
        if (i < authoritative.length) {
            combined.push(authoritative[i]);
        }
        if (i < tutorials.length) {
            combined.push(tutorials[i]);
        }
        if (i < academic.length) {
            combined.push(academic[i]);
        }
    }

    const seen = new Set();
    const unique = [];

    for(const source of combined){
        if(!seen.has(source.url)){
            seen.add(source.url);

            const formattedTitle = formatResourceTitle({
                title: source.title || source.hostname || "Source",
                source_type: source.source_type
            });
            unique.push({
                url: source.url,
                title: formattedTitle,
                displayTitle: formatResourceTitle({
                    title: source.title || source.hostname || "Source",
                    source_type: source.source_type
                }),
                hostname: source.hostname,
                source_type: source.source_type
            })
        }
    };

    return unique.slice(0, limit);
}

const EXA_CONTENTS_API_URL = "https://api.exa.ai/contents";

export async function exaGetContents(urls, options = {}) {

    if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error("At least one URL is required for Exa contents");
    }

    const {text = true, highlights = false, summary = false} = options;

    const payload = { urls, text, highlights, summary};

    console.log(`Exa Contents: Retrieving ${urls.length} exact URLs`);

    try {

        const response = await axios.post(EXA_CONTENTS_API_URL, payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": API_KEY
                }
            }
        );

        return response.data;

    } catch (error) {

        console.error("Exa Contents API error:",error.message);

        if (error.response) {
            console.error("Status:", error.response.status);

            console.error("Data:", error.response.data);
        }

        throw error;
    }
}

export async function getExaContents(urls, options = {}) {

    return retryWithBackoff(() =>
        exaGetContents(urls, options)
    );
}