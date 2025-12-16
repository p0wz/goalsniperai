import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    Zap,
    Target,
    Shield,
    TrendingUp,
    CheckCircle2,
    ArrowRight,
    Play,
    Trophy,
    Users
} from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Landing() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Mock Live Ticker Data
    const liveWins = [
        { match: 'Man City vs Liverpool', market: 'Over 2.5', status: 'WON', profit: '+ $120' },
        { match: 'Real Madrid vs Barca', market: 'BTTS', status: 'WON', profit: '+ $85' },
        { match: 'Arsenal vs Chelsea', market: 'Home Win', status: 'PENDING', profit: '...' },
        { match: 'Bayern vs Dortmund', market: 'Over 3.5', status: 'WON', profit: '+ $200' },
        { match: 'PSG vs Lyon', market: 'Away +1.5', status: 'WON', profit: '+ $95' },
    ];

    return (
        <div className="flex flex-col gap-32">

            {/* HERO SECTION */}
            <section className="relative pt-20 px-6">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] -z-10 animate-pulse" />

                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
                    <div className="space-y-8 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 backdrop-blur border border-white/20 shadow-neu-flat text-sm font-bold text-accent animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            AI V3.2 Engine Online
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-text-main tracking-tight leading-[1.1] animate-in slide-in-from-bottom-8 duration-700 delay-100">
                            Outsmart the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-purple-500">Bookmakers</span>
                        </h1>

                        <p className="text-xl text-text-muted font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-in slide-in-from-bottom-8 duration-700 delay-200">
                            Stop betting on gut feeling. Our specialized AI processes
                            <span className="text-text-main font-bold"> 10,000+ data points </span>
                            per second to find value bets you missed.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-in slide-in-from-bottom-8 duration-700 delay-300">
                            <NeuButton onClick={() => navigate('/login')} variant="primary" className="px-8 py-4 text-lg rounded-2xl group">
                                Start Free Trial
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </NeuButton>
                            <NeuButton variant="secondary" className="px-8 py-4 text-lg rounded-2xl flex items-center gap-2">
                                <Play size={18} fill="currentColor" /> Watch Demo
                            </NeuButton>
                        </div>

                        <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-sm font-bold text-text-muted opacity-80">
                            <div className="flex items-center gap-2">
                                <Users size={18} /> 5,000+ Active Snipers
                            </div>
                            <div className="flex items-center gap-2">
                                <Trophy size={18} /> 78% Win Rate (Hist.)
                            </div>
                        </div>
                    </div>

                    {/* HERO MOCKUP */}
                    <div className="relative animate-float delay-500 hidden lg:block">
                        <div className="absolute inset-0 bg-gradient-to-tr from-accent/30 to-purple-500/30 blur-[60px] rounded-full" />
                        <NeuCard className="relative z-10 rotate-y-12 rotate-x-6 transform-gpu" padding="p-0">
                            <div className="bg-[#1a1f2e] p-6 rounded-[32px] text-white h-[500px] border-4 border-base overflow-hidden relative">
                                {/* Mock UI Elements */}
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                        <div className="w-3 h-3 rounded-full bg-green-500" />
                                    </div>
                                    <div className="text-xs font-mono text-gray-500">LIVE SCANNER V3</div>
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">⚡</div>
                                                <div>
                                                    <div className="font-bold text-sm">Over 2.5 Goals</div>
                                                    <div className="text-xs text-gray-400">Man City vs Liverpool</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-green-400">88%</div>
                                                <div className="text-xs text-gray-400">Confidence</div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#1a1f2e] to-transparent" />
                                </div>
                            </div>
                        </NeuCard>
                    </div>
                </div>
            </section>

            {/* LIVE TICKER */}
            <div className="bg-base border-y border-white/20 overflow-hidden py-4 relative">
                <div className="flex gap-8 animate-marquee whitespace-nowrap">
                    {[...liveWins, ...liveWins, ...liveWins].map((win, i) => (
                        <div key={i} className="flex items-center gap-3 px-6 py-2 rounded-full bg-base shadow-neu-inset text-sm font-bold opacity-80">
                            <span className={win.status === 'WON' ? 'text-green-500' : 'text-yellow-500'}>● {win.status}</span>
                            <span>{win.match}</span>
                            <span className="text-text-muted">({win.market})</span>
                            <span className="text-accent">{win.profit}</span>
                        </div>
                    ))}
                </div>
                {/* Gradient Masks */}
                <div className="absolute top-0 left-0 h-full w-32 bg-gradient-to-r from-base to-transparent z-10" />
                <div className="absolute top-0 right-0 h-full w-32 bg-gradient-to-l from-base to-transparent z-10" />
            </div>

            {/* BENTO GRID FEATURES */}
            <section className="max-w-7xl mx-auto px-6">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl font-extrabold text-text-main">Why Professionals Choose Us</h2>
                    <p className="text-text-muted text-lg">The only platform that combines AI precision with bankroll management.</p>
                </div>

                <div className="grid md:grid-cols-3 md:grid-rows-2 gap-8 h-[800px] md:h-[600px]">
                    {/* Feature 1: Large Left */}
                    <NeuCard className="md:row-span-2 group relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent z-0" />
                        <div className="relative z-10 h-full flex flex-col">
                            <div className="w-14 h-14 rounded-2xl bg-base shadow-neu-extruded flex items-center justify-center text-accent mb-6">
                                <Target size={32} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Real-Time Sniper</h3>
                            <p className="text-text-muted mb-8">
                                Our bot monitors live match statistics (xG, attacks, pressure metrics) and alerts you explicitly when a goal is imminent.
                            </p>
                            <div className="mt-auto rounded-xl bg-base shadow-neu-inset p-4 overflow-hidden">
                                {/* Abstract Chart */}
                                <div className="flex items-end gap-2 h-32 opacity-70">
                                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                                        <div key={i} className="flex-1 bg-accent rounded-t-sm animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </NeuCard>

                    {/* Feature 2: Top Middle */}
                    <NeuCard className="md:col-span-2 bg-gradient-to-r from-base to-white/50">
                        <div className="flex flex-col md:flex-row items-center gap-8 h-full">
                            <div className="flex-1">
                                <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center mb-4">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Value & Probability</h3>
                                <p className="text-text-muted text-sm">
                                    We don't just guess. We calculate the mathematical probability of every outcome and compare it to bookmaker odds to find positive EV.
                                </p>
                            </div>
                            <div className="flex-1 bg-base shadow-neu-flat rounded-xl p-4 w-full">
                                <div className="flex justify-between items-center text-sm font-bold mb-2">
                                    <span>Implied Odds</span>
                                    <span className="text-text-muted">1.80 (55%)</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold text-accent">
                                    <span>True Value</span>
                                    <span>1.60 (62%)</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-accent w-[62%]" />
                                </div>
                            </div>
                        </div>
                    </NeuCard>

                    {/* Feature 3: Bottom Middle */}
                    <NeuCard>
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-4">
                            <Shield size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Bankroll Guard</h3>
                        <p className="text-text-muted text-sm">
                            Smart staking plans. We tell you exactly how much to bet (1-5 units) based on confidence.
                        </p>
                    </NeuCard>

                    {/* Feature 4: Bottom Right */}
                    <NeuCard>
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                            <Zap size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Instant Alerts</h3>
                        <p className="text-text-muted text-sm">
                            Get notifications via Telegram or Dashboard instantly. Speed is everything.
                        </p>
                    </NeuCard>
                </div>
            </section>

            {/* CTA STRIP */}
            <section className="bg-[#1a1f2e] text-white py-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/10 blur-[100px]" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10 space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black">Ready to Level Up?</h2>
                    <p className="text-xl text-gray-300">Join thousands of smart bettors who have stopped guessing and started snipping.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-10 py-5 bg-accent hover:bg-accent-hover text-white rounded-2xl font-bold text-xl shadow-lg hover:shadow-accent/50 transition-all transform hover:-translate-y-1"
                    >
                        Get Started Now
                    </button>
                    <p className="text-sm text-gray-500">No credit card required for free tier.</p>
                </div>
            </section>

        </div>
    );
}
