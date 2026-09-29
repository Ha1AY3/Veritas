import { PDFParse } from "pdf-parse";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2800,
    chunkOverlap: 50,
    separators: ["\n\n", "\n", ". ", " ", ""]
});


export async function extractAndChunkPdf(pdfBuffer) {

    if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error("PDF buffer is required");
    }

    if (pdfBuffer.length === 0) {
        throw new Error("PDF buffer is empty");
    }

    const parser = new PDFParse({
        data: pdfBuffer
    });

    try {

        const result = await parser.getText();

        const pages = result.pages || [];

        if (!pages.length) {
            throw new Error("No pages found in PDF");
        }

        const pageDocuments = [];

        for (const page of pages) {

            const text = (page.text || "").trim();

            if (!text) {
                continue;
            }

            pageDocuments.push(new Document({
                    pageContent: text,

                    metadata: {
                        pageNumber: page.num
                    }
                })
            );
        }

        if (!pageDocuments.length) {
            throw new Error("No extractable text found in PDF");
        }

        const chunkedDocuments = [];

        for (const pageDocument of pageDocuments) {

            const pageChunks = await textSplitter.splitDocuments([ pageDocument]);

            pageChunks.forEach((chunk, index) => {

                chunk.metadata = {
                    ...chunk.metadata,

                    chunkIndex: index
                };

                chunkedDocuments.push(chunk);

            });
        }

        return {
            pageCount: result.total || pages.length,

            documents: chunkedDocuments
        };

    } finally {

        await parser.destroy();

    }
}