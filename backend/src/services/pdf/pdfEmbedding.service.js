import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import pdfChunkModel from "../../models/pdfChunk.model.js";

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
    outputDimensionality: 768
});


function splitIntoBatches(items, batchSize = 50) {
    const batches = [];

    for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
    }

    return batches;
}


export async function storePdfEmbeddings({documentId, userId, documents}){

    if (!documentId) {
        throw new Error("documentId is required");
    }

    if (!userId) {
        throw new Error("userId is required");
    }

    if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error("No PDF documents provided");
    }

    const batches = splitIntoBatches(documents, 20);

    const records = [];

    let globalChunkIndex = 0;

    for (const batch of batches) {

        const texts = batch.map(
            document => document.pageContent
        );

        let vectors = [];

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                vectors = await Promise.all(
                    texts.map(text => embeddings.embedQuery(text))
                );

                const hasInvalidVector =
                    vectors.length !== texts.length ||
                    vectors.some(
                        vector => !Array.isArray(vector) || vector.length !== 768
                    );

                if (!hasInvalidVector) {
                    break;
                }

                throw new Error("Invalid embedding vector received");

            } catch (error) {
                console.error(`Embedding attempt ${attempt}/3 failed:`, error.message);

                if (attempt === 3) {
                    throw error;
                }

                await new Promise(resolve =>
                    setTimeout(resolve, 60000)
                );
            }
        }

        if (vectors.length !== batch.length) {
            throw new Error("Embedding count does not match PDF chunk count");
        }

        for (let i = 0; i < batch.length; i++) {

            const document = batch[i];
            const vector = vectors[i];

            if (!Array.isArray(vector) || vector.length !== 768) {
                console.error("Invalid PDF embedding");
                console.error("Batch index:", i);
                console.error("Global chunk index:", globalChunkIndex);
                console.error("Page:", document.metadata?.pageNumber);
                console.error("Text length:", document.pageContent?.length);
                console.error("Text preview:", JSON.stringify(document.pageContent?.slice(0, 200)),);
                console.error("Vector length:", Array.isArray(vector) ? vector.length : "not-array",);
            }

            records.push({
                documentId,
                userId,
                pageNumber: Number(document.metadata?.pageNumber) || 0,
                chunkIndex: globalChunkIndex++,
                text: document.pageContent,
                embedding: vector
            });
        }
    }

    if (!records.length) {
        throw new Error("No embedding records generated");
    }

    const savedChunks = await pdfChunkModel.insertMany(records);

    console.log(`Stored ${savedChunks.length} PDF chunks with embeddings`);

    return savedChunks;
}