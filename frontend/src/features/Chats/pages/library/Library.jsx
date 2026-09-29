import { useState } from 'react';
import { useLibrary } from '../../hooks/useLibrary';
import { BookOpen, ExternalLink, FileText, LibraryBig, Menu, Video, X } from 'lucide-react';
import "./library.scss";
import { useEffect } from 'react';

const Library = () => {
    const { savedResources, loading, removeResource, saveResource } = useLibrary();
    const [removing, setRemoving] = useState({});
    const [undoItem, setUndoItem] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (!undoItem) return;

        const timer = setTimeout(() => {
            setUndoItem(null);
        }, 5000);

        return () => clearTimeout(timer);
    }, [undoItem]);

    const getIcon = (sourceType) => {
        switch (sourceType) {
            case 'video':
                return <Video size={18} />;
            case 'research_paper':
                return <FileText size={18} />;
            case 'documentation':
            case 'reference':
            default:
                return <BookOpen size={18} />;
        }
    };

    const getLabel = (sourceType) => {
        switch (sourceType) {
            case 'video':
                return 'Video';
            case 'research_paper':
                return 'Research Paper';
            case 'documentation':
                return 'Documentation';
            case 'reference':
            default:
                return 'Reference';
        }
    };

    const handleRemove = async (item) => {

        setRemoving(prev => ({ ...prev, [item._id]: true }));

        const result = await removeResource(item._id, item.url);

        setRemoving(prev => ({ ...prev, [item._id]: false }));

        if (result.success) {
            setUndoItem(item);
        } else {
            setToast({
                type: "error",
                message: "Failed to remove resource"
            });
        }
    };

    const handleUndo = async () => {
        if (!undoItem) return;

        const result = await saveResource(undoItem);

        if (result.success) {
            setUndoItem(null);
        } else {
            setToast({
                type: "error",
                message: "Could not restore resource"
            });
        }
    };

    if (loading) {
        return (
            <div className="library-page-wrapper">

                <main className="library-page">
                    <div className="library-loading">
                        <div className="spinner"></div>
                        <p>Loading your library...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (savedResources.length === 0) {
        return (
            <div className="library-page-wrapper">
                <main className="library-page">
                    <div className="library-empty">
                        <div className="library-empty-icon">
                            <LibraryBig size={24} strokeWidth={1.7} />
                        </div>

                        <h2>Your library is empty</h2>

                        <p>
                            Save resources from Explore More while researching.
                        </p>

                        <p className="library-empty-hint">
                            Found something useful? Click the Save button on any resource card.
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="library-page-wrapper">

            <main className="library-page">
                <header className="library-header">
                    <div className='library-header-main'>
                        <div className="library-title-row">
                            <div className="library-header-icon">
                                <LibraryBig size={20} strokeWidth={1.7} />
                            </div>
                            <h2 className="library-header-title"> My Library </h2>

                            <span className="library-count">{savedResources.length} saved</span>
                        </div>
                        <p className="library-header-subtitle">Your saved research and resources </p>
                    </div>
                </header>

                <div className="library-grid">
                    {savedResources.map((item) => (
                        <div key={item._id} className="library-card">
                            <div className="library-card-header">
                                <div className="library-type-badge">
                                    {getIcon(item.source_type)}
                                    <span>{getLabel(item.source_type)}</span>
                                </div>
                                <button
                                    className="library-remove-btn"
                                    onClick={() => handleRemove(item)}
                                    disabled={removing[item._id]}
                                    title="Remove from library"
                                >
                                    {removing[item._id] ? (
                                        <span className="removing-spinner">⏳</span>
                                    ) : (
                                        <X size={18} />
                                    )}
                                </button>
                            </div>

                            <h4 className="library-card-title">{item.title}</h4>

                            <p className="library-card-hostname">{item.hostname}</p>

                            <div className="library-card-footer">
                                <span className="library-card-date">
                                    Saved: {new Date(item.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </span>
                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="library-card-link">
                                    Open
                                    <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {undoItem && (
                <div className="library-toast">
                    <span className='toast-message'>Resource removed</span>

                    <button onClick={handleUndo}>
                        Undo
                    </button>
                </div>
            )}

            {toast && (
                <div className={`library-toast ${toast.type}`}>
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Library;