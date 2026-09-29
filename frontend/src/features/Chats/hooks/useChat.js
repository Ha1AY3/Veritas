import { useContext } from "react"
import { ChatContext } from "../context/Chat.context"


export const useChat = () => {
    const context = useContext(ChatContext);

    return context;
}