import React, { useRef } from 'react'
import "./chat.scss"
import Sidebar from '../../components/sidebar/Sidebar'
import Header from '../../components/header/Header'
import MessageList from '../../components/messageList/MessageList'
import InputArea from '../../components/inputArea/InputArea'
import EmptyState from '../../components/emptyState/EmptyState'
import { useNavigate, useParams } from 'react-router'
import { useChat } from '../../hooks/useChat'
import { useEffect } from 'react'
import { useState } from 'react'
import { Menu } from 'lucide-react'

const Chat = () => {

  const { id } = useParams();
  const { messages, loadChat, sendMessages, loading, clearMessages } = useChat();
  const [conversationId, setConversationId] = useState(id || null);
  const [inputValue, setInputValue] = useState('');
  const navigate = useNavigate();

  const textAreaRef = useRef(null);

  const handleSend = async (message, imageBase64 = null, pdfFile = null) => {

    const data = await sendMessages(message, conversationId, imageBase64, pdfFile);
    console.log("response data:", data);
    if (data?.conversationId) {
      setConversationId(data.conversationId);

      navigate(`/chat/${data.conversationId}`);
    }
  };

  const handleQuestionClick = (question) => {
    setInputValue(question);
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.focus();
    }, 100);
  };

  const handleRoadmapQuestionClick = (question) => {
    handleQuestionClick(question);
  };

  useEffect(() => {
    if (id) {
      loadChat(id);
      setConversationId(id);
    } else {
      setConversationId(null);
      clearMessages();
    }
  }, [id]);

  const showEmptyState = messages.length === 0 && !id;
  return (
    <div className='chat-page'>

      <main className="chat-main">

        <Header onRoadmapQuestionClick={handleRoadmapQuestionClick} />

        <section className='chat-content'>

          <div className='chat-body'>

            {showEmptyState ? (
              <EmptyState />
            ) : (
              <MessageList messages={messages} loading={loading} onQuestionClick={handleQuestionClick} />
            )}
          </div>

          <div className='chat-input-wrapper'>
            <InputArea onSend={handleSend} loading={loading} value={inputValue} setValue={setInputValue} textAreaRef={textAreaRef} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default Chat

