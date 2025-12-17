import { useState, useEffect } from 'react';
import { signalService, picksService } from '../../services/api';
import NeuCard from '../../components/ui/NeuCard';
import NeuButton from '../../components/ui/NeuButton';
import { Trophy, Flame, Target, Activity, TrendingUp, Shield, Clock } from 'lucide-react';

export default function ProDashboard({ user }) {
    const [liveSignals, setLiveSignals] = useState([]);
    const [dailyPicks, setDailyPicks] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [signalsRes, picksRes] = await Promise.all([
                signalService.getLiveSignals(),
                picksService.getDailyPicks()
            ]);

            // Live Signals
            if (signalsRes.success) {
                setLiveSignals(signalsRes.data.filter(s => s.verdict === 'PLAY').sort((a, b) => b.confidencePercent - a.confidencePercent));
            }

            // Picks
            if (picksRes.success) {
                setDailyPicks(picksRes.data);
            }

        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const singlePicks = dailyPicks.filter(p => p.type === 'single');
    const parlays = dailyPicks.filter(p => p.type === 'parlay');

    return (
        <div className="max-w-7xl mx-auto px-6 space-y-8 animate-in fade-in duration-500">

            {/* 1. HEADER & QUICK STATS */}
            {/* 1. HEADER */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
                        Command Center
                    </h1>
                    <p className="text-text-muted font-medium">
                        Welcome back, {user.name.split(' ')[0]}.
                    </p>
                </div>
            </header>

            {/* 2. MAIN GRID */}
            <div className="grid lg:grid-cols-3 gap-8">

                {/* LEFT COL: LIVE FEED (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Activity size={20} className="text-accent" /> Live Opportunities ({liveSignals.length})
                        </h2>
                        <NeuButton onClick={fetchData} variant="secondary" className="px-3 py-1 text-xs">
                            {loading ? 'Scanning...' : 'Refresh'}
                        </NeuButton>
                    </div>

                    <div className="space-y-4">
                        {liveSignals.length > 0 ? liveSignals.map((signal) => (
                            <NeuCard key={signal.id} className="relative group hover:scale-[1.01] transition-transform duration-300 border-l-4 border-accent">
                                <div className="flex flex-col md:flex-row gap-6 items-center">
                                    {/* Time & Score */}
                                    <div className="text-center min-w-[80px]">
                                        <div className="text-2xl font-black text-text-main">{signal.time}'</div>
                                        <div className="text-sm font-bold text-accent bg-accent/10 rounded px-2">{signal.score}</div>
                                    </div>

                                    {/* Match Info */}
                                    <div className="flex-grow text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                            <span className="text-xs font-bold text-text-muted uppercase bg-base shadow-neu-inset px-2 py-0.5 rounded">{signal.league}</span>
                                        </div>
                                        <div className="text-lg font-bold text-text-main">
                                            {signal.homeTeam} <span className="text-text-muted text-sm">vs</span> {signal.awayTeam}
                                        </div>
                                        <div className="text-sm text-text-muted mt-1 flex items-center justify-center md:justify-start gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            {signal.reason}
                                        </div>
                                    </div>

                                    {/* Confidence & Action */}
                                    <div className="min-w-[140px] text-center space-y-3">
                                        <div className="relative h-12 w-12 mx-auto flex items-center justify-center">
                                            <svg className="absolute w-full h-full transform -rotate-90">
                                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-base shadow-neu-inset" />
                                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-accent" strokeDasharray={125} strokeDashoffset={125 - (125 * signal.confidencePercent) / 100} strokeLinecap="round" />
                                            </svg>
                                            <span className="text-xs font-bold">{signal.confidencePercent}%</span>
                                        </div>
                                        <NeuButton className="w-full py-2 text-xs">Bet Now</NeuButton>
                                    </div>
                                </div>
                            </NeuCard>
                        )) : (
                            <div className="py-20 text-center border-2 border-dashed border-text-muted/20 rounded-3xl animate-pulse">
                                <Activity className="mx-auto text-text-muted mb-4 opacity-50" size={48} />
                                <h3 className="text-lg font-bold text-text-muted">Scanning Global Leagues...</h3>
                                <p className="text-text-muted text-sm">Looking for high-value opportunities.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COL: SIDEBAR (1/3) */}
                <div className="space-y-8">

                    {/* PARLAY OF THE DAY */}
                    {parlays.length > 0 && (
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-[32px] blur opacity-20 group-hover:opacity-30 transition-opacity" />
                            <NeuCard className="relative border-2 border-orange-500/20">
                                <div className="flex items-center gap-2 mb-4 text-orange-500">
                                    <Flame size={24} fill="currentColor" />
                                    <h3 className="font-black text-lg">DAILY PARLAY</h3>
                                </div>
                                <div className="space-y-3">
                                    {(Array.isArray(parlays[0].match_data) ? parlays[0].match_data : [parlays[0].match_data]).map((m, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm border-b border-text-muted/10 pb-2 last:border-0 last:pb-0">
                                            <span className="font-bold">{m.homeTeam || m.home}</span>
                                            <span className="font-bold text-orange-500">{m.prediction || m.market}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 pt-4 border-t border-text-muted/10 flex justify-between items-center">
                                    <span className="text-xs font-bold text-text-muted uppercase">Total Odds</span>
                                    <span className="text-2xl font-black text-text-main">{parlays[0].confidence || '3.50'}</span>
                                </div>
                            </NeuCard>
                        </div>
                    )}



                    {/* SINGLE PICKS */}
                    <div>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Target size={18} /> Daily Curated</h3>
                        <div className="space-y-4">
                            {singlePicks.map((pick) => (
                                <NeuCard key={pick.id} className="py-3 px-4 flex justify-between items-center cursor-pointer hover:scale-[1.02] transition-transform">
                                    <div>
                                        <div className="text-xs font-bold text-text-muted uppercase">{pick.market}</div>
                                        <div className="font-bold text-sm">{(pick.match_data.homeTeam || pick.match_data.home)}</div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-base shadow-neu-extruded flex items-center justify-center">
                                        <ChevronRight size={16} />
                                    </div>
                                </NeuCard>
                            ))}
                            {singlePicks.length === 0 && <div className="text-sm text-text-muted italic">No singles pending.</div>}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Helper icon
function ChevronRight(props) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
}
