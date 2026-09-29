import React from 'react'
import remarkGfm from 'remark-gfm';
import ReactMarkdown from "react-markdown";
import CodeBlock from '../codeBlock/CodeBlock';
import "./messageContent.scss";
import { isSpeechSynthesisSupported, speakText, stopSpeaking } from '../../../services/speechSynthesis.service';
import { Square, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

const MessageContent = ({ text, enableSpeech = false }) => {
    const [speaking, setSpeaking] = useState(false);

    const handleSpeak = () => {

        if (!text?.trim()) return;

        if (!isSpeechSynthesisSupported()) {
            alert("Text-to-speech is not supported in this browser.");
            return;
        }

        if (speaking) {
            stopSpeaking();
            setSpeaking(false);
            return;
        }

        setSpeaking(true);

        speakText(text, () => { setSpeaking(false) });
    };
    return (
        <div className='message-text'>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
                components={{
                    pre({ children }) {
                        return <>{children}</>
                    },
                    code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");

                        if (!inline && match) {
                            return (
                                <CodeBlock
                                    language={match[1]}
                                    value={String(children).replace(/\n$/, "")}
                                />
                            );
                        }

                        return (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },

                    a({ href, children }) {

                        const extractText = (node) => {
                            return React.Children.toArray(node)
                                .map((child) => {
                                    if (
                                        typeof child === "string" ||
                                        typeof child === "number"
                                    ) {
                                        return String(child);
                                    }

                                    if (child?.props?.children) {
                                        return extractText(child.props.children);
                                    }

                                    return "";
                                })
                                .join("");
                        };

                        const citationText = extractText(children)
                            .replace(/↗+$/g, "")
                            .trim();

                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-citation"
                            >
                                {citationText}
                                <span className="arrow">↗</span>
                            </a>
                        );
                    }
                }}
            >
                {text}
            </ReactMarkdown>

            {enableSpeech && text?.trim() && (
                <button
                    type="button"
                    className={`message-speech-btn ${speaking ? "speaking" : ""
                        }`}
                    onClick={handleSpeak}
                    aria-label={
                        speaking
                            ? "Stop reading"
                            : "Read answer aloud"
                    }
                >
                    {speaking ? (
                        <VolumeX size={16} />
                    ) : (
                        <Volume2 size={16} />
                    )}

                    <span>
                        {speaking
                            ? "Stop"
                            : "Read aloud"}
                    </span>
                </button>
            )}
        </div>
    )
}

export default MessageContent
