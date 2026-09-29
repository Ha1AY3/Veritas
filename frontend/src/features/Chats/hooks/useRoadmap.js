import { useContext } from "react"
import { ResearchRoadmapContext } from "../context/Roadmap.context"


export const useRoadmap = () => {
    const context = useContext(ResearchRoadmapContext);

    return context;
}