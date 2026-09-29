import mongoose from "mongoose";

const messagesSchema = new mongoose.Schema(
  {
    chat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chats",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    answer_summary: {
      type: String,
      default: null,
    },

    citations: [
      {
        type: {
          type: String,
          enum: ["web", "pdf"],
          default: "web",
        },

        source_type: {
          type: String,
          enum: ["web", "pdf"],
          default: "web",
        },

        documentId: {
          type: String,
          default: null,
        },

        url: {
          type: String,
          required: true,
        },

        title: {
          type: String,
          required: true,
        },

        hostname: {
          type: String,
        },

        pageNumber: {
          type: Number,
          default: null,
        },

        chunkIndex: {
          type: Number,
          default: null,
        },

        snippet: {
          type: String,
        },
      },
    ],

    resources: [
      {
        url: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        hostname: {
          type: String,
        },
        description: {
          type: String,
        },
        source_type: {
          type: String,
          enum: ["documentation", "research_paper", "video"],
          required: true,
        },
      },
    ],

    related_questions: {
      type: [String],
      default: [],
    },

    explore_more: [
      {
        url: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        hostname: {
          type: String,
        },
        source_type: {
          type: String,
          enum: ["reference", "research_paper", "video"],
          default: "reference",
        },
      },
    ],

    pdf: {
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PdfDocument",
        default: null
      },
      fileName: {
        type: String,
        default: ""
      },
      fileUrl: {
        type: String,
        default: ""
      },
      pageCount: {
        type: Number,
        default: 0
      }
    },

    images: [
      {
        url: {
          type: String,
          required: true,
        },
        description: {
          type: String,
        },
      },
    ],

    visual: {
      type: [
        {
          imageUrl: {
            type: String,
            required: true,
          },

          title: {
            type: String,
            default: "",
          },

          sourceUrl: {
            type: String,
            default: "",
          },

          hostname: {
            type: String,
            default: "",
          },

          sourceType: {
            type: String,
            default: "diagram",
          },
        },
      ],
      default: [],
    },

    visualStatus: {
      type: String,
      enum: ["none", "processing", "ready", "failed"],
      default: "none",
    },

    confidence: {
      level: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "medium",
      },
      score: { type: Number, min: 0, max: 10 },
      sources_count: { type: Number, default: 0 },
      description: { type: String },
    },

    response_time_ms: { type: Number },
    tokens_used: { type: Number },
  },
  { timestamps: true },
);

messagesSchema.index({ chat_id: 1, createdAt: 1 });

const messagesModel = mongoose.model("messages", messagesSchema);

export default messagesModel;