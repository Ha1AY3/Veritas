import { useContext } from "react"
import { AuthContext } from "../Auth.context"

export const useAuth = () => {
    const context = useContext(AuthContext);


    return context;
}