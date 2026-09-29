import React from 'react'
import logo from "../../../../assets/logo.png";
import "./message.scss"
import { FileText, ImageIcon } from 'lucide-react';

const Message = ({ role, children, hasImage, imagePreview, pdf }) => {
  return (
    <div className={`message ${role}`}>
      {
        role === "assistant" && (
          <div className='assistant-avatar'>
            <img src={logo} alt="Veritas Logo" />
          </div>
        )
      }

      <div className='user-message-wrapper'>
        {role === 'user' && hasImage && imagePreview && (
          <div className='message-image'>
            <img src={imagePreview} alt="Uploaded content" className='uploaded-image' />
          </div>
        )}

        {role === 'user' && pdf && (
          <div
            className="message-pdf"
            onClick={() => {
              if (pdf.fileUrl) {
                window.open(pdf.fileUrl, "_blank", "noopener,noreferrer");
              }
            }}
            role="button"
            tabIndex={0}
          >
            <FileText size={22} />

            <div className="message-pdf-info">
              <span className="message-pdf-name">
                {pdf.fileName}
              </span>

              {pdf.pageCount > 0 && (
                <span className="message-pdf-pages">
                  {pdf.pageCount} pages
                </span>
              )}
            </div>
          </div>
        )}

        <div className="message-content">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Message
