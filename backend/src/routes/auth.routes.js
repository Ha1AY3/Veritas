import express from "express";
import { loginValidator, registerValidator } from "../validators/auth.validation.js";
import { getMeController, loginController, logoutController, registerController, verifyEmailController } from "../controllers/auth.controller.js";
import { authUser } from "../middleware/auth.middleware.js";

const authRouter = express.Router();

authRouter.post("/register", registerValidator, registerController);

authRouter.get("/verify-email", verifyEmailController);

authRouter.post("/login", loginValidator ,loginController);

authRouter.get("/get-me", authUser, getMeController);

authRouter.post("/logout", logoutController);

export default authRouter;