export function formatPdfAnswerForVeritas({answer, citations, pdfDocument}){
    if (!answer || typeof answer !== "string") {
        return "";
    }

    if (!Array.isArray(citations)) {
        return answer;
    }

    let formattedAnswer = answer;

    formattedAnswer = formattedAnswer.replace(
        /\[PDF Page (\d+)\](?!\()/g,
        (match, pageNumber) => {
            const page = Number(pageNumber);

            const citation = citations.find(
                item => Number(item.pageNumber) === page
            );

            if (!citation) {
                return match;
            }

            const fileUrl = pdfDocument?.fileUrl || citation.url || "";

            if (!fileUrl) {
                return `[PDF Page ${page}]`;
            }

            return `[PDF Page ${page}](${fileUrl}#page=${page})`;
        }
    );

    formattedAnswer = formattedAnswer.replace(
        /\[WEB:\s*([^\]]+)\]/g,
        (match, hostname) => {
            const cleanHostname = hostname.trim();

            const citation = citations.find(
                item =>
                    item.sourceType === "web" &&
                    item.hostname === cleanHostname
            );

            if (!citation) {
                return match;
            }

            if (!citation.url) {
                return `[${cleanHostname}]`;
            }

            return `[${cleanHostname}](${citation.url})`;
        }
    );

    return formattedAnswer;
}

export function formatPdfCitations(pdfEvidence, pdfDocument) {
    if (!Array.isArray(pdfEvidence)) {
        throw new Error("PDF evidence must be an array");
    }

    if (!pdfDocument) {
        throw new Error("PDF document is required");
    }

    const documentId = pdfDocument._id?.toString?.() || String(pdfDocument._id || "");

    const fileName = pdfDocument.fileName || "PDF Document";

    const fileUrl = pdfDocument.fileUrl || "";

    const citations = pdfEvidence
        .filter(item => item & item.pageNumber !== undefined && item.pageNumber !== null && item.text)
        .map(item => ({
            type: "pdf",
            source_type: "pdf",
            documentId,
            title: fileName,
            hostname: "PDF",
            url: fileUrl,
            pageNumber: Number(item.pageNumber),
            chunkIndex: item.chunkIndex !== undefined  ? Number(item.chunkIndex) : null,

            snippet: item.text.trim().slice(0, 300)
        }));
        
    const unique = new Map();

    for (const citation of citations) {
        const key = [
            citation.documentId,
            citation.pageNumber,
            citation.chunkIndex
        ].join("-");

        if (!unique.has(key)) {
            unique.set(key, citation);
        }
    }

    return [...unique.values()];
}