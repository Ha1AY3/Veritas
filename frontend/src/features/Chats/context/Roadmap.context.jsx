import {createContext, useCallback, useState } from "react";
import { deleteResearchRoadmap, enrichResearchRoadmapNode, generateResearchRoadmap, getResearchRoadmapById, getResearchRoadmaps } from "../services/roadmap.api";
import { useRef } from "react";

export const ResearchRoadmapContext = createContext(null);


export function ResearchRoadmapProvider({ children }) {
    const [currentRoadmap, setCurrentRoadmap] = useState(null); 
    const [versions, setVersions] = useState([]);
    const [hasRoadmap, setHasRoadmap] = useState(false);
    const [selectedRoadmap, setSelectedRoadmap] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [enrichingNodeId, setEnrichingNodeId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState(null);

    const enrichingNodeRef = useRef(null);

    const loadResearchRoadmaps = useCallback( async (chatId) => {

            if(!chatId){
                return;
            }

            setLoading(true);
            setError(null);

            try{
                const data = await getResearchRoadmaps(chatId);
                setHasRoadmap(data.hasRoadmap);

                setCurrentRoadmap(data.currentRoadmap || null);

                setSelectedRoadmap(data.currentRoadmap || null);

                setSelectedNode(null);

                setVersions(data.versions || []);

                return data;

            }catch(error){
                console.error("Load research roadmaps error:", error);
                setError( error.response?.data?.message || error.message || "Failed to load research roadmaps");

                throw error;

            }finally{
                setLoading(false);
            }
        },
        []
    );

    const generateRoadmap = useCallback(async (chatId) => {

            if (!chatId) {
                throw new Error("Chat ID is required");
            }

            setGenerating(true);
            setError(null);

            try {
                const data = await generateResearchRoadmap(chatId);
                const roadmap = data.roadmap;

                setCurrentRoadmap(roadmap);
                setSelectedRoadmap(roadmap);

                setSelectedNode(null);

                setHasRoadmap(true);

                setVersions(prevVersions => {
                    const newVersion = {
                        _id: roadmap._id,
                        version: roadmap.version,
                        title: roadmap.title,
                        isCurrent: true,
                        createdAt: roadmap.createdAt,
                        updatedAt: roadmap.updatedAt
                    };

                    const updatedVersions = prevVersions.map(version => ({
                            ...version,
                            isCurrent: false
                        }));


                    return [newVersion, ...updatedVersions.filter(version =>
                                version._id !== roadmap._id
                        )];

                });
                return data;

            }catch(error){
                console.error("Generate research roadmap error:", error);
                setError(error.response?.data?.message || error.message || "Failed to generate research roadmap");

                throw error;

            }finally{
                setGenerating(false);
            }
        },
        []
    );

    const loadRoadmapById = useCallback(
    async (chatId, roadmapId) => {

        if(!chatId){
            throw new Error("Chat ID is required");
        }

        if(!roadmapId){
            throw new Error("Roadmap ID is required");
        }

        setError(null);

        try{
            const data = await getResearchRoadmapById(chatId, roadmapId);

            setSelectedRoadmap(data.roadmap || null);

            setSelectedNode(null);

            return data;

        }catch(error){

            console.error("Load roadmap by ID error:", error);

            setError(error.response?.data?.message || error.message || "Failed to load research roadmap");

            throw error;
        }

    },
    []
    );

    const enrichNode = async (chatId, roadmapId, nodeId) => {
        if (!chatId || !roadmapId || !nodeId) {
            throw new Error("Chat ID, roadmap ID and node ID are required");
        }

        if (enrichingNodeRef.current) {
            return;
        }

        enrichingNodeRef.current = `${roadmapId}:${nodeId}`;
        setEnrichingNodeId(nodeId);

        try {
            const data = await enrichResearchRoadmapNode(chatId, roadmapId, nodeId);

            if (!data?.success || !data?.node) {
                throw new Error("Failed to enrich roadmap node");
            }

            const updatedNode = data.node;

            const updateRoadmapNodes = (roadmap) => {
                if (!roadmap || roadmap._id !== roadmapId) {
                    return roadmap;
                }

                return {...roadmap,nodes: roadmap.nodes.map((node) =>
                        node.id === nodeId ? updatedNode : node
                    )
                };
            };

            setSelectedRoadmap((prev) => updateRoadmapNodes(prev));

            setCurrentRoadmap((prev) => updateRoadmapNodes(prev));

            setSelectedNode((prev) => prev?.id === nodeId ? updatedNode : prev);

            return data;

        } catch (error) {
            console.error("Enrich roadmap node error:", error );
            throw error;
        } finally {
            enrichingNodeRef.current = null;
            setEnrichingNodeId(null);
        }
    };


    const deleteRoadmap = useCallback( async (chatId, roadmapId) => {

            if (!chatId) {
                throw new Error("Chat ID is required");
            }

            if (!roadmapId) {
                throw new Error("Roadmap ID is required");
            }

            setDeleting(true);
            setError(null);

            try {
                const data = await deleteResearchRoadmap(chatId, roadmapId);

                await loadResearchRoadmaps(chatId);

                return data;

            }catch(error){

                console.error("Delete research roadmap error:", error);
                setError( error.response?.data?.message || error.message || "Failed to delete research roadmap");

                throw error;

            }finally{
                setDeleting(false);
            }
        },
        [loadResearchRoadmaps]
    );


    return (
        <ResearchRoadmapContext.Provider value={{ currentRoadmap, selectedNode, versions, enrichingNodeId,hasRoadmap, loading, generating, deleting, error, loadResearchRoadmaps, generateRoadmap, deleteRoadmap, loadRoadmapById, selectedRoadmap, setSelectedNode, enrichNode}}>
            {children}
        </ResearchRoadmapContext.Provider>
    );
}