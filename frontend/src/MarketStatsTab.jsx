import { useState, useEffect } from 'react';
import { betsService } from './services/api';

export default function MarketStatsTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [marketBets, setMarketBets] = useState([]);
    const [loadingBets, setLoadingBets] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await betsService.getStats();
            if (res?.success !== false) {
                setStats(res);
            }
        } catch (e) {
            console.error('Failed to fetch stats:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMarketBets = async (market) => {
        setLoadingBets(true);
        try {
            const res = await betsService.getByMarket(market);
            setMarketBets(res?.bets || []);
        } catch (e) {
            console.error('Failed to fetch market bets:', e);
            setMarketBets([]);
        } finally {
            setLoadingBets(false);
        }
    };

    const handleMarketClick = (market) => {
        setSelectedMarket(market === selectedMarket ? null : market);
        if (market !== selectedMarket) {
            fetchMarketBets(market);
        }
    };

    const getWinRateColor = (rate) => {
        if (rate >= 70) return 'text-green-400';
        if (rate >= 50) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getWinRateBg = (rate) => {
        if (rate >= 70) return 'bg-green-500/20 border-green-500/30';
        if (rate >= 50) return 'bg-yellow-500/20 border-yellow-500/30';
        return 'bg-red-500/20 border-red-500/30';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!stats || !stats.byMarket || Object.keys(stats.byMarket).length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <p>📊 Henüz market istatistiği yok</p>
                <p className="text-sm mt-2">Bahisler settle edildikçe istatistikler burada görünecek.</p>
            </div>
        );
    }

    const marketEntries = Object.entries(stats.byMarket).sort((a, b) => {
        // Sort by settled count (won + lost), then by win rate
        const aSettled = (a[1].won || 0) + (a[1].lost || 0);
        const bSettled = (b[1].won || 0) + (b[1].lost || 0);
        if (bSettled !== aSettled) return bSettled - aSettled;
        return (b[1].winRate || 0) - (a[1].winRate || 0);
    });

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
                    <p className="text-2xl font-bold text-white">{stats.total || 0}</p>
                    <p className="text-xs text-gray-400">Toplam</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
                    <p className="text-2xl font-bold text-yellow-400">{stats.pending || 0}</p>
                    <p className="text-xs text-gray-400">Bekleyen</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
                    <p className="text-2xl font-bold text-green-400">{stats.won || 0}</p>
                    <p className="text-xs text-gray-400">Kazanan</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
                    <p className="text-2xl font-bold text-red-400">{stats.lost || 0}</p>
                    <p className="text-xs text-gray-400">Kaybeden</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-700">
                    <p className={`text-2xl font-bold ${getWinRateColor(stats.winRate || 0)}`}>
                        {stats.winRate || 0}%
                    </p>
                    <p className="text-xs text-gray-400">Genel Oran</p>
                </div>
            </div>

            {/* Per-Market Stats */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    📊 Market Bazlı İstatistikler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marketEntries.map(([market, data]) => {
                        const settled = (data.won || 0) + (data.lost || 0);
                        const isSelected = selectedMarket === market;

                        return (
                            <div
                                key={market}
                                onClick={() => handleMarketClick(market)}
                                className={`rounded-xl p-4 border cursor-pointer transition-all ${isSelected
                                        ? 'bg-cyan-500/20 border-cyan-500/50 ring-2 ring-cyan-500/30'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-white truncate">{market}</h4>
                                    <div className={`px-2 py-1 rounded-lg text-sm font-bold ${getWinRateBg(data.winRate || 0)}`}>
                                        <span className={getWinRateColor(data.winRate || 0)}>
                                            {data.winRate || 0}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <span className="text-green-400">✓</span>
                                        <span className="text-gray-300">{data.won || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-red-400">✗</span>
                                        <span className="text-gray-300">{data.lost || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-yellow-400">⏳</span>
                                        <span className="text-gray-300">{data.pending || 0}</span>
                                    </div>
                                    <div className="text-gray-500 ml-auto">
                                        {settled} settled
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {settled > 0 && (
                                    <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-green-500 h-full"
                                            style={{ width: `${((data.won || 0) / settled) * 100}%` }}
                                        />
                                        <div
                                            className="bg-red-500 h-full"
                                            style={{ width: `${((data.lost || 0) / settled) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Market Details */}
            {selectedMarket && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-white flex items-center gap-2">
                            📋 {selectedMarket} - Son Bahisler
                        </h4>
                        <button
                            onClick={() => setSelectedMarket(null)}
                            className="text-gray-400 hover:text-white text-xl"
                        >
                            ✕
                        </button>
                    </div>

                    {loadingBets ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
                        </div>
                    ) : marketBets.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">Bu market için bahis bulunamadı.</p>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {marketBets.slice(0, 20).map((bet) => (
                                <div
                                    key={bet.id}
                                    className={`flex items-center justify-between p-3 rounded-lg ${bet.status === 'WON' ? 'bg-green-500/10 border border-green-500/20' :
                                            bet.status === 'LOST' ? 'bg-red-500/10 border border-red-500/20' :
                                                bet.status === 'REFUND' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                                                    'bg-slate-700/50'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-white truncate">
                                            {bet.homeTeam} vs {bet.awayTeam}
                                        </p>
                                        <p className="text-xs text-gray-400">{bet.league}</p>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4">
                                        {bet.resultScore && (
                                            <span className="text-sm text-gray-300 font-mono">
                                                {bet.resultScore}
                                            </span>
                                        )}
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${bet.status === 'WON' ? 'bg-green-500/20 text-green-400' :
                                                bet.status === 'LOST' ? 'bg-red-500/20 text-red-400' :
                                                    bet.status === 'REFUND' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-slate-600 text-gray-300'
                                            }`}>
                                            {bet.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
