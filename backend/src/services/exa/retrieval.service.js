import { evaluateRetrieval } from "../../utils/evaluateRetrieval.js";
import { mergeAndDeduplicate } from "../../utils/mergeResults.js";
import { generateQueries } from "../../utils/queryGenerator.js";
import { searchAndFormatExa } from "./exa.service.js";


export async function retrieve(searchQuery, conversationSummary, previousUserMessages, resourceFilter = {type : "all"}) {
    const startTime = Date.now();

    const queryMetadata = await generateQueries(searchQuery, conversationSummary, previousUserMessages, resourceFilter);

    const queries = queryMetadata.retrieval.queries;
    const videoQuery = queryMetadata.video.query;
    const topic = queryMetadata.video.topic;

    const searchResults = await Promise.all(
        queries.map(q => searchAndFormatExa(q, {
                numResults: 5,
                type: "auto",
                highlights: true
            })
        )
    );

    const mergedResults = mergeAndDeduplicate(searchResults);

    const MAX_SOURCES = 5;

    const finalSources = mergedResults.slice(0, MAX_SOURCES);

    const evaluation = evaluateRetrieval(mergedResults, searchQuery);

    const endTime = Date.now();

    const metadata = {
        totalQueries: queries.length,
        mergedSources: mergedResults.length,
        duplicatesRemoved: searchResults.reduce(
                (sum, r) => sum + (r.formatted?.length || 0), 0) - mergedResults.length,
        searchTimeMs: endTime - startTime,
        topic,
        videoQuery
    };

    return {
        sources: finalSources,
        evaluation,
        queriesUsed: queries,
        videoQuery,
        topic,
        metadata
    };
}