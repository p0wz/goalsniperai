import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../ui';

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();
    const isHome = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                <Link to="/login">
                    <Button variant="ghost">Giriş</Button>
                </Link>
                <Link to="/register">
                    <Button variant="primary">Başlayın</Button>
                </Link>
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
