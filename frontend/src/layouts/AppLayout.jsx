import { useState } from "react";
import Sidebar from "../features/Chats/components/sidebar/Sidebar";
import { Menu } from "lucide-react";
import { Outlet } from "react-router";
import "./appLayout.scss"

const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div
            className={`app-layout ${
                sidebarOpen ? "sidebar-open" : "sidebar-closed"
            }`}
        >
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {!sidebarOpen && (
                <button
                    type="button"
                    className="sidebar-toggle"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Open sidebar"
                >
                    <Menu size={20} strokeWidth={1.8} />
                </button>
            )}

            <main className="app-main">
                <Outlet />
            </main>
        </div>
    );
};

export default AppLayout;