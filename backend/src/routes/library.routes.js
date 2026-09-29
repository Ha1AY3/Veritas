import express from "express";
import { authUser } from "../middleware/auth.middleware.js";
import { addToLibrary, checkSaved, getLibrary, removeFromLibrary } from "../controllers/library.controller.js";

const saveRouter = express.Router();

saveRouter.get("/", authUser, getLibrary);

saveRouter.post("/", authUser, addToLibrary);

saveRouter.delete("/:id", authUser, removeFromLibrary);

saveRouter.post("/check", authUser, checkSaved);

export default saveRouter;