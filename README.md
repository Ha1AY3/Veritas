<div align="center">

# Veritas

### An Evidence-Backed Research Environment

**Ask. Verify. Explore. Research.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Veritas-blue?style=for-the-badge&logo=vercel)](https://veritas.vercel.app)
[![Backend](https://img.shields.io/badge/API-Render-green?style=for-the-badge&logo=render)](https://veritas-backend.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)

*"Veritas does not stop at answering a question. It helps users verify, explore, research, and build reusable knowledge."*

 [Documentation](#-architecture-deep-dive) · [Report Bug](https://github.com/Ha1AY3/Veritas/issues) · [Request Feature](https://github.com/Ha1AY3/Veritas/issues)

</div>

---

## 📖 Table of Contents

- [The Veritas Philosophy](#-the-veritas-philosophy)
- [What Makes Veritas Different](#-what-makes-veritas-different)
- [Feature Overview](#-feature-overview)
- [Architecture Deep Dive](#-architecture-deep-dive)
  - [System Architecture](#system-architecture)
  - [Request Lifecycle](#request-lifecycle)
  - [Intent Engine](#intent-engine)
  - [Retrieval Pipeline](#retrieval-pipeline)
  - [Memory System](#memory-system-o1)
  - [Visual Verification Pipeline](#visual-verification-pipeline)
  - [PDF Hybrid Research](#pdf-hybrid-research-pipeline)
  - [Research Roadmap](#research-roadmap-generation)
  - [Research Notes PDF](#research-notes-generation)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Performance Characteristics](#-performance-characteristics)
- [Engineering Principles](#-engineering-principles)
- [Team](#-team)
- [License](#-license)

---

## 🧠 The Veritas Philosophy

Every modern AI assistant shares the same fundamental flaw: **they hallucinate**. They generate fluent, confident answers that sound correct but are often false — and users have no way to verify them.

Veritas is built on a single principle:

> **Every factual claim must be traceable to a retrieved source.**

This principle drives everything:

| Principle | Implementation |
|-----------|----------------|
| **Evidence-first** | Every answer is grounded in retrieved sources |
| **Verifiable** | Inline citations for every claim |
| **Context-bounded** | O(1) memory — never grows with conversation length |
| **Asynchronous** | Visuals, summaries, metadata never block the user |
| **Multimodal** | Text, image, voice, and PDF in one system |
| **Research-oriented** | Not just Q&A — full research workflows |

---

## ⭐ What Makes Veritas Different

| Traditional AI Assistant | Veritas |
|--------------------------|---------|
| `Question → Answer → Stop` | `Question → Research → Evidence → Answer → Verify → Explore → Preserve` |
| Answers from LLM memory | Answers from retrieved sources |
| No citations | Inline clickable citations |
| No learning path | Explore More + Related Questions + Research Roadmap |
| Stale training data | Real-time web search |
| Full history sent to LLM | Bounded context (O(1) memory) |
| Text only | Text + Image + Voice + PDF |
| Separate tools for PDF vs web | PDF + Web hybrid research in one answer |

---

## ✨ Feature Overview

### 🔍 Core Research
- **RAG Pipeline** — Real-time web search (Exa) with source-grounded answers
- **Inline Citations** — Every factual claim is linked to its source
- **Streaming Responses** — Token-by-token streaming across all intents
- **Multi-Query Retrieval** — 3 parallel searches for broader coverage
- **Retrieval Confidence Scoring** — HIGH / MEDIUM / LOW based on evidence quality

### 🎓 Learning & Exploration
- **Explore More** — Curated documentation, videos, and research papers
- **Related Questions** — Auto-generated follow-up questions
- **Learning Support** — Simplify, clarify, or re-explain any answer
- **Research Roadmap** — Interactive mind map with hover-sourced nodes

### 📄 Research Workflows
- **Research-Backed Notes PDF** — Turn conversations into structured, citable documents
- **PDF Hybrid Research** — Combine private documents with live web research
- **Verified Diagrams** — Web-sourced visuals verified by DeepSeek Vision
- **Code Snippets with Citations** — Every code block is source-attributed

### 🎯 User Experience
- **Multimodal Input** — Text, Voice, Image, PDF
- **O(1) Conversation Memory** — Bounded context, never grows
- **Personal Library** — Save and revisit resources
- **Full Authentication** — JWT + email verification
- **Responsive UI** — Desktop, tablet, mobile

---

## 🏗 Architecture Deep Dive

### System Architecture

```mermaid
flowchart TB

    subgraph CLIENT["🖥️ CLIENT — React"]
        direction LR
        INPUT["Text / Voice / Image / PDF"]
        SSE["Streaming SSE Consumer"]
        POLL["Visual Polling"]
    end

    subgraph BACKEND["⚙️ BACKEND — Node.js + Express"]
        direction TB

        subgraph LIFECYCLE["Request Lifecycle"]
            direction LR
            CLASSIFY["1. Classify Request"]
            REWRITE["2. Rewrite Query"]
            ROUTE["3. Route to Pipeline"]
            STREAM["4. Stream Response"]

            CLASSIFY --> REWRITE --> ROUTE --> STREAM
        end

        subgraph PIPELINES["AI Processing Pipelines"]
            direction LR
            CONVERSATION["💬 Conversation"]
            OPINION["⚖️ Opinion"]
            LEARNING["📚 Learning Support"]
            IMAGE["🖼️ Image"]
            RESEARCH["🔎 Research"]
        end

        ROUTE --> PIPELINES

        subgraph ASYNC["⚡ Async Background Pipeline"]
            direction LR
            VISUAL["Visual Retrieval"]
            VERIFY["Verification"]
            STORAGE["Storage"]

            VISUAL --> VERIFY --> STORAGE
        end

        STREAM -.-> ASYNC
    end

    subgraph PERSISTENCE["💾 Persistence & AI Services"]
        direction LR

        MONGO[("MongoDB")]
        IMAGEKIT[("ImageKit")]
        VECTOR[("Atlas Vector Search")]
        DEEPSEEK[("DeepSeek")]
    end

    INPUT --> CLASSIFY
    STREAM --> SSE
    ASYNC -.-> POLL

    STORAGE --> MONGO
    STORAGE --> IMAGEKIT

    RESEARCH --> VECTOR

    CONVERSATION --> DEEPSEEK
    OPINION --> DEEPSEEK
    LEARNING --> DEEPSEEK
    IMAGE --> DEEPSEEK
    RESEARCH --> DEEPSEEK
```


### Request Lifecycle

Every message flows through a **6-stage pipeline**:

```mermaid
flowchart TD

    %% =========================
    %% STAGE 1
    %% =========================
    S1["<b>STAGE 1 — INTENT CLASSIFICATION</b><br/><br/>
    classifyRequest(message, hasImage)<br/><br/>
    • 500+ keyword patterns<br/>
    • Regex-based conversation detection<br/>
    • Math detection<br/>
    • Word-boundary-safe code detection<br/><br/>
    Returns: intent · mode · confidence"]

    %% =========================
    %% STAGE 2
    %% =========================
    S2["<b>STAGE 2 — CONTEXT-AWARE REWRITING</b><br/><br/>
    rewriteQuery(message, initialIntent, summary, history, pdfDocument)<br/><br/>
    • Resolves pronouns: it / that / this<br/>
    • Refines intent<br/>
    • Determines research requirement<br/>
    • Determines PDF usage<br/><br/>
    Returns: intent · query · requiresResearch · usePdf · isFollowUp"]

    %% =========================
    %% STAGE 3
    %% =========================
    S3{"<b>STAGE 3 — ROUTING</b><br/><br/>
    switch(finalIntent)"}

    CONV["💬 Conversation<br/><br/>generateDirectAnswer()"]
    OPINION["⚖️ Opinion<br/><br/>generateOpinionAnswer()"]
    LEARN["📚 Learning Support<br/><br/>generateLearningSupport()"]
    IMAGE["🖼️ Image<br/><br/>Gemini + Research if needed"]
    RESEARCH["🔎 Research"]

    %% =========================
    %% STAGE 4
    %% =========================
    S4{"<b>STAGE 4 — RESEARCH SUB-PATHS</b>"}

    RESOURCE["📚 Resource Only<br/><br/>Filtered resources<br/>No LLM"]

    PDF["📄 PDF Only<br/><br/>PDF Evidence<br/>→ generatePdfAnswer()"]

    HYBRID["🔗 PDF + Web Hybrid<br/><br/>PDF + Web Evidence<br/>→ generatePdfHybridAnswer()"]

    EXA["🌐 Web Research<br/><br/>Exa Search<br/>→ DeepSeek<br/>Streaming + Citations"]

    DIRECT["🧮 Direct Computation<br/><br/>DeepSeek<br/>No Web Research"]

    %% =========================
    %% STAGE 5
    %% =========================
    S5["<b>STAGE 5 — STREAMING RESPONSE</b><br/><br/>
    Server-Sent Events (SSE)<br/><br/>
    🟢 start → conversationId<br/>
    📝 text → token chunks<br/>
    🔗 citation → real-time citations<br/>
    ❓ relatedQuestions → after answer<br/>
    🔎 exploreMore → after answer<br/>
    ✅ done → final metadata<br/>
    ❌ error → failure handling"]

    %% =========================
    %% STAGE 6
    %% =========================
    S6["<b>STAGE 6 — BACKGROUND ENRICHMENT</b><br/><br/>
    ⚡ Fire-and-Forget Async Processing<br/><br/>
    Visual Retrieval → Verification → Storage<br/>
    visualStatus: processing → ready<br/><br/>
    Answer Summary → Conversation Summary<br/><br/>
    Chat Title Generation<br/>
    <i>(new conversations only)</i>"]


    %% =========================
    %% MAIN FLOW
    %% =========================

    S1 --> S2
    S2 --> S3

    S3 -->|"conversation"| CONV
    S3 -->|"opinion"| OPINION
    S3 -->|"learning_support"| LEARN
    S3 -->|"image"| IMAGE
    S3 -->|"research"| RESEARCH

    RESEARCH --> S4

    S4 -->|"resource-only"| RESOURCE
    S4 -->|"pdf-only"| PDF
    S4 -->|"pdf-hybrid"| HYBRID
    S4 -->|"requiresResearch"| EXA
    S4 -->|"requiresResearch = false"| DIRECT

    CONV --> S5
    OPINION --> S5
    LEARN --> S5
    IMAGE --> S5
    RESOURCE --> S5
    PDF --> S5
    HYBRID --> S5
    EXA --> S5
    DIRECT --> S5

    S5 --> S6


    %% =========================
    %% STYLING
    %% =========================

    classDef stage fill:#111827,stroke:#60a5fa,color:#ffffff,stroke-width:2px;
    classDef route fill:#172554,stroke:#818cf8,color:#ffffff,stroke-width:2px;
    classDef path fill:#172a1c,stroke:#4ade80,color:#ffffff,stroke-width:2px;
    classDef stream fill:#312e81,stroke:#a78bfa,color:#ffffff,stroke-width:2px;
    classDef async fill:#3f2a13,stroke:#f59e0b,color:#ffffff,stroke-width:2px;

    class S1,S2 stage;
    class S3,S4 route;
    class CONV,OPINION,LEARN,IMAGE,RESEARCH,RESOURCE,PDF,HYBRID,EXA,DIRECT path;
    class S5 stream;
    class S6 async;
```


### Intent Engine

Veritas routes every message through **five distinct intents**:

| Intent | Description | Pipeline |
|--------|-------------|----------|
| **Conversation** | Greetings, thanks, casual talk | Direct LLM (no search) |
| **Opinion** | Personal perspective, recommendations | Direct LLM (no search) |
| **Learning Support** | Clarify, simplify, re-explain | Previous answer → LLM |
| **Image** | Image-based questions | Gemini → (research if needed) |
| **Research** | Factual, technical, comparative | RAG + PDF hybrid |

Each intent has its own **streaming and non-streaming modes**.

## 🔎 Retrieval Pipeline

Veritas uses parallel web retrieval followed by deduplication and retrieval-quality evaluation before sources are passed to the answer generation pipeline.

```mermaid
flowchart LR
    A["User Query"] --> B["Generate Queries"]
    B --> C["Parallel Exa Search"]
    C --> D["Merge & Deduplicate"]
    D --> E["Evaluate Retrieval"]
    E --> F{"Confidence"}
    F --> G["Final Sources"]


## 🧠 Memory System — Bounded LLM Context

### The Problem with Naive Conversation Memory

```mermaid
flowchart LR
    A["Long Conversation"] --> B["Full History in MongoDB"]
    A --> C["Growing Prompt"]
    C --> D["Higher Token Usage"]
    D --> E["Higher Latency / Cost"]
```

### Veritas's Solution — Bounded Context

```mermaid
flowchart LR
    A["Full Conversation<br/>MongoDB"] --> B["Conversation Summary"]
    A --> C["Latest Answer Summary"]
    A --> D["Recent Messages"]

    B --> E["Bounded LLM Context"]
    C --> E
    D --> E

    E --> F["LLM Request"]
```

Veritas stores the complete conversation in MongoDB, but does not send the entire history to the LLM. Instead, it combines a conversation summary, the latest answer summary, and recent messages to construct a bounded context for each request.

### Result

LLM context size remains **bounded** as conversations grow, avoiding full-history prompts.


**Result:** Response time and cost stay **constant** whether the conversation has 5 turns or 500.

### Visual Verification Pipeline

Finding the **right** visual — not just any image:

```mermaid
flowchart LR
    A["Question"] --> B["Visual Need Decision"]
    B --> C["Source Page Discovery"]
    C --> D["Image Extraction"]
    D --> E["Filter & Rank"]
    E --> F["DeepSeek Vision Verification"]
    F --> G["Select & Store"]
```

### Visual Need Decision

Veritas first determines whether a visual would materially help answer the question and generates a targeted visual search query.

### Source Discovery & Extraction

Relevant source pages are discovered and their images are extracted, including high-resolution and lazy-loaded images.

### Filter & Rank

Candidate images are filtered to remove irrelevant visuals such as logos, icons, advertisements, and banners, then ranked based on relevance.

### DeepSeek Vision Verification

Candidate visuals are evaluated using DeepSeek Vision to determine whether they directly match the user's question.

### Select & Store

Relevant, high-scoring visuals are selected and stored for use in the final response.

### Research Roadmap Generation

Transforming a conversation into a **visual learning path**:

```mermaid
flowchart LR
    A["Conversation Data"] --> B["Roadmap Planning"]
    B --> C["Validate & Repair"]
    C --> D["Research Roadmap"]
    D --> E["Lazy Node Enrichment"]
    E --> F["Questions + Docs + Videos + Papers"]
```

### Roadmap Planning

Veritas analyzes the conversation and generates a structured research roadmap with a single root and hierarchical learning nodes.

### Validation & Repair

The generated roadmap is validated to ensure valid node types, unique IDs, a single root, and valid parent relationships.

### Research Roadmap

The validated nodes and relationships form a visual learning path from the main topic to related branches and concepts.

### Lazy Node Enrichment

Additional resources are retrieved only when a roadmap node is explored, keeping initial roadmap generation lightweight.

### Enriched Resources

Each explored node can provide:

- Related research questions
- Documentation
- Videos
- Research papers

### Research Notes Generation

Turning a conversation into a **structured PDF**:

```mermaid
flowchart LR
    A["Chat Data"] --> B["Source Extraction"]
    B --> C["Notes Plan"]
    C --> D["Retrieve Existing Evidence"]
    D --> E["Select Relevant Evidence"]
    E --> F["Generate Notes"]
    F --> G["Attach Citations"]
    G --> H["Further Reading"]
    H --> I["Render PDF"]
```

### Source Extraction

Veritas extracts the conversation summary, user questions, answer summaries, citations, and previously discovered resources.

### Notes Planning

The system creates a structured notes plan and maps each section to the relevant existing sources.

### Evidence Retrieval

Content is retrieved from the **already-cited sources**, ensuring that the notes remain grounded in the evidence collected during the conversation.

### Evidence Selection

Relevant sections of the retrieved content are selected based on their relevance to each planned notes section.

### Notes Generation

The selected evidence is transformed into structured study material rather than simply reproducing the original conversation.

### Citation Attachment

Source metadata is attached to the generated notes so that supporting references remain traceable.

### Further Reading

Additional learning resources are generated based on the research topic.

### PDF Rendering

The completed notes are rendered into a structured PDF with formatted content, citations, code, mathematics, and further-reading resources.

---

## 🛠 Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool |
| **React Router** | Navigation |
| **Tailwind CSS + SCSS** | Styling |
| **Context API** | State management |
| **Web Speech API** | Voice input/output |

### Backend
| Tech | Purpose |
|------|---------|
| **Node.js 18** | Runtime |
| **Express** | Web framework |
| **MongoDB + Mongoose** | Primary database |
| **Atlas Vector Search** | Semantic PDF retrieval |
| **JWT + bcrypt** | Authentication |
| **Nodemailer** | Email verification |

### AI & External APIs
| Service | Purpose |
|---------|---------|
| **DeepSeek** | Reasoning, streaming, vision verification |
| **Google Gemini** | Image analysis, embeddings |
| **Exa** | Real-time web search + contents |
| **YouTube Data API** | Educational videos |
| **ImageKit** | Image + PDF persistent storage |

---

## 🗂️ Project Structure

```text
Veritas/
│
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       │   ├── deepseek/
│       │   ├── exa/
│       │   ├── gemini/
│       │   ├── intents/
│       │   ├── notes/
│       │   ├── pdf/
│       │   ├── roadmap/
│       │   ├── routing/
│       │   └── visuals/
│       ├── utils/
│       ├── validators/
│       ├── tests/
│       ├── app.js
│       └── server.js
│
├── frontend/
│   └── src/
│       ├── features/
│       │   ├── auth/
│       │   └── Chats/
│       ├── layouts/
│       ├── App.jsx
│       ├── AppRoutes.jsx
│       └── main.jsx
│
├── .env
├── .gitignore
└── README.md
```
---

## 🚀 Getting Started

### Prerequisites

Before running Veritas locally, make sure you have:

- **Node.js 18+**
- **MongoDB** — local installation or MongoDB Atlas
- API credentials for:
  - DeepSeek
  - Gemini
  - Exa
  - YouTube Data API
  - ImageKit
  - Gmail / SMTP

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Ha1AY3/Veritas.git
cd Veritas
```

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

#### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### Configuration

Create a `.env` file inside the `backend/` directory:

```env
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_uri

# Authentication
JWT_SECRET=your_jwt_secret

# AI / Research
DEEPSEEK_API_KEY=your_key
GEMINI_API_KEY=your_key
EXA_API_KEY=your_key
YOUTUBE_API_KEY=your_key

# Media Storage
IMAGEKIT_PRIVATE_KEY=your_key

# Email
GMAIL_USER=your_email
GMAIL_APP_PASSWORD=your_app_password

# Frontend
CLIENT_URL=http://localhost:5173
```

> 🔐 **Security:** Never commit your `.env` file or expose API keys in the repository.

### Run

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

The application will be available at:

- **Frontend:** `http://localhost:5173`
- **Backend:** `http://localhost:5000`

---

## ⚡ Performance & Optimization

Veritas is designed around **parallel execution, bounded LLM context, intelligent routing, and asynchronous background processing**.

### Latency Optimizations

| Optimization | Implementation | Benefit |
| :--- | :--- | :--- |
| **Parallel Exa Search** | 3 complementary searches execute concurrently | Reduces retrieval latency |
| **Combined LLM Calls** | Answer + related questions generated together where possible | Reduces redundant inference |
| **Bounded Context** | Summary + latest answer + recent messages | Prevents context growth with conversation length |
| **Background Enrichment** | Visual retrieval and summaries run asynchronously | Does not block the response |
| **Intent Routing** | Skips unnecessary research for simple requests | Avoids unnecessary API calls |
| **Lazy Visual Retrieval** | Visual search runs only when a visual is useful | Reduces unnecessary retrieval |
| **Retry with Backoff** | Handles transient API failures | Improves reliability |

### Response Latency

| Scenario | Typical Latency |
| :--- | :---: |
| Simple query / greeting | ~1–2s |
| Standard research query | ~2.5–4s |
| Image analysis | ~2.5–4s |
| PDF hybrid research | ~4–6s |

> **Note:** Latency varies depending on network conditions, external API response times, model load, query complexity, and retrieved content size.

### Context & Storage Characteristics

| Metric | Design |
| :--- | :--- |
| **LLM context** | Bounded / approximately ~500 tokens |
| **Conversation storage** | O(n) — complete conversation retained in MongoDB |
| **Recent context** | Fixed number of recent messages |
| **Conversation summaries** | Preserve older context without sending full history |
| **Caching** | Redis-ready for frequently accessed data |

---

## 🧩 Engineering Principles

| Principle | How Veritas Applies It |
| :--- | :--- |
| **Single Responsibility** | Each service focuses on one well-defined responsibility |
| **Separation of Concerns** | Controllers handle HTTP; services handle business logic |
| **Feature-Based Organization** | Complex functionality is grouped into focused service modules |
| **Fail Gracefully** | External API failures use fallbacks and controlled error handling |
| **Defensive Programming** | Inputs, API responses, IDs, and external data are validated |
| **Consistent Interfaces** | Services follow predictable success/error response structures |
| **Database Constraints** | Unique indexes and schema validation prevent invalid duplicates |
| **User Scoping** | User-owned resources are queried with `userId` constraints |
| **Async by Default** | Non-critical enrichment tasks run without blocking the main response |
| **Cost Awareness** | Redundant LLM calls are minimized and retrieval is performed conditionally |
| **Lazy Execution** | Expensive visual and roadmap enrichment occurs only when needed |
| **Evidence Preservation** | Source IDs and citation metadata are carried through the generation pipeline |
| **Version Everything** | Research roadmaps maintain version history for iterative changes |
| **Modular Integrations** | AI and external providers are isolated behind dedicated services |

---

## 🛡️ Reliability & Defensive Design

Veritas treats external AI and retrieval services as unreliable dependencies and uses controlled failure handling.

- **Retry with exponential backoff** for transient API failures
- **429 / 503 handling** for rate limits and temporary service failures
- **Fallback paths** when external services fail
- **Input validation** before processing requests
- **Response validation** for external API and LLM outputs
- **Graceful degradation** when optional services are unavailable
- **User-scoped database queries** to prevent cross-user data access
- **Database constraints** to prevent duplicate or invalid records

---

## 💰 Cost-Aware Architecture

Veritas minimizes unnecessary API and LLM usage through conditional execution.

### Optimization Strategies

- Skip web research when the request does not require external information
- Skip visual retrieval when a visual does not materially improve the answer
- Reuse PDF evidence before performing additional web research
- Combine related outputs into a single LLM call where practical
- Run expensive enrichment tasks asynchronously
- Cache roadmap node enrichment
- Limit the number of sources passed to the LLM
- Use summaries instead of sending complete conversation history
- Perform parallel retrieval to reduce duplicated waiting time

### Resource-Aware Research

The research pipeline adapts retrieval based on the user's request:

- **Web research** → Exa
- **PDF research** → Atlas Vector Search
- **PDF + Web** → Hybrid retrieval
- **Videos** → YouTube
- **Documentation / papers** → Resource-specific retrieval
- **Visual research** → Exa + image extraction + DeepSeek Vision

> The goal is to use the **minimum necessary retrieval and inference work** while preserving answer quality and evidence traceability.

