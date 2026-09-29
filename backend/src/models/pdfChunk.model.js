import mongoose from "mongoose";

const pdfChunkSchema = new mongoose.Schema(
    {
        documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "pdfDocuments",
            required: true,
            index: true
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
            index: true
        },

        pageNumber: {
            type: Number,
            required: true
        },

        chunkIndex: {
            type: Number,
            required: true
        },

        text: {
            type: String,
            required: true
        },

        embedding: {
            type: [Number],
            required: true
        }
    },
    {
        timestamps: true,
        collection: "pdfChunks"
    }
);

pdfChunkSchema.index({documentId: 1, pageNumber: 1, chunkIndex: 1});

const pdfChunkModel = mongoose.model("pdfChunks", pdfChunkSchema);

export default pdfChunkModel;