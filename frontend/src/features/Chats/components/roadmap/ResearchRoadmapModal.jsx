import React, { useCallback, useState } from 'react'
import { useRoadmap } from '../../hooks/useRoadmap';
import "./researchRoadmapModal.scss"
import ResearchRoadmapCanvas from './ResearchRoadmapCanvas';
import RoadmapNodePanel from './RoadmapNodePanel';

const ResearchRoadmapModal = ({ chatId, onClose, onAskQuestion }) => {

  const { currentRoadmap, selectedRoadmap, selectedNode, setSelectedNode, versions, hasRoadmap, generating, deleting, generateRoadmap, deleteRoadmap, loadRoadmapById } = useRoadmap();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState(null);

  const handleGenerate = async () => {

    if (!chatId || generating) return;

    try {
      await generateRoadmap(chatId);

    } catch (error) {
      console.error("Failed to generate research roadmap:", error);

    }
  };

  const handleVersionClick = async (roadmapId) => {

    if (!chatId) return;

    try {
      await loadRoadmapById(chatId, roadmapId);

    } catch (error) {

      console.error("Failed to load roadmap version:", error);

    }
  };

  const handleNodeClick = useCallback((node) => {

    setSelectedNode(node);

  },
    [setSelectedNode]
  );


  const handleDelete = async (roadmapId) => {

    if (!chatId || !roadmapId || deleting) return;

    try {

      await deleteRoadmap(chatId, roadmapId);
      setShowDeleteConfirm(false);
      setRoadmapToDelete(null);

    } catch (error) {

      console.error("Failed to delete research roadmap:", error);

    }
  };

  const handleNodeClose = () => {
    setSelectedNode(null);
  };

  const handleDeleteClick = (version) => {

    setRoadmapToDelete(version);
    setShowDeleteConfirm(true);

  };

  return (
    <div className="roadmap-modal-overlay" onClick={onClose}>
      <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>

        <div className="roadmap-modal-header">
          <div>
            <h2>Research Roadmap</h2>

            {selectedRoadmap && (
              <p>{selectedRoadmap.title}</p>
            )}

          </div>

          <button type="button" className="roadmap-close-btn" onClick={onClose}> × </button>

        </div>

        <div className="roadmap-modal-body">
          {!hasRoadmap ? (
            <div className="roadmap-empty">
              <h3> No research roadmap yet</h3>
              <p>Generate a roadmap from the research explored in this chat.</p>
              <button type="button" className="roadmap-generate-btn" onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating..." : "Generate Research Roadmap"}
              </button>
            </div>
          ) : (
            <>
              <div className="roadmap-current">
                <div className="roadmap-section-header">
                  <div>
                    <h3>Selected Roadmap</h3>
                    <span> Version {selectedRoadmap?.version}</span>
                  </div>
                  <button type="button" className="roadmap-generate-btn" onClick={handleGenerate} disabled={generating}>
                    {generating ? "Generating..." : "Generate New Roadmap"}
                  </button>
                </div>
                <div className="roadmap-preview">
                  <h4>{selectedRoadmap?.title}</h4>
                  <p>{selectedRoadmap.nodes?.length || 0}{" "}nodes</p>
                  <ResearchRoadmapCanvas nodes={selectedRoadmap.nodes} edges={selectedRoadmap.edges} selectedNodeId={selectedNode?.id} onNodeClick={handleNodeClick}  roadmapTitle={selectedRoadmap.title} onNodeClose={handleNodeClose}
                    onAskQuestion={onAskQuestion}
                  />
                </div>
              </div>

              <div className="roadmap-versions">
                <h3>Roadmap History</h3>
                <div className="roadmap-version-list">
                  {versions.map((version) => (
                    <div key={version._id} className={`roadmap-version-item ${version._id === selectedRoadmap?._id ? "selected" : ""}`}
                      onClick={() => {
                        console.log("Clicked roadmap version:", version);
                        handleVersionClick(version._id);
                      }}>
                      <div className="roadmap-version-info">
                        <strong>Version {version.version}</strong>
                        <span>{version.title}</span>
                      </div>
                      <button type="button" className="roadmap-delete-btn" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(version)
                      }} disabled={deleting}>
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ))}

                </div>
              </div>

            </>

          )}

        </div>

        {showDeleteConfirm && roadmapToDelete && (

          <div className="roadmap-confirm-overlay" onClick={() => {

            if (!deleting) {
              setShowDeleteConfirm(false);
              setRoadmapToDelete(null);
            }

          }}
          >

            <div className="roadmap-confirm-modal" onClick={(e) => e.stopPropagation()}>

              <div className="roadmap-confirm-icon">!</div>

              <h3>Delete research roadmap?</h3>


              <span className="roadmap-confirm-warning">This roadmap will be permanently deleted.</span>


              <div className="roadmap-confirm-actions">

                <button type="button" className="roadmap-confirm-cancel" onClick={() => {

                  setShowDeleteConfirm(false);
                  setRoadmapToDelete(null);

                }} disabled={deleting}>
                  Cancel
                </button>


                <button type="button" className="roadmap-confirm-delete" onClick={() =>
                  handleDelete(roadmapToDelete._id)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Roadmap"}
                </button>

              </div>

            </div>

          </div>

        )}
      </div>

    </div>
  )
}

export default ResearchRoadmapModal
