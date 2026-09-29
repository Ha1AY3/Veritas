export function buildPdfHybridEvidence({pdfEvidence = [], webSources = []}){
    if (!Array.isArray(pdfEvidence)) {
        throw new Error("PDF evidence must be an array");
    }

    if (!Array.isArray(webSources)) {
        throw new Error("Web sources must be an array");
    }

    const pdf = pdfEvidence.map((item, index) => ({
        evidenceId: `pdf_${index + 1}`,
        sourceType: "pdf",

        documentId: item.documentId,
        pageNumber: item.pageNumber,
        chunkIndex: item.chunkIndex,

        title: item.title || "PDF Document",
        text: item.text || "",
        score: item.score ?? null
    }));

    const web = webSources.map((source, index) => ({
        evidenceId: `web_${index + 1}`,
        sourceType: "web",
        url: source.url || "",
        title: source.title || "",
        hostname: source.hostname || "",
        text: Array.isArray(source.highlights) ? source.highlights.slice(0, 3).join(" ") : "",
        score: source.score ?? null
    }));

    return {
        pdf,
        web,
        all: [...pdf, ...web]
    };
}