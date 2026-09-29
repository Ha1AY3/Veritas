import mongoose from "mongoose";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
    outputDimensionality: 768
});

export async function retrievePdfEvidence({ question, documentId, userId, limit = 5 }) {
    if (!question?.trim()) {
        throw new Error("Question is required");
    }

    if (!documentId) {
        throw new Error("documentId is required");
    }

    if (!userId) {
        throw new Error("userId is required");
    }

    const queryVector = await embeddings.embedQuery(question);

    if (queryVector.length !== 768) {
        throw new Error(`Invalid query embedding dimension: ${queryVector.length}`);
    }

    const db = mongoose.connection.db;
    const collection = db.collection("pdfChunks");

    let results = [];
    const maxAttempts = 5;
    const retryDelays = [1000, 2000, 4000, 8000, 10000];

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        results = await collection.aggregate([
            {
                $vectorSearch: {
                    index: "pdf_vector_index",
                    path: "embedding",
                    queryVector,
                    numCandidates: 100,
                    limit,
                    filter: {
                        $and: [
                            {
                                userId: { $eq: new mongoose.Types.ObjectId(userId)}
                            },
                            {
                                documentId: {$eq: new mongoose.Types.ObjectId(documentId) }
                            }
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 1,
                    documentId: 1,
                    userId: 1,
                    pageNumber: 1,
                    chunkIndex: 1,
                    text: 1,
                    score: {$meta: "vectorSearchScore"}
                }
            }
        ]).toArray();
        if (results.length > 0) {
            break;
        }

        if (attempt < maxAttempts) {
            const delay = retryDelays[attempt - 1];
            
            await new Promise(resolve =>
                setTimeout(resolve, delay)
            );
        }
    }

    return results;
}