import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, Zap, Crown } from 'lucide-react';

export default function Navbar({ user }) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isPro = user?.role === 'pro' || user?.role === 'admin' || user?.plan === 'pro';

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Dashboard', path: '/dashboard', allowGuest: false },
        { label: 'Fiyatlandırma', path: '/pricing', allowGuest: true },
        { label: 'Hakkımızda', path: '/about', allowGuest: true },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav
            className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
                ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 py-3'
                : 'bg-transparent py-5'
                }`}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* LOGO */}
                <Link
                    to={user ? '/dashboard' : '/'}
                    className="flex items-center gap-3 cursor-pointer group"
                >
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary group-hover:scale-105 transition-transform">
                        <Zap className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-foreground">
                        Goalify AI
                    </span>
                </Link>

                {/* DESKTOP NAV */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        (!user && !link.allowGuest) ? null :
                            <Link
                                key={link.label}
                                to={link.path}
                                className={`text-sm font-medium transition-colors ${isActive(link.path)
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {link.label}
                            </Link>
                    ))}

                    {user ? (
                        <div className="flex items-center gap-3 pl-4 border-l border-border">
                            {user.role === 'admin' && (
                                <Link
                                    to="/admin"
                                    className="px-4 py-2 text-xs font-bold text-destructive bg-destructive/10 rounded-lg hover:bg-destructive/20 transition-all"
                                >
                                    ADMIN
                                </Link>
                            )}
                            {isPro && (
                                <div className="flex items-center gap-1 px-3 py-1 rounded-full gradient-accent">
                                    <Crown className="w-3 h-3 text-accent-foreground" />
                                    <span className="text-xs font-bold text-accent-foreground">PRO</span>
                                </div>
                            )}
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground"
                            >
                                <User size={16} />
                                {user.name?.split(' ')[0]}
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 pl-4">
                            <Link
                                to="/login"
                                className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                            >
                                Giriş
                            </Link>
                            <button
                                onClick={() => navigate('/register')}
                                className="px-6 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold glow-primary hover:opacity-90 transition-opacity"
                            >
                                Başla
                            </button>
                        </div>
                    )}
                </div>

                {/* MOBILE TOGGLE */}
                <button
                    className="md:hidden p-2 text-foreground"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu size={28} />
                </button>
            </div>

            {/* MOBILE MENU OVERLAY */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-background flex flex-col p-6">
                    <div className="flex justify-between items-center mb-12">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Goalify AI
                            </span>
                        </div>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 bg-secondary rounded-full text-foreground"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        {navLinks.map((link) => (
                            (!user && !link.allowGuest) ? null :
                                <Link
                                    key={link.label}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`text-lg font-medium py-4 px-4 rounded-xl transition-colors ${isActive(link.path)
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-foreground hover:bg-secondary'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                        ))}

                        {!user && (
                            <div className="mt-6 space-y-3">
                                <Link
                                    to="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block w-full py-4 text-center font-medium text-foreground bg-secondary rounded-xl"
                                >
                                    Giriş Yap
                                </Link>
                                <button
                                    onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                                    className="w-full py-4 gradient-primary text-primary-foreground font-semibold rounded-xl glow-primary"
                                >
                                    Ücretsiz Başla
                                </button>
                            </div>
                        )}

                        {user && (
                            <div className="mt-6">
                                <button
                                    onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
                                    className="w-full py-4 bg-secondary text-foreground font-medium rounded-xl flex items-center justify-center gap-2"
                                >
                                    <User size={18} />
                                    Profilim
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
