import { Link } from 'react-router-dom';
import { Bot, Twitter, Github, Globe } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-base pt-20 pb-10 border-t border-white/20 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-base shadow-neu-extruded flex items-center justify-center overflow-hidden">
                                <img src="/sentio-logo.jpg" alt="SENTIO" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-text-main">
                                SENTIO
                            </span>
                        </div>
                        <p className="text-text-muted leading-relaxed max-w-sm">
                            Advanced AI-powered football betting analysis.
                            We process thousands of data points to give you the unfair advantage.
                        </p>
                        <div className="flex gap-4">
                            {[Twitter, Github, Globe].map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="w-10 h-10 rounded-full bg-base shadow-neu-extruded flex items-center justify-center text-text-muted hover:text-accent hover:shadow-neu-extruded-hover transition-all"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-bold text-lg mb-6">Product</h4>
                        <ul className="space-y-4 text-text-muted">
                            <li><Link to="/dashboard" className="hover:text-accent transition-colors">Live Scanner</Link></li>
                            <li><Link to="/pricing" className="hover:text-accent transition-colors">Pricing</Link></li>
                            <li><Link to="/dashboard" className="hover:text-accent transition-colors">Daily Picks</Link></li>
                            <li><span className="text-accent bg-accent/10 px-2 py-0.5 rounded text-xs font-bold">New</span> API Access</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-lg mb-6">Company</h4>
                        <ul className="space-y-4 text-text-muted">
                            <li><Link to="/about" className="hover:text-accent transition-colors">About Us</Link></li>
                            <li><a href="#" className="hover:text-accent transition-colors">Terms of Service</a></li>
                            <li><a href="#" className="hover:text-accent transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="hover:text-accent transition-colors">Contact Support</a></li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-text-muted font-medium">
                    <div>© 2024 SENTIO. All rights reserved.</div>
                    <div className="flex gap-8">
                        <span>Made with 🧠 + 💻</span>
                        <span>v3.2.0</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
