import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="border-t border-border py-12 px-8 lg:px-12">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                {/* Logo & Copyright */}
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-sm">
                        ⚽
                    </div>
                    <span className="text-sm text-muted-foreground">
                        © 2024 GoalGPT. Tüm hakları saklıdır.
                    </span>
                </div>

                {/* Links */}
                <div className="flex items-center gap-8">
                    <FooterLink href="#">Gizlilik</FooterLink>
                    <FooterLink href="#">Kullanım Şartları</FooterLink>
                    <FooterLink href="#">İletişim</FooterLink>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, children }) {
    return (
        <a
            href={href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
            {children}
        </a>
    );
}
