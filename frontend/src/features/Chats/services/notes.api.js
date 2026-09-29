import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/chats`,
    withCredentials: true
})

export async function downloadNotesPdf(chatId){
    if(!chatId){
        throw new Error("Chat ID is required");
    }
    const response = await api.post(`${chatId}/notes/pdf`, {}, {
        responseType: "blob"
    });

    return response;

}