import { createContext, useState } from "react";
import { downloadNotesPdf } from "../services/notes.api";

export const NotesContext = createContext();

export const NotesProvider = ({ children }) => {

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateAndDownloadNotes = async (chatId) => {

        if (!chatId || loading) {
            return;
        }

        setLoading(true);
        setError(null);

        try {

            const response = await downloadNotesPdf(chatId);

            const blob = new Blob([response.data],{ type: "application/pdf" });

            const url = window.URL.createObjectURL(blob);

            let filename = "Research Notes.pdf";

            const contentDisposition = response.headers["content-disposition"];

            if (contentDisposition) {

                const match = contentDisposition.match( /filename="([^"]+)"/);

                if (match?.[1]) {
                    filename = match[1];
                }
            }

            const link = document.createElement("a");

            link.href = url;
            link.download = filename;

            document.body.appendChild(link);
            link.click();

            link.remove();

            window.URL.revokeObjectURL(url);

        } catch (error) {

            console.error("Failed to generate Notes:", error);

            setError(error.response?.data?.message || "Failed to generate research notes.");

            throw error;

        } finally {
            setLoading(false);
        }
    };

    return (
        <NotesContext.Provider value={{generateAndDownloadNotes, loading, error}}>
            {children}
        </NotesContext.Provider>
    );
};

