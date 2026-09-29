import React, { useEffect } from 'react'

import { useMemo } from "react";

import {ReactFlow, Background, useReactFlow} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import "./researchRoadmapModal.scss";
import CustomRoadmapNode from './CustomRoadmapNode';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 64;

const BRANCH_X_DISTANCE = 430;
const CHILD_X_DISTANCE = 750;

const CHILD_VERTICAL_GAP = 110;
const BRANCH_VERTICAL_GAP = 90;

const nodeTypes = {
    roadmap: CustomRoadmapNode
};

function getNodePath(nodes, nodeId) {

    const nodeMap = new Map( nodes.map(node => [
            node.id,
            node
        ])
    );

    const path = [];

    let currentNode = nodeMap.get(nodeId);


    while (currentNode) {

        path.unshift(currentNode.label);

        if (!currentNode.parentId) {
            break;
        }

        currentNode = nodeMap.get(currentNode.parentId);
    }


    return path;
}



function getNodeChildren(nodes, parentId) {

    return nodes.filter(
        node => node.parentId === parentId
    );

}


function buildFlowNodes(roadmapNodes, selectedNodeId,  roadmapTitle, onNodeClose, onAskQuestion) {

    if (!roadmapNodes?.length) {
        return [];
    }


    const root = roadmapNodes.find(
        node => node.parentId === null
    );


    if (!root) {
        return [];
    }


    const branches = getNodeChildren( roadmapNodes, root.id);
    
    const flowNodes = [];

    flowNodes.push({
        id: root.id,
        type: "roadmap",
        position: {x: -NODE_WIDTH / 2, y: -NODE_HEIGHT / 2},
        data: {
            label: root.label, 
            roadmapType: root.type,
            side: 0,
            hasChildren: branches.length > 0,

            roadmapNode: root,

            roadmapTitle,

            researchPath: getNodePath(
                roadmapNodes,
                root.id
            ),

            onNodeClose,
            onAskQuestion
        },

        selected: root.id === selectedNodeId,

        draggable: false,

        style: {
            width: NODE_WIDTH,
            minHeight: NODE_HEIGHT,
            borderRadius: 14,
            fontWeight: 700,
            fontSize: 16,
             color: "#111"
        }

    });

    const leftBranches = [];
    const rightBranches = [];


    branches.forEach((branch, index) => {

        if (index % 2 === 0) {
            leftBranches.push(branch);
        } else {
            rightBranches.push(branch);
        }

    });

    const positionSide = (sideBranches,  side) => {

        if (!sideBranches.length) {
            return;
        }

        const branchBlocks = sideBranches.map(branch => {

            const children = getNodeChildren(roadmapNodes, branch.id);
            const childCount = Math.max(children.length, 1);
            const blockHeight = childCount * CHILD_VERTICAL_GAP;


            return { branch, children, blockHeight };

        });

        const totalHeight = branchBlocks.reduce((total, block) => total + block.blockHeight, 0) +
            Math.max( branchBlocks.length - 1, 0) * BRANCH_VERTICAL_GAP;


        let cursorY =- totalHeight / 2;

        branchBlocks.forEach(block => {
            const {branch, children, blockHeight } = block;

            const branchY = cursorY + (blockHeight - NODE_HEIGHT) / 2;

            flowNodes.push({
                id: branch.id,
                type: "roadmap",
                position: {
                    x: side * BRANCH_X_DISTANCE,
                    y: branchY
                },
                data: {
                    label: branch.label,
                    roadmapType: branch.type,
                    side,
                    hasChildren: children.length > 0,

                    roadmapNode: branch,

                    roadmapTitle,

                    researchPath: getNodePath(
                        roadmapNodes,
                        branch.id
                    ),

                    onNodeClose,
                    onAskQuestion
                },
                selected: branch.id === selectedNodeId,
                draggable: false,
                style: {
                    width: NODE_WIDTH,
                    minHeight: NODE_HEIGHT,
                    borderRadius: 12,
                    fontWeight: 600,
                    fontSize: 14,
                     color: "#111"
                }

            });

            children.forEach(
                (child, childIndex) => {

                    const childY = cursorY + childIndex * CHILD_VERTICAL_GAP + (CHILD_VERTICAL_GAP - NODE_HEIGHT) / 2;


                    flowNodes.push({
                        id: child.id,
                        type: "roadmap",
                        position: {
                            x: side * CHILD_X_DISTANCE,
                            y: childY
                        },
                        data: {
                            label: child.label,
                            roadmapType: child.type,
                            side,
                            hasChildren:false,

                            roadmapNode: child,

                            roadmapTitle,

                            researchPath: getNodePath(
                                roadmapNodes,
                                child.id
                            ),

                            onNodeClose,
                            onAskQuestion
                        },
                        selected: child.id === selectedNodeId,
                        draggable: false,
                        style: {
                            width: NODE_WIDTH,
                            minHeight: NODE_HEIGHT,
                            borderRadius: 10,
                            fontSize: 13,
                             color: "#111"
                        }

                    });

                }
            );
            
            cursorY += blockHeight + BRANCH_VERTICAL_GAP;

        });

    };

    positionSide( leftBranches, -1);
    positionSide( rightBranches, 1);

    return flowNodes;
}


function buildFlowEdges(roadmapEdges, flowNodes) {

    if (!roadmapEdges?.length) {
        return [];
    }

    const nodeMap = new Map(flowNodes.map(node => [
            node.id,
            node
        ])
    );


    return roadmapEdges.map(edge => {

        const sourceNode = nodeMap.get(edge.source);

        const targetNode = nodeMap.get(edge.target);

         const sourceSide = sourceNode?.data?.side;

        const targetSide = targetNode?.data?.side;

        if(sourceNode?.data?.roadmapType === "root" && targetSide === -1){

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: "source-left",
                targetHandle: "target-right",
                type: "smoothstep"
            };

        }

        if(sourceNode?.data?.roadmapType === "root" && targetSide === 1){

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: "source-right",
                targetHandle: "target-left",
                type: "smoothstep"
            };

        }

        if(sourceSide === -1){

            return {
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: "source-left",
                targetHandle: "target-right",
                type: "smoothstep"
            };

        }
        return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: "source-right",
            targetHandle: "target-left",
            type: "smoothstep"
        };

    });

}

const RoadmapViewport = () => {

    const {fitView, setCenter, getZoom} = useReactFlow();


    useEffect(() => {

        const frame = requestAnimationFrame(async () => {

                await fitView({
                    padding: 0.15,
                    duration: 0
                });

                const zoom = getZoom();

                setCenter(0,0, { zoom });

            }
        );


        return () => {
            cancelAnimationFrame(frame);
        };

    }, [fitView, setCenter, getZoom]);


    return null;
};

const ResearchRoadmapCanvas = ({nodes = [], edges = [], selectedNodeId = null, onNodeClick, roadmapTitle, onNodeClose, onAskQuestion}) => {

    const flowNodes = useMemo(() => buildFlowNodes(nodes, selectedNodeId, roadmapTitle, onNodeClose, onAskQuestion),[nodes, selectedNodeId, roadmapTitle, onNodeClose, onAskQuestion]);

    const flowEdges = useMemo(() => buildFlowEdges(edges, flowNodes),[edges, flowNodes]);

    if (!nodes.length) {
        return (
            <div className="roadmap-canvas-empty">
                <span>No roadmap nodes available.</span>
            </div>

        );

    }


    return (

        <div className="roadmap-canvas">
            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}

                onNodeClick={(_, node) => {
                    if (onNodeClick) {
                        onNodeClick(node.data.roadmapNode);
                    }
                }}
                
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                panOnDrag={true}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                minZoom={0.25}
                maxZoom={1.5}

            >

                <Background gap={24} size={1}/>

                <RoadmapViewport />

            </ReactFlow>

        </div>

    );
};


export default ResearchRoadmapCanvas
