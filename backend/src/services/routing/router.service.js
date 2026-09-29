
export function classifyRequest(message, hasImage = false) {
    const msg = message.toLowerCase().trim();

    if (hasImage) {
        return { intent: "image", mode: "standard", confidence: 1.0 };
    }

    const conversationExact = [
        // Greetings
        "hello", "hi", "hey", "heyy", "heyyy",
        "hiya", "howdy", "greetings", "yo", "sup",
        "what's up", "whats up", "wassup", "wazzup",
        "hey there", "hi there", "hello there",
        "good morning", "good afternoon", "good evening",
        "morning", "afternoon", "evening",

        // Acknowledgements
        "ok", "okay", "k", "kk",
        "alright", "all right",
        "got it", "understood",
        "i see", "makes sense", "that makes sense",
        "sure", "fine",
        "sounds good", "fair enough",

        // Positive reactions
        "cool", "nice", "great",
        "awesome", "perfect",
        "excellent", "amazing",
        "wonderful", "brilliant",

        // Agreement
        "yes", "yeah", "yep", "yup", "yea",
        "correct", "right", "exactly", "true",

        // Disagreement
        "no", "nope", "nah",
        "not really",

        // Thanks
        "thanks", "thank you",
        "ty", "thx",
        "thanks a lot",
        "thank you so much",
        "thanks so much",
        "appreciate it",
        "much appreciated",

        // Short reactions
        "wow",
        "woah",
        "whoa",

        // Farewells
        "bye",
        "goodbye",
        "see you",
        "see ya",
        "talk later",
        "later",
        "good night",
        "gn",
        "take care"
    ];

    const conversationPatterns = [
        // Greetings
        /^how are you[.!?]*$/i,
        /^how are you doing[.!?]*$/i,
        /^how'?s it going[.!?]*$/i,
        /^how is it going[.!?]*$/i,

        /^are you there[.!?]*$/i,
        /^you there[.!?]*$/i,

        /^nice to meet you[.!?]*$/i,
        /^good to meet you[.!?]*$/i,

        /^how about you[.!?]*$/i,
        /^what about you[.!?]*$/i,
        /^and you[.!?]*$/i,
        
        // User Mood

        /^i('?| a)m (good|fine|okay|ok|great|well)[.!?]*$/i,

        /^i('?| a)m doing (good|well|fine|okay|ok|great)[.!?]*$/i,

        /^doing (good|well|fine|okay|great)[.!?]*$/i,

        /^not bad[.!?]*$/i,
        /^pretty good[.!?]*$/i,
        /^all good[.!?]*$/i,
        /^could be better[.!?]*$/i,

        /^i('?| a)m (happy|sad|excited|tired|sleepy|hungry|bored|busy|nervous|stressed)[.!?]*$/i,

        // Identity

        /^my name is\s+[a-zA-Z][a-zA-Z\s'-]{0,40}[.!?]*$/i,

        /^call me\s+[a-zA-Z][a-zA-Z\s'-]{0,40}[.!?]*$/i,

        /^you can call me\s+[a-zA-Z][a-zA-Z\s'-]{0,40}[.!?]*$/i,

        // Assistant
        /^who are you[.!?]*$/i,

        /^what are you[.!?]*$/i,

        /^what can you do[.!?]*$/i,

        /^can you help me[.!?]*$/i,

        /^will you help me[.!?]*$/i,

        // Thanks / Apology
        /^thanks\b/i,

        /^thank you\b/i,

        /^appreciate it\b/i,

        /^sorry\b/i,

        /^i('?| a)m sorry\b/i,

        /^my bad\b/i,

        // Conversation control
        /^never ?mind[.!?]*$/i,

        /^forget it[.!?]*$/i,

        /^ignore that[.!?]*$/i,

        /^leave it[.!?]*$/i,

        /^continue[.!?]*$/i,

        /^go on[.!?]*$/i,

        // Emotional
        /^i love you[.!?]*$/i,

        /^love you[.!?]*$/i,

        /^i hate you[.!?]*$/i,

        /^hate you[.!?]*$/i,

        /^you('?| a)re awesome[.!?]*$/i,

        /^you('?| a)re nice[.!?]*$/i,

        /^you('?| a)re annoying[.!?]*$/i,

        // Short Feedback
        /^good job[.!?]*$/i,

        /^great job[.!?]*$/i,

        /^nice work[.!?]*$/i,

        /^well done[.!?]*$/i,

        /^that('?| i)s helpful[.!?]*$/i,

        /^that helps[.!?]*$/i,

        /^good answer[.!?]*$/i,

        /^great answer[.!?]*$/i,

        // Chat fillers
        /^haha+[.!?]*$/i,

        /^lol+[.!?]*$/i,

        /^lmao[.!?]*$/i,

        /^really[.!?]*$/i,

        /^interesting[.!?]*$/i,

        /^same here[.!?]*$/i,

        /^me too[.!?]*$/i,

        // Talking about their day
        /^my day (is|was|has been) (good|great|fine|okay|ok|bad|busy|amazing|wonderful|long|productive)[.!?]*$/i,

        /^my day is going (good|great|well|fine|okay)[.!?]*$/i,

        /^today (is|was) (good|great|busy|fine|okay|bad)[.!?]*$/i,

        /^it's been (good|great|busy|fine|okay|bad)[.!?]*$/i,

        /^been (good|great|busy|fine|okay|bad)[.!?]*$/i,

        /^(can we|could we) talk[.!?]*$/i,

        /^let'?s talk[.!?]*$/i,

        /^talk to me[.!?]*$/i,

        /^i want to talk( to you)?[.!?]*$/i,

        /^i need someone to talk to[.!?]*$/i,

        /^can i talk to you[.!?]*$/i,

        /^i just want to chat[.!?]*$/i,

        /^can we chat[.!?]*$/i,

        /^(not much)[.!?]*$/i,

        /^(nothing much)[.!?]*$/i,

        /^(same here)[.!?]*$/i,

        /^(me too)[.!?]*$/i,

        /^(you too)[.!?]*$/i,

        /^(same)[.!?]*$/i,

        /^(not really)[.!?]*$/i,

        /^i('?| a)m (okay|ok|good|fine|great|well)[.!?]*$/i,

        /^i('?| a)m doing (good|great|well|fine|okay)[.!?]*$/i,

        /^doing (good|great|well|fine|okay)[.!?]*$/i,

        /^not bad[.!?]*$/i,

        /^pretty good[.!?]*$/i,

        /^all good[.!?]*$/i,

        /^could be better[.!?]*$/i,

        /^i('?| a)m happy[.!?]*$/i,

        /^i('?| a)m sad[.!?]*$/i,

        /^i('?| a)m tired[.!?]*$/i,

        /^i('?| a)m bored[.!?]*$/i,

        /^i('?| a)m stressed[.!?]*$/i,

        /^i('?| a)m excited[.!?]*$/i,
    ];
    if (conversationExact.includes(msg) || conversationPatterns.some(pattern => pattern.test(msg))) {
        return { intent: "conversation", mode: "standard", confidence: 1.0 };
    }

    const opinionKeywords = [
        // Opinion
        "what do you think",
        "what do you think about",
        "what are your thoughts",
        "your thoughts",
        "what's your opinion",
        "in your opinion",
        "what's your view",
        "how do you feel about",
        "what's your take",
        "what is your take",
        "what's your perspective",
        "what is your perspective",

        // Recommendation
        "would you recommend",
        "do you recommend",
        "should i",
        "should we",
        "should i use",
        "should i learn",
        "should i choose",
        "which should i choose",
        "which would you choose",
        "which would you recommend",
        "if you were me",
        "what would you do",
        "what would you choose",

        // Preference
        "which is better",
        "which one is better",
        "which is best",
        "which one is best",
        "what do you prefer",
        "which do you prefer",
        "would you rather",
        "your favorite",

        // Worth / Value
        "is it worth",
        "is it worth it",
        "is it worth learning",
        "is it worth buying",
        "is it worth using",

        // Belief
        "do you think",
        "do you believe",
        "would you say",
        "would you agree",
        "do you agree",

        // Advice
        "any advice",
        "what do you suggest",
        "what would you suggest",
        "what do you advise",
        "what would you advise",

        "why do you think",
        "why would you",
        "convince me",
        "would it be better",
        "do you personally think",
        "would it make sense",
        "is it a good idea",
        "would it be a good idea",
        "would you go with",
        "which one would you pick"
    ];

    const opinionPatterns = [
        /^should i\b/i,
        /^should we\b/i,
        /^if you were me\b/i,
        /^what would you do\b/i,
        /^which would you choose\b/i,
        /^would you recommend\b/i,
        /^do you recommend\b/i
    ];

    const isOpinion =
        opinionKeywords.some(k => msg.includes(k)) ||
        opinionPatterns.some(p => p.test(msg));

    if (isOpinion) {
        return {
            intent: "opinion",
            mode: "standard",
            confidence: 0.9
        };
    }

    // ──────────────────────────────────────────────
    // 4. LEARNING SUPPORT INTENT
    // ──────────────────────────────────────────────
    const learningKeywords = [
        // Simpler explanation
        "simplify",
        "simplify this",
        "explain simply",
        "in simple terms",
        "simpler explanation",
        "easy explanation",
        "make it simpler",
        "dumb it down",
        "eli5",
        "explain like i'm five",
        "explain like i am five",
        "explain like a beginner",

        // Doesn't understand
        "i don't understand",
        "i dont understand",
        "i'm confused",
        "im confused",
        "confused",
        "not clear",
        "unclear",
        "hard to understand",
        "too difficult",
        "this is confusing",
        "i'm lost",
        "im lost",

        // Explain again
        "explain again",
        "say that again",
        "repeat that",
        "go over it again",
        "re-explain",
        "explain one more time",
        "once more",
        "again",

        // Expand
        "tell me more",
        "elaborate",
        "expand on",
        "go deeper",
        "more details",
        "more detail",
        "explain further",
        "continue explaining",

        // Examples
        "give an example",
        "another example",
        "example please",
        "real world example",
        "practical example",
        "show an example",

        // Breakdown
        "break it down",
        "step by step",
        "walk me through",
        "explain each step",

        // Analogies
        "use an analogy",
        "analogy",
        "compare it to",
        "real life analogy",

        // Clarification
        "clarify",
        "what do you mean",
        "what does that mean",
        "can you clarify",
        "help me understand",

        // Shorter / longer
        "summarize that",
        "short version",
        "long version",
        "explain briefly",
        "explain in detail"
    ];

    const followupPatterns = [
        // Previous answer references
        /explain that/i,
        /explain this/i,
        /that part/i,
        /this part/i,
        /the previous answer/i,
        /the earlier answer/i,
        /your previous answer/i,
        /what about that/i,
        /tell me about that/i,
        /what do you mean by/i,

        // Follow-up clarification
        /^why\??$/i,
        /^how\??$/i,
        /^why is that\??$/i,
        /^how so\??$/i,
        /^can you explain\??$/i,
        /^can you elaborate\??$/i,
        /^can you expand\??$/i,

        // Topic continuation
        /^what about (that|this)\??$/i,
        /^tell me more\??$/i,
        /^go deeper\??$/i,
        /^more details\??$/i,
        /^another example\??$/i,
        /^give me an example\??$/i,

        // Beginner requests
        /^eli5\??$/i,
        /^explain like i'm five\??$/i,
        /^break it down\??$/i,
        /^step by step\??$/i
    ];

    const isLearning = learningKeywords.some(k => msg.includes(k));
    const isFollowup = followupPatterns.some(p => p.test(msg));

    if (isLearning || isFollowup) {
        return { intent: "learning_support", mode: "standard", confidence: 0.9 };
    }

    const mathSubjects = [
        "calculus", "algebra", "geometry", "matrix", "vector",
        "probability", "statistics", "trigonometry", "logarithm",
        "equation", "derivative", "integral", "differentiate",
        "integration", "differentiation", "limits"
    ];

    // Math research — only if it's about a math subject
    const mathResearchKeywords = [
        "history of", "who discovered", "who invented", "origins of",
        "when was", "who created", "mathematician", "mathematical history"
    ];

    const isMathSubject = mathSubjects.some(s => msg.includes(s));
    const isMathResearch = isMathSubject && mathResearchKeywords.some(k => msg.includes(k));

    if (isMathResearch) {
        return { intent: "math", mode: "research", confidence: 0.9 };
    }

    // Math solve — only on actual equations or math keywords
    const mathKeywords = [
        "solve", "calculate", "evaluate", "equation", "formula",
        "derivative", "integral", "differentiate", "algebra",
        "geometry", "trigonometry", "statistics",
        "calculus", "matrix", "vector", "probability", "limits",
        "logarithm", "linear algebra", "integration", "differentiation"
    ];

    // Only trigger on actual math expressions, not version numbers
    const hasEquation = /(\d+\s*[\+\-\*\/=]\s*\d+)/.test(msg); 
    const hasVariable = /\b(x|y|z)\b/.test(msg); 
    const hasMathKeywords = mathKeywords.some(k => msg.includes(k));

    if (hasEquation || hasVariable || hasMathKeywords) {
        return { intent: "math", mode: "solve", confidence: 0.85 };
    }

    const comparisonKeywords = [
        "compare", "versus", "vs", "difference", "better",
        "which is", "which one", "should i choose", "pros and cons"
    ];
    if (comparisonKeywords.some(k => msg.includes(k))) {
        return { intent: "research", mode: "comparison", confidence: 0.95 };
    }

    const codeKeywords = [
        // General programming
        "code", "coding", "programming",
        "function", "method", "class", "object",
        "interface", "inheritance", "polymorphism",
        "encapsulation", "abstraction",
        "algorithm", "data structure",

        // Languages
        "javascript", "typescript", "python",
        "java", "kotlin", "swift",
        "rust", "go", "golang",
        "php", "ruby", "c", "c++", "c#",
        "scala", "perl", "r",

        // Frontend
        "react", "reactjs",
        "vue", "vuejs",
        "angular",
        "next", "next.js", "nextjs",
        "nuxt", "nuxt.js",
        "svelte", "sveltekit",
        "solidjs",
        "astro",
        "vite",
        "webpack",
        "babel",
        "tailwind",
        "bootstrap",
        "redux",
        "zustand",
        "mobx",

        // Backend
        "node", "nodejs",
        "express", "nestjs",
        "django",
        "flask",
        "fastapi",
        "spring", "springboot",
        "laravel",
        "asp.net",

        // Databases
        "sql",
        "mysql",
        "postgresql",
        "postgres",
        "mongodb",
        "redis",
        "sqlite",
        "firebase",
        "supabase",
        "prisma",
        "mongoose",

        // APIs
        "api",
        "rest",
        "rest api",
        "graphql",
        "grpc",
        "sdk",

        // DevOps / Cloud
        "docker",
        "kubernetes",
        "k8s",
        "terraform",
        "ansible",
        "jenkins",
        "github actions",
        "aws",
        "azure",
        "gcp",
        "vercel",
        "netlify",

        // Git
        "git",
        "github",
        "gitlab",
        "bitbucket",
        "branch",
        "commit",
        "merge",
        "pull request",
        "pr",

        // Build / Tooling
        "npm",
        "yarn",
        "pnpm",
        "eslint",
        "prettier",
        "jest",
        "vitest",
        "playwright",
        "cypress",

        // Debugging
        "debug",
        "debugging",
        "bug",
        "error",
        "exception",
        "stack trace",
        "syntax error",
        "runtime error",
        "compiler",
        "interpreter",

        // Concepts
        "oop",
        "recursion",
        "async",
        "await",
        "promise",
        "callback",
        "closure",
        "hoisting",
        "memoization",
        "multithreading",
        "concurrency"
    ];
    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    const isCode = codeKeywords.some(k => new RegExp(`\\b${escapeRegex(k)}\\b`, "i").test(msg));

    if (isCode) {

        return {
            intent: "research",
            confidence: 0.9
        };
    }

    return { intent: "research", confidence: 0.8 };
}