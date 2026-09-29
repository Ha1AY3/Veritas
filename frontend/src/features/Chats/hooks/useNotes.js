import { useContext } from "react"
import { NotesContext } from "../context/Notes.context"


export const useNotes = () => {
    const context = useContext(NotesContext);

    return context;
}