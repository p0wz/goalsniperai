import { useState, useEffect } from 'react';
import { signalService } from '../../services/api';
import NeuCard from '../../components/ui/NeuCard';
import NeuButton from '../../components/ui/NeuButton';

export default function ProDashboard({ user }) {
    const [liveSignals, setLiveSignals] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchLiveSignals = async () => {
        setLoading(true);
        try {
            const data = await signalService.getLiveSignals();
            setLiveSignals(data.data.filter(s => s.verdict === 'PLAY').sort((a, b) => b.confidencePercent - a.confidencePercent));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchLiveSignals();
    }, []);

    return (
        <div className="min-h-screen bg-base p-6 md:p-8 font-body">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-text-main">Live Signals</h1>
                        <p className="text-text-muted">High confidence opportunities detected in real-time.</p>
                    </div>
                    <NeuButton onClick={fetchLiveSignals} variant="secondary" className="px-4 py-2">
                        {loading ? 'Refreshing...' : 'Refresh Feed'}
                    </NeuButton>
                </div>

                {/* Signals Grid */}
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
                        <div className="col-span-full py-20 text-center">
                            <div className="text-6xl mb-4">💤</div>
                            <h3 className="text-2xl font-bold text-text-muted">No signals active</h3>
                            <p className="text-text-muted">The bot is scanning. Wait for the next wave.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
