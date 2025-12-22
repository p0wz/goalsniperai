import { useState } from 'react';
import { signalService } from './services/api';
import clsx from 'clsx';

function RawStatsTab() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    const runAnalysis = async (leagueFilter) => {
        setLoading(true);
        setMatches([]);
        try {
            const res = await signalService.getRawStats(leagueFilter, 50);
            if (res.success) {
                setMatches(res.data.matches || []);
            }
        } catch (err) {
            alert(`Analiz başarısız: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const copyPrompt = (match) => {
        if (match.aiPrompt) {
            navigator.clipboard.writeText(match.aiPrompt);
            setCopiedId(match.id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        📊 Ham İstatistikler
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Tüm maçlar için H2H istatistikleri (market filtresi yok)
                    </p>
                </div>
            </div>

            {/* Analysis Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => runAnalysis(true)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                >
                    {loading ? '⏳ Taranıyor...' : '🏆 Lig Filtreli'}
                </button>
                <button
                    onClick={() => runAnalysis(false)}
                    disabled={loading}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-medium hover:shadow-lg disabled:opacity-50"
                >
                    {loading ? '⏳ Taranıyor...' : '🌍 Tüm Maçlar'}
                </button>
            </div>

            {/* Results Table */}
            {matches.length > 0 ? (
                <div className="rounded-lg border bg-card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Maç</th>
                                <th className="p-3 text-left">Lig</th>
                                <th className="p-3 text-center">Ev Formu</th>
                                <th className="p-3 text-center">Dep Formu</th>
                                <th className="p-3 text-center">AI Prompt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map((m, i) => (
                                <tr key={i} className="border-t hover:bg-muted/50">
                                    <td className="p-3 font-medium">
                                        {m.event_home_team} vs {m.event_away_team}
                                    </td>
                                    <td className="p-3 text-muted-foreground text-xs">
                                        {m.league_name}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center gap-1 text-xs">
                                            <span className="text-green-500">
                                                ⚽ {m.stats?.homeForm?.avgScored?.toFixed(1) || '-'}
                                            </span>
                                            <span className="text-yellow-500">
                                                🎯 %{m.stats?.homeHomeStats?.winRate?.toFixed(0) || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex flex-col items-center gap-1 text-xs">
                                            <span className="text-green-500">
                                                ⚽ {m.stats?.awayForm?.avgScored?.toFixed(1) || '-'}
                                            </span>
                                            <span className="text-yellow-500">
                                                🎯 %{m.stats?.awayAwayStats?.winRate?.toFixed(0) || '-'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => copyPrompt(m)}
                                            className={clsx(
                                                "px-4 py-2 rounded text-sm font-medium transition-all",
                                                copiedId === m.id
                                                    ? "bg-green-500 text-white"
                                                    : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg"
                                            )}
                                        >
                                            {copiedId === m.id ? '✓ Kopyalandı!' : '📋 Kopyala'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : !loading && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                    <p className="text-lg">📊 Ham istatistik taraması başlatılmadı.</p>
                    <p className="text-sm mt-2">
                        Yukarıdaki butonlardan birini seçerek tüm maçların istatistiklerini çekin.
                    </p>
                    <p className="text-xs mt-4 text-muted-foreground/70">
                        Bu modda market filtresi uygulanmaz - tüm maçlar için AI prompt'u oluşturulur.
                    </p>
                </div>
            )}

            {/* Info Card */}
            {matches.length > 0 && (
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <h3 className="font-medium text-purple-400 mb-2">💡 Kullanım</h3>
                    <p className="text-sm text-muted-foreground">
                        <strong>"📋 Kopyala"</strong> butonuna tıklayarak maçın tüm istatistiklerini içeren
                        AI prompt'unu panoya kopyalayın. Bu prompt'u ChatGPT, Claude veya başka bir
                        AI ile kullanarak maç analizi yaptırabilirsiniz.
                    </p>
                </div>
            )}
        </div>
    );
}

export { RawStatsTab };
