import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import LiveBotPanel from '../components/LiveBotPanel';
import DailyAnalystPanel from '../components/DailyAnalystPanel';
import SettingsPanel from '../components/SettingsPanel';

function ControlPanel() {
    const [activeTab, setActiveTab] = useState('livebot');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    // Auth check
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
        }
    }, [navigate]);

    // Menu icon for mobile
    const MenuIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );

    return (
        <div className="min-h-screen bg-gray-950 flex">
            {/* Sidebar */}
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isOpen={sidebarOpen}
                setIsOpen={setSidebarOpen}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen">
                {/* Top Bar */}
                <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden text-gray-400 hover:text-white"
                        >
                            <MenuIcon />
                        </button>
                        <h1 className="text-xl font-semibold text-white">
                            {activeTab === 'livebot' && '🔴 Live Bot'}
                            {activeTab === 'daily' && '📊 Daily Analyst'}
                            {activeTab === 'settings' && '⚙️ Ayarlar'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm text-gray-400">Bot Aktif</span>
                        </div>

                        {/* Time */}
                        <div className="text-gray-400 text-sm">
                            {new Date().toLocaleDateString('tr-TR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                            })}
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
                    {activeTab === 'livebot' && <LiveBotPanel />}
                    {activeTab === 'daily' && <DailyAnalystPanel />}
                    {activeTab === 'settings' && <SettingsPanel />}
                </div>
            </main>
        </div>
    );
}

export default ControlPanel;
