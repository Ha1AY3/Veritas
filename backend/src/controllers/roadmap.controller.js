import mongoose from "mongoose";
import chatModel from "../models/chat.model.js";
import messagesModel from "../models/messages.model.js";
import researchRoadmapModel from "../models/roadmap.model.js";
import { generateResearchRoadmap } from "../services/roadmap/researchRoadmap.service.js";
import { enrichResearchRoadmapNode } from "../services/roadmap/roadmapEnrichment.service.js";

export async function createResearchRoadmap(req, res) {

    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        if(!mongoose.Types.ObjectId.isValid(chatId)){
            return res.status(400).json({
                success: false,
                message: "Invalid chat ID"
            });

        }

        const chat = await chatModel.findOne({
            _id: chatId,
            userId
        });


        if(!chat){
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });

        }

        const messages = await messagesModel.find({ chat_id: chatId }).sort({ createdAt: 1 }).lean();


        if(!messages.length){
            return res.status(400).json({
                success: false,
                message: "No messages found in this chat"
            });

        }

        const researchHistory = [];
        let currentQuestion = null;

        for(const message of messages){
            if(message.role === "user"){
                currentQuestion = message.content;
            }else if(message.role === "assistant" && currentQuestion){
                researchHistory.push({
                    question: currentQuestion,
                    answerSummary: message.answer_summary || message.content || ""
                });
                currentQuestion = null;
            }
        }

        if(!researchHistory.length){

            return res.status(400).json({
                success: false,
                message: "Not enough conversation data to generate roadmap"
            });

        }

        const roadmap = await generateResearchRoadmap( chat.summary || "", researchHistory);

        const latestRoadmap = await researchRoadmapModel.findOne({chat_id: chatId}).sort({version: -1}).lean();


        const nextVersion = latestRoadmap ? latestRoadmap.version + 1 : 1;


        await researchRoadmapModel.updateMany(
            {
                chat_id: chatId,
                isCurrent: true
            },
            {
                $set: { isCurrent: false }
            }
        );


        const savedRoadmap = await researchRoadmapModel.create({
            chat_id: chatId,
            userId,
            title: roadmap.title,
            version: nextVersion,
            isCurrent: true,
            nodes: roadmap.nodes,
            edges: roadmap.edges

        });

        return res.status(201).json({
            success: true,
            message: "Research roadmap generated successfully",
            roadmap: savedRoadmap

        });


    }catch(error) {

        console.error("Research roadmap creation error:", error);


        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate research roadmap"

        });

    }
}

export async function getResearchRoadmaps(req, res) {

    try {
        const { chatId } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(chatId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid chat ID"
            });

        }

        const chat = await chatModel.findOne({_id: chatId, userId}).lean();


        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });

        }

        const roadmaps = await researchRoadmapModel.find({chat_id: chatId, userId }).sort({ version: -1}).lean();

        if (!roadmaps.length) {
            return res.status(200).json({
                success: true,
                hasRoadmap: false,
                currentRoadmap: null,
                versions: []
            });

        }

        const currentRoadmap = roadmaps.find( roadmap => roadmap.isCurrent === true) || roadmaps[0];

        const versions = roadmaps.map(roadmap => ({
            _id: roadmap._id,
            version: roadmap.version,
            title: roadmap.title,
            isCurrent: roadmap.isCurrent,
            createdAt: roadmap.createdAt,
            updatedAt: roadmap.updatedAt
        }));


        return res.status(200).json({
            success: true,
            hasRoadmap: true,
            currentRoadmap,
            versions

        });


    }catch(error){

        console.error("Get research roadmaps error:", error);
        return res.status(500).json({
            success: false,
            message:error.message ||"Failed to get research roadmaps"

        });

    }
}

export async function getResearchRoadmapById(req, res) {

    try {
        const { chatId, roadmapId } = req.params;
        const userId = req.user.id;

        if(!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(roadmapId)){

            return res.status(400).json({
                success: false,
                message: "Invalid chat or roadmap ID"
            });

        }

        const chat = await chatModel.findOne({_id: chatId, userId }).lean();


        if (!chat) {

            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });

        }

        const roadmap = await researchRoadmapModel.findOne({
                _id: roadmapId,
                chat_id: chatId,
                userId
            }).lean();


        if (!roadmap) {

            return res.status(404).json({
                success: false,
                message: "Research roadmap not found"
            });

        }

        return res.status(200).json({
            success: true,
            roadmap

        });


    } catch (error) {

        console.error("Get research roadmap by ID error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to get research roadmap"
        });

    }

}

export async function enrichResearchRoadmapNodeController(req, res){

    try {

        const {chatId, roadmapId, nodeId} = req.params;

        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(roadmapId)){

            return res.status(400).json({
                success: false,
                message: "Invalid chat or roadmap ID"
            });

        }

        const roadmap = await researchRoadmapModel.findOne({
                _id: roadmapId,
                chat_id: chatId,
                userId
            });


        if (!roadmap) {

            return res.status(404).json({
                success: false,
                message: "Research roadmap not found"
            });

        }

        const node = roadmap.nodes.find(
                item => item.id === nodeId
            );


        if (!node) {

            return res.status(404).json({
                success: false,
                message: "Roadmap node not found"
            });

        }

        if ( node.enrichmentStatus === "ready" && node.related_questions?.length && node.resources?.length){

            return res.status(200).json({

                success: true,
                cached: true,
                node

            });

        }

        if ( node.enrichmentStatus === "loading"){

            return res.status(409).json({
                success: false,
                message:"This node is already being enriched"

            });

        }

        node.enrichmentStatus = "loading";

        await roadmap.save();


        try {
            const result = await enrichResearchRoadmapNode({roadmap,nodeId});

            await roadmap.save();


            return res.status(200).json({
                success: true,
                cached: result.cached,
                node: result.node

            });


        } catch (error) {
            node.enrichmentStatus = "failed";
            await roadmap.save();
            throw error;

        }


    } catch (error) {
         console.error("Roadmap node enrichment error:",error);


        return res.status(500).json({
            success: false,
            message: error.message || "Failed to enrich roadmap node"

        });

    }

}

export async function deleteResearchRoadmap(req, res) {

    try {
        const { chatId, roadmapId } = req.params;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(chatId) || !mongoose.Types.ObjectId.isValid(roadmapId)){
            return res.status(400).json({
                success: false,
                message: "Invalid chat or roadmap ID"
            });

        }

        const chat = await chatModel.findOne({_id: chatId, userId }).lean();


        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });

        }

        const roadmap = await researchRoadmapModel.findOne({
                _id: roadmapId,
                chat_id: chatId,
                userId
            });


        if (!roadmap) {
            return res.status(404).json({
                success: false,
                message: "Roadmap not found"
            });

        }


        const wasCurrent = roadmap.isCurrent;

        await researchRoadmapModel.deleteOne({ _id: roadmapId});

        if (wasCurrent) {
            const newestRoadmap = await researchRoadmapModel.findOne({ chat_id: chatId, userId }).sort({version: -1});

            if (newestRoadmap) {
                newestRoadmap.isCurrent = true;
                await newestRoadmap.save();

            }

        }

        return res.status(200).json({
            success: true,
            message: "Research roadmap deleted successfully"

        });


    }catch(error){

        console.error("Delete research roadmap error:", error);


        return res.status(500).json({
            success: false,
            message: error.message || "Failed to delete research roadmap"

        });

    }

}