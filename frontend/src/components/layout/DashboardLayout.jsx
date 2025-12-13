import { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

const DashboardLayout = ({ children, title }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen">
                {/* Top Bar */}
                <header className="sticky top-0 z-20 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
                    <div className="flex items-center justify-between px-4 md:px-8 h-16">
                        {/* Mobile Menu Toggle */}
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-[var(--bg-tertiary)]"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Page Title */}
                        <h1 className="text-xl font-bold">{title}</h1>

                        {/* Right Side */}
                        <div className="flex items-center gap-4">
                            {/* Notification Bell */}
                            <button className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)]">
                                <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent-red)] rounded-full" />
                            </button>

                            {/* Plan Badge */}
                            <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold ${user?.plan === 'premium' ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]' :
                                    user?.plan === 'pro' ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]' :
                                        'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
                                }`}>
                                {user?.plan?.toUpperCase() || 'FREE'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
