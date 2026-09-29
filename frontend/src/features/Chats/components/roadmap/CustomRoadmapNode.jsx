import {Handle, NodeToolbar, Position} from "@xyflow/react";
import "./researchRoadmapModal.scss"
import RoadmapNodePanel from "./RoadmapNodePanel";


const CustomRoadmapNode = ({ data, selected }) => {

    const {label, roadmapType, side, hasChildren, roadmapNode, roadmapTitle, researchPath, onNodeClose, onAskQuestion } = data;


    const getNodeClass = () => {

        switch (roadmapType) {

            case "root":
                return "roadmap-node roadmap-node--root";

            case "branch":
                return "roadmap-node roadmap-node--branch";

            case "subtopic":
                return "roadmap-node roadmap-node--subtopic";

            case "concept":
                return "roadmap-node roadmap-node--concept";

            default:
                return "roadmap-node";

        }

    };


    const getToolbarPosition = () => {

        if (roadmapType === "root") {
            return Position.Bottom;
        }

        if (side === -1) {
            return Position.Right;
        }

        return Position.Left;
    };


    const renderHandles = () => {
        if (roadmapType === "root") {

            return (
                <>
                    <Handle
                        type="source"
                        position={Position.Left}
                        id="source-left"
                        className="roadmap-handle"
                    />

                    <Handle
                        type="source"
                        position={Position.Right}
                        id="source-right"
                        className="roadmap-handle"
                    />
                </>
            );
        }
        if (side === -1) {

            return (
                <>
                    <Handle
                        type="target"
                        position={Position.Right}
                        id="target-right"
                        className="roadmap-handle"
                    />

                    {hasChildren && (
                        <Handle
                            type="source"
                            position={Position.Left}
                            id="source-left"
                            className="roadmap-handle"
                        />
                    )}
                </>
            );
        }
        return (
            <>
                <Handle
                    type="target"
                    position={Position.Left}
                    id="target-left"
                    className="roadmap-handle"
                />

                {hasChildren && (
                    <Handle
                        type="source"
                        position={Position.Right}
                        id="source-right"
                        className="roadmap-handle"
                    />
                )}
            </>
        );

    };


    return (
        <>
            <NodeToolbar
                isVisible={selected}
                position={getToolbarPosition()}
                offset={18}
                align="center"
            >
                <RoadmapNodePanel
                    node={roadmapNode}
                    roadmapTitle={roadmapTitle}
                    researchPath={researchPath}
                    onClose={onNodeClose}
                    onAskQuestion={onAskQuestion}
                />
            </NodeToolbar>


            <div className={getNodeClass()}>

                {renderHandles()}

                <div className="roadmap-node-content">

                    <span className="roadmap-node-label">
                        {label}
                    </span>

                </div>

            </div>
        </>
    );
};

export default CustomRoadmapNode;