import { useState, useEffect } from 'react';
import { signalService, betService, trainingService, betsService } from './services/api';
import clsx from 'clsx';

// Market Configuration
const MARKET_CONFIG = {
    over25: { name: 'Over 2.5', icon: '🔥', desc: 'Maç sonu 3+ gol' },
    btts: { name: 'BTTS', icon: '⚽', desc: 'İki takım da gol atar' },
    doubleChance: { name: '1X DC', icon: '🛡️', desc: 'Ev sahibi kaybetmez' },
    homeOver15: { name: 'Ev 1.5+', icon: '🏠', desc: 'Ev sahibi 2+ gol' },
    under35: { name: 'Alt 3.5', icon: '🔒', desc: 'Maç sonu maks 3 gol' },
    under25: { name: 'Alt 2.5', icon: '🧊', desc: 'Maç sonu maks 2 gol' },
    firstHalfOver05: { name: '1Y 0.5+', icon: '⏱️', desc: 'İlk yarıda gol' },
    ms1AndOver15: { name: 'MS1 & 1.5 Üst', icon: '1️⃣', desc: 'Ev Kazanır ve 1.5 Üst' },
    awayOver05: { name: 'Dep 0.5 Üst', icon: '🚀', desc: 'Deplasman gol atar' },
    handicap: { name: 'Hnd. -1.5', icon: '💪', desc: 'Favori takım farklı kazanır (-1.5)' }
};

function MarketTab({ marketKey, handleAddToPicks }) {
    const config = MARKET_CONFIG[marketKey];

    const [candidates, setCandidates] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [matchOdds, setMatchOdds] = useState({}); // Store odds for each match

    // Update odds for a specific match
    const updateMatchOdds = (matchId, odds) => {
        setMatchOdds(prev => ({ ...prev, [matchId]: odds }));
    };

    // Get prompt with odds included
    const getPromptWithOdds = (match) => {
        const matchId = match.event_key || match.matchId;
        const odds = matchOdds[matchId];
        if (odds && match.aiPrompt) {
            const oddsText = `\n\n💰 ORAN BİLGİSİ:\n${config.name} Oranı: ${odds}\n⚠️ Bu oranı analiz sırasında değerlendir.`;
            return match.aiPrompt + oddsText;
        }
        return match.aiPrompt;
    };

    // Fetch history on mount
    useEffect(() => {
        fetchHistory();
        // Auto-load cached analysis on page load
        fetchLastAnalysis();
    }, [marketKey]);

    const fetchLastAnalysis = async () => {
        try {
            const res = await signalService.getLastAnalysis(marketKey);
            if (res.success && res.data && res.data.candidates) {
                setCandidates(res.data.candidates);
                console.log(`📦 Loaded cached ${marketKey} analysis (${res.data.candidates.length} matches)`);
            }
        } catch (e) {
            console.log('No cached analysis available');
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await signalService.getMarketHistory(marketKey);
            if (res.success) setHistory(res.data || []);
        } catch (e) { console.error(e); }
    };

    const runAnalysis = async (leagueFilter) => {
        setLoading(true);
        setCandidates([]);
        try {
            const res = await signalService.analyzeMarket(marketKey, leagueFilter);
            if (res.success) {
                setCandidates(res.data.candidates || []);
            }
        } catch (err) {
            alert(`Analiz başarısız: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSettle = async (id, status) => {
        if (!confirm(`Bu maçı ${status} olarak işaretle?`)) return;
        try {
            await betService.settleBet(id, status, '');
            fetchHistory();
        } catch (e) {
            alert('Hata: ' + e.message);
        }
    };

    const handleReset = async () => {
        if (!confirm(`${config.name} geçmişini sıfırla?`)) return;
        try {
            await signalService.resetMarketHistory(marketKey);
            setHistory([]);
            alert('Geçmiş sıfırlandı');
        } catch (e) {
            alert('Hata: ' + e.message);
        }
    };

    const copyPrompt = (match) => {
        const promptWithOdds = getPromptWithOdds(match);
        if (promptWithOdds) {
            navigator.clipboard.writeText(promptWithOdds);
            setCopiedId(match.event_key || match.matchId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const copyAllPrompts = () => {
        if (candidates.length === 0) return;

        const allPrompts = candidates.map((m, i) => {
            const header = `\n${'='.repeat(60)}\n📊 MAÇ ${i + 1}/${candidates.length}: ${m.event_home_team} vs ${m.event_away_team}\n${'='.repeat(60)}\n`;
            return header + getPromptWithOdds(m);
        }).join('\n\n');

        const fullText = `🎯 ${config.name} - TOPLU ANALİZ (${candidates.length} MAÇ)\n${allPrompts}`;
        navigator.clipboard.writeText(fullText);
        alert(`✅ ${candidates.length} maçın prompt'u kopyalandı!`);
    };

    const handleApproveBet = async (m) => {
        try {
            const res = await betsService.approve({
                eventId: m.event_key || m.matchId,
                match: `${m.event_home_team} vs ${m.event_away_team}`,
                homeTeam: m.event_home_team,
                awayTeam: m.event_away_team,
                league: m.league_name,
                market: config.name,
                prediction: config.name,
                matchDate: m.event_date || new Date().toISOString().split('T')[0],
                matchTime: m.event_start_time || m.event_time,
                stats: m.filterStats || m.stats || {},
                aiPrompt: m.aiPrompt
            });

            if (res.success) {
                alert('✅ Bahis onaylandı ve takibe alındı!');
            } else {
                alert('Hata: ' + (res.error || 'Bilinmeyen hata'));
            }
        } catch (e) {
            console.error('Approve error:', e);
            alert('Hata: ' + (e?.response?.data?.error || e?.message || 'Bağlantı hatası'));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        {config.icon} {config.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{config.desc}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowHistory(false)}
                        className={clsx("px-3 py-1 text-sm rounded-md", !showHistory ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                        Analiz
                    </button>
                    <button
                        onClick={() => setShowHistory(true)}
                        className={clsx("px-3 py-1 text-sm rounded-md", showHistory ? "bg-primary text-primary-foreground" : "bg-muted")}
                    >
                        Geçmiş ({history.filter(h => h.status === 'PENDING').length})
                    </button>
                </div>
            </div>

            {!showHistory ? (
                /* Analysis View */
                <div className="space-y-4">
                    {/* Analysis Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => runAnalysis(true)}
                            disabled={loading}
                            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? '⏳ Taranıyor...' : '🏆 Lig Filtreli Analiz'}
                        </button>
                        <button
                            onClick={() => runAnalysis(false)}
                            disabled={loading}
                            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? '⏳ Taranıyor...' : '🌍 Tüm Maçlar'}
                        </button>
                    </div>

                    {/* Bulk Copy Button */}
                    {candidates.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={copyAllPrompts}
                                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
                            >
                                📋 Tümünü Kopyala ({candidates.length} maç)
                            </button>
                        </div>
                    )}

                    {/* Results Table */}
                    {candidates.length > 0 ? (
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left">Maç</th>
                                        <th className="p-3 text-left">Lig</th>
                                        <th className="p-3 text-center w-24">Oran</th>
                                        <th className="p-3 text-center">AI Prompt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((m, i) => {
                                        const matchId = m.event_key || m.matchId;
                                        return (
                                            <tr key={i} className="border-t hover:bg-muted/50">
                                                <td className="p-3 font-medium">{m.event_home_team} vs {m.event_away_team}</td>
                                                <td className="p-3 text-muted-foreground">{m.league_name}</td>
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="text"
                                                        placeholder="1.85"
                                                        value={matchOdds[matchId] || ''}
                                                        onChange={(e) => updateMatchOdds(matchId, e.target.value)}
                                                        className="w-16 px-2 py-1 text-center text-sm rounded border bg-background focus:ring-2 focus:ring-primary focus:border-primary"
                                                    />
                                                </td>
                                                <td className="p-3 text-center flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => copyPrompt(m)}
                                                        className={clsx(
                                                            "px-3 py-1 rounded text-xs font-medium transition-all",
                                                            copiedId === matchId
                                                                ? "bg-green-500 text-white"
                                                                : matchOdds[matchId]
                                                                    ? "bg-blue-500 text-white hover:bg-blue-600"
                                                                    : "bg-muted hover:bg-primary hover:text-primary-foreground"
                                                        )}
                                                        title={matchOdds[matchId] ? `Oran dahil: ${matchOdds[matchId]}` : 'Oran girilmedi'}
                                                    >
                                                        {copiedId === matchId ? '✓' : matchOdds[matchId] ? '📋💰' : '📋'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddToPicks(m, config.name, 'single')}
                                                        className="px-3 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-all border border-yellow-500/20"
                                                        title="Add to Daily Picks"
                                                    >
                                                        ⭐ Pick
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddToPicks(m, config.name, 'parlay')}
                                                        className="px-3 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20"
                                                        title="Add to Daily Parlay"
                                                    >
                                                        🔥 Parlay
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveBet(m)}
                                                        className="px-3 py-1 rounded text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                                                        title="Onayla & Takibe Al"
                                                    >
                                                        ✅ Takip
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : !loading && (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                            <p>Henüz analiz yapılmadı.</p>
                            <p className="text-sm mt-2">Yukarıdaki butonlardan birini seçin.</p>
                        </div>
                    )}
                </div>
            ) : (
                /* History View */
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button
                            onClick={handleReset}
                            className="px-3 py-1 text-xs rounded bg-red-600/10 text-red-500 hover:bg-red-600/20"
                        >
                            🗑️ Geçmişi Sıfırla
                        </button>
                    </div>

                    {history.length > 0 ? (
                        <div className="rounded-lg border bg-card overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left">Maç</th>
                                        <th className="p-3 text-center">Durum</th>
                                        <th className="p-3 text-right">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((h, i) => (
                                        <tr key={i} className="border-t hover:bg-muted/50">
                                            <td className="p-3">
                                                <span className="font-medium">{h.homeTeam || h.home_team} vs {h.awayTeam || h.away_team}</span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-xs font-bold",
                                                    h.status === 'WON' && "bg-green-600/20 text-green-500",
                                                    h.status === 'LOST' && "bg-red-600/20 text-red-500",
                                                    h.status === 'PENDING' && "bg-yellow-600/20 text-yellow-500"
                                                )}>
                                                    {h.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                {h.status === 'PENDING' && (
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleSettle(h.id, 'WON')}
                                                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                        >
                                                            WON
                                                        </button>
                                                        <button
                                                            onClick={() => handleSettle(h.id, 'LOST')}
                                                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                                        >
                                                            LOST
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                            <p>Henüz geçmiş yok.</p>
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
}

export { MarketTab, MARKET_CONFIG };
