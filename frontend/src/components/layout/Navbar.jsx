import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../ui';

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [user, setUser] = useState(null);
    const location = useLocation();
    const isHome = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        // Check Auth
        checkUser();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const checkUser = async () => {
        try {
            // Assumes API_URL is accessible or using relative path proxy if set up. 
            // Using relative path for simplicity if proxy exists, else might need config.
            // Admin.jsx used API_URL from ../config. Let's try to grab it or use relative.
            // Ideally we need API_URL. I will check if I can import it.
            // For now, I'll use a relative fetch assuming Vite proxy or same origin. 
            // If strictly needed, I'll add the import.
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data.success) setUser(data.user);
            }
        } catch (e) {
            console.error("Auth check failed", e);
        }
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`
        fixed top-0 left-0 right-0 z-50 h-[72px] px-8 lg:px-12
        flex items-center justify-between
        transition-all duration-300
        ${scrolled
                    ? 'bg-background/90 backdrop-blur-xl border-b border-border'
                    : 'bg-transparent'
                }
      `}
        >
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center text-lg shadow-accent">
                    ⚽
                </div>
                <span className="font-display text-xl text-foreground group-hover:text-accent transition-colors">
                    GoalGPT
                </span>
            </Link>

            {/* Nav Links - Desktop */}
            {isHome && (
                <div className="hidden md:flex items-center gap-10">
                    <NavLink href="#features">Özellikler</NavLink>
                    <NavLink href="#how-it-works">Nasıl Çalışır</NavLink>
                    <NavLink href="#pricing">Fiyatlar</NavLink>
                </div>
            )}

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
                {user ? (
                    <Link to="/dashboard">
                        <Button variant="primary" className="shadow-accent">
                            Dashboard <span className="ml-2">→</span>
                        </Button>
                    </Link>
                ) : (
                    <>
                        <Link to="/login">
                            <Button variant="ghost">Giriş</Button>
                        </Link>
                        <Link to="/register">
                            <Button variant="primary">Başlayın</Button>
                        </Link>
                    </>
                )}
            </div>
        </motion.nav>
    );
}

function NavLink({ href, children }) {
    return (
        <a
            href={href}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
        >
            {children}
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
        </a>
    );
}
