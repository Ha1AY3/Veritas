import React, { useEffect, useState } from 'react'
import "./sidebar.scss"
import logo from "../../../../assets/logo.png";
import { useLocation, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../auth/hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { LibraryBig, Trash2, X } from 'lucide-react';

const Sidebar = ({ isOpen, setIsOpen }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, handleLogout } = useAuth();
    const { chats, loadChats, removeChat } = useChat();

    const location = useLocation();

    useEffect(() => {
        loadChats();
    }, []);

    const handleNewChat = async () => {
        navigate("/chat");
    };

    const logout = () => {
        handleLogout();

        navigate("/login");
    }

    const groupChats = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const groups = {
            TODAY: [],
            YESTERDAY: [],
            LAST_WEEK: [],
            OLDER: []
        };

        chats.forEach(chat => {
            const date = new Date(chat.updatedAt);
            if (date >= today) groups.TODAY.push(chat);
            else if (date >= yesterday) { groups.YESTERDAY.push(chat); }
            else if (date >= weekAgo) groups.LAST_WEEK.push(chat);
            else groups.OLDER.push(chat);
        });

        return groups;
    };

    const groupedChats = groupChats();


    return (
        <aside className={`sidebar ${isOpen ? "open" : ""}`}>

            <button type="button" className="sidebar-close" onClick={() => {
                setIsOpen(false)
            }} aria-label="Close sidebar">
                <X size={18} />
            </button>

            <div className='sidebar_brand'>
                <img src={logo} alt="Veritas Logo" />

                <div>
                    <h2>Veritas</h2>
                    <p>Research AI Assistant</p>
                </div>
            </div>

            <button className='sidebar_new-chat' onClick={handleNewChat}>
                + New Chat
            </button>

            <button className={`sidebar_library ${location.pathname === "/library" ? "active" : ""}`} onClick={() => {
                navigate("/library");
            }}>
                <LibraryBig size={17} strokeWidth={1.8} />
                <span>Library</span>
            </button>

            <div className='sidebar_history'>
                {Object.entries(groupedChats).map(([label, chats]) => (
                    chats.length > 0 && (
                        <div key={label} className='history-group'>
                            <h4>{label.replace("_", " ")}</h4>

                            <ul>
                                {chats.map(chat => (
                                    <li key={chat._id} className={id === chat._id ? 'active' : ''} onClick={() => {
                                        navigate(`/chat/${chat._id}`);
                                    }}>

                                        <span className='chat-title'>{chat.title || "New Chat"}</span>

                                        <button className='delete-chat-btn' onClick={(e) => {
                                            e.stopPropagation();
                                            removeChat(chat._id);
                                            navigate("/chat");
                                        }}><Trash2 size={20} /></button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                ))}

            </div>

            <div className='sidebar_footer'>
                <div className='user'>
                    <div className='user-avatar'>
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className='user_name'>
                        {user?.username || 'User'}
                    </span>
                </div>
                <button className='logout-btn' onClick={logout}>
                    Logout
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
