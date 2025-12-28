import { useState, useEffect } from 'react';
import { betsService } from './services/api';

export default function MarketStatsTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedMarket, setSelectedMarket] = useState(null);
    const [allBets, setAllBets] = useState([]);
    const [loadingBets, setLoadingBets] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchAllBets();
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

    const fetchAllBets = async () => {
        setLoadingBets(true);
        try {
            const res = await betsService.getAll();
            setAllBets(res?.bets || []);
        } catch (e) {
            console.error('Failed to fetch bets:', e);
            setAllBets([]);
        } finally {
            setLoadingBets(false);
        }
    };

    const handleMarketClick = (market) => {
        setSelectedMarket(market === selectedMarket ? null : market);
    };

    // Filter bets by selected market (client-side)
    const filteredBets = selectedMarket
        ? allBets.filter(bet => bet.market === selectedMarket)
        : [];

    const getWinRateColor = (rate) => {
        if (rate >= 70) return 'text-emerald-400';
        if (rate >= 50) return 'text-amber-400';
        return 'text-rose-400';
    };

    const getWinRateBg = (rate) => {
        if (rate >= 70) return 'bg-emerald-500/10 border-emerald-500/40';
        if (rate >= 50) return 'bg-amber-500/10 border-amber-500/40';
        return 'bg-rose-500/10 border-rose-500/40';
    };

    const getProgressColor = (rate) => {
        if (rate >= 70) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
        if (rate >= 50) return 'bg-gradient-to-r from-amber-500 to-orange-400';
        return 'bg-gradient-to-r from-rose-500 to-pink-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!stats || !stats.byMarket || Object.keys(stats.byMarket).length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>📊 Henüz market istatistiği yok</p>
                <p className="text-sm mt-2">Bahisler settle edildikçe istatistikler burada görünecek.</p>
            </div>
        );
    }

    const marketEntries = Object.entries(stats.byMarket).sort((a, b) => {
        const aSettled = (a[1].won || 0) + (a[1].lost || 0);
        const bSettled = (b[1].won || 0) + (b[1].lost || 0);
        if (bSettled !== aSettled) return bSettled - aSettled;
        return (b[1].winRate || 0) - (a[1].winRate || 0);
    });

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-card rounded-xl p-4 text-center border border-border shadow-sm">
                    <p className="text-2xl font-bold text-foreground">{stats.total || 0}</p>
                    <p className="text-xs text-muted-foreground">Toplam</p>
                </div>
                <div className="bg-card rounded-xl p-4 text-center border border-border shadow-sm">
                    <p className="text-2xl font-bold text-amber-400">{stats.pending || 0}</p>
                    <p className="text-xs text-muted-foreground">Bekleyen</p>
                </div>
                <div className="bg-card rounded-xl p-4 text-center border border-border shadow-sm">
                    <p className="text-2xl font-bold text-emerald-400">{stats.won || 0}</p>
                    <p className="text-xs text-muted-foreground">Kazanan</p>
                </div>
                <div className="bg-card rounded-xl p-4 text-center border border-border shadow-sm">
                    <p className="text-2xl font-bold text-rose-400">{stats.lost || 0}</p>
                    <p className="text-xs text-muted-foreground">Kaybeden</p>
                </div>
                <div className="bg-card rounded-xl p-4 text-center border border-border shadow-sm">
                    <p className={`text-2xl font-bold ${getWinRateColor(stats.winRate || 0)}`}>
                        {stats.winRate || 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Genel Oran</p>
                </div>
            </div>

            {/* Per-Market Stats */}
            <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    📊 Market Bazlı İstatistikler
                    <span className="text-sm text-muted-foreground font-normal">
                        (Detay için karta tıklayın)
                    </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {marketEntries.map(([market, data]) => {
                        const settled = (data.won || 0) + (data.lost || 0);
                        const isSelected = selectedMarket === market;
                        const winRate = data.winRate || 0;

                        return (
                            <div
                                key={market}
                                onClick={() => handleMarketClick(market)}
                                className={`rounded-xl p-4 border cursor-pointer transition-all duration-200 ${isSelected
                                        ? 'bg-primary/10 border-primary ring-2 ring-primary/30 scale-[1.02]'
                                        : 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-medium text-foreground truncate">{market}</h4>
                                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${getWinRateBg(winRate)}`}>
                                        <span className={getWinRateColor(winRate)}>
                                            {winRate}%
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm mb-3">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        <span className="text-muted-foreground">{data.won || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                        <span className="text-muted-foreground">{data.lost || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                        <span className="text-muted-foreground">{data.pending || 0}</span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {settled > 0 && (
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${getProgressColor(winRate)}`}
                                            style={{ width: `${winRate}%` }}
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
                <div className="bg-card rounded-xl p-5 border border-primary/30 shadow-lg animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-foreground flex items-center gap-2">
                            <span className="text-xl">📋</span>
                            <span className="text-primary">{selectedMarket}</span>
                            <span className="text-muted-foreground font-normal">({filteredBets.length} bahis)</span>
                        </h4>
                        <button
                            onClick={() => setSelectedMarket(null)}
                            className="text-muted-foreground hover:text-foreground transition-colors text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {loadingBets ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : filteredBets.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Bu market için bahis bulunamadı.</p>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {filteredBets.slice(0, 30).map((bet) => (
                                <div
                                    key={bet.id}
                                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${bet.status === 'WON'
                                            ? 'bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10'
                                            : bet.status === 'LOST'
                                                ? 'bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10'
                                                : bet.status === 'REFUND'
                                                    ? 'bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10'
                                                    : 'bg-muted/30 border border-border hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">
                                            {bet.homeTeam} vs {bet.awayTeam}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{bet.league}</p>
                                    </div>
                                    <div className="flex items-center gap-3 ml-4">
                                        {bet.resultScore && (
                                            <span className="text-sm text-foreground font-mono bg-muted px-2 py-0.5 rounded">
                                                {bet.resultScore}
                                            </span>
                                        )}
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${bet.status === 'WON'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : bet.status === 'LOST'
                                                    ? 'bg-rose-500/20 text-rose-400'
                                                    : bet.status === 'REFUND'
                                                        ? 'bg-amber-500/20 text-amber-400'
                                                        : 'bg-muted text-muted-foreground'
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
