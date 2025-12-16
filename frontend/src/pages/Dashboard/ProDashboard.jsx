import { useState, useEffect } from 'react';
import { signalService, picksService } from '../../services/api';
import NeuCard from '../../components/ui/NeuCard';
import NeuButton from '../../components/ui/NeuButton';
import { Trophy, Flame, Target } from 'lucide-react';

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
    }, []);

    const singlePicks = dailyPicks.filter(p => p.type === 'single');
    const parlays = dailyPicks.filter(p => p.type === 'parlay');

    return (
        <div className="min-h-screen bg-base p-6 md:p-8 font-body">
            <div className="max-w-7xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-text-main">Welcome Back, {user.name}</h1>
                        <p className="text-text-muted">Your daily edge is ready.</p>
                    </div>
                    <NeuButton onClick={fetchData} variant="secondary" className="px-4 py-2">
                        {loading ? 'Refreshing...' : 'Refresh Feed'}
                    </NeuButton>
                </div>

                {/* 🌟 USER REQUEST: Daily Picks & Parlays Section */}
                {(singlePicks.length > 0 || parlays.length > 0) && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-black flex items-center gap-2 text-accent">
                            <Trophy className="text-yellow-500" /> Günün Seçimleri (Curated)
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* PARLAYS (Featured) */}
                            {parlays.map((parlay) => (
                                <NeuCard key={parlay.id} className="md:col-span-2 relative overflow-hidden border-2 border-accent/20">
                                    <div className="absolute top-0 right-0 p-2 bg-accent text-white rounded-bl-xl font-bold text-xs shadow-neu-extruded z-10">
                                        🔥 GÜNÜN KUPONU
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Flame className="text-orange-500" size={24} />
                                            <span className="font-bold text-lg">Yüksek Güvenli Kombine</span>
                                        </div>
                                        <div className="space-y-2">
                                            {/* Render parsed match data for parlay - assumed array or text? 
                                                Actually DB stores JSON. If it's a parlay, match_data implies multiple matches? 
                                                Let's assume match_data is an array for parlays or single object for singles.
                                            */}
                                            {(Array.isArray(parlay.match_data) ? parlay.match_data : [parlay.match_data]).map((m, i) => (
                                                <div key={i} className="flex justify-between items-center bg-base shadow-neu-inset p-3 rounded-lg">
                                                    <span className="font-bold text-sm text-text-main">{m.homeTeam || m.home} vs {m.awayTeam || m.away}</span>
                                                    <span className="font-bold text-accent">{m.prediction || m.market || 'Pick'}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-center pt-2">
                                            <span className="text-sm text-text-muted">Toplam Oran: </span>
                                            <span className="text-xl font-black text-green-500">{parlay.confidence || '3.50'}</span>
                                        </div>
                                    </div>
                                </NeuCard>
                            ))}

                            {/* SINGLE PICKS */}
                            {singlePicks.map((pick) => (
                                <NeuCard key={pick.id} className="relative">
                                    <div className="absolute top-3 right-3">
                                        <Target className="text-blue-500" size={20} />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">{pick.market}</div>
                                        <div className="font-bold text-lg leading-tight">
                                            {(pick.match_data.homeTeam || pick.match_data.home)} <br />
                                            <span className="text-sm text-text-muted">vs</span> <br />
                                            {(pick.match_data.awayTeam || pick.match_data.away)}
                                        </div>
                                        <div className="bg-base shadow-neu-inset rounded-lg p-2 text-center">
                                            <span className="text-accent font-black text-xl">{pick.category || 'Pick'}</span>
                                        </div>
                                    </div>
                                </NeuCard>
                            ))}
                        </div>
                    </div>
                )}


                {/* LIVE SIGNALS */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-black flex items-center gap-2 text-text-main">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> Live Sniper Feed
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {liveSignals.map((signal) => (
                            <NeuCard key={signal.id} className="relative group hover:-translate-y-2 transition-transform duration-300">
                                {/* League Badge */}
                                <div className="absolute top-4 right-4 text-xs font-bold text-text-muted bg-base shadow-neu-inset px-2 py-1 rounded-lg">
                                    {signal.league}
                                </div>

                                {/* Teams */}
                                <div className="mb-6 mt-2">
                                    <div className="text-xl font-bold text-text-main mb-1">{signal.homeTeam}</div>
                                    <div className="text-sm text-text-muted">vs</div>
                                    <div className="text-xl font-bold text-text-main mt-1">{signal.awayTeam}</div>
                                </div>

                                {/* Stats Row */}
                                <div className="flex items-center justify-between bg-base shadow-neu-inset rounded-xl p-4 mb-4">
                                    <div className="text-center">
                                        <div className="text-xs text-text-muted font-bold">SCORE</div>
                                        <div className="text-lg font-bold text-accent">{signal.score}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-text-muted font-bold">TIME</div>
                                        <div className="text-lg font-bold text-text-main">{signal.time}'</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-text-muted font-bold">HT</div>
                                        <div className="text-lg font-bold text-text-muted">{signal.htScore}</div>
                                    </div>
                                </div>

                                {/* Confidence */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-xs font-bold text-text-muted mb-1">
                                        <span>CONFIDENCE</span>
                                        <span>{signal.confidencePercent}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-base shadow-neu-inset rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-accent shadow-neu-extruded"
                                            style={{ width: `${signal.confidencePercent}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Reason */}
                                <p className="text-sm text-text-muted italic bg-base/50 p-2 rounded-lg line-clamp-2 mb-4">
                                    "{signal.reason}"
                                </p>

                                <NeuButton className="w-full py-3">Bet Now</NeuButton>
                            </NeuCard>
                        ))}

                        {liveSignals.length === 0 && !loading && (
                            <div className="col-span-full py-20 text-center border-2 border-dashed border-text-muted/20 rounded-3xl">
                                <div className="text-6xl mb-4 grayscale opacity-50">📡</div>
                                <h3 className="text-2xl font-bold text-text-muted">No live signals yet</h3>
                                <p className="text-text-muted">The bot is scanning global leagues. Hold tight.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
