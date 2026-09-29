import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/chats`,
    withCredentials: true
})

export async function generateResearchRoadmap(chatId){

    if(!chatId){
        throw new Error("Chat ID is required");
    }
    
    try{
        const response = await api.post(`${chatId}/roadmaps`);
    
        return response.data;
    }catch(error){
        console.error("Generate research roadmap error: ", error.response?.data || error.message);
        throw error;
    }
}

export async function getResearchRoadmaps(chatId){

    if(!chatId){
        throw new Error("Chat ID is required");
    }

    try{
        const response = await api.get(`${chatId}/roadmaps`);

        return response.data;
    }catch(error){
        console.error("Get research roadmap error: ", error.response?.data || error.message);
        throw error;
    }
}

export async function getResearchRoadmapById(chatId, roadmapId){
    if(!chatId){
        throw new Error("Chat ID is required");
    }

    if(!roadmapId){
        throw new Error("Roadmap ID is required");
    }

    try{
        const response = await api.get(`${chatId}/roadmaps/${roadmapId}`);

        return response.data;
    }catch(error){
        console.error("Get research roadmap by ID error:",error.response?.data || error.message);

        throw error;
    }
}

export async function enrichResearchRoadmapNode(chatId, roadmapId, nodeId) {
    if (!chatId) throw new Error("Chat ID is required");
    if (!roadmapId) throw new Error("Roadmap ID is required");
    if (!nodeId) throw new Error("Node ID is required");

    try {
        const response = await api.post(`${chatId}/roadmaps/${roadmapId}/nodes/${nodeId}/enrich`);

        return response.data;
    } catch (error) {
        console.error("Enrich research roadmap node error:", error.response?.data || error.message );
        throw error;
    }
}

export async function deleteResearchRoadmap(chatId, roadmapId){

    if(!chatId){
        throw new Error("Chat ID is required");
    }

    try{
        const response = await api.delete(`${chatId}/roadmaps/${roadmapId}`);

        return response.data;
    }catch(error){
        console.error("Delete research roadmap error: ", error.response?.data || error.message);
        throw error;
    }
}