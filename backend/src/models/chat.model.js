import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },
    title: {
        type: String,
        default: "New chat"
    },
    summary: {
        type: String,
        default: ""
    },
    message_count: {
        type: Number,
        default: 0
    },
    last_message_preview: {
        type: String,
        default: ""
    }
}, {timestamps: true});

const chatModel = mongoose.model("chats", chatSchema);

export default chatModel;