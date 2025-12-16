import { useState } from 'react';
import {
    BarChart3,
    Zap,
    Target,
    Shield,
    TrendingUp,
    CheckCircle2,
    Menu,
    X,
    ChevronDown,
    ArrowRight,
    Bot
} from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Landing({ onLoginClick }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeFaq, setActiveFaq] = useState(null);

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index);
    };

    const scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-base text-text-main font-body selection:bg-accent selection:text-white overflow-x-hidden">

            {/* BACKGROUND GRAPHICS */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] rounded-full bg-base shadow-neu-extruded opacity-40 blur-3xl animate-float" />
                <div className="absolute top-[40%] -left-[10%] w-[600px] h-[600px] rounded-full bg-base shadow-neu-inset opacity-30 blur-3xl" />
            </div>

            {/* NAVBAR */}
            <nav className="fixed top-0 w-full z-50 bg-base/90 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center shadow-neu-extruded">
                            <Bot size={24} />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight">
                            GoalGPT <span className="text-accent">Pro</span>
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center gap-8">
                        <button onClick={() => scrollToSection('features')} className="text-sm font-bold text-text-muted hover:text-accent transition-colors">Features</button>
                        <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-bold text-text-muted hover:text-accent transition-colors">How it Works</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-sm font-bold text-text-muted hover:text-accent transition-colors">Pricing</button>
                        <NeuButton onClick={onLoginClick} variant="primary" className="px-6 py-2.5 rounded-xl">
                            Launch App
                        </NeuButton>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="md:hidden">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-text-main">
                            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-20 w-full bg-base border-b border-white/20 shadow-xl p-6 flex flex-col gap-4 animate-in slide-in-from-top-4">
                        <button onClick={() => scrollToSection('features')} className="text-lg font-bold py-2">Features</button>
                        <button onClick={() => scrollToSection('pricing')} className="text-lg font-bold py-2">Pricing</button>
                        <NeuButton onClick={onLoginClick} className="w-full py-4 mt-2">Sign In</NeuButton>
                    </div>
                )}
            </nav>

            {/* HERO SECTION */}
            <section className="relative z-10 pt-40 pb-20 md:pt-48 md:pb-32 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-base shadow-neu-inset text-accent text-sm font-bold mb-4 animate-in fade-in zoom-in duration-500 delay-100">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
                        </span>
                        v3.0 Now Live: 85% Win Rate on Premier League
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-text-main tracking-tighter leading-[1.1] mb-6 animate-in slide-in-from-bottom-8 duration-700">
                        Predict the Future <br className="hidden md:block" />
                        of <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-600">Football</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-text-muted font-medium max-w-3xl mx-auto leading-relaxed animate-in slide-in-from-bottom-8 duration-700 delay-200">
                        Stop gambling. Start investing. Our AI analyzes
                        <span className="font-bold text-text-main"> 10,000+ data points </span>
                        per match to find high-value opportunities you missed.
                    </p>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8 animate-in slide-in-from-bottom-8 duration-700 delay-300">
                        <NeuButton onClick={onLoginClick} variant="primary" className="w-full md:w-auto px-10 py-5 text-lg rounded-2xl group">
                            Start Snipping Free
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </NeuButton>
                        <NeuButton onClick={() => scrollToSection('how-it-works')} variant="secondary" className="w-full md:w-auto px-10 py-5 text-lg rounded-2xl">
                            See How It Works
                        </NeuButton>
                    </div>

                    <div className="pt-12 flex justify-center gap-12 text-text-muted opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Fake Trust Logos */}
                        <span className="text-2xl font-black">FlashScore</span>
                        <span className="text-2xl font-black">Opta</span>
                        <span className="text-2xl font-black">SofaScore</span>
                    </div>
                </div>
            </section>

            {/* STATS STRIP */}
            <section className="py-12 bg-base border-y border-white/20 relative z-10">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { label: 'Live Leagues', value: '850+' },
                        { label: 'Daily Signals', value: '1,240' },
                        { label: 'Success Rate', value: '78%' },
                        { label: 'Active Users', value: '5k+' },
                    ].map((stat, i) => (
                        <div key={i} className="space-y-2">
                            <div className="text-4xl md:text-5xl font-black text-text-main">{stat.value}</div>
                            <div className="text-sm font-bold text-text-muted uppercase tracking-widest">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FEATURES GRID */}
            <section id="features" className="py-24 md:py-32 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 space-y-4">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-text-main">Unfair Advantage</h2>
                        <p className="text-xl text-text-muted max-w-2xl mx-auto">
                            We don't just show stats. We provide actionable intelligence derived from millions of historical matches.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <NeuCard className="group h-full" padding="p-8">
                            <div className="w-14 h-14 rounded-2xl bg-base shadow-neu-extruded flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Target size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Live Sniper Bot</h3>
                            <p className="text-text-muted leading-relaxed">
                                Our bot watches 200+ games simultaneously. When a team creates pressure but hasn't scored, you get an instant signal. Perfect for "Next Goal" bets.
                            </p>
                        </NeuCard>

                        <NeuCard className="group h-full" padding="p-8">
                            <div className="w-14 h-14 rounded-2xl bg-base shadow-neu-extruded flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
                                <BarChart3 size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Value Detection</h3>
                            <p className="text-text-muted leading-relaxed">
                                Compare bookmaker odds against our true probability models. We highlight when the books have made a mistake, giving you positive EV.
                            </p>
                        </NeuCard>

                        <NeuCard className="group h-full" padding="p-8">
                            <div className="w-14 h-14 rounded-2xl bg-base shadow-neu-extruded flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Shield size={32} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Bankroll Guard</h3>
                            <p className="text-text-muted leading-relaxed">
                                Smart staking strategies built-in. Never lose your cool. Our system suggests strict unit sizes based on confidence levels.
                            </p>
                        </NeuCard>
                    </div>
                </div>
            </section>

            {/* DETAILED FEATURE (Left/Right) */}
            <section className="py-24 bg-base relative z-10 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="space-y-8">
                            <h2 className="text-4xl font-extrabold leading-tight">
                                It's like having <br />
                                <span className="text-accent">Pep Guardiola</span> in your pocket.
                            </h2>
                            <p className="text-lg text-text-muted">
                                Most bettors look at the table. We look at the xG, recent form slope, injury impact, and referee tendencies.
                                Our "Goal Probability Matrix" calculates the exact % chance of a goal in the next 15 minutes.
                            </p>
                            <ul className="space-y-4">
                                {['Real-time Momentum Tracking', 'Refereed Strictness Analysis', 'Weather Impact Calculations'].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-bold text-text-main">
                                        <CheckCircle2 className="text-green-500" size={24} />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <NeuButton variant="primary" className="px-8 py-3">Explore The Data</NeuButton>
                        </div>

                        <div className="relative">
                            {/* Decorative mock UI */}
                            <div className="absolute inset-0 bg-accent/20 blur-[100px] rounded-full" />
                            <NeuCard className="relative z-10 rotate-3 hover:rotate-0 transition-transform duration-500" padding="p-0">
                                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-[32px] text-white h-[400px] flex flex-col justify-between border-4 border-base">
                                    {/* Mock Dashboard UI */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="bg-red-500 text-xs font-bold px-2 py-1 rounded">LIVE 76'</div>
                                        <div className="text-gray-400 text-sm">Premier League</div>
                                    </div>
                                    <div className="text-center space-y-2">
                                        <div className="text-2xl font-bold">Liverpool vs Arsenal</div>
                                        <div className="text-4xl font-mono text-accent">1 - 1</div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>Home Pressure</span>
                                            <span>88%</span>
                                        </div>
                                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 w-[88%]" />
                                        </div>
                                        <div className="bg-accent/20 text-accent p-3 rounded-xl text-center font-bold text-sm border border-accent/30 mt-4">
                                            ⚡ SIGNAL: OVER 2.5 GOALS
                                        </div>
                                    </div>
                                </div>
                            </NeuCard>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" className="py-32 px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-extrabold mb-4">Simple, Transparent Pricing</h2>
                        <p className="text-text-muted">No hidden fees. Cancel anytime.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 items-center">
                        {/* Free */}
                        <NeuCard className="h-full opacity-80 hover:opacity-100 transition-opacity">
                            <div className="text-xl font-bold mb-4">Rookie</div>
                            <div className="text-4xl font-black mb-2">$0</div>
                            <p className="text-text-muted text-sm mb-8">Forever free for testing waters.</p>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> 3 Daily Signals</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> Major Leagues Only</li>
                                <li className="flex items-center gap-2 text-text-muted line-through"><X size={16} /> No Live Bot</li>
                            </ul>
                            <NeuButton variant="secondary" className="w-full" onClick={onLoginClick}>Join Free</NeuButton>
                        </NeuCard>

                        {/* Pro */}
                        <div className="relative transform md:-translate-y-4">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-white px-4 py-1 rounded-full text-xs font-bold shadow-neu-extruded z-20">MOST POPULAR</div>
                            <NeuCard className="h-full border-2 border-accent/20 relative z-10 shadow-neu-extruded-hover">
                                <div className="text-xl font-bold mb-4 text-accent">Pro Analyst</div>
                                <div className="text-5xl font-black mb-2">$29<span className="text-lg text-text-muted font-normal">/mo</span></div>
                                <p className="text-text-muted text-sm mb-8">For serious profit seekers.</p>
                                <ul className="space-y-4 mb-8 text-sm font-medium">
                                    <li className="flex items-center gap-2"><CheckCircle2 className="text-accent" size={18} /> Unlimited Signals</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="text-accent" size={18} /> Live Sniper Bot Access</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="text-accent" size={18} /> 850+ Leagues Included</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 className="text-accent" size={18} /> Priority Support</li>
                                </ul>
                                <NeuButton variant="primary" className="w-full py-4 text-lg" onClick={onLoginClick}>Get Pro Access</NeuButton>
                            </NeuCard>
                        </div>

                        {/* Elite */}
                        <NeuCard className="h-full opacity-80 hover:opacity-100 transition-opacity">
                            <div className="text-xl font-bold mb-4 text-purple-600">Syndicate</div>
                            <div className="text-4xl font-black mb-2">$99<span className="text-lg text-text-muted font-normal">/mo</span></div>
                            <p className="text-text-muted text-sm mb-8">For whales and syndicates.</p>
                            <ul className="space-y-4 mb-8 text-sm">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> Everything in Pro</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> 1-on-1 Strategy Calls</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} /> API Access</li>
                            </ul>
                            <NeuButton variant="secondary" className="w-full">Contact User</NeuButton>
                        </NeuCard>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 px-6 max-w-3xl mx-auto relative z-10">
                <h2 className="text-3xl font-extrabold text-center mb-12">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    {[
                        { q: "Is this guaranteed profit?", a: "No. Sports betting involves risk. We provide statistical edges and tools to improve your decisions, not magic crystal balls. Always bet responsibly." },
                        { q: "Which leagues are covered?", a: "We cover over 850 leagues globally, from the Premier League to the Japanese J2 League. If there is data, we analyze it." },
                        { q: "Can I cancel anytime?", a: "Yes. Your subscription can be cancelled instantly from your dashboard. No questions asked." }
                    ].map((item, i) => (
                        <NeuCard key={i} className="cursor-pointer" onClick={() => toggleFaq(i)} padding="p-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-lg">{item.q}</h3>
                                <ChevronDown className={`transition-transform duration-300 ${activeFaq === i ? 'rotate-180' : ''}`} />
                            </div>
                            {activeFaq === i && (
                                <p className="mt-4 text-text-muted leading-relaxed animate-in slide-in-from-top-2">
                                    {item.a}
                                </p>
                            )}
                        </NeuCard>
                    ))}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-12 border-t border-white/20 bg-base relative z-10">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-text-main text-base flex items-center justify-center font-bold">G</div>
                        <span className="font-bold">GoalGPT Pro</span>
                    </div>
                    <div className="text-sm text-text-muted">
                        © 2024 GoalGPT Pro. All rights reserved.
                    </div>
                    <div className="flex gap-6 text-sm font-bold text-text-muted">
                        <a href="#" className="hover:text-accent">Terms</a>
                        <a href="#" className="hover:text-accent">Privacy</a>
                        <a href="#" className="hover:text-accent">Twitter</a>
                    </div>
                </div>
            </footer>

        </div>
    );
}
