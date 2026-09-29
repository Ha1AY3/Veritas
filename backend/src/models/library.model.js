

import mongoose from 'mongoose';

const librarySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    url: {
        type: String,
        required: true,
        trim: true
    },
    hostname: {
        type: String,
        trim: true
    },
    source_type: {
        type: String,
        enum: ["documentation", "video", "research_paper", "reference"],
        default: "reference"
    }
}, {timestamps: true});

librarySchema.index({ userId: 1, url: 1 }, { unique: true });

const libraryModel = mongoose.model("library", librarySchema);

export default libraryModel;