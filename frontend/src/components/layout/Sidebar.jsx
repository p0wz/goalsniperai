import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const { isAdmin, user } = useAuth();

    const isActive = (path) => location.pathname === path;

    const links = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/signals', label: 'Canlı Sinyaller', icon: '⚡' },
        { path: '/history', label: 'Sinyal Geçmişi', icon: '📜' },
        { path: '/coupons', label: 'Kupon Oluştur', icon: '🎫' },
        { path: '/profile', label: 'Profil', icon: '👤' },
    ];

    const adminLinks = [
        { path: '/admin', label: 'Admin Panel', icon: '🛡️' },
        { path: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
        { path: '/admin/analysis', label: 'Günlük Analiz', icon: '📈' },
        { path: '/admin/logs', label: 'Sistem Logları', icon: '📋' },
    ];

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <span className="text-2xl">⚽</span>
                    <span className="text-lg font-bold text-gradient">GoalSniper</span>
                </div>

                {/* User Info */}
                <div className="mb-6 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center">
                            <span className="text-[var(--accent-green)] font-bold text-lg">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{user?.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                                <span className={`inline-block px-2 py-0.5 rounded text-xs ${user?.plan === 'premium' ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]' :
                                        user?.plan === 'pro' ? 'bg-[var(--accent-gold)]/20 text-[var(--accent-gold)]' :
                                            'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
                                    }`}>
                                    {user?.plan?.toUpperCase() || 'FREE'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Nav Links */}
                <nav className="space-y-1">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <span className="text-lg">{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Admin Links */}
                {isAdmin && (
                    <>
                        <div className="my-4 border-t border-[var(--border-color)]" />
                        <p className="px-4 text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Admin</p>
                        <nav className="space-y-1">
                            {adminLinks.map((link) => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
                                    onClick={onClose}
                                >
                                    <span className="text-lg">{link.icon}</span>
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </nav>
                    </>
                )}

                {/* Upgrade CTA for Free Users */}
                {user?.plan === 'free' && (
                    <div className="absolute bottom-4 left-4 right-4">
                        <Link
                            to="/pricing"
                            className="block p-4 rounded-xl bg-gradient-to-r from-[var(--accent-green)]/20 to-[var(--accent-blue)]/20 border border-[var(--accent-green)]/30"
                        >
                            <p className="font-semibold text-sm mb-1">🚀 Pro'ya Geç</p>
                            <p className="text-xs text-[var(--text-secondary)]">Sınırsız sinyal al</p>
                        </Link>
                    </div>
                )}
            </aside>
        </>
    );
};

export default Sidebar;
