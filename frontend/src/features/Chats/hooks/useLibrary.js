import { useContext } from "react"
import { LibraryContext } from "../context/Library.context"

export const useLibrary = () => {
    const context = useContext(LibraryContext);

    return context;
}