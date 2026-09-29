import ImageKit, { toFile } from "@imagekit/nodejs";
import crypto from "crypto";

const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

export async function uploadPdf(pdfBuffer, originalFileName) {
    if (!pdfBuffer) {
        throw new Error("PDF buffer is required");
    }

    if (!originalFileName) {
        throw new Error("PDF file name is required");
    }

    try {
        const safeName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_");

        const fileName = `veritas-${crypto.randomUUID()}-${safeName}`;

        const uploadable = await toFile(
            pdfBuffer,
            fileName,
            { type: "application/pdf" }
        );

        const result = await imagekit.files.upload({
            file: uploadable,
            fileName,
            folder: "veritas-pdfs"
        });
        return {
            url: result.url,
            fileId: result.fileId
        };

    } catch (error) {
        console.error("PDF ImageKit upload failed:", error);

        throw new Error("Failed to upload PDF");
    }
}