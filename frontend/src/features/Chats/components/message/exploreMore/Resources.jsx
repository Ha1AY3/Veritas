import { Video, BookOpen, FileText, Globe, FolderGit2, BookmarkCheck, Bookmark } from 'lucide-react';
import React from 'react'
import { useLibrary } from '../../../hooks/useLibrary';
import "./exploreMore.scss";

const Resources = ({ items }) => {
    const { saveResource, isSaved, savingUrls } = useLibrary();

    if (!items || items.length === 0) return null;

    function getHeading(items) {
        if (!items.length) return "Resources";

        switch (items[0].source_type) {
            case "documentation":
                return "Documentation";
            case "video":
                return "Recommended Videos";
            case "research_paper":
                return "Research Papers";
            default:
                return "Resources";
        }
    }

    function getResourceType(item) {

        switch (item.source_type) {

            case "video":
                return {
                    icon: Video,
                    label: "Videos",
                    action: "Watch"
                };

            case "research_paper":
                return {
                    icon: FileText,
                    label: "Research Papers",
                    action: "Read"
                };

            case "documentation":
                return {
                    icon: BookOpen,
                    label: "Documentation",
                    action: "Open"
                };

            default:
                return {
                    icon: BookOpen,
                    label: "Resources",
                    action: "Open"
                };
        }
    }

    const handleSave = async (item, e) => {
        e.stopPropagation();

        await saveResource({
            title: item.displayTitle || item.title,
            url: item.url,
            hostname: item.hostname,
            source_type: item.source_type || "reference"
        });
    };
    return (
        <div className="explore-more">

            <span className="explore-label">
                {getHeading(items)}
            </span>

            <div className="explore-list">
                {items.map((item, index) => {

                    const { icon: Icon } = getResourceType(item);

                    let hostname = item.hostname;

                    if (!hostname) {
                        try {
                            hostname = new URL(item.url)
                                .hostname
                                .replace("www.", "");
                        } catch {
                            hostname = "";
                        }
                    }

                    return (
                        <div key={index} className="explore-card">

                            <h4>{item.title}</h4>

                            <div className="explore-card-footer">

                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="explore-link" >
                                    {hostname}
                                    <span className="explore-arrow">↗</span>
                                </a>

                                <button className={`save-btn ${isSaved(item.url) ? "saved" : ""}`}
                                    onClick={(e) => handleSave(item, e)}
                                    disabled={savingUrls.has(item.url)}
                                    title={isSaved(item.url) ? "Saved to library" : "Save to library"} >
                                    {savingUrls.has(item.url) ? (
                                        <span className="saving-spinner"></span>
                                    ) : isSaved(item.url) ? (
                                        <BookmarkCheck size={16} />
                                    ) : (
                                        <Bookmark size={16} />
                                    )}

                                    <span className="save-label">
                                        {isSaved(item.url) ? "Saved" : "Save"}
                                    </span>
                                </button>

                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    )
}

export default Resources
