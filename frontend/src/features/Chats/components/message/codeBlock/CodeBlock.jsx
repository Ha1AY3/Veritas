import React from 'react'
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow    } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useState } from 'react';
import veritasTheme from '../VeritasTheme';
import "./codeBlock.scss";

const CodeBlock = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const copyCode = async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };
    return (
        <div className="code-block">

            <div className="code-header">
                <span className='code-language'>{language.toUpperCase()}</span>

                <button onClick={copyCode} className='copy-btn'>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>

            <SyntaxHighlighter
                language={language}
                style={veritasTheme}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    padding: "18px 22px",
                    background: "transparent",
                    borderRadius: 0,
                    boxShadow: "none",

                    fontSize: "14px",

                    width: "max-content",
                    minWidth: "100%",
                    boxSizing: "border-box"
                }}
            >
                {value}
            </SyntaxHighlighter>

        </div>
    )
}

export default CodeBlock
