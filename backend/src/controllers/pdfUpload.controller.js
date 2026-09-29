import pdfDocumentModel from "../models/pdfDocument.model.js";
import { storePdfEmbeddings } from "../services/pdf/pdfEmbedding.service.js";
import { extractAndChunkPdf } from "../services/pdf/pdfExtraction.service.js";
import { uploadPdf } from "../services/pdf/pdfUpload.service.js";


export async function uploadPdfController(req, res) {
    let pdfDocument = null;

    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "PDF file is required"
            });
        }

        if (file.mimetype !== "application/pdf") {
            return res.status(400).json({
                success: false,
                message: "Only PDF files are allowed"
            });
        }

        if (file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "PDF is too large. Please upload a PDF under 10MB"
            });
        }

        const uploadedPdf = await uploadPdf(
            file.buffer,
            file.originalname
        );

        pdfDocument = await pdfDocumentModel.create({
            userId,
            fileName: file.originalname,
            fileUrl: uploadedPdf.url,
            mimeType: file.mimetype,
            status: "processing"
        });
        const extracted = await extractAndChunkPdf(file.buffer);

        await storePdfEmbeddings({
            documents: extracted.documents,
            documentId: pdfDocument._id,
            userId
        });

        pdfDocument.pageCount = extracted.pageCount;
        pdfDocument.status = "ready";

        await pdfDocument.save();

        return res.status(201).json({
            success: true,
            documentId: pdfDocument._id.toString(),
            fileName: pdfDocument.fileName,
            fileUrl: pdfDocument.fileUrl,
            pageCount: pdfDocument.pageCount,
            status: pdfDocument.status
        });

    } catch (error) {
        console.error("PDF upload/processing failed:", error);

        if (pdfDocument) {
            pdfDocument.status = "failed";
            await pdfDocument.save().catch(() => {});
        }

        return res.status(500).json({
            success: false,
            message: "Failed to process PDF"
        });
    }
}