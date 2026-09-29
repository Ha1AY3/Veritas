import { useEffect } from "react";
import { useRoadmap } from "../../hooks/useRoadmap";
import { useParams } from "react-router-dom";

const RoadmapNodePanel = ({node, roadmapTitle, researchPath, onClose, onAskQuestion}) => {

    if (!node) {
        return null;
    }

    const { id: chatId } = useParams();

    const { selectedRoadmap, enrichNode, enrichingNodeId} = useRoadmap();

    const isEnriching = enrichingNodeId === node?.id;

    useEffect(() => {
        if (!node || !chatId || !selectedRoadmap?._id) {
            return;
        }

        if (node.enrichmentStatus === "ready") {
            return;
        }

        enrichNode(chatId, selectedRoadmap._id,node.id)
        .catch(error => {
            console.error("Failed to enrich roadmap node:",error);
        });

    }, [node, chatId, selectedRoadmap?._id, enrichNode]);


    const formattedType = node.type?.charAt(0).toUpperCase() + node.type?.slice(1);


    return (

        <div
            className="roadmap-node-panel"
            onClick={(e) => e.stopPropagation()}
            onWheelCapture={(e) => e.stopPropagation()}
        >

            <div className="roadmap-node-panel-header">

                <div>

                    <span className="roadmap-node-panel-eyebrow">
                        Research Node
                    </span>

                    <h3>
                        {node.label}
                    </h3>

                </div>


                <button
                    type="button"
                    className="roadmap-node-panel-close"
                    onClick={onClose}
                >
                    ×
                </button>

            </div>


            <div className="roadmap-node-panel-content">

                <div className="roadmap-node-panel-section">

                    <span className="roadmap-node-panel-label"> Research Path </span>

                    <div className="roadmap-node-path">

                        {researchPath.map(
                            (item, index) => (

                                <div
                                    key={`${item}-${index}`}
                                    className="roadmap-node-path-item"
                                >

                                    <span>
                                        {item}
                                    </span>

                                    {index < researchPath.length - 1 && (
                                        <span className="roadmap-node-path-arrow">
                                            →
                                        </span>
                                    )}

                                </div>

                            )
                        )}

                    </div>

                </div>
                {isEnriching ? (

                    <div className="roadmap-node-panel-placeholder">Researching this node...</div>

                ) : (

                    <>

                        <div className="roadmap-node-panel-section">

                            <span className="roadmap-node-panel-label">
                                Research Questions
                            </span>

                            {node.related_questions?.length > 0 ? (

                                <div className="roadmap-node-questions">

                                    {node.related_questions.map(
                                        (question, index) => (
                                            <div key={`${question}-${index}`} className="roadmap-node-question" onClick={() => onAskQuestion(question)}>
                                                {question}
                                            </div>
                                        )
                                    )}

                                </div>

                            ) : (

                                <p>No research questions available.</p>

                            )}

                        </div>


                        <div className="roadmap-node-panel-section">

                            <span className="roadmap-node-panel-label">
                                Resources
                            </span>

                            {node.resources?.length > 0 ? (

                                <div className="roadmap-node-resources">

                                    {node.resources.map(
                                        (resource, index) => (
                                            <a
                                                key={`${resource.url}-${index}`}
                                                href={resource.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="roadmap-node-resource"
                                            >

                                                <div>

                                                    <strong>{resource.title}</strong>

                                                    <span>{resource.hostname}</span>

                                                </div>

                                                <span className="roadmap-node-resource-type">
                                                    {resource.source_type}
                                                </span>

                                            </a>
                                        )
                                    )}

                                </div>

                            ) : (

                                <p>
                                    No resources available.
                                </p>

                            )}

                        </div>

                    </>

                )}
            </div>

        </div>
    );
};


export default RoadmapNodePanel;