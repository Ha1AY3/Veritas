const STOP_WORDS = [
    'what', 'is', 'the', 'of', 'to', 'for', 'on', 'with', 'at', 'by', 'from',
    'up', 'about', 'into', 'through', 'during', 'including', 'etc',
    'how', 'when', 'where', 'which', 'can', 'does', 'will', 'would', 'should',
    'could', 'may', 'might', 'has', 'have', 'had', 'was', 'were', 'been',
    'being', 'am', 'are', 'isnt', 'arent', 'wasnt', 'werent', 'hasnt',
    'havent', 'hadnt', 'doesnt', 'dont', 'didnt', 'wont', 'wouldnt', 'shouldnt',
    'couldnt', 'mustnt', 'lets', 'thats', 'whos', 'whats', 'heres', 'theres'
];

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ') 
        .split(/\s+/)
        .filter(word => word.length > 0 && !STOP_WORDS.includes(word));
}

function removeStopWords(query) {
    return tokenize(query).join(' ');
}

export function evaluateRetrieval(results, query) {
    if (!results || results.length === 0) {
        return {
            isGood: false,
            score: 0,
            confidence: "LOW",
            reason: "No results found",
            metrics: {
                resultCount: 0,
                highlightCoverage: 0,
                diversity: 0,
                lexicalRelevance: 0
            }
        };
    }

    const cleanQuery = tokenize(query).join(' ');
    let resultCountScore = 0;
    if (results.length >= 5) resultCountScore = 3;
    else if (results.length >= 3) resultCountScore = 2;
    else if (results.length >= 1) resultCountScore = 1;

    const resultsWithHighlights = results.filter(r => r.highlights && r.highlights.length > 0);
    let highlightCoverageScore = 0;
    if (resultsWithHighlights.length >= 3) highlightCoverageScore = 3;
    else if (resultsWithHighlights.length >= 1) highlightCoverageScore = 1;

    const uniqueHosts = new Set(results.map(r => r.hostname)).size;
    let diversityScore = 0;
    if (uniqueHosts >= 3) diversityScore = 1;

    let lexicalRelevanceScore = 0;
    if (cleanQuery) {
        const queryTerms = tokenize(cleanQuery);
        const relevantResults = results.filter(r => {
            const title = r.title?.toLowerCase() || '';
            const snippet = r.highlights?.join(' ')?.toLowerCase() || '';
            return queryTerms.some(term => title.includes(term) || snippet.includes(term));
        });
        if (relevantResults.length >= 2) lexicalRelevanceScore = 2;
        else if (relevantResults.length >= 1) lexicalRelevanceScore = 1;
    }

    const totalScore = resultCountScore + highlightCoverageScore + diversityScore + lexicalRelevanceScore;
    const isGood = totalScore >= 6;

    let confidence = "LOW";
    if (totalScore >= 8) confidence = "HIGH";
    else if (totalScore >= 6) confidence = "MEDIUM";

    return {
        isGood,
        score: totalScore,
        confidence,
        reason: isGood ? "Sufficient relevant sources found" :
            totalScore >= 4 ? "Limited but usable sources" :
                "Weak retrieval, using limited evidence",
        metrics: {
            resultCount: resultCountScore,
            highlightCoverage: highlightCoverageScore,
            diversity: diversityScore,
            lexicalRelevance: lexicalRelevanceScore
        }
    };
}