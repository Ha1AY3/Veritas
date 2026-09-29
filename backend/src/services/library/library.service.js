import libraryModel from "../../models/library.model.js";

export async function saveResource(userId, resource) {
    const { title, url, hostname, source_type } = resource;

    const existing = await libraryModel.findOne({ userId, url });
    if (existing) {
        return { success: false, message: "Already saved" };
    }

    const saved = await libraryModel.create({
        userId,
        title,
        url,
        hostname,
        source_type: source_type || "reference"
    });

    return { success: true, saved };
}

export async function getUserLibrary(userId) {
    const resources = await libraryModel.find({ userId }).sort({ savedAt: -1 });

    return resources;
}

export async function removeResource(userId, resourceId) {
    const result = await libraryModel.findOneAndDelete({
        _id: resourceId,
        userId
    });

    return { success: !!result, removed: result };
}

export async function isResourceSaved(userId, url) {
    const found = await libraryModel.findOne({ userId, url });
    return !!found;
}