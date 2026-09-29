import { CornerDownRight, Sparkles } from 'lucide-react';
import React from 'react'
import "./relatedQuestions.scss";

const RelatedQuestions = ({ questions, onQuestionClick }) => {
    if (!questions || questions.length === 0) return null;
    return (
        <div className="related-questions">
            <div className="related-questions-label">
                <span className="related-questions-label-icon">
                    <Sparkles size={15} strokeWidth={1.8} />
                </span>
                <span className='related-questions-header'>Related Questions</span>

                <span className="related-questions-line" />
            </div>
            <div className="related-questions-list">
                {questions.map((question, index) => (
                    <button
                        key={index}
                        className="related-question-btn"
                        onClick={() => onQuestionClick?.(question)}
                    >
                        <span className="related-question-icon">
                            <CornerDownRight size={18} strokeWidth={1.8} />
                        </span>
                        <span className="related-question-text">{question}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default RelatedQuestions
