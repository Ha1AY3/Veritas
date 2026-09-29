import mongoose from "mongoose";

const pdfDocumentSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
            index: true
        },

        fileName: {
            type: String,
            required: true,
            trim: true
        },

        fileUrl: {
            type: String,
            required: true,
            trim: true
        },

        mimeType: {
            type: String,
            default: "application/pdf"
        },

        pageCount: {
            type: Number,
            default: 0
        },

        status: {
            type: String,
            enum: ["processing", "ready", "failed"],
            default: "processing"
        }
    },
    {
        timestamps: true
    }
);

const pdfDocumentModel = mongoose.model("pdfDocuments", pdfDocumentSchema);

export default pdfDocumentModel;