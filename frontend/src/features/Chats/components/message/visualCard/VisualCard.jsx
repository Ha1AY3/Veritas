import React from "react";
import { ExternalLink } from "lucide-react";
import "./visualCard.scss"

const VisualCard = ({ visual }) => {
    if (!visual?.imageUrl) {
        return null;
    }

    return (
        <div className="visual-card">

            <div className="visual-image-wrapper">
                <img
                    src={visual.imageUrl}
                    alt={visual.title || "Research visual"}
                    className="visual-image"
                    loading="lazy"
                />
            </div>

            <div className="visual-info">

                <div className="visual-source-info">

                    <h4 className="visual-title">
                        {visual.title || "Research Visual"}
                    </h4>

                    {visual.sourceUrl && (
                        <a
                            href={visual.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="visual-source"
                        >
                            Source: {visual.hostname || "Original source"} ↗
                        </a>
                    )}

                </div>

            </div>

        </div>
    );
};

export default VisualCard;