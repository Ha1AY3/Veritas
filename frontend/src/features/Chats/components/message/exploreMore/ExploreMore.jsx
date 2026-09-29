import { Video, BookOpen, FileText, Globe, FolderGit2, ChevronDown, BookmarkCheck, Bookmark } from 'lucide-react';
import React, { useState } from 'react'
import { useLibrary } from '../../../hooks/useLibrary';
import "./exploreMore.scss";

const ExploreMore = ({ items }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { saveResource, isSaved, savingUrls } = useLibrary();

    if (!items || items.length === 0) return null;

    const handleSave = async (item, e) => {
        e.stopPropagation();

        await saveResource({
            title: item.displayTitle || item.title,
            url: item.url,
            hostname: item.hostname,
            source_type: item.source_type || 'reference'
        });
    };

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

            case "reference":
            default:
                return {
                    icon: BookOpen,
                    label: "References",
                    action: "Open"
                };
        }
    }

    const groupedResources = items.reduce((acc, item) => {
        const type = getResourceType(item);

        if (!acc[type.label]) {
            acc[type.label] = {
                icon: type.icon,
                action: type.action,
                items: []
            };
        }

        acc[type.label].items.push(item);

        return acc;
    }, {});

    return (
        <div className="explore-more">

            <button type="button" className="explore-label"
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span>Further Reading</span>

                <ChevronDown size={18} strokeWidth={1.8} className={`explore-chevron ${isOpen ? "open" : ""}`} />
            </button>
            <div className={`explore-dropdown-content ${isOpen ? "open" : ""}`}>
                {Object.entries(groupedResources).map(([label, group]) => {

                    const Icon = group.icon;

                    return (
                        <div key={label} className="explore-section">

                            <div className="explore-section-title">
                                <Icon size={18} strokeWidth={2} />
                                <span>{label}</span>
                            </div>

                            <div className="explore-list">

                                {group.items.map((item, index) => {

                                    let hostname = "";

                                    try {
                                        hostname = new URL(item.url).hostname.replace("www.", "");
                                    } catch {
                                        hostname = item.hostname || "";
                                    }

                                    const saved = isSaved(item.url);
                                    const saving = savingUrls.has(item.url);

                                    return (
                                        <div
                                            key={index}
                                            className="explore-card"
                                        >

                                            <h4>{item.title}</h4>

                                            <div className='explore-card-footer'>
                                                <a href={item.url} target="_blank" rel="noopener noreferrer" className="explore-link">
                                                    {hostname}
                                                    <span className="explore-arrow"> ↗ </span>
                                                </a>

                                                <button className={`save-btn ${saved ? 'saved' : ''}`}
                                                    onClick={(e) => handleSave(item, e)}
                                                    disabled={saving}
                                                    title={saved ? "Saved to library" : "Save to library"}
                                                >
                                                    {saving ? (
                                                        <span className="saving-spinner" />
                                                    ) : saved ? (
                                                        <BookmarkCheck size={16} />
                                                    ) : (
                                                        <Bookmark size={16} />
                                                    )}
                                                    <span className="save-label"> {saved ? "Saved" : "Save"} </span>
                                                </button>
                                            </div>

                                        </div>
                                    );
                                })}

                            </div>

                        </div>
                    );
                })}
            </div>

        </div>
    )
}

export default ExploreMore
