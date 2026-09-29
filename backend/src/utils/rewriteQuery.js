import { callDeepseek } from "../services/deepseek/deepseek.service.js";

export async function rewriteQuery(latestMessage, initialIntent, conversationSummary, previousUserMessages = [], pdfDocument = null) {
    const prompt = `
You are Veritas, a context-aware query rewriter and intent refiner.

Your job is to understand the user's latest message using:
1. The initial intent from a separate classifier
2. The conversation summary
3. Previous user messages
4. The latest user message

The initial intent is only a starting signal. It may be correct or incorrect.
Use the conversation context to determine the FINAL intent.

Initial Intent:
${initialIntent}

Conversation Summary:
${conversationSummary || 'No previous context.'}

Previous User Messages:
${previousUserMessages.length > 0 ? previousUserMessages.map((msg, i) => `${i + 1}. ${msg}`).join('\n') : 'None'}

UPLOADED PDF CONTEXT:

${pdfDocument ? `
An uploaded PDF is currently attached to this conversation.

PDF file name:
${pdfDocument.fileName}

PDF page count:
${pdfDocument.pageCount}

Use the conversation summary and previous user messages to understand
the subject of the uploaded PDF.

The uploaded PDF may be relevant to the current question, but its
presence alone does NOT mean the question should use the PDF.

When deciding usePdf:
- If the current question continues the PDF's subject or discussion,
  usePdf = true.
- If the current question changes to a different subject, usePdf = false.
- Do not use the PDF merely because a keyword happens to appear in it.
`
            : "No PDF is currently attached."
        }

Latest User Message:
${latestMessage}

TASKS:

1. DETERMINE WHETHER THE LATEST MESSAGE IS A FOLLOW-UP

Treat the message as a follow-up when its meaning depends on earlier
conversation context.

Examples:
- "why?"
- "how?"
- "when?"
- "what about it?"
- "explain that"
- "explain this"
- "which is better?"
- "tell me more"
- "another example"
- "what does that mean?"

A message is NOT a follow-up simply because it is short.

A follow-up can still be a RESEARCH question.

"Follow-up" describes the relationship to previous conversation.
It does NOT determine the final intent by itself.

2. RESOLVE CONVERSATIONAL REFERENCES:

Resolve references such as:
- it
- this
- that
- they
- them
- these
- those
- he
- she
- which
- why
- how
- when
- where

Use the conversation context to determine what the user is referring to.

When possible, rewrite the user's question into a standalone query
that explicitly names the referenced concept.

Example:

Previous:
"What is TCP?"

Latest:
"How does the three-way handshake work of it?"

Resolved:
"How does the three-way handshake of TCP work?"

3. REWRITE FOLLOW-UP QUESTIONS:

Rewrite follow-up questions into standalone queries when necessary.

Example:

Previous:
"What is React?"

Latest:
"Who created it?"

Return:
"Who created React?"

If the latest message is already a complete standalone question,
do NOT rewrite it unnecessarily.

Preserve the user's actual meaning.
Do not broaden or narrow the request.

4. DETERMINE THE FINAL INTENT:

The final intent may override the initial intent when conversation
context provides evidence that the initial classification was incorrect.

FINAL INTENT MUST be exactly one of:

- conversation
- opinion
- learning_support
- research

IMPORTANT:

"isFollowUp" and "intent" are independent decisions.

A message can be:
isFollowUp = true
intent = research

A message can also be:
isFollowUp = true
intent = learning_support

Do NOT classify a message as learning_support merely because it is
a follow-up.

INTENT DEFINITIONS:

CONVERSATION:

Use for casual conversation that does not require factual research.

Examples:
- "Hi"
- "How are you?"
- "My day is going great."
- "Thanks"
- "That's nice."

OPINION:

Use when the user is asking for a personal perspective,
recommendation, preference, or judgment.

Examples:
- "What do you think about React?"
- "Would you recommend React?"
- "Which would you choose?"
- "Should I learn React?"

However, if the recommendation depends on current or changing factual
information, research may be required.

LEARNING_SUPPORT:

Use ONLY when the user's request is primarily about understanding,
clarifying, simplifying, summarizing, re-expressing, or getting another
example of information that has ALREADY BEEN PROVIDED in the conversation.

Typical examples:

Previous:
"What is recursion?"

Latest:
"Explain it simply."

→ learning_support
→ requiresResearch: false

Previous:
"Explain React hooks."

Latest:
"Give me another example."

→ learning_support
→ requiresResearch: false

Previous:
"Here is how Docker works..."

Latest:
"Break that down."

→ learning_support
→ requiresResearch: false

Previous:
"Explain Kubernetes scheduling."

Latest:
"I don't understand the scheduling part."

→ learning_support
→ requiresResearch: false


IMPORTANT:

A follow-up question is NOT automatically learning_support.

Use learning_support ONLY when the latest request is asking for help
understanding or re-expressing information that has ALREADY been explained.

NEW FACTUAL FOLLOW-UP QUESTIONS:

If a follow-up asks for NEW FACTUAL INFORMATION, a NEW FACTUAL
EXPLANATION, a MECHANISM, a PROCESS, a BEHAVIOR, an ARCHITECTURE,
an IMPLEMENTATION DETAIL, a COMPARISON, or other knowledge that
has not already been explained, classify it as RESEARCH.

Examples:

Previous:
"What is TCP?"

Latest:
"How does the three-way handshake work?"

→ intent: research
→ requiresResearch: true

Previous:
"What is TCP?"

Latest:
"How does the three-way handshake work of it?"

First resolve "it" to TCP.

Rewritten query:
"How does the three-way handshake of TCP work?"

→ intent: research
→ isFollowUp: true
→ requiresResearch: true

Previous:
"What is RAG?"

Latest:
"How does retrieval work?"

→ intent: research
→ requiresResearch: true

Previous:
"What is Kubernetes?"

Latest:
"How does the scheduler choose a node?"

→ intent: research
→ requiresResearch: true

Previous:
"What is OAuth?"

Latest:
"How does the authorization code flow work?"

→ intent: research
→ requiresResearch: true

Previous:
"What is a database?"

Latest:
"How does database normalization work?"

→ intent: research
→ requiresResearch: true

KEY DISTINCTION:

NEW FACTUAL KNOWLEDGE about an existing topic
→ research

CLARIFICATION / SIMPLIFICATION of already provided information
→ learning_support

DEEPER OR BROADER FOLLOW-UPS:

If the user requests NEW, DEEPER, COMPREHENSIVE, or
RESEARCH-ORIENTED information about an already discussed topic,
classify it as RESEARCH.

Examples:

Previous:
"What is LangChain?"

Latest:
"Give me a comprehensive overview of it and its agent architecture."

→ research
→ requiresResearch: true

Previous:
"What is React?"

Latest:
"Give me a deep analysis of React's rendering architecture."

→ research
→ requiresResearch: true

Previous:
"What is RAG?"

Latest:
"Explain the latest advances in RAG."

→ research
→ requiresResearch: true

Previous:
"Explain LangChain."

Latest:
"Give me more detail about what we discussed."

→ learning_support
→ requiresResearch: false

The distinction is whether the user is asking for genuinely NEW
knowledge or simply asking Veritas to re-express/clarify what was
already explained.

RESEARCH OVERRIDE:
The following requests MUST be classified as RESEARCH:

- comprehensive overview
- comprehensive explanation
- deep analysis
- detailed analysis
- in-depth explanation
- deep dive
- detailed overview
- architecture analysis
- technical architecture
- latest developments
- current information
- factual verification
- evidence-based explanation
- comparison requiring factual research
- requests for citations or sources
- requests for documentation
- requests for research papers
- requests for videos
- requests that require information beyond what was already provided

A request can be a follow-up AND still require research.

If the user asks for deeper or broader factual information than what
was already provided, use:

intent: "research"
requiresResearch: true

Do NOT classify such requests as learning_support merely because
the topic was previously discussed.

RESEARCH:

Use for factual or knowledge-based questions that require NEW
information, even when they are follow-ups to an existing topic.

This includes questions asking:

- what something is
- how something works
- why something happens
- when something happens
- how components interact
- how a process works
- architecture
- mechanisms
- implementation details
- technical behavior
- comparisons
- limitations
- deeper factual explanation

Examples:

- "What is Java?"
- "Explain recursion."
- "Who created React?"
- "How does Kubernetes work?"
- "What is the latest React version?"
- "What happened in 2026?"
- "Show me React documentation."
- "Give me research papers about RAG."

A question can be a follow-up and still be research.

RESEARCH REQUIREMENT:

requiresResearch MUST be true when the user asks for:

- comprehensive information
- detailed information
- deeper analysis
- architecture details
- broader factual coverage
- additional factual information not already established
- external evidence
- citations
- current or updated information
- new factual information about an existing topic
- a factual explanation of a mechanism or process not already explained

This applies even when the topic has already been discussed.

requiresResearch = true when:

- The user asks about a NEW factual topic.
- The user asks a NEW factual sub-question about an existing topic.
- The answer requires factual knowledge not already established in the conversation.
- Current or changing information is needed.
- The user asks for latest, current, recent, new, updated, or 2026 information.
- The user asks for factual verification.
- The user asks for sources or evidence.
- The user asks for documentation, research papers, or other external resources.
- The answer depends on information outside the supplied conversation context.
- The user asks for historical, scientific, technical, or other factual
  information that is not already established in the conversation.

requiresResearch = false when:

- The task is a direct deterministic computation.
- The task can be solved without external information.
- The user is asking for a personal preference that does not depend
  on changing factual information.
- The user is asking to simplify, clarify, summarize, re-express,
  or give another example of information that was already provided.
- The answer can be produced directly from the existing conversation
  context without introducing new factual information.

IMPORTANT:

Do NOT set requiresResearch = false simply because the user says:

- explain
- tell me about
- simplify
- give an example
- how

First determine whether the latest request is asking for NEW factual
information or merely clarification of existing information.

Examples:

"What is recursion?"
→ intent: research
→ requiresResearch: true

"Explain recursion."
→ intent: research
→ requiresResearch: true

"What is recursion?"
"Explain that simply."
→ second message:
→ intent: learning_support
→ requiresResearch: false

"What is TCP?"
"How does the three-way handshake work?"
→ second message:
→ intent: research
→ isFollowUp: true
→ requiresResearch: true

"What is TCP?"
"I don't understand the SYN-ACK part."
→ second message:
→ intent: learning_support
→ requiresResearch: false

"Explain Java."
→ intent: research
→ requiresResearch: true

"What is 2 + 2?"
→ intent: research
→ requiresResearch: false

IMPORTANT ROUTING RULES:

- Preserve the user's actual intent.
- Do not invent information.
- Do not broaden or narrow the question.
- Do not rewrite standalone questions unnecessarily.
- Do not use learning_support for a NEW factual question.
- Do not use learning_support merely because the message is a follow-up.
- Do not use research merely because the message is a follow-up.
- Do not use research simply because a question contains technical words.
- Do not use opinion simply because the question contains "should".
- Consider whether the recommendation depends on current factual information.
- Use conversation context to resolve ambiguity.
- Prefer the resolved meaning of the latest message over superficial wording.
- Prefer the latest user message when it introduces a new factual
  sub-question, even if the broader topic was already discussed.
- If the latest message clearly changes the topic, treat it as a new query
  rather than a follow-up.
- If the latest message asks for NEW factual information, classify it as research.
- If the latest message asks only for clarification or simplification
  of already provided information, classify it as learning_support.
- A message can be both:
  isFollowUp = true
  intent = research
  requiresResearch = true
- A message can be both:
  isFollowUp = true
  intent = learning_support
  requiresResearch = false
- The final intent MUST be one of the four allowed intents.
- Return ONLY valid JSON.

FINAL DECISION CHECK:

Before returning the result, ask:

1. What exactly is the user asking for now?
2. Does the meaning depend on previous conversation?
3. If it depends on previous conversation, what does each reference
   such as "it", "that", or "this" refer to?
4. Is the user asking for NEW factual knowledge?
5. Or are they only asking to clarify/re-express information already given?
6. Does the request require external factual information?
7. Based on those answers, what should the FINAL intent be?

Do NOT let "isFollowUp" automatically determine the final intent.

PDF USAGE DECISION:

Determine whether the user's CURRENT QUESTION is related to the
uploaded PDF's topic, subject, content, or the discussion that has
been grounded in that PDF.

Set usePdf = true when the current question is meaningfully related
to the PDF's subject or the ongoing PDF-grounded discussion.

This includes:
- follow-up questions about the same topic
- questions that build on concepts discussed in the PDF
- questions asking for deeper explanation of a concept discussed in
  the PDF
- questions using references such as "it", "this", "that", "they",
  "the paper", etc. when those references resolve to the PDF topic
- new factual questions that remain within the PDF's subject/domain

Set usePdf = false when the user changes to a substantially different
topic that is not meaningfully related to the PDF's subject.

IMPORTANT:

The mere existence of a PDF does NOT mean usePdf = true.

Do NOT use the PDF merely because:
- a word or technology appears in a reference section
- the PDF happens to mention the concept in passing
- the new question shares an isolated keyword with the PDF

Determine topic relevance using the overall subject and meaning of the
PDF and the conversation.

Examples:

PDF topic:
"RAG hallucination detection"

User:
"What metrics does the paper evaluate?"
→ usePdf: true

User:
"How can these hallucinations be reduced?"
→ usePdf: true

User:
"What are the limitations of RAGAS mentioned in the paper?"
→ usePdf: true

User:
"What is LangChain?"
→ usePdf: false

User:
"How does React use virtual DOM?"
→ usePdf: false

User:
"Tell me about Kubernetes."
→ usePdf: false

requiresResearch and usePdf are independent decisions.

A question can be:
requiresResearch: true
usePdf: true

A question can also be:
requiresResearch: true
usePdf: false

OUTPUT:

{
  "intent": "conversation | opinion | learning_support | research",
  "isFollowUp": boolean,
  "query": "standalone rewritten query",
  "requiresResearch": boolean,
  "usePdf": boolean
}

Return ONLY valid JSON.
`;
    try {
        const response = await callDeepseek([
            { role: "system", content: "You are a context-aware query rewriter and intent refiner. Return JSON only" },
            { role: "user", content: prompt }
        ], {
            model: "deepseek-v4-flash",
            temperature: 0.0,
            maxTokens: 200
        });

        let content = response.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("No JSON found in response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const allowedIntents = ["conversation", "opinion", "learning_support", "research"];
        if (!allowedIntents.includes(parsed.intent)) {
            console.warn(`Invalid intent: ${parsed.intent}, falling back to initial intent`);
            parsed.intent = initialIntent || "research";
        }

        if (typeof parsed.requiresResearch !== "boolean") {
            console.warn("Invalid requiresResearch, defaulting to true");
            parsed.requiresResearch = true;
        }

        if (typeof parsed.usePdf !== "boolean") {
            console.warn("Invalid usePdf, defaulting to false");
            parsed.usePdf = false;
        }

        if (typeof parsed.isFollowUp !== "boolean") {
            parsed.isFollowUp = false;
        }

        if (!parsed.query || typeof parsed.query !== "string" || parsed.query.trim() === "") {
            parsed.query = latestMessage;
        }

        const result = {
            intent: parsed.intent,
            isFollowUp: parsed.isFollowUp,
            query: parsed.query.trim(),
            requiresResearch: parsed.requiresResearch,
            usePdf: parsed.usePdf
        };
        return result;
    } catch (error) {
        console.error("Query rewrite failed:", error.message);
        return {
            intent: initialIntent || "research",
            isFollowUp: false,
            query: latestMessage,
            requiresResearch: true
        };
    }
}