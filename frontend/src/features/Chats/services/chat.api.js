import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/chats`,
    withCredentials: true
})

export async function sendMessage(message, conversationId, imageBase64, pdfDocumentId, onText, onCitation, onRelatedQuestions, onExploreMore, onDone, onError) {
    try {
        const response = await fetch(
            `${import.meta.env.VITE_API_URL}/api/chats/messages`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message,
                    conversationId,
                    imageBase64,
                    pdfDocumentId
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        if (!response.body) {
            throw new Error("Streaming response body is not available");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        let eventType = "message";

        while (true) {
            const { value, done } = await reader.read();

            if (done) {
                break;
            }

            buffer += decoder.decode(value, {
                stream: true
            });

            const lines = buffer.split("\n");

            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();

                if (!trimmed) {
                    continue;
                }

                if (trimmed.startsWith("event:")) {
                    eventType = trimmed.replace(/^event:\s*/, "");

                    continue;
                }

                if (!trimmed.startsWith("data:")) {
                    continue;
                }

                const data = trimmed.replace(/^data:\s*/, "");

                let event;

                try {
                    event = JSON.parse(data);
                } catch (error) {
                    console.error("Failed to parse SSE:",data,error);

                    continue;
                }

                if (eventType === "text") {
                    onText?.(event.text);
                }

                if (eventType === "citation") {
                    onCitation?.(event.citation);
                }

                if (eventType === "relatedQuestions") {
                    onRelatedQuestions?.(event.questions);
                }

                if (eventType === "exploreMore") {
                    onExploreMore?.(event.resources);
                }

                if (eventType === "done") {
                    onDone?.(event);
                }

                if (eventType === "error") {
                    onError?.(new Error(event.message || "Streaming failed"));
                }
            }
        }

        return true;

    } catch (error) {
        console.error("endMessage streaming error:",error);
        onError?.(error);

        return false;
    }
}

export async function uploadPdf(pdfFile) {
    if (!pdfFile) {
        throw new Error("PDF file is required");
    }

    const formData = new FormData();

    formData.append("file", pdfFile);

    const response = await api.post("/pdf", formData);

    const data = response.data;

    if (!data.success) {
        throw new Error(data.message || "Failed to upload PDF");
    }

    return data;
}

export async function getVisualStatus(messageId) {

    try {
        const response = await api.get(`/messages/${messageId}/visual`);

        return response.data;
    } catch (error) {
        console.error("Visual status API error:", error.response?.status, error.response?.data, error.message);
    }

    return response.data;
}

export async function createNewChat() {
    const response = await api.post("/");

    return response.data;
}


export async function getChats() {
    const response = await api.get("/");

    return response.data;
}

export async function getChatById(chatId) {
    const response = await api.get(`/${chatId}`);

    return response.data;
}

export async function deleteChat(chatId) {
    const response = await api.delete(`/${chatId}`);

    return response.data;
}