import { useState } from 'react';
import { signalService, sentioService } from './services/api';
import clsx from 'clsx';

function RawStatsTab() {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const [allCopied, setAllCopied] = useState(false);
    const [sentioApprovedId, setSentioApprovedId] = useState(null);
    const [sentioAllApproved, setSentioAllApproved] = useState(false);
    const [sentioLoading, setSentioLoading] = useState(false);

    const runAnalysis = async (leagueFilter) => {
        setLoading(true);
        setMatches([]);
        setAllCopied(false);
        setSentioAllApproved(false);
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

    const copyAllPrompts = () => {
        if (matches.length === 0) return;

        const allPrompts = matches.map((m, i) => {
            return `\n${'='.repeat(80)}\n📌 MAÇ ${i + 1}/${matches.length}\n${'='.repeat(80)}\n${m.aiPrompt}`;
        }).join('\n\n');

        const header = `🎯 TOPLU MAÇ ANALİZİ - ${matches.length} MAÇ\n📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n${'═'.repeat(80)}`;

        navigator.clipboard.writeText(header + allPrompts);
        setAllCopied(true);
        setTimeout(() => setAllCopied(false), 3000);
    };

    // SENTIO: Approve single match
    const approveForSentio = async (match) => {
        try {
            const res = await sentioService.approveMatch({
                matchId: match.matchId || match.id,
                homeTeam: match.event_home_team,
                awayTeam: match.event_away_team,
                league: match.league_name,
                stats: match.stats,
                aiPrompt: match.aiPrompt
            });
            if (res.success) {
                setSentioApprovedId(match.id);
                setTimeout(() => setSentioApprovedId(null), 2000);
            }
        } catch (err) {
            alert(`SENTIO onay hatası: ${err.message}`);
        }
    };

    // SENTIO: Approve all matches
    const approveAllForSentio = async () => {
        if (matches.length === 0) return;
        setSentioLoading(true);

        try {
            const formattedMatches = matches.map(m => ({
                matchId: m.matchId || m.id,
                homeTeam: m.event_home_team,
                awayTeam: m.event_away_team,
                league: m.league_name,
                stats: m.stats,
                aiPrompt: m.aiPrompt
            }));

            const res = await sentioService.approveBulk(formattedMatches);
            if (res.success) {
                setSentioAllApproved(true);
                alert(`✅ ${res.added} maç SENTIO'ya eklendi${res.skipped > 0 ? `, ${res.skipped} zaten mevcuttu` : ''}`);
            }
        } catch (err) {
            alert(`SENTIO toplu onay hatası: ${err.message}`);
        } finally {
            setSentioLoading(false);
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

            {/* Action Buttons Row */}
            {matches.length > 0 && (
                <div className="flex justify-center gap-4 flex-wrap">
                    {/* Copy All */}
                    <button
                        onClick={copyAllPrompts}
                        className={clsx(
                            "px-6 py-3 rounded-lg text-lg font-bold transition-all shadow-lg",
                            allCopied
                                ? "bg-green-500 text-white"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl hover:scale-105"
                        )}
                    >
                        {allCopied
                            ? `✅ ${matches.length} Maç Kopyalandı!`
                            : `📋 Tümünü Kopyala (${matches.length} Maç)`
                        }
                    </button>

                    {/* SENTIO Approve All */}
                    <button
                        onClick={approveAllForSentio}
                        disabled={sentioLoading || sentioAllApproved}
                        className={clsx(
                            "px-6 py-3 rounded-lg text-lg font-bold transition-all shadow-lg",
                            sentioAllApproved
                                ? "bg-green-500 text-white"
                                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-xl hover:scale-105 disabled:opacity-50"
                        )}
                    >
                        {sentioLoading
                            ? '⏳ Gönderiliyor...'
                            : sentioAllApproved
                                ? `✅ SENTIO'ya Gönderildi!`
                                : `🤖 Tümünü SENTIO'ya Gönder`
                        }
                    </button>
                </div>
            )}

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
                                <th className="p-3 text-center">İşlemler</th>
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
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <button
                                                onClick={() => copyPrompt(m)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded text-xs font-medium transition-all",
                                                    copiedId === m.id
                                                        ? "bg-green-500 text-white"
                                                        : "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg"
                                                )}
                                            >
                                                {copiedId === m.id ? '✓' : '📋'}
                                            </button>
                                            <button
                                                onClick={() => approveForSentio(m)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded text-xs font-medium transition-all",
                                                    sentioApprovedId === m.id
                                                        ? "bg-green-500 text-white"
                                                        : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg"
                                                )}
                                            >
                                                {sentioApprovedId === m.id ? '✓' : '🤖'}
                                            </button>
                                        </div>
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
                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <h3 className="font-medium text-cyan-400 mb-2">💡 SENTIO Kullanımı</h3>
                    <p className="text-sm text-muted-foreground">
                        <strong>"🤖 Tümünü SENTIO'ya Gönder"</strong> butonuyla tüm maçları SENTIO hafızasına ekleyin.<br />
                        Kullanıcılar dashboard'da SENTIO Chat ile bu maçlar hakkında sohbet edebilir,
                        tahmin ve kupon önerileri alabilir.
                    </p>
                </div>
            )}
        </div>
    );
}

export { RawStatsTab };
