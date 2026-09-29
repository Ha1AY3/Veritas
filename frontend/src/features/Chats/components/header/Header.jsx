import React, { useState } from 'react'
import "./header.scss";
import { useNavigate, useParams } from 'react-router';
import { useChat } from '../../hooks/useChat';
import { useRoadmap } from '../../hooks/useRoadmap';
import ResearchRoadmapModal from '../roadmap/ResearchRoadmapModal';
import { useNotes } from '../../hooks/useNotes';

const Header = ({onRoadmapQuestionClick}) => {

    const { id } = useParams();
    const navigate = useNavigate();

    const { chats, currentChat, removeChat } = useChat();

    const { loadResearchRoadmaps, loading: roadmapLoading } = useRoadmap();

    const {generateAndDownloadNotes, loading: notesLoading} = useNotes();

    const [showRoadmap, setShowRoadmap] = useState(false);

    const activeChat = chats.find(chat => chat._id === id);

    const chatTitle = activeChat?.title || currentChat?.title || "New Chat";

    const handleRoadmapClick = async () => {

        if (!id || roadmapLoading) return;

        try {
            await loadResearchRoadmaps(id);
            setShowRoadmap(true);
        }catch(error){

            console.error("Failed to open research roadmap:", error);

        }
    };

    const handleNotesClick = async () => {

        if (!id || notesLoading) return;

        try {

            await generateAndDownloadNotes(id);

        } catch (error) {

            console.error("Failed to download research notes:", error);

        }
    };

  return (
    <>
        <header className="header">

            <h2 className="chat-title"> {chatTitle} </h2>

            {id && (
                <div className='header-actions'>
                      <button className="roadmap-btn" onClick={handleRoadmapClick} disabled={roadmapLoading}>
                          {roadmapLoading ? "Loading..." : "Research Roadmap"}
                      </button>

                      <button className="notes-btn" onClick={handleNotesClick} disabled={notesLoading}>
                            {notesLoading ? "Generating..." : "Notes"}
                      </button>
                </div>
            )}

        </header>

        {showRoadmap && (
            <ResearchRoadmapModal chatId={id} onClose={() => setShowRoadmap(false)} onAskQuestion={(question) => {
                onRoadmapQuestionClick(question);
                setShowRoadmap(false);
            }}/>
        )}

    </>

    
  )
}

export default Header
