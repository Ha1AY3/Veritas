import { createContext } from "react";
import { checkSaved, getLibrary, removeFromLibrary, saveToLibrary } from "../services/library.api";
import { useEffect } from "react";
import { useState } from "react";


export const LibraryContext = createContext();

export const LibraryProvider = ({children}) => {
    const [savedResources, setSavedResources] = useState([]);
    const [savedUrls, setSavedUrls] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [savingUrls, setSavingUrls] = useState(new Set()); 
    const [error, setError] = useState('');

    const loadLibrary = async () => {
        setLoading(true);
        try {
            const data = await getLibrary();
            if (data.success) {
                setSavedResources(data.resources || []);
                const urls = new Set(data.resources.map(r => r.url));
                setSavedUrls(urls);
            }
        } catch (err) {
            setError('Failed to load library');
            console.error('Load library error:', err);
        } finally {
            setLoading(false);
        }
    };


    const saveResource = async (resource) => {
        if (savingUrls.has(resource.url)) {
            return { success: false, message: 'Already saving' };
        }

        setSavingUrls(prev => new Set([...prev, resource.url]));

        try {
            const data = await saveToLibrary(resource);
            if (data.success) {
                setSavedResources(prev => [data.saved, ...prev]);
                setSavedUrls(prev => new Set([...prev, data.saved.url]));
                return { success: true };
            }
            return { success: false, message: data.message };
        } catch (err) {
            console.error('Save resource error:', err);
            return { success: false, message: 'Failed to save' };
        } finally {
            setSavingUrls(prev => {
                const newSet = new Set(prev);
                newSet.delete(resource.url);
                return newSet;
            });
        }
    };


    const removeResource = async (id, url) => {
        try {
            const data = await removeFromLibrary(id);
            if (data.success) {
                setSavedResources(prev => prev.filter(r => r._id !== id));
                if (url) {
                    setSavedUrls(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(url);
                        return newSet;
                    });
                }
                return { success: true };
            }
            return { success: false };
        } catch (err) {
            console.error('Remove resource error:', err);
            return { success: false };
        }
    };


    const isSaved = (url) => {
        return savedUrls.has(url);
    };

    const checkSavedStatus = async (url) => {
        try {
            const data = await checkSaved(url);
            if (data.success) {
                if (data.saved) {
                    setSavedUrls(prev => new Set([...prev, url]));
                }
                return data.saved;
            }
            return false;
        } catch (err) {
            console.error('Check saved error:', err);
            return false;
        }
    };

    useEffect(() => {
        loadLibrary();
    }, []);

    return(
        <LibraryContext.Provider value={{savedResources, savedUrls, loading, savingUrls, error, loadLibrary, saveResource, removeResource, isSaved, checkSavedStatus}}>
            {children}
        </LibraryContext.Provider>
    )

}