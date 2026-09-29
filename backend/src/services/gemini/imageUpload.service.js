import ImageKit from "@imagekit/nodejs";
import crypto from "crypto";

const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

export async function uploadImage(imageBase64) {
    if (!imageBase64) {
        return null;
    }

    try {
        function getImageExtension(base64) {
          const match = base64.match(/^data:image\/([^;]+);base64,/);
          return match?.[1] || "jpeg";
        }

        const extension = getImageExtension(imageBase64);
        const fileName = `veritas-${crypto.randomUUID()}.${extension}`;

        const result = await imagekit.files.upload({
            file: imageBase64,
            fileName,
            folder: "veritas-images"
        });

        return result.url;

    } catch (error) {
        console.error("ImageKit upload failed:", error);
        throw new Error("Failed to upload image");
    }
}