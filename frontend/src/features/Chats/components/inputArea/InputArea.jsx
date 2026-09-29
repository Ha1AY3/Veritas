import React from 'react'
import "./inputArea.scss";
import { FileText, Mic, MicOff, Plus, SendHorizonal, X } from 'lucide-react';
import { useRef } from 'react';
import { useState } from 'react';
import { isSpeechRecognitionSupported, startSpeechRecognition, stopSpeechRecognition } from '../../services/speechRecognition.service';
import { useChat } from '../../hooks/useChat';

const InputArea = ({ onSend, loading, value, setValue, textAreaRef }) => {
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [pdf, setPdf] = useState(null);

    const fileInputRef = useRef(null);

    const MAX_HEIGHT = 160;

    const handleInput = () => {

        const textarea = textAreaRef.current;

        textarea.style.height = "auto";

        const height = Math.min(
            textarea.scrollHeight,
            MAX_HEIGHT
        );

        textarea.style.height = `${height}px`;

        textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";

        setValue(textarea.value);
    };

    const handleSend = () => {
        if (!value.trim() && !image && !pdf) return;
        if (loading) return;

        if (isListening) {
            stopSpeechRecognition();
            setIsListening(false);
            setAudioLevel(0);
        }


        let imageBase64 = null;

        if (image) {
            const reader = new FileReader();
            reader.onload = () => {
                imageBase64 = reader.result;
                onSend(value.trim(), imageBase64, null);
                setValue("");
                setImage(null);
                setImagePreview(null);
                const textarea = textAreaRef.current;
                textarea.style.height = "auto";
            }

            reader.readAsDataURL(image);
        } else {
            const pdfToSend = pdf;

            onSend(value.trim() || null, null, pdfToSend);

            setValue("");
            setPdf(null);

            const textarea = textAreaRef.current;
            textarea.style.height = "auto";
        }
    }

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            alert("File is too large. Please upload under 10MB.");
            e.target.value = "";
            return;
        }

        if (file.type.startsWith("image/")) {

            setPdf(null);
            setImage(file);

            const reader = new FileReader();

            reader.onload = () => {
                setImagePreview(reader.result);
            };

            reader.readAsDataURL(file);

            e.target.value = "";
            return;
        }

        if (file.type === "application/pdf") {

            setImage(null);
            setImagePreview(null);

            setPdf(file);

            e.target.value = "";
            return;
        }

        alert("Please upload an image or PDF file.");
        e.target.value = "";
    };

    const removeImage = () => {
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const handleMicClick = () => {

        if (!isSpeechRecognitionSupported()) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening) {

            stopSpeechRecognition();

            setIsListening(false);

            return;
        }

        startSpeechRecognition({

            initialText: value,

            onStart: () => { setIsListening(true) },

            onResult: (transcript) => { setValue(transcript) },

            onAudioLevel: (level) => { setAudioLevel(level) },

            onEnd: () => {
                setIsListening(false);
                setAudioLevel(0);
            },

            onError: (error) => {
                console.error("Speech recognition error:", error);

                setIsListening(false);
            }
        });
    };
    return (
        <div className='input-area'>
            {pdf && (
                <div className="pdf-preview-container">
                    <div className="pdf-preview">

                        <div className="pdf-preview-icon">
                            <FileText size={20} strokeWidth={1.8} />
                        </div>

                        <div className="pdf-preview-info">
                            <div
                                className="pdf-preview-name"
                                title={pdf.name}
                            >
                                {pdf.name}
                            </div>

                            <div className="pdf-preview-meta">
                                <span>PDF document</span>
                                <span className="pdf-preview-dot">•</span>
                                <span>
                                    {(pdf.size / (1024 * 1024)).toFixed(1)} MB
                                </span>
                            </div>
                        </div>

                        <button
                            className="remove-pdf-btn"
                            onClick={() => setPdf(null)}
                            type="button"
                            aria-label="Remove PDF"
                        >
                            <X size={15} strokeWidth={2} />
                        </button>

                    </div>
                </div>
            )}
            {imagePreview && (
                <div className='image-preview-container'>
                    <div className='image-preview'>
                        <img src={imagePreview} alt="Upload preview" />
                        <button className='remove-image-btn' onClick={removeImage} type='button'>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
            <input ref={fileInputRef} type='file' accept="image/*,application/pdf" id="file-upload" hidden onChange={handleFileSelect} />

            <button className='add-btn' onClick={() => {
                fileInputRef.current?.click();
            }}>
                <Plus size={20} />
            </button>

            <div className='input-content'>
                <textarea ref={textAreaRef} placeholder='Ask any question...' rows={1} onInput={handleInput} onKeyDown={handleKeyDown} value={value} disabled={loading} />
            </div>

            <div className='input-actions'>
                <button
                    className={`mic-btn ${isListening ? "listening" : ""}`}
                    onClick={handleMicClick}
                    disabled={loading}
                    type="button"
                    style={{
                        "--voice-level": audioLevel
                    }}
                >
                    <Mic size={22} />
                </button>

                <button className='send-btn' onClick={handleSend} disabled={(!value?.trim() && !image && !pdf) || loading}>
                    <SendHorizonal size={20} />
                </button>
            </div>
        </div>
    )
}

export default InputArea
