import express from "express";
import multer from "multer";
import { authUser } from "../middleware/auth.middleware.js";
import { createChatController, deleteChatController, getChatByIdController, getChatsController, getVisualStatus, sendMessageController } from "../controllers/chat.controller.js";
import { createResearchRoadmap, deleteResearchRoadmap, enrichResearchRoadmapNodeController, getResearchRoadmapById, getResearchRoadmaps } from "../controllers/roadmap.controller.js";
import { generateNotesPdfController } from "../controllers/notes.controller.js";
import { uploadPdfController } from "../controllers/pdfUpload.controller.js";

const chatRouter = express.Router();

const upload = multer({storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed"));
        }
    }
});

chatRouter.post("/messages", authUser, sendMessageController);

chatRouter.post("/pdf", authUser, upload.single("file") , uploadPdfController);

chatRouter.get("/messages/:messageId/visual", authUser, getVisualStatus);

chatRouter.post("/", authUser, createChatController);

chatRouter.get("/", authUser, getChatsController);

chatRouter.get("/:id", authUser, getChatByIdController);

chatRouter.post("/:chatId/roadmaps", authUser, createResearchRoadmap);

chatRouter.get("/:chatId/roadmaps", authUser, getResearchRoadmaps );

chatRouter.get("/:chatId/roadmaps/:roadmapId", authUser,getResearchRoadmapById);

chatRouter.post("/:chatId/roadmaps/:roadmapId/nodes/:nodeId/enrich", authUser,enrichResearchRoadmapNodeController);

chatRouter.delete("/:chatId/roadmaps/:roadmapId", authUser, deleteResearchRoadmap );

chatRouter.post("/:chatId/notes/pdf", authUser, generateNotesPdfController);

chatRouter.delete("/:id", authUser, deleteChatController);

export default chatRouter;