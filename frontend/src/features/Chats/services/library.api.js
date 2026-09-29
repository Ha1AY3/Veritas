import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/save`,
    withCredentials: true
})


export async function getLibrary() {
    const response = await api.get('/');
    return response.data;
}


export async function saveToLibrary(resource) {
    const response = await api.post('/', {
        title: resource.title || resource.displayTitle,
        url: resource.url,
        hostname: resource.hostname,
        source_type: resource.source_type || 'reference'
    });
    return response.data;
}


export async function removeFromLibrary(id) {
    const response = await api.delete(`/${id}`);
    return response.data;
}


export async function checkSaved(url) {
    const response = await api.post('/check', { url });
    return response.data;
}