import express from "express";
import authRouter from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import chatRouter from "./routes/chat.routes.js";
import saveRouter from "./routes/library.routes.js";

const app = express();

app.use(express.json({ limit : "10mb"}));
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}))

app.use("/api/auth", authRouter);
app.use("/api/chats", chatRouter);
app.use("/api/save", saveRouter);


export default app;