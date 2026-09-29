import React from 'react'
import "./emptyState.scss"
import { BookOpen, FileText, Video, Image, Mic } from 'lucide-react'

const EmptyState = () => {
  return (
    <div className="empty-state">

      <h1 className="empty-title">
        Find answers you can trust, without the
        <br />
        <span className='script-text'>endless searching.</span>
      </h1>

      <div className="feature-list">

        <div className="feature">
          <div className="feature-icon"><FileText size={18}/></div>
          <span>Research Papers</span>
        </div>

        <div className="feature">
          <div className="feature-icon"><BookOpen size={18}/></div>
          <span>Documentation</span>
        </div>

        <div className="feature">
          <div className="feature-icon"><Video size={18}/></div>
          <span>Video Tutorials</span>
        </div>

        <div className="feature">
          <div className="feature-icon"><Image size={18}/></div>
          <span>Image Analysis</span>
        </div>

        <div className="feature">
          <div className="feature-icon"><Mic size={18}/></div>
          <span>Voice Search</span>
        </div>

      </div>

    </div>
  )
}

export default EmptyState
