import axios from "axios";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/auth`,
    withCredentials: true
})

export async function register(username, email, password){
    const response = await api.post("/register", {
        username,
        email,
        password
    })

    return response.data;
}

export async function login(email, password){
    const response = await api.post("/login", {
        email,
        password
    })

    return response.data
}

export async function getMe(){
    const response = await api.get("/get-me");

    return response.data
}

export async function verifyEmail(token){
    const response = await api.get(`/verify-email?token=${token}`);

    return response.data;
}

export async function logout(){
    const response = await api.post("/logout");
    localStorage.removeItem('user');

    return response.data;
}