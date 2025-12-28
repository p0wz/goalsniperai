import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-background border-t border-border pt-16 pb-8 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                                <Zap className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Goalify AI
                            </span>
                        </div>
                        <p className="text-muted-foreground leading-relaxed max-w-sm">
                            AI destekli profesyonel spor tahmin platformu.
                            Günlük analizler ve öngörülerle maçları takip edin.
                        </p>
                        <div className="flex gap-3">
                            <a
                                href="https://t.me/goalsniperai"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                                📢
                            </a>
                            <a
                                href="https://twitter.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                                𝕏
                            </a>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-6">Platform</h4>
                        <ul className="space-y-4 text-muted-foreground text-sm">
                            <li>
                                <Link to="/dashboard" className="hover:text-primary transition-colors">
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <Link to="/pricing" className="hover:text-primary transition-colors">
                                    Fiyatlandırma
                                </Link>
                            </li>
                            <li>
                                <a
                                    href="https://t.me/goalsniperai"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-primary transition-colors"
                                >
                                    Telegram Kanalı
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-foreground mb-6">Şirket</h4>
                        <ul className="space-y-4 text-muted-foreground text-sm">
                            <li>
                                <Link to="/about" className="hover:text-primary transition-colors">
                                    Hakkımızda
                                </Link>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary transition-colors">
                                    Kullanım Şartları
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary transition-colors">
                                    Gizlilik Politikası
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-primary transition-colors">
                                    İletişim
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <div>© 2024 Goalify AI. Tüm hakları saklıdır.</div>
                    <div className="flex gap-6">
                        <span>Made with 🧠 + 💻</span>
                        <span>v3.2.0</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
