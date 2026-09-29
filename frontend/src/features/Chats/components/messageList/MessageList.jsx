import React from 'react'
import "./messageList.scss";
import Message from '../message/Message';
import { useRef } from 'react';
import { useEffect } from 'react';
import MessageContent from '../message/messageContent/MessageContent';
import Citations from '../message/citation/Citations';
import ExploreMore from '../message/exploreMore/ExploreMore';
import logo from "../../../../assets/logo.png";
import Resources from '../message/exploreMore/Resources';
import RelatedQuestions from '../message/relatedQuestions/RelatedQuestions';
import VisualCard from '../message/visualCard/VisualCard';
import VisualGenerating from '../visualGenerator/VisualGenerating';

const MessageList = ({ messages, loading, onQuestionClick }) => {
  const messagesEndRef = useRef(null);
  const previousMessageCountRef = useRef(messages.length);
  useEffect(() => {
    const previousCount = previousMessageCountRef.current;

    if (messages.length > previousCount) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      });
    }

    previousMessageCountRef.current = messages.length;
  }, [messages]);


  if (messages.length === 0 && !loading) return null;
  return (
    <div className='messages'>
      {messages.map((msg, index) => {
        return (
          <div key={index} >
            <Message key={index} role={msg.role} hasImage={msg.hasImage} imagePreview={msg.imagePreview} pdf={msg.pdf}>
              {msg.role === "user" && (
                <MessageContent text={msg.content} />
              )}
              {msg.role === "assistant" && (
                <>

                  {msg.visualStatus === "processing" && (
                    <VisualGenerating />
                  )}

                  {msg.visualStatus === "ready" &&
                    msg.visual?.length > 0 && (
                      <div className="message-visuals">
                        {msg.visual.slice(0, 2).map((visual, index) => (
                          <VisualCard key={`${visual.imageUrl}-${index}`} visual={visual} />
                        ))}
                      </div>
                    )
                  }

                  {loading && index === messages.length - 1 && !msg.content ? (
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <MessageContent
                      text={msg.content}
                      enableSpeech={true}
                    />
                  )}


                  {msg.resources?.length > 0 && (
                    <Resources items={msg.resources} />
                  )}

                  {msg.relatedQuestions?.length > 0 && (
                    <RelatedQuestions questions={msg.relatedQuestions} onQuestionClick={onQuestionClick} />
                  )}

                  {msg.exploreMore?.length > 0 && (
                    <ExploreMore items={msg.exploreMore} />
                  )}
                </>
              )}

            </Message>
          </div>
        )
      })}

      <div ref={messagesEndRef} />
    </div>
  )
}

export default MessageList
