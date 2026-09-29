import { createContext, useEffect, useState } from "react";
import { getMe, login, logout, register, verifyEmail } from "./services/auth.api";

export const AuthContext = createContext();

const  AuthProvider = ({children}) => {

    const [user , setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    async function handleRegister(username, email, password){
        setError(null);

        try{
            const data = await register(username, email, password);

            return data;
        }catch(err){
            setError(err.response?.data?.message || "Failed to register");
            throw err;
        }
        
    }

    async function handleLogin(email, password){
        setError(null);
        try{
            const data = await login(email, password);

            setUser(data.user);
            return data;
        }catch(err){
            setError(err.response?.data?.message || "Failed to login");
            throw err;
        }
    }

    async function fetchMe(){
        setError(null);

        try{
            const data = await getMe();

            setUser(data.user);

            return data;
        }catch(err){
            if(err.response?.status===401){

                handleLogout();

            }

            setError(err.response?.data?.message || "Failed to fetch user details");
        }finally{
            setLoading(false)
        }
    }

    async function verifyUserEmail(token){
        setError(null);
        try{
            const data = await verifyEmail(token);

            return data;
        }catch(err){
            setError(err.response?.data?.message || "Email verification failed");
            throw err;
        }
    }

    async function handleLogout(){
        try {
            await logout();
        } catch (err) {
            console.error("Logout error:", err);
        }
        setUser(null); 
        setError(null);   
    }

    const clearError = async() => {
        setError(null);
    }

    const isAuthenticated =  !!user;

    useEffect(() => {
        const hasCookie = document.cookie.includes("token");
        if (hasCookie) {
            fetchMe();
        } else {
            setLoading(false);
        }
    }, []);

    return(
        <AuthContext.Provider value={{user, loading, error, handleRegister, handleLogin, handleLogout, verifyUserEmail, fetchMe, clearError, isAuthenticated}}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;