import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { signalService, betService, adminService, picksService } from '../../services/api';
import { MarketTab, MARKET_CONFIG } from '../../MarketTab';
import clsx from 'clsx';
import NeuButton from '../../components/ui/NeuButton';

export default function AdminPanel({ user, handleLogout }) {
    const [activeTab, setActiveTab] = useState('live');
    const [liveSignals, setLiveSignals] = useState([]);
    const [betHistory, setBetHistory] = useState([]);
    const [dailyAnalysis, setDailyAnalysis] = useState(null);
    const [firstHalfData, setFirstHalfData] = useState(null);
    const [selectedDailyMatch, setSelectedDailyMatch] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isAnalysing, setIsAnalysing] = useState(false);
    const [isAnalysingFH, setIsAnalysingFH] = useState(false);
    const [botRunning, setBotRunning] = useState(false);
    const [botStatusLoading, setBotStatusLoading] = useState(false);

    // Gemini Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');

    useEffect(() => {
        fetchLiveSignals();
        fetchBetHistory();
        fetchBotStatus();
    }, []);

    const fetchBotStatus = async () => {
        try {
            const res = await adminService.getBotStatus();
            setBotRunning(res.running);
        } catch (err) { console.error('Failed to get bot status', err); }
    };

    const toggleBot = async () => {
        if (!user) return;
        setBotStatusLoading(true);
        try {
            let res;
            if (botRunning) {
                res = await adminService.stopBot();
            } else {
                res = await adminService.startBot();
            }
            if (res.success) {
                setBotRunning(res.running);
                alert(res.message);
            }
        } catch (err) {
            alert('Failed to toggle bot: ' + err.message);
        } finally {
            setBotStatusLoading(false);
        }
    };

    const fetchLiveSignals = async () => {
        try {
            setRefreshing(true);
            fetchBotStatus();
            const data = await signalService.getLiveSignals();
            setLiveSignals(data.data.filter(s => s.verdict === 'PLAY').sort((a, b) => b.confidencePercent - a.confidencePercent));
        } catch (err) { console.error(err); }
        finally { setRefreshing(false); }
    };

    const fetchBetHistory = async () => {
        try {
            const data = await betService.getHistory();
            setBetHistory(data.data || []);
        } catch (err) {
            console.error("Failed to load history", err);
        }
    };

    const handleRunDaily = async (leagueFilter = true) => {
        try {
            setIsAnalysing(true);
            const res = await signalService.getDailyAnalysis(true, leagueFilter);
            if (res.success) setDailyAnalysis(res.data);
        } catch (err) {
            alert('Analysis failed: ' + err.message);
        } finally {
            setIsAnalysing(false);
        }
    };

    const handleRunFirstHalf = async () => {
        try {
            setIsAnalysingFH(true);
            const res = await signalService.getFirstHalfAnalysis();
            if (res.success) setFirstHalfData(res.data);
        } catch (err) {
            alert('FH Analysis failed: ' + err.message);
        } finally {
            setIsAnalysingFH(false);
        }
    };

    const handleSettle = async (id, status, actualScore) => {
        if (!confirm(`Mark this bet as ${status}?`)) return;
        try {
            await betService.settleBet(id, status, actualScore || '0-0');
            fetchBetHistory();
            alert('Bet updated!');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    const handleDailyAction = async (match, action, category) => {
        try {
            if (action === 'approve') {
                await signalService.approveSignal(match.id, {
                    matchData: {
                        matchId: match.matchId,
                        home_team: match.event_home_team,
                        away_team: match.event_away_team
                    },
                    market: match.market,
                    category: category,
                    confidence: 85
                });
                alert(`Approved: ${match.event_home_team} vs ${match.event_away_team}`);
                fetchBetHistory();
            } else if (action === 'reject') {
                if (!confirm('Are you sure you want to remove this match?')) return;
                await signalService.rejectSignal(match.id);
            }

            const newAnalysis = { ...dailyAnalysis };
            for (const cat in newAnalysis) {
                if (Array.isArray(newAnalysis[cat])) {
                    newAnalysis[cat] = newAnalysis[cat].filter(m => m.id !== match.id);
                }
            }
            setDailyAnalysis(newAnalysis);

            if (firstHalfData && firstHalfData.firstHalfOver05) {
                const newFH = { ...firstHalfData };
                newFH.firstHalfOver05 = newFH.firstHalfOver05.filter(m => m.id !== match.id);
                setFirstHalfData(newFH);
            }

        } catch (err) {
            console.error(`Action ${action} failed`, err);
            alert('Action failed');
        }
    };

    const handleAddToPicks = async (match, marketName, type = 'single') => {
        if (!confirm(`Add ${match.event_home_team} vs ${match.event_away_team} to ${type === 'parlay' ? 'Daily Parlay' : 'Daily Picks'}?`)) return;
        try {
            await adminService.createPick({
                type: type,
                match_data: {
                    matchId: match.matchId,
                    homeTeam: match.event_home_team,
                    awayTeam: match.event_away_team,
                    market: marketName,
                    prediction: marketName
                },
                market: marketName,
                category: type === 'parlay' ? 'Daily Parlay' : 'Daily Pick',
                confidence: 85
            });
            alert(`Added to ${type === 'parlay' ? 'Parlay' : 'Daily Picks'}!`);
        } catch (err) {
            alert('Failed to add pick: ' + err.message);
        }
    };

    const handleDeleteHistory = async (id) => {
        if (!confirm('Delete this record permanently?')) return;
        try {
            await betService.deleteBet(id);
            setBetHistory(prev => prev.filter(b => b.id !== id));
        } catch (e) {
            alert('Delete failed');
        }
    };

    // Helper: Copy Market Prompt
    const copyMarketPrompt = (title, items) => {
        if (!items || items.length === 0) return;

        let prompt = `Role: Professional Sports Betting Analyst\n`;
        prompt += `Task: Analyze the following ${items.length} matches for the '${title}' market. Identify the TOP 3 safest picks based on the data provided.\n\n`;
        prompt += `CRITERIA: Focus on Form consistency, H2H safety, and League averages.\n\n`;
        prompt += `--------------------------------------------------\n\n`;

        items.forEach((match, index) => {
            prompt += `MATCH ${index + 1}: ${match.event_home_team} vs ${match.event_away_team}\n`;
            prompt += `League: ${match.league}\n`;

            if (match.detailed_analysis) {
                prompt += `STATS:\n`;
                prompt += `- ${match.detailed_analysis.form.home}\n`;
                prompt += `- ${match.detailed_analysis.form.away}\n`;
                prompt += `- League Avg: ${match.detailed_analysis.stats.leagueAvg}\n`;
                prompt += `- H2H: ${match.detailed_analysis.h2h.summary}\n`;
                match.detailed_analysis.h2h.games.forEach(g => prompt += `  * ${g}\n`);
            }
            prompt += `\n--------------------------------------------------\n\n`;
        });

        prompt += `OUTPUT FORMAT:\n`;
        prompt += `1. [Match Name] - [Confidence %] - [Brief Reasoning]\n`;
        prompt += `2. [Match Name] - [Confidence %] - [Brief Reasoning]\n`;
        prompt += `3. [Match Name] - [Confidence %] - [Brief Reasoning]\n`;

        navigator.clipboard.writeText(prompt);
        alert(`Copied prompt for ${items.length} matches in ${title}!`);
    };

    // Modal Component for Daily Analysis Details
    const MatchDetailsModal = ({ match, onClose }) => {
        if (!match) return null;

        const copyToClipboard = (text) => {
            navigator.clipboard.writeText(text);
            alert('Prompt copied to clipboard!');
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">{match.event_home_team} vs {match.event_away_team}</h2>
                            <p className="text-sm text-muted-foreground">{match.league} • {match.market}</p>
                        </div>
                        <button onClick={onClose} className="rounded-full p-2 hover:bg-accent">✕</button>
                    </div>

                    <div className="space-y-6">
                        {/* Detailed Analysis Section */}
                        {match.detailed_analysis && !match.fhStats && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-primary border-b pb-1">📊 Detailed Analysis</h3>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded bg-muted/30 p-3 text-sm">
                                        <div className="font-semibold mb-1">Form</div>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>{match.detailed_analysis.form.home}</li>
                                            <li>{match.detailed_analysis.form.away}</li>
                                        </ul>
                                    </div>
                                    <div className="rounded bg-muted/30 p-3 text-sm">
                                        <div className="font-semibold mb-1">Stats</div>
                                        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                            <li>League Avg Goals: {match.detailed_analysis.stats.leagueAvg}</li>
                                            <li>Home @ Home: {match.detailed_analysis.stats.homeAtHome}</li>
                                            <li>Away @ Away: {match.detailed_analysis.stats.awayAtAway}</li>
                                        </ul>
                                    </div>
                                </div>

                                {match.detailed_analysis.h2h && (
                                    <div className="rounded bg-muted/30 p-3 text-sm">
                                        <div className="font-semibold mb-1">Head-to-Head</div>
                                        <p className="mb-2 text-muted-foreground">{match.detailed_analysis.h2h.summary}</p>
                                        <div className="space-y-1">
                                            {match.detailed_analysis.h2h.games.map((g, i) => (
                                                <div key={i} className="text-xs font-mono bg-background/50 p-1 rounded border">{g}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* PURE FORM ANALYSIS (New 1H Module) */}
                        {match.fhStats && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-primary border-b pb-1">⚡ First Half Pure Form</h3>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className={clsx("text-3xl font-bold", match.fhStats.score >= 80 ? "text-green-500" : "text-yellow-500")}>
                                        {match.fhStats.score}<span className="text-sm font-normal text-muted-foreground">/100</span>
                                    </div>
                                    <div className="px-3 py-1 rounded bg-muted text-sm font-mono border">
                                        Confidence: {match.fhStats.confidence}
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="p-3 bg-muted/30 rounded border text-center">
                                        <div className="text-xs text-muted-foreground uppercase">Home 1H Goal</div>
                                        <div className="text-lg font-bold text-foreground">{match.fhStats.metrics.home_ht_rate}%</div>
                                        <div className="text-[10px] text-muted-foreground">Last 5-8 Home Games</div>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded border text-center">
                                        <div className="text-xs text-muted-foreground uppercase">Away 1H Goal</div>
                                        <div className="text-lg font-bold text-foreground">{match.fhStats.metrics.away_ht_rate}%</div>
                                        <div className="text-[10px] text-muted-foreground">Last 5-8 Away Games</div>
                                    </div>
                                    <div className="p-3 bg-muted/30 rounded border text-center">
                                        <div className="text-xs text-muted-foreground uppercase">H2H 1H Goal</div>
                                        <div className="text-lg font-bold text-foreground">{match.fhStats.metrics.h2h_ht_rate}%</div>
                                        <div className="text-[10px] text-muted-foreground">Last 5 Meetings</div>
                                    </div>
                                </div>

                                <div className="rounded bg-indigo-500/10 border border-indigo-500/20 p-3 text-sm">
                                    <div className="font-semibold mb-1 text-indigo-400">Analysis Logic</div>
                                    <p className="text-foreground/80 leading-relaxed">{match.fhStats.reason}</p>
                                </div>
                            </div>
                        )}

                        {/* AI Prompts Section */}
                        {match.ai_prompts && match.ai_prompts.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-primary border-b pb-1">🤖 AI Prompts</h3>
                                <p className="text-xs text-muted-foreground">Click to copy prompt and paste into ChatGPT/Claude.</p>

                                <div className="space-y-2">
                                    {match.ai_prompts.map((prompt, idx) => (
                                        <div key={idx} className="flex items-center gap-2 rounded border bg-muted/20 p-2 text-sm transition-colors hover:bg-accent/20">
                                            <div className="flex-1 truncate font-mono text-xs text-muted-foreground" title={prompt}>
                                                {prompt.substring(0, 80)}...
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(prompt)}
                                                className="shrink-0 px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90"
                                            >
                                                Copy
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!match.detailed_analysis && !match.ai_prompts && (
                            <div className="p-4 text-center text-muted-foreground italic">
                                No detailed analysis available for this match.
                            </div>
                        )}

                    </div>

                    <div className="mt-6 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 rounded bg-muted hover:bg-muted/80 text-foreground text-sm font-medium">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b bg-card p-4 shadow-sm">
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">G</div>
                        <h1 className="text-xl font-bold">SENTIO Pro - ADMIN</h1>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <Link
                            to="/dashboard"
                            className="px-3 py-1.5 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold transition-colors"
                        >
                            👁️ View as User
                        </Link>
                        <span className="text-muted-foreground">{user.name} <span className="text-xs opacity-50">({user.role})</span></span>
                        <button onClick={handleLogout} className="text-red-400 hover:text-red-300">Logout</button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 md:p-6">
                {/* Navigation Tabs */}
                <div className="mb-6 flex gap-2 border-b overflow-x-auto">
                    {['live', 'analiz', 'history', 'picks', ...Object.keys(MARKET_CONFIG)].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={clsx(
                                "px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                                activeTab === tab
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {tab === 'live' && '📡 Live'}
                            {tab === 'analiz' && '🎯 Analiz'}
                            {tab === 'history' && '📜 Geçmiş'}
                            {tab === 'picks' && '⭐ Yönetin'}
                            {MARKET_CONFIG[tab] && `${MARKET_CONFIG[tab].icon} ${MARKET_CONFIG[tab].name}`}
                        </button>
                    ))}
                </div>

                {/* Tab Content: LIVE */}
                {activeTab === 'live' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Active Live Signals</h2>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleBot}
                                    className={clsx("px-4 py-2 rounded font-bold transition-all", botRunning ? "bg-green-500 text-white" : "bg-red-500 text-white")}
                                    disabled={botStatusLoading}
                                >
                                    {botStatusLoading ? "..." : (botRunning ? "🟢 BOT ON" : "🔴 BOT OFF")}
                                </button>
                                <button onClick={fetchLiveSignals} className="p-2 bg-muted rounded hover:bg-muted/80" disabled={refreshing}>
                                    {refreshing ? '...' : '↻'}
                                </button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {liveSignals.map((signal) => (
                                <div key={signal.id} className="border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-lg text-primary">{signal.homeTeam} vs {signal.awayTeam}</span>
                                        <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded font-mono">{signal.time}'</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mb-3">{signal.league}</div>

                                    <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3 bg-muted/20 p-2 rounded">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Score</div>
                                            <div className="font-bold">{signal.score}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">HT Score</div>
                                            <div className="font-bold">{signal.htScore}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Attacks</div>
                                            <div className="font-bold text-green-500">{signal.stats.dangerousAttacks.home}-{signal.stats.dangerousAttacks.away}</div>
                                        </div>
                                    </div>

                                    <div className="bg-primary/5 p-3 rounded mb-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-bold text-sm">Strategy: {signal.strategyId}</span>
                                            <span className="text-xs font-bold bg-green-100 text-green-800 px-1.5 py-0.5 rounded">{signal.confidencePercent}%</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground italic line-clamp-2">{signal.reason}</p>
                                    </div>
                                </div>
                            ))}
                            {liveSignals.length === 0 && <div className="text-muted-foreground text-center col-span-3 py-8">No live signals matching criteria right now.</div>}
                        </div>
                    </div>
                )}

                {/* Tab Content: ANALYSIS HUB */}
                {activeTab === 'analiz' && (
                    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-bold mb-2">🎯 Analiz Merkezi</h2>
                            <p className="text-muted-foreground">Tüm marketler için toplu analiz</p>
                        </div>

                        <div className="flex justify-center gap-4 mb-8 flex-wrap">
                            <button
                                onClick={() => handleRunDaily(true)}
                                disabled={isAnalysing}
                                className="px-6 py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isAnalysing ? '⏳ Taranıyor...' : '🏆 LİG FİLTRELİ ANALİZ'}
                            </button>
                            <button
                                onClick={() => handleRunDaily(false)}
                                disabled={isAnalysing}
                                className="px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isAnalysing ? '⏳ Taranıyor...' : '🌍 TÜM MAÇLAR (Filtresiz)'}
                            </button>
                        </div>

                        {/* ORACLE DASHBOARD (AI-FIRST) */}
                        {dailyAnalysis?.oracle && dailyAnalysis.oracle.length > 0 && (
                            <div className="mb-12 space-y-6">
                                <div className="p-1 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
                                    <div className="bg-background rounded-lg p-6">
                                        <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
                                            🤖 AI ORACLE RECOMMENDATIONS
                                            <span className="text-sm font-normal text-muted-foreground ml-2">
                                                (Based on detailed AI analysis of {dailyAnalysis.oracle.length} matches)
                                            </span>
                                        </h3>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* COLUMN 1: BANKO */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b pb-2">
                                                    <h4 className="text-xl font-bold text-green-600 flex items-center gap-2">
                                                        🏆 BANKO (High Confidence)
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const bankos = dailyAnalysis.oracle.flatMap(m =>
                                                                    (m.recommendations || []).filter(r => r.classification === 'BANKO').map(r => ({ ...r, match: m }))
                                                                );
                                                                const prompt = `Review these BANKO candidates and analyze if they are truly safe:\n\n${bankos.map((b, i) => `${i + 1}. ${b.match.event_home_team} vs ${b.match.event_away_team} (${b.match.league_name})\n   Pick: ${b.market}\n   AI Confidence: ${b.confidence}%\n   Reason: ${b.reasoning}`).join('\n\n')}`;
                                                                navigator.clipboard.writeText(prompt);
                                                                alert('Banko Prompt Copied! Paste into ChatGPT.');
                                                            }}
                                                            className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded hover:bg-muted/80 font-bold border"
                                                        >
                                                            📋 Copy for Review
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const bankos = dailyAnalysis.oracle.flatMap(m =>
                                                                    (m.recommendations || []).filter(r => r.classification === 'BANKO').map(r => ({ id: m.id, matchData: { matchId: m.event_key || m.match_id, home_team: m.event_home_team, away_team: m.event_away_team, training_data: m.ai_analysis_raw?.training_data }, market: r.market, category: 'oracle' }))
                                                                );
                                                                if (confirm(`Approve all ${bankos.length} BANKO bets?`)) {
                                                                    signalService.bulkApprove(bankos, 'oracle');
                                                                    alert('Bankos Approved!');
                                                                }
                                                            }}
                                                            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 font-bold"
                                                        >
                                                            ✅ Approve All Bankos
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {dailyAnalysis.oracle.flatMap(m =>
                                                        (m.recommendations || []).filter(r => r.classification === 'BANKO').map((r, idx) => ({ ...r, match: m, idx: `${m.id}_${idx}` }))
                                                    ).map(item => (
                                                        <div key={item.idx} className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-900/10 hover:shadow-md transition-all">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-bold">{item.match.event_home_team} vs {item.match.event_away_team}</div>
                                                                    <div className="text-xs text-muted-foreground">{item.match.league_name}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-green-600">{item.market}</div>
                                                                    <div className="text-xs font-mono">{item.confidence}% Conf.</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-foreground/80 italic mb-3">"{item.reasoning}"</p>
                                                            <button
                                                                onClick={() => handleDailyAction({ ...item.match, market: item.market }, 'approve', 'oracle')}
                                                                className="w-full py-1.5 rounded bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                                                            >
                                                                APPROVE
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {dailyAnalysis.oracle.flatMap(m => (m.recommendations || []).filter(r => r.classification === 'BANKO')).length === 0 && (
                                                        <div className="text-center p-8 text-muted-foreground italic">No Banko opportunities found today.</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* COLUMN 2: VALUE */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between border-b pb-2">
                                                    <h4 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                                                        💎 VALUE (High Reward)
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const values = dailyAnalysis.oracle.flatMap(m =>
                                                                    (m.recommendations || []).filter(r => r.classification === 'VALUE').map(r => ({ ...r, match: m }))
                                                                );
                                                                const prompt = `Review these VALUE candidates and analyze if the risk is worth the reward:\n\n${values.map((b, i) => `${i + 1}. ${b.match.event_home_team} vs ${b.match.event_away_team} (${b.match.league_name})\n   Pick: ${b.market}\n   AI Confidence: ${b.confidence}%\n   Reason: ${b.reasoning}`).join('\n\n')}`;
                                                                navigator.clipboard.writeText(prompt);
                                                                alert('Value Prompt Copied! Paste into ChatGPT.');
                                                            }}
                                                            className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded hover:bg-muted/80 font-bold border"
                                                        >
                                                            📋 Copy for Review
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const values = dailyAnalysis.oracle.flatMap(m =>
                                                                    (m.recommendations || []).filter(r => r.classification === 'VALUE').map(r => ({ id: m.id, matchData: { matchId: m.event_key || m.match_id, home_team: m.event_home_team, away_team: m.event_away_team, training_data: m.ai_analysis_raw?.training_data }, market: r.market, category: 'oracle' }))
                                                                );
                                                                if (confirm(`Approve all ${values.length} VALUE bets?`)) {
                                                                    signalService.bulkApprove(values, 'oracle');
                                                                    alert('Value Bets Approved!');
                                                                }
                                                            }}
                                                            className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-bold"
                                                        >
                                                            ✅ Approve All Value
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    {dailyAnalysis.oracle.flatMap(m =>
                                                        (m.recommendations || []).filter(r => r.classification === 'VALUE').map((r, idx) => ({ ...r, match: m, idx: `${m.id}_${idx}` }))
                                                    ).map(item => (
                                                        <div key={item.idx} className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 hover:shadow-md transition-all">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-bold">{item.match.event_home_team} vs {item.match.event_away_team}</div>
                                                                    <div className="text-xs text-muted-foreground">{item.match.league_name}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-blue-600">{item.market}</div>
                                                                    <div className="text-xs font-mono">{item.confidence}% Conf.</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-foreground/80 italic mb-3">"{item.reasoning}"</p>
                                                            <button
                                                                onClick={() => handleDailyAction({ ...item.match, market: item.market }, 'approve', 'oracle')}
                                                                className="w-full py-1.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                                                            >
                                                                APPROVE
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {dailyAnalysis.oracle.flatMap(m => (m.recommendations || []).filter(r => r.classification === 'VALUE')).length === 0 && (
                                                        <div className="text-center p-8 text-muted-foreground italic">No Value opportunities found today.</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RESULTS (Legacy Grid) */}
                        <div className="space-y-6">
                            {Object.entries(MARKET_CONFIG).map(([key, config]) => {
                                const items = dailyAnalysis?.[key] || [];
                                return (
                                    <div key={key} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
                                            <h4 className="font-bold text-lg flex items-center gap-2">
                                                {config.icon} {config.name} ({items.length})
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {items.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            // Generate Bulk Prompt on Client Side
                                                            let bulkPrompt = `ROLE: Expert Football Analyst (Stats Only Mode)\n`;
                                                            bulkPrompt += `TASK: Analyze these matches. Find the BEST VALUE.\n`;
                                                            bulkPrompt += `IMPORTANT: Output JSON ONLY with "classification": "BANKO" | "VALUE".\n\n`;

                                                            items.forEach((m, idx) => {
                                                                const stats = m.filterStats || {};
                                                                const hHome = stats.homeHomeStats || {};
                                                                const aAway = stats.awayAwayStats || {};
                                                                const hForm = stats.homeForm || {};
                                                                const aForm = stats.awayForm || {};

                                                                bulkPrompt += `[MATCH ${idx + 1}] ${m.event_home_team} vs ${m.event_away_team}\n`;
                                                                bulkPrompt += `LEAGUE: ${m.league_name}\n`;
                                                                if (hForm.avgScored) {
                                                                    bulkPrompt += `HOME: Form Scored ${hForm.avgScored.toFixed(1)}, Conceded ${hForm.avgConceded.toFixed(1)}. @Home Win ${hHome.winRate}%\n`;
                                                                    bulkPrompt += `AWAY: Form Scored ${aForm.avgScored.toFixed(1)}, Conceded ${aForm.avgConceded.toFixed(1)}. @Away Win ${aAway.winRate}%\n`;
                                                                }
                                                                bulkPrompt += `----------------------------------------\n`;
                                                            });

                                                            bulkPrompt += `\nOutput Format:\n{ "picks": [ { "home_team": "...", "classification": "BANKO", "confidence": 90, "reason": "..." } ] }`;

                                                            navigator.clipboard.writeText(bulkPrompt);
                                                            alert(`✅ ${items.length} maç için Gemini Prompt kopyalandı!`);
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 shadow-sm"
                                                    >
                                                        🤖 GEMINI PROMPT KOPYALA (TÜMÜ)
                                                    </button>
                                                )}
                                                <span className="text-xs px-2 py-1 bg-background rounded border font-mono">
                                                    ID: {key}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Table */}
                                        {items.length > 0 ? (
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/30">
                                                    <tr>
                                                        <th className="p-3 text-left font-medium">Maç</th>
                                                        <th className="p-3 text-center font-medium">Saat</th>
                                                        <th className="p-3 text-left font-medium">Lig</th>
                                                        <th className="p-3 text-center font-medium">AI Prompt</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((m, i) => (
                                                        <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                                                            <td className="p-3 font-medium">{m.event_home_team} vs {m.event_away_team}</td>
                                                            <td className="p-3 text-center text-sm">
                                                                {m.startTime ? new Date(m.startTime * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                            </td>
                                                            <td className="p-3 text-muted-foreground">{m.league_name}</td>
                                                            <td className="p-3 text-center">
                                                                <div className="flex justify-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            if (m.aiPrompt || m.ai_prompts?.[0]) {
                                                                                navigator.clipboard.writeText(m.aiPrompt || m.ai_prompts?.[0]);
                                                                                alert('AI Prompt kopyalandı!');
                                                                            }
                                                                        }}
                                                                        className="px-3 py-1 rounded text-xs font-medium bg-muted hover:bg-primary hover:text-primary-foreground transition-all"
                                                                    >
                                                                        📋
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
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="p-6 text-center text-muted-foreground italic">
                                                Analiz bekleniyor...
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-6 p-4 rounded-lg bg-muted/50 border text-center">
                            <p className="text-sm text-muted-foreground">
                                💡 <strong>Lig Filtreli:</strong> Sadece seçili liglerdeki maçları tarar.
                                <strong>Tüm Maçlar:</strong> Lig filtresi olmadan tüm maçları tarar.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tab Content: HISTORY */}
                {activeTab === 'history' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-xl font-semibold mb-4">Bet History</h2>

                        <div className="overflow-x-auto rounded-lg border shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left">Date</th>
                                        <th className="p-3 text-left">Match</th>
                                        <th className="p-3 text-left">Strategy</th>
                                        <th className="p-3 text-left">Result</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {betHistory.map((bet) => (
                                        <tr key={bet.id} className="hover:bg-muted/50">
                                            <td className="p-3 text-muted-foreground">{new Date(bet.timestamp).toLocaleDateString()}</td>
                                            <td className="p-3 font-medium">
                                                <div>{bet.homeTeam} vs {bet.awayTeam}</div>
                                                <div className="text-xs text-muted-foreground">{bet.league}</div>
                                            </td>
                                            <td className="p-3">
                                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold">{bet.strategyId}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-xs font-bold",
                                                    bet.result === 'WIN' && "bg-green-100 text-green-700",
                                                    bet.result === 'LOSS' && "bg-red-100 text-red-700",
                                                    bet.result === 'PENDING' && "bg-yellow-100 text-yellow-700",
                                                )}>
                                                    {bet.result}
                                                </span>
                                                {bet.actualScore && <span className="ml-2 text-xs font-mono">({bet.actualScore})</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                {bet.result === 'PENDING' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleSettle(bet.id, 'WIN')} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">WIN</button>
                                                        <button onClick={() => handleSettle(bet.id, 'LOSS')} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600">LOSS</button>
                                                    </div>
                                                )}
                                                <button onClick={() => handleDeleteHistory(bet.id)} className="ml-2 text-xs text-red-400 hover:text-red-500" title="Delete record">🗑</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {betHistory.length === 0 && (
                                        <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No history yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Market Tabs (Legacy/Other) */}
                {MARKET_CONFIG[activeTab] && (
                    <MarketTab
                        marketKey={activeTab}
                        config={MARKET_CONFIG[activeTab]}
                        // renderDailyTable removed as it is not defined and not used inside MarketTab
                        dailyAnalysis={dailyAnalysis?.[activeTab] || []}
                        firstHalfData={firstHalfData}
                        handleRunFirstHalf={handleRunFirstHalf}
                        isAnalysingFH={isAnalysingFH}
                        handleDailyAction={handleDailyAction}
                        copyMarketPrompt={copyMarketPrompt}
                        setSelectedDailyMatch={setSelectedDailyMatch}
                        handleAddToPicks={handleAddToPicks}
                    />
                )}
            </main>

            {/* Logic for Modal */}
            {selectedDailyMatch && (
                <MatchDetailsModal
                    match={selectedDailyMatch}
                    onClose={() => setSelectedDailyMatch(null)}
                />
            )}

            {/* GEMINI IMPORT MODAL */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            📥 Gemini/AI Yanıtını İçe Aktar
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Gemini'nin verdiği JSON formatındaki yanıtı buraya yapıştırın.
                        </p>

                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            placeholder='{"picks": [...] }'
                            className="w-full h-64 p-3 rounded border bg-background font-mono text-sm mb-4 focus:ring-2 focus:ring-primary"
                        />

                        <div className="flex justify-end gap-2">
                            <NeuButton variant="secondary" onClick={() => setShowImportModal(false)}>
                                İptal
                            </NeuButton>
                            <NeuButton variant="primary" onClick={handleImportGemini} disabled={!importText.trim() || refreshing}>
                                {refreshing ? 'İşleniyor...' : 'İçe Aktar ve Kaydet'}
                            </NeuButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
