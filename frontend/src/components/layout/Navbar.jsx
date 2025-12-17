import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bot, Menu, X, User } from 'lucide-react';
import NeuButton from '../ui/NeuButton';

export default function Navbar({ user }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Analysis Hub', path: '/dashboard', allowGuest: false },
        { label: 'Live Scanner', path: '/dashboard', allowGuest: false },
        { label: 'Pricing', path: '/pricing', allowGuest: true },
        { label: 'About', path: '/about', allowGuest: true },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-base/80 backdrop-blur-lg shadow-neu-flat py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* LOGO */}
                <Link
                    to={user ? '/dashboard' : '/'}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl bg-base shadow-neu-extruded flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                        <img src="/sentio-logo.jpg" alt="SENTIO" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-text-main">
                        SENTIO
                    </span>
                </Link>

                {/* DESKTOP NAV */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        (!user && !link.allowGuest) ? null :
                            <Link
                                key={link.label}
                                to={link.path}
                                className={`text-sm font-bold transition-colors ${isActive(link.path) ? 'text-accent' : 'text-text-muted hover:text-text-main'
                                    }`}
                            >
                                {link.label}
                            </Link>
                    ))}

                    {user ? (
                        <div className="flex items-center gap-4 pl-4 border-l border-white/20">
                            {user.role === 'admin' && (
                                <Link
                                    to="/admin"
                                    className="px-4 py-2 text-xs font-bold text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all"
                                >
                                    ADMIN
                                </Link>
                            )}
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-base shadow-neu-extruded hover:shadow-neu-extruded-hover transition-all text-sm font-bold text-text-main"
                            >
                                <User size={16} />
                                {user.name?.split(' ')[0]}
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 pl-4">
                            <Link
                                to="/login"
                                className="text-sm font-bold text-text-main hover:text-accent transition-colors"
                            >
                                Login
                            </Link>
                            <NeuButton
                                onClick={() => navigate('/register')}
                                variant="primary"
                                className="px-6 py-2 text-sm"
                            >
                                Get Started
                            </NeuButton>
                        </div>
                    )}
                </div>

                {/* MOBILE TOGGLE */}
                <button
                    className="md:hidden p-2 text-text-main"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu size={28} />
                </button>
            </div>

            {/* MOBILE MENU OVERLAY */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-base flex flex-col p-6 animate-in slide-in-from-right-full duration-300">
                    <div className="flex justify-between items-center mb-12">
                        <span className="text-2xl font-black tracking-tight">
                            SENTIO
                        </span>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-base shadow-neu-extruded rounded-full text-danger">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-6 text-center">
                        {navLinks.map((link) => (
                            (!user && !link.allowGuest) ? null :
                                <Link
                                    key={link.label}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-xl font-bold text-text-main py-4 border-b border-white/10"
                                >
                                    {link.label}
                                </Link>
                        ))}

                        {!user && (
                            <>
                                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-xl font-bold py-4">Login</Link>
                                <NeuButton onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full py-4 mt-4" variant="primary">
                                    Get Started
                                </NeuButton>
                            </>
                        )}

                        {user && (
                            <NeuButton onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }} className="w-full py-4 mt-4" variant="secondary">
                                My Profile
                            </NeuButton>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
