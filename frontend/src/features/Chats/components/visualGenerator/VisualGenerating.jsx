import React from 'react'
import "./visualGenerating.scss";

const VisualGenerating = () => {
  return (
      <div className="visual-generating">
        <div className="visual-loader">
            <div className="visual-loader-core"></div>
        </div>

        <div className="visual-generating-text">
            <span className="visual-generating-title">
                Generating visual
            </span>

            <span className="visual-generating-dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
            </span>
        </div>
    </div>
  )
}

export default VisualGenerating
