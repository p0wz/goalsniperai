import { useNavigate } from 'react-router-dom';
import { MessageCircle, Sparkles, Trophy, Shield, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import NeuCard from '../components/ui/NeuCard';
import NeuButton from '../components/ui/NeuButton';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-24 pb-16">

            {/* HERO SECTION */}
            <section className="relative pt-16 px-6">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px] -z-10" />

                <div className="max-w-4xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-sm font-bold text-cyan-400 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                        </span>
                        SENTIO AI Active
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-text-main tracking-tight leading-[1.15] animate-in slide-in-from-bottom-8 duration-700 delay-100">
                        AI-Powered<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            Betting Advisor
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-text-muted font-medium max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom-8 duration-700 delay-200">
                        SENTIO AI analyzes today's matches and provides personalized predictions.
                        No more researching stats yourself - just ask!
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in slide-in-from-bottom-8 duration-700 delay-300">
                        <NeuButton onClick={() => navigate('/register')} variant="primary" className="px-8 py-4 text-lg rounded-xl group bg-gradient-to-r from-cyan-500 to-blue-600 border-0">
                            Start Free
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </NeuButton>
                        <NeuButton onClick={() => navigate('/login')} variant="secondary" className="px-8 py-4 text-lg rounded-xl">
                            Sign In
                        </NeuButton>
                    </div>
                </div>
            </section>

            {/* SENTIO PREVIEW */}
            <section className="max-w-4xl mx-auto px-6">
                <NeuCard className="relative overflow-hidden" padding="p-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 to-blue-900/30" />
                    <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-5xl shadow-lg shadow-cyan-500/30 flex-shrink-0">
                            🤖
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-text-main mb-3 flex items-center justify-center md:justify-start gap-2">
                                <Sparkles className="text-yellow-400" size={24} />
                                Meet SENTIO
                            </h2>
                            <p className="text-text-muted mb-4">
                                Ask questions like "Which matches are safest today?", "Any Over 2.5 recommendations?"
                                SENTIO analyzes current stats and provides personalized insights.
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center md:justify-start text-sm">
                                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300">💬 Natural Chat</span>
                                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300">📊 Live Data</span>
                                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300">🎯 Personal Tips</span>
                            </div>
                        </div>
                    </div>
                </NeuCard>
            </section>

            {/* FEATURES */}
            <section className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">Why GoalSniper?</h2>
                    <p className="text-text-muted">The smarter way to bet</p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <NeuCard className="text-center" padding="p-8">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-6">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-3">Chat & Learn</h3>
                        <p className="text-text-muted text-sm">
                            Ask SENTIO anything. Match analysis, coupon suggestions,
                            stat comparisons - all just a message away.
                        </p>
                    </NeuCard>

                    <NeuCard className="text-center" padding="p-8">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                            <Shield size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-3">Data-Driven</h3>
                        <p className="text-text-muted text-sm">
                            Predictions are based on real statistics, not gut feelings.
                            Form, H2H history, home/away performance all analyzed.
                        </p>
                    </NeuCard>

                    <NeuCard className="text-center" padding="p-8">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center mb-6">
                            <Zap size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-3">Daily Updates</h3>
                        <p className="text-text-muted text-sm">
                            Fresh match data added to the system every day.
                            Always analyze with the latest information.
                        </p>
                    </NeuCard>
                </div>
            </section>

            {/* PRICING */}
            <section className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">Simple Pricing</h2>
                    <p className="text-text-muted">Choose the plan that fits your needs</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Free Plan */}
                    <NeuCard padding="p-8">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-text-main mb-1">Free</h3>
                            <p className="text-text-muted text-sm">Get started</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-text-main">$0</span>
                            <span className="text-text-muted">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-text-muted text-sm">
                                <CheckCircle2 size={18} className="text-green-400" />
                                Telegram channel access
                            </li>
                            <li className="flex items-center gap-2 text-text-muted text-sm">
                                <CheckCircle2 size={18} className="text-green-400" />
                                Daily free tips
                            </li>
                            <li className="flex items-center gap-2 text-text-muted/40 text-sm line-through">
                                SENTIO AI Chat
                            </li>
                            <li className="flex items-center gap-2 text-text-muted/40 text-sm line-through">
                                Custom coupon suggestions
                            </li>
                        </ul>
                        <NeuButton onClick={() => navigate('/register')} variant="secondary" className="w-full py-3">
                            Start Free
                        </NeuButton>
                    </NeuCard>

                    {/* PRO Plan */}
                    <NeuCard className="relative border-2 border-cyan-500/50" padding="p-8">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-xs font-bold text-white">
                            RECOMMENDED
                        </div>
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-text-main mb-1">PRO</h3>
                            <p className="text-text-muted text-sm">Full experience</p>
                        </div>
                        <div className="mb-6">
                            <span className="text-4xl font-black text-cyan-400">$15</span>
                            <span className="text-text-muted">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-text-muted text-sm">
                                <CheckCircle2 size={18} className="text-green-400" />
                                Telegram channel access
                            </li>
                            <li className="flex items-center gap-2 text-text-muted text-sm">
                                <CheckCircle2 size={18} className="text-green-400" />
                                Daily free tips
                            </li>
                            <li className="flex items-center gap-2 text-text-main text-sm font-medium">
                                <CheckCircle2 size={18} className="text-cyan-400" />
                                Unlimited SENTIO AI Chat
                            </li>
                            <li className="flex items-center gap-2 text-text-main text-sm font-medium">
                                <CheckCircle2 size={18} className="text-cyan-400" />
                                Custom coupon suggestions
                            </li>
                        </ul>
                        <NeuButton onClick={() => navigate('/pricing')} variant="primary" className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 border-0">
                            Upgrade to PRO
                        </NeuButton>
                    </NeuCard>
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-3xl mx-auto px-6 text-center">
                <NeuCard className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border border-cyan-500/30" padding="p-12">
                    <h2 className="text-3xl font-bold text-text-main mb-4">Start Now</h2>
                    <p className="text-text-muted mb-8">
                        Begin smart betting with SENTIO AI. Sign up free,
                        join our Telegram channel, and follow daily tips.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <NeuButton onClick={() => navigate('/register')} variant="primary" className="px-8 py-4 text-lg bg-gradient-to-r from-cyan-500 to-blue-600 border-0">
                            Sign Up Free
                        </NeuButton>
                        <a
                            href="https://t.me/goalsniperai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-8 py-4 rounded-xl bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2"
                        >
                            📢 Telegram Channel
                        </a>
                    </div>
                </NeuCard>
            </section>

        </div>
    );
}
