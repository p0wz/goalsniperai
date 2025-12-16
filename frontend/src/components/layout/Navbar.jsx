import { useState, useEffect } from 'react';
import { Bot, Menu, X, ChevronRight, User } from 'lucide-react';
import NeuButton from '../ui/NeuButton';

export default function Navbar({ user, onViewChange, currentView }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Analysis Hub', id: 'dashboard', allowGuest: false },
        { label: 'Live Scanner', id: 'dashboard', allowGuest: false }, // Could be anchor links
        { label: 'Pricing', id: 'pricing', allowGuest: true },
        { label: 'About', id: 'about', allowGuest: true },
    ];

    const handleNav = (id) => {
        onViewChange(id);
        setMobileMenuOpen(false);
    };

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-base/80 backdrop-blur-lg shadow-neu-flat py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* LOGO */}
                <div
                    onClick={() => handleNav(user ? 'dashboard' : 'landing')}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl bg-base shadow-neu-extruded flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                        <Bot size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-black tracking-tight text-text-main">
                        GOAL<span className="text-accent">SNIPER</span>
                    </span>
                </div>

                {/* DESKTOP NAV */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        (!user && !link.allowGuest) ? null :
                            <button
                                key={link.label}
                                onClick={() => handleNav(link.id)}
                                className={`text-sm font-bold transition-colors ${currentView === link.id ? 'text-accent' : 'text-text-muted hover:text-text-main'
                                    }`}
                            >
                                {link.label}
                            </button>
                    ))}

                    {user ? (
                        <div className="flex items-center gap-4 pl-4 border-l border-white/20">
                            {user.role === 'admin' && (
                                <button
                                    onClick={() => handleNav('admin')}
                                    className="px-4 py-2 text-xs font-bold text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-all"
                                >
                                    ADMIN
                                </button>
                            )}
                            <button
                                onClick={() => handleNav('profile')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-base shadow-neu-extruded hover:shadow-neu-extruded-hover transition-all text-sm font-bold text-text-main"
                            >
                                <User size={16} />
                                {user.name?.split(' ')[0]}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 pl-4">
                            <button
                                onClick={() => handleNav('login')}
                                className="text-sm font-bold text-text-main hover:text-accent transition-colors"
                            >
                                Login
                            </button>
                            <NeuButton
                                onClick={() => handleNav('register')}
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
                            GOAL<span className="text-accent">SNIPER</span>
                        </span>
                        <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-base shadow-neu-extruded rounded-full text-danger">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-6 text-center">
                        {navLinks.map((link) => (
                            (!user && !link.allowGuest) ? null :
                                <button
                                    key={link.label}
                                    onClick={() => handleNav(link.id)}
                                    className="text-xl font-bold text-text-main py-4 border-b border-white/10"
                                >
                                    {link.label}
                                </button>
                        ))}

                        {!user && (
                            <>
                                <button onClick={() => handleNav('login')} className="text-xl font-bold py-4">Login</button>
                                <NeuButton onClick={() => handleNav('register')} className="w-full py-4 mt-4" variant="primary">
                                    Get Started
                                </NeuButton>
                            </>
                        )}

                        {user && (
                            <NeuButton onClick={() => handleNav('profile')} className="w-full py-4 mt-4" variant="secondary">
                                My Profile
                            </NeuButton>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
