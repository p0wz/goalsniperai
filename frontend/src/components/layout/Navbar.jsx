import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
    const { isAuthenticated, isAdmin, user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-secondary)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-2xl">⚽</span>
                        <span className="text-xl font-bold text-gradient">GoalSniper</span>
                        <span className="text-xs bg-[var(--accent-green)]/20 text-[var(--accent-green)] px-2 py-0.5 rounded-full font-semibold">PRO</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className={`text-sm font-medium transition-colors ${isActive('/dashboard') ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/signals"
                                    className={`text-sm font-medium transition-colors ${isActive('/signals') ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                >
                                    Canlı Sinyaller
                                </Link>
                                <Link
                                    to="/history"
                                    className={`text-sm font-medium transition-colors ${isActive('/history') ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                >
                                    Geçmiş
                                </Link>
                                <Link
                                    to="/coupons"
                                    className={`text-sm font-medium transition-colors ${isActive('/coupons') ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                >
                                    Kupon
                                </Link>
                                {isAdmin && (
                                    <Link
                                        to="/admin"
                                        className={`text-sm font-medium transition-colors ${location.pathname.startsWith('/admin') ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)] hover:text-white'}`}
                                    >
                                        Admin
                                    </Link>
                                )}
                            </>
                        ) : (
                            <>
                                <Link to="/" className={`text-sm font-medium ${isActive('/') ? 'text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>
                                    Ana Sayfa
                                </Link>
                                <Link to="/pricing" className={`text-sm font-medium ${isActive('/pricing') ? 'text-white' : 'text-[var(--text-secondary)] hover:text-white'}`}>
                                    Fiyatlandırma
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-4">
                                <Link to="/profile" className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-[var(--accent-green)]/20 flex items-center justify-center">
                                        <span className="text-[var(--accent-green)] font-bold">
                                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                    <span className="hidden sm:block text-[var(--text-secondary)]">{user?.name}</span>
                                </Link>
                                <button
                                    onClick={logout}
                                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors"
                                >
                                    Çıkış
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Link to="/login" className="btn btn-ghost text-sm">
                                    Giriş Yap
                                </Link>
                                <Link to="/register" className="btn btn-primary text-sm">
                                    Kayıt Ol
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
