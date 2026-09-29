import mongoose from "mongoose";

const roadmapResourceSchema = new mongoose.Schema(
    {
        url: {
            type: String,
            required: true
        },

        title: {
            type: String,
            required: true
        },

        hostname: {
            type: String,
            default: ""
        },

        source_type: {
            type: String,
            enum: ["documentation", "video", "research_paper"],
            required: true
        }
    },
    { _id: false }
);

const roadmapNodeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true
        },

        label: {
            type: String,
            required: true
        },

        type: {
            type: String,
            enum: ["root", "branch", "subtopic", "concept"],
            default: "subtopic"
        },

        parentId: {
            type: String,
            default: null
        },

        related_questions: {
            type: [String],
            default: []
        },

        resources: {
            type: [roadmapResourceSchema],
            default: []
        },

        enrichmentStatus: {
            type: String,
            enum: [ "not_loaded", "loading", "ready", "failed"],
            default: "not_loaded"
        }
    },
    { _id: false }
);

const roadmapEdgeSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true
        },

        source: {
            type: String,
            required: true
        },

        target: {
            type: String,
            required: true
        }
    },
    { _id: false }
);

const researchRoadmapSchema = new mongoose.Schema(
    {
        chat_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "chats",
            required: true,
            index: true
        },

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

        version: {
            type: Number,
            required: true
        },

        isCurrent: {
            type: Boolean,
            default: true
        },

        nodes: {
            type: [roadmapNodeSchema],
            default: []
        },

        edges: {
            type: [roadmapEdgeSchema],
            default: []
        }
    },
    {
        timestamps: true
    }
);

researchRoadmapSchema.index({ chat_id: 1, createdAt: -1});

researchRoadmapSchema.index({chat_id: 1, version: 1 }, { unique: true });

const researchRoadmapModel = mongoose.model( "researchRoadmaps", researchRoadmapSchema );

export default researchRoadmapModel;