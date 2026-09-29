import { getUserLibrary, isResourceSaved, removeResource, saveResource } from "../services/library/library.service.js";


export async function getLibrary(req, res) {
    try {
        const userId = req.user.id;
        const resources = await getUserLibrary(userId);

        res.json({
            success: true,
            resources
        });
    } catch (error) {
        console.error("Get library error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch library"
        });
    }
}

export async function addToLibrary(req, res) {
    try {
        const userId = req.user.id;
        const { title, url, hostname, source_type } = req.body;

        if (!title || !url) {
            return res.status(400).json({
                success: false,
                message: "Title and URL are required"
            });
        }

        const result = await saveResource(userId, {
            title,
            url,
            hostname,
            source_type
        });

        if (!result.success) {
            return res.status(409).json({
                success: false,
                message: result.message
            });
        }

        res.json({
            success: true,
            saved: result.saved
        });
    } catch (error) {
        console.error("Save library error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to save resource"
        });
    }
}


export async function removeFromLibrary(req, res) {
    try {
        const userId = req.user.id;
        const resourceId = req.params.id;

        const result = await removeResource(userId, resourceId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: "Resource not found"
            });
        }

        res.json({
            success: true,
            removed: result.removed
        });
    } catch (error) {
        console.error("Remove library error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove resource"
        });
    }
}


export async function checkSaved(req, res) {
    try {
        const userId = req.user.id;
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: "URL is required"
            });
        }

        const saved = await isResourceSaved(userId, url);

        res.json({
            success: true,
            saved
        });
    } catch (error) {
        console.error("Check library error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to check library"
        });
    }
}