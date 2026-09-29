import ImageKit from "@imagekit/nodejs";

const imagekit = new ImageKit({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY
});

export async function uploadRemoteImage(imageUrl, fileName){
    if (!imageUrl) {
        throw new Error("Image URL is required");
    }

    if (!fileName) {
        throw new Error("File name is required");
    }

    try {
        const result = await imagekit.files.upload({
            file: imageUrl,
            fileName,
            folder: "veritas-images"
        });

        return {
            url: result.url,
            fileId: result.fileId
        };

    } catch (error) {
        console.error("ImageKit remote image upload failed:", error.message);

        throw error;
    }
}

function normalizeImageUrl(url) {
    if (!url) return url;

    if (url.includes("github.com/") && url.includes("/blob/")) {
        return url.replace(
                "https://github.com/",
                "https://raw.githubusercontent.com/"
            ).replace("/blob/", "/");
    }

    return url;
}

export async function persistVisual(visual) {
    if (!visual?.imageUrl) {
        return null;
    }

    try {
        const fileName = createVisualFileName(
            visual.title
        );

        const normalizedUrl = normalizeImageUrl(visual.imageUrl);

        const uploaded = await uploadRemoteImage(
            normalizedUrl,
            fileName
        );

        return {
            imageUrl: uploaded.url,
            title: visual.title || "Research Visual",
            sourceUrl: visual.sourceUrl || "",
            hostname: visual.hostname || "",
            sourceType: visual.sourceType || "diagram"
        };

    } catch (error) {
        console.error("Failed to persist visual:", error.message);

        return null;
    }
}

function createVisualFileName(title = "research-visual") {
    const cleaned = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

    return `${cleaned || "research-visual"}-${Date.now()}`;
}