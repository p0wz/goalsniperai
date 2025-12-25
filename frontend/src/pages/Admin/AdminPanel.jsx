import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { signalService, betService, adminService, picksService, trainingService, sentioService, paymentService, betsService } from '../../services/api';
import { MarketTab, MARKET_CONFIG } from '../../MarketTab';
import { RawStatsTab } from '../../RawStatsTab';
import NBAProps from './NBAProps';
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
    const [optimizationReport, setOptimizationReport] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // AI Auto Analysis State
    const [aiCandidates, setAiCandidates] = useState([]);
    const [aiCoupons, setAiCoupons] = useState(null);
    const [isAutoAnalysing, setIsAutoAnalysing] = useState(false);

    // AI Training Dataset State
    const [trainingData, setTrainingData] = useState([]);
    const [loadingTraining, setLoadingTraining] = useState(false);

    // SENTIO Chat State
    const [sentioMemory, setSentioMemory] = useState({ date: null, matchCount: 0 });
    const [sentioPopulating, setSentioPopulating] = useState(false);

    // Payments State
    const [pendingPayments, setPendingPayments] = useState([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Approved Bets State (new system)
    const [approvedBets, setApprovedBets] = useState([]);
    const [approvedBetsStats, setApprovedBetsStats] = useState(null);
    const [loadingApprovedBets, setLoadingApprovedBets] = useState(false);

    // Training Pool State
    const [trainingPool, setTrainingPool] = useState([]);
    const [trainingPoolStats, setTrainingPoolStats] = useState(null);
    const [loadingTrainingPool, setLoadingTrainingPool] = useState(false);

    // Manual Odds Input State
    const [matchOdds, setMatchOdds] = useState({});

    // Update odds for a specific match
    const updateMatchOdds = (matchId, odds) => {
        setMatchOdds(prev => ({ ...prev, [matchId]: odds }));
    };

    // Get prompt with odds included
    const getPromptWithOdds = (match, marketName) => {
        const matchId = match.event_key || match.matchId || match.id;
        const odds = matchOdds[matchId];
        const prompt = match.aiPrompt || match.ai_prompts?.[0] || '';
        if (odds && prompt) {
            const oddsText = `\n\n💰 ORAN BİLGİSİ:\n${marketName} Oranı: ${odds}\n⚠️ Bu oranı analiz sırasında değerlendir.`;
            return prompt + oddsText;
        }
        return prompt;
    };

    useEffect(() => {
        fetchLiveSignals();
        fetchBetHistory();
        fetchBotStatus();
        fetchApprovedBets();
        fetchTrainingPool();
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

    // Fetch approved bets (new system)
    const fetchApprovedBets = async () => {
        setLoadingApprovedBets(true);
        try {
            // Fetch bets
            let bets = [];
            try {
                const betsRes = await betsService.getAll();
                bets = betsRes?.bets || [];
            } catch (e) {
                console.error("Failed to fetch bets:", e);
            }
            setApprovedBets(bets);

            // Fetch stats separately
            let stats = { total: 0, pending: 0, won: 0, lost: 0, winRate: 0 };
            try {
                const statsRes = await betsService.getStats();
                if (statsRes?.success) {
                    stats = statsRes;
                }
            } catch (e) {
                console.error("Failed to fetch stats:", e);
            }
            setApprovedBetsStats(stats);
        } catch (err) {
            console.error("Failed to load approved bets", err);
            setApprovedBets([]);
            setApprovedBetsStats({ total: 0, pending: 0, won: 0, lost: 0, winRate: 0 });
        } finally {
            setLoadingApprovedBets(false);
        }
    };

    // Fetch training pool
    const fetchTrainingPool = async () => {
        setLoadingTrainingPool(true);
        try {
            const res = await api.get('/training-pool');
            const data = res.data;
            if (data.success) {
                setTrainingPool(data.entries || []);
                setTrainingPoolStats(data.stats || null);
            }
        } catch (err) {
            console.error("Failed to load training pool", err);
            setTrainingPool([]);
            setTrainingPoolStats(null);
        } finally {
            setLoadingTrainingPool(false);
        }
    };

    // Approve a bet from daily analysis
    const handleApproveBet = async (match, market, prediction) => {
        try {
            const betData = {
                match: `${match.event_home_team} vs ${match.event_away_team}`,
                homeTeam: match.event_home_team,
                awayTeam: match.event_away_team,
                league: match.league_name,
                matchDate: match.event_date || new Date().toISOString().split('T')[0],
                matchTime: match.event_time || '15:00',
                eventId: match.event_key || match.match_id,
                market: market,
                prediction: prediction,
                odds: match.ai?.estimated_odds || null,
                confidence: match.ai?.confidence || match.filterStats?.score || null,
                stats: match.filterStats || null,
                aiPrompt: match.aiPrompt || null
            };
            const res = await betsService.approve(betData);
            if (res.success) {
                alert(`✅ Bet approved: ${betData.match} - ${market}`);
                fetchApprovedBets();
            } else {
                alert(`⚠️ ${res.error || 'Failed to approve'}`);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // Settle approved bet
    const handleSettleApprovedBet = async (betId, status) => {
        const score = prompt('Enter final score (e.g. 2-1):');
        try {
            const res = await betsService.settle(betId, status, score);
            if (res.success) {
                fetchApprovedBets();
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // Delete approved bet
    const handleDeleteApprovedBet = async (betId) => {
        if (!confirm('Delete this bet?')) return;
        try {
            await betsService.delete(betId);
            fetchApprovedBets();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    // Trigger manual settlement run
    const handleManualSettlement = async () => {
        try {
            const res = await api.post('/settlement/run');
            alert(res.data?.message || 'Settlement triggered');
            fetchApprovedBets();
            fetchTrainingPool();
        } catch (err) {
            alert('Error: ' + (err?.response?.data?.error || err.message));
        }
    };

    // Sync training pool to Pinecone VectorDB
    const handleSyncPinecone = async () => {
        if (!confirm('Training Pool verilerini Pinecone\'a sync et?')) return;
        try {
            const res = await api.post('/training-pool/sync-pinecone');
            if (res.data.success) {
                alert(`✅ Pinecone Sync tamamlandı!\n${res.data.synced} kayıt sync edildi, ${res.data.failed} başarısız.`);
            } else {
                alert('Hata: ' + res.data.error);
            }
        } catch (err) {
            alert('Error: ' + (err?.response?.data?.error || err.message));
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

                // Also record to AI Training Dataset
                await trainingService.record({
                    matchId: match.matchId || match.event_key,
                    match: `${match.event_home_team} vs ${match.event_away_team}`,
                    homeTeam: match.event_home_team,
                    awayTeam: match.event_away_team,
                    league: match.league_name,
                    startTime: match.event_time,
                    market: match.market,
                    prediction: match.market,
                    odds: match.odds || 1.50,
                    features: match.filterStats || match.stats || {}
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

    const handleOptimize = async () => {
        try {
            setIsOptimizing(true);
            const res = await adminService.optimizeStrategy();
            if (res.success) setOptimizationReport(res.report);
            else alert('Optimization failed: ' + res.error);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setIsOptimizing(false); }
    };

    const handleAutoAI = async (leagueFilter) => {
        try {
            setIsAutoAnalysing(true);
            setAiCandidates([]); // Reset previous
            const res = await adminService.getAIAnalysis(leagueFilter);
            if (res.success) {
                setAiCandidates(res.candidates);
                setAiCoupons(res.coupons);
                if (res.candidates.length === 0) alert("AI kriterlerine uygun maç bulunamadı.");
            }
            else alert('AI Analysis failed: ' + res.error);
        } catch (err) { alert('Error: ' + err.message); }
        finally { setIsAutoAnalysing(false); }
    };

    const handleApproveAICandidate = async (candidate) => {
        // Approve to NEW bet tracking system for auto-settlement
        try {
            const betData = {
                match: candidate.match || `${candidate.home_team || candidate.event_home_team} vs ${candidate.away_team || candidate.event_away_team}`,
                homeTeam: candidate.home_team || candidate.event_home_team || candidate.match?.split(' vs ')[0],
                awayTeam: candidate.away_team || candidate.event_away_team || candidate.match?.split(' vs ')[1],
                league: candidate.league,
                matchDate: candidate.matchDate || candidate.startTime?.split('T')[0] || new Date().toISOString().split('T')[0],
                matchTime: candidate.matchTime || candidate.startTime?.split('T')[1]?.slice(0, 5) || '15:00',
                eventId: candidate.eventId || candidate.matchId || candidate.id,
                market: candidate.ai?.market || candidate.market,
                prediction: candidate.ai?.market || candidate.market,
                odds: candidate.ai?.estimated_odds || 1.50,
                confidence: candidate.ai?.confidence || 85,
                stats: candidate.filterStats || {},
                aiPrompt: candidate.aiPrompt || null,
                aiReason: candidate.ai?.reason || null
            };

            // 1. Save to new approved bets system (for auto-settlement)
            const res = await betsService.approve(betData);

            if (res.success) {
                // 2. Also record to AI Training Dataset
                await trainingService.record({
                    matchId: candidate.matchId || candidate.id,
                    match: betData.match,
                    homeTeam: betData.homeTeam,
                    awayTeam: betData.awayTeam,
                    league: candidate.league,
                    startTime: candidate.startTime,
                    market: betData.market,
                    prediction: betData.market,
                    odds: betData.odds,
                    features: candidate.filterStats || {}
                });

                // Remove from list
                setAiCandidates(prev => prev.filter(p => p.id !== candidate.id));

                // Refresh approved bets
                fetchApprovedBets();

                alert(`✅ Bahis onaylandı!\n${betData.match} - ${betData.market}`);
            } else {
                alert("Hata: " + res.error);
            }

        } catch (e) { alert(e.message); }
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
                    {['live', 'bets', 'training', 'sentio', 'payments', 'raw-stats', 'analiz', 'nba-props', ...Object.keys(MARKET_CONFIG)].map((tab) => (
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
                            {tab === 'bets' && '🎯 Approved Bets'}
                            {tab === 'training' && '🧠 Training Pool'}
                            {tab === 'analiz' && '🎯 Analiz'}
                            {tab === 'sentio' && '💬 SENTIO'}
                            {tab === 'payments' && '💰 Ödemeler'}
                            {tab === 'raw-stats' && '📊 Ham Data'}
                            {tab === 'nba-props' && '🏀 NBA Props'}
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

                {/* Tab Content: APPROVED BETS */}
                {activeTab === 'bets' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">🎯 Approved Bets</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleManualSettlement}
                                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                    ⚡ Run Settlement
                                </button>
                                <button
                                    onClick={handleSyncPinecone}
                                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                    🧠 Sync Pinecone
                                </button>
                                <button
                                    onClick={fetchApprovedBets}
                                    disabled={loadingApprovedBets}
                                    className="px-4 py-2 bg-muted rounded hover:bg-muted/80"
                                >
                                    {loadingApprovedBets ? '...' : '↻ Refresh'}
                                </button>
                            </div>
                        </div>

                        {/* Stats */}
                        {approvedBetsStats && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold">{approvedBetsStats.total}</div>
                                    <div className="text-sm text-muted-foreground">Total</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-yellow-500">{approvedBetsStats.pending}</div>
                                    <div className="text-sm text-muted-foreground">Pending</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-green-500">{approvedBetsStats.won}</div>
                                    <div className="text-sm text-muted-foreground">Won</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-red-500">{approvedBetsStats.lost}</div>
                                    <div className="text-sm text-muted-foreground">Lost</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-blue-500">{approvedBetsStats.winRate}%</div>
                                    <div className="text-sm text-muted-foreground">Win Rate</div>
                                </div>
                            </div>
                        )}

                        {/* Bets Table */}
                        <div className="bg-card border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Match</th>
                                        <th className="px-4 py-3 text-left">Market</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-center">Score</th>
                                        <th className="px-4 py-3 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Array.isArray(approvedBets) && approvedBets.map(bet => (
                                        <tr key={bet.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{bet.match}</div>
                                                <div className="text-xs text-muted-foreground">{bet.league} | {bet.matchTime}</div>
                                            </td>
                                            <td className="px-4 py-3">{bet.market}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${bet.status === 'WON' ? 'bg-green-500/20 text-green-500' :
                                                    bet.status === 'LOST' ? 'bg-red-500/20 text-red-500' :
                                                        'bg-yellow-500/20 text-yellow-500'
                                                    }`}>
                                                    {bet.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">{bet.resultScore || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {bet.status === 'PENDING' && (
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={() => handleSettleApprovedBet(bet.id, 'WON')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">✓</button>
                                                        <button onClick={() => handleSettleApprovedBet(bet.id, 'LOST')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">✗</button>
                                                    </div>
                                                )}
                                                <button onClick={() => handleDeleteApprovedBet(bet.id)} className="px-2 py-1 text-red-400 hover:text-red-300 text-xs">🗑</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {approvedBets.length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No approved bets yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab Content: TRAINING POOL */}
                {activeTab === 'training' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">🧠 AI Training Pool</h2>
                            <button
                                onClick={fetchTrainingPool}
                                disabled={loadingTrainingPool}
                                className="px-4 py-2 bg-muted rounded hover:bg-muted/80"
                            >
                                {loadingTrainingPool ? '...' : '↻ Refresh'}
                            </button>
                        </div>

                        {/* Stats */}
                        {trainingPoolStats && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold">{trainingPoolStats.total}</div>
                                    <div className="text-sm text-muted-foreground">Total Entries</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-green-500">{trainingPoolStats.won}</div>
                                    <div className="text-sm text-muted-foreground">Won</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-red-500">{trainingPoolStats.lost}</div>
                                    <div className="text-sm text-muted-foreground">Lost</div>
                                </div>
                                <div className="bg-card p-4 rounded-lg border text-center">
                                    <div className="text-2xl font-bold text-blue-500">{trainingPoolStats.winRate}%</div>
                                    <div className="text-sm text-muted-foreground">Win Rate</div>
                                </div>
                            </div>
                        )}

                        {/* Win Rate by Market - Enhanced */}
                        {trainingPoolStats?.byMarket && Object.keys(trainingPoolStats.byMarket).length > 0 && (
                            <div className="bg-card border rounded-lg p-4">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    📊 Win Rate by Market
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(trainingPoolStats.byMarket)
                                        .sort((a, b) => (b[1].won / b[1].total) - (a[1].won / a[1].total))
                                        .map(([market, stats]) => {
                                            const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100) : 0;
                                            const colorClass = winRate >= 70 ? 'text-green-500 bg-green-500' :
                                                winRate >= 50 ? 'text-yellow-500 bg-yellow-500' :
                                                    'text-red-500 bg-red-500';
                                            return (
                                                <div key={market} className="bg-muted/30 p-4 rounded-lg border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium">{market}</span>
                                                        <span className={`font-bold ${colorClass.split(' ')[0]}`}>
                                                            {winRate.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-2 mb-2">
                                                        <div
                                                            className={`h-2 rounded-full ${colorClass.split(' ')[1]}`}
                                                            style={{ width: `${winRate}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-xs text-muted-foreground">
                                                        <span>✅ {stats.won} Won</span>
                                                        <span>❌ {stats.lost} Lost</span>
                                                        <span>📊 {stats.total} Total</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Pool Table */}
                        <div className="bg-card border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Match</th>
                                        <th className="px-4 py-3 text-left">Market</th>
                                        <th className="px-4 py-3 text-center">Result</th>
                                        <th className="px-4 py-3 text-center">Score</th>
                                        <th className="px-4 py-3 text-center">Settled</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Array.isArray(trainingPool) && trainingPool.map(entry => (
                                        <tr key={entry.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{entry.match}</div>
                                                <div className="text-xs text-muted-foreground">{entry.league}</div>
                                            </td>
                                            <td className="px-4 py-3">{entry.market}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${entry.result === 'WON' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                                    }`}>
                                                    {entry.result}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono">{entry.finalScore}</td>
                                            <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                                                {new Date(entry.settledAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {trainingPool.length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No training data yet. Bets will appear here after settlement.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab Content: AI ANALIZ NEW */}
                {activeTab === 'ai-analiz' && (
                    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
                        <div className="bg-card border border-indigo-500/20 rounded-xl shadow-sm p-6 text-center">
                            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
                                🤖 AI Oto-Analiz (Llama 4 Scout 17B)
                            </h2>
                            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                                Yapay zeka tüm maçları tarar, istatistikleri inceler ve sadece <strong>1.50 oranın altındaki BANKO</strong> fırsatları bulur.
                            </p>

                            <div className="flex gap-4 justify-center mb-8">
                                <button
                                    onClick={() => handleAutoAI(true)}
                                    disabled={isAutoAnalysing}
                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isAutoAnalysing ? 'Taranıyor...' : '🔍 Lig Filtreli Tara'}
                                </button>
                                <button
                                    onClick={() => handleAutoAI(false)}
                                    disabled={isAutoAnalysing}
                                    className="px-8 py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                                >
                                    {isAutoAnalysing ? 'Taranıyor...' : '🌍 Tümünü Tara'}
                                </button>
                            </div>



                            {/* COUPONS SECTION */}
                            {aiCoupons && (
                                <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-500">
                                    {/* Banker 1 */}
                                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BANKO #1</div>
                                        <h3 className="text-xl font-bold text-emerald-500 mb-4 flex items-center gap-2">🛡️ Güvenli Liman</h3>
                                        <div className="space-y-3 mb-4">
                                            {aiCoupons.banker1?.matches.map((m, i) => (
                                                <div key={i} className="text-sm border-b border-emerald-500/10 pb-2 last:border-0">
                                                    <div className="font-bold">{m.match}</div>
                                                    <div className="flex justify-between text-muted-foreground text-xs mt-0.5">
                                                        <span>{m.pick}</span>
                                                        <span className="font-mono text-emerald-600 font-bold">{m.odds}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-emerald-500/20 flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Toplam Oran</span>
                                            <span className="text-2xl font-bold text-emerald-600">{aiCoupons.banker1?.totalOdds}</span>
                                        </div>
                                    </div>

                                    {/* Banker 2 */}
                                    <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/30 rounded-xl p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">BANKO #2</div>
                                        <h3 className="text-xl font-bold text-teal-500 mb-4 flex items-center gap-2">⚓ Sağlam Kale</h3>
                                        <div className="space-y-3 mb-4">
                                            {aiCoupons.banker2?.matches.map((m, i) => (
                                                <div key={i} className="text-sm border-b border-teal-500/10 pb-2 last:border-0">
                                                    <div className="font-bold">{m.match}</div>
                                                    <div className="flex justify-between text-muted-foreground text-xs mt-0.5">
                                                        <span>{m.pick}</span>
                                                        <span className="font-mono text-teal-600 font-bold">{m.odds}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-teal-500/20 flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Toplam Oran</span>
                                            <span className="text-2xl font-bold text-teal-600">{aiCoupons.banker2?.totalOdds}</span>
                                        </div>
                                    </div>

                                    {/* High Odds */}
                                    <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl p-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">SÜRPRİZ 🚀</div>
                                        <h3 className="text-xl font-bold text-violet-500 mb-4 flex items-center gap-2">💎 Yüksek Kazanç</h3>
                                        <div className="space-y-3 mb-4">
                                            {aiCoupons.highOdds?.matches.map((m, i) => (
                                                <div key={i} className="text-sm border-b border-violet-500/10 pb-2 last:border-0">
                                                    <div className="font-bold">{m.match}</div>
                                                    <div className="flex justify-between text-muted-foreground text-xs mt-0.5">
                                                        <span>{m.pick}</span>
                                                        <span className="font-mono text-violet-600 font-bold">{m.odds}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-auto pt-4 border-t border-violet-500/20 flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Toplam Oran</span>
                                            <span className="text-2xl font-bold text-violet-600">{aiCoupons.highOdds?.totalOdds}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Results Grid - NEW LAYOUT */}
                            {aiCandidates.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                                    {aiCandidates.map(c => (
                                        <div key={c.id} className="p-5 rounded-xl bg-background border border-indigo-500/30 hover:border-indigo-500 transition-all shadow-md group hover:shadow-lg">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-bold text-lg">{c.match}</h4>
                                                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.league}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-bold text-xl text-indigo-400">{c.ai.estimated_odds}</span>
                                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Oran</span>
                                                </div>
                                            </div>

                                            <div className="mb-4 p-3 bg-muted/40 rounded-lg text-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-foreground">{c.ai.market}</span>
                                                    <span className="text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">%{c.ai.confidence}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground leading-relaxed">{c.ai.reason}</p>
                                            </div>

                                            <button
                                                onClick={() => handleApproveAICandidate(c)}
                                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow hover:shadow-lg transition-all"
                                            >
                                                ✅ Onayla & Takibe Al
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {aiCandidates.length === 0 && !isAutoAnalysing && (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    Sonuçlar burada görünecek.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab Content: SENTIO CHAT ADMIN */}
                {activeTab === 'sentio' && (
                    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
                        <div className="bg-card border border-cyan-500/20 rounded-xl shadow-sm p-6">
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">💬 SENTIO Chat Yönetimi</h2>
                            <p className="text-muted-foreground mb-6">
                                PRO kullanıcıların soru sorabilmesi için SENTIO'nun belleğini güncel maç verileriyle doldurun.
                            </p>

                            {/* Memory Status */}
                            <div className="bg-muted/50 rounded-lg p-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className="font-bold">Bellek Durumu:</span>
                                        {sentioMemory.date ? (
                                            <span className="ml-2 text-green-500">
                                                ✅ {sentioMemory.matchCount} maç yüklü ({sentioMemory.date})
                                            </span>
                                        ) : (
                                            <span className="ml-2 text-yellow-500">⚠️ Boş - Henüz veri yüklenmedi</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const res = await sentioService.getMemoryStatus();
                                            if (res.success) setSentioMemory(res);
                                        }}
                                        className="text-sm text-cyan-500 hover:underline"
                                    >
                                        🔄 Yenile
                                    </button>
                                </div>
                            </div>

                            {/* Populate Buttons */}
                            <div className="flex gap-4 flex-wrap">
                                <button
                                    onClick={async () => {
                                        setSentioPopulating(true);
                                        try {
                                            const res = await sentioService.populate(true);
                                            if (res.success) {
                                                alert(`✅ ${res.count} maç SENTIO belleğine yüklendi!`);
                                                setSentioMemory({ date: new Date().toISOString().split('T')[0], matchCount: res.count });
                                            } else {
                                                alert('Hata: ' + res.error);
                                            }
                                        } catch (e) {
                                            alert('Hata: ' + e.message);
                                        }
                                        setSentioPopulating(false);
                                    }}
                                    disabled={sentioPopulating}
                                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    {sentioPopulating ? '⏳ Yükleniyor...' : '🔍 Lig Filtreli Yükle'}
                                </button>
                                <button
                                    onClick={async () => {
                                        setSentioPopulating(true);
                                        try {
                                            const res = await sentioService.populate(false);
                                            if (res.success) {
                                                alert(`✅ ${res.count} maç SENTIO belleğine yüklendi!`);
                                                setSentioMemory({ date: new Date().toISOString().split('T')[0], matchCount: res.count });
                                            } else {
                                                alert('Hata: ' + res.error);
                                            }
                                        } catch (e) {
                                            alert('Hata: ' + e.message);
                                        }
                                        setSentioPopulating(false);
                                    }}
                                    disabled={sentioPopulating}
                                    className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold disabled:opacity-50"
                                >
                                    {sentioPopulating ? '⏳ Yükleniyor...' : '🌍 Tüm Maçları Yükle'}
                                </button>
                            </div>

                            <p className="text-xs text-muted-foreground mt-4">
                                💡 Belleği günde 1-2 kez yenilemek yeterli. Yenileme işlemi mevcut veriyi tamamen değiştirir.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tab Content: AI DATASET */}
                {activeTab === 'ai-dataset' && (
                    <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
                        <div className="bg-card border border-violet-500/20 rounded-xl shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-2">📊 AI Eğitim Veri Seti</h2>
                                <button
                                    onClick={async () => {
                                        setLoadingTraining(true);
                                        try {
                                            const res = await trainingService.getAll();
                                            if (res.success) setTrainingData(res.data);
                                        } catch (e) {
                                            alert('Veri çekilemedi: ' + e.message);
                                        }
                                        setLoadingTraining(false);
                                    }}
                                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold"
                                >
                                    {loadingTraining ? 'Yükleniyor...' : '🔄 Yenile'}
                                </button>
                            </div>
                            <p className="text-muted-foreground mb-6 text-sm">
                                Bu veriler Llama 4 / GPT modellerini fine-tune etmek için kullanılacak.<br />
                                <strong>Toplam:</strong> {trainingData.length} kayıt |
                                <span className="text-green-500 ml-2">✅ {trainingData.filter(d => d.result === 'WON').length} Kazandı</span> |
                                <span className="text-red-500 ml-2">❌ {trainingData.filter(d => d.result === 'LOST').length} Kaybetti</span> |
                                <span className="text-yellow-500 ml-2">⏳ {trainingData.filter(d => d.result === 'PENDING').length} Bekliyor</span>
                            </p>

                            {trainingData.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    Henüz eğitim verisi yok. "Analiz" sekmesinden maç onaylayın.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted text-left">
                                            <tr>
                                                <th className="px-3 py-2">Tarih</th>
                                                <th className="px-3 py-2">Maç</th>
                                                <th className="px-3 py-2">Lig</th>
                                                <th className="px-3 py-2">Market</th>
                                                <th className="px-3 py-2">Oran</th>
                                                <th className="px-3 py-2">Durum</th>
                                                <th className="px-3 py-2">Aksiyon</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {trainingData.slice().reverse().map((entry) => (
                                                <tr key={entry.id} className="border-b hover:bg-muted/50">
                                                    <td className="px-3 py-2 font-mono text-xs">{entry.date}</td>
                                                    <td className="px-3 py-2 font-bold">{entry.match}</td>
                                                    <td className="px-3 py-2 text-muted-foreground text-xs">{entry.league}</td>
                                                    <td className="px-3 py-2">{entry.market}</td>
                                                    <td className="px-3 py-2 font-mono">{entry.odds?.toFixed(2)}</td>
                                                    <td className="px-3 py-2">
                                                        {entry.result === 'WON' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">✅ WON</span>}
                                                        {entry.result === 'LOST' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">❌ LOST</span>}
                                                        {entry.result === 'PENDING' && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">⏳ PENDING</span>}
                                                    </td>
                                                    <td className="px-3 py-2 flex gap-1">
                                                        {entry.result === 'PENDING' && (
                                                            <>
                                                                <button
                                                                    onClick={async () => {
                                                                        await trainingService.settle(entry.id, 'WON');
                                                                        setTrainingData(prev => prev.map(e => e.id === entry.id ? { ...e, result: 'WON' } : e));
                                                                    }}
                                                                    className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs"
                                                                >
                                                                    ✅
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        await trainingService.settle(entry.id, 'LOST');
                                                                        setTrainingData(prev => prev.map(e => e.id === entry.id ? { ...e, result: 'LOST' } : e));
                                                                    }}
                                                                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs"
                                                                >
                                                                    ❌
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={async () => {
                                                                if (confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
                                                                    await trainingService.delete(entry.id);
                                                                    setTrainingData(prev => prev.filter(e => e.id !== entry.id));
                                                                }
                                                            }}
                                                            className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab Content: NBA Props */}
                {activeTab === 'nba-props' && <NBAProps />}

                {/* Tab Content: ANALYSIS HUB */}
                {
                    activeTab === 'analiz' && (
                        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-bold mb-2">🎯 Analiz Merkezi</h2>
                                {isAnalysing && <span className="text-sm animate-pulse text-indigo-500 font-bold">Analiz yapılıyor... (Bu işlem 1-2 dk sürebilir)</span>}

                                {/* New Bulk Prompt Button */}
                                {dailyAnalysis && (
                                    <button
                                        onClick={() => {
                                            // 1. Collect all unique matches from all categories
                                            const uniqueMatches = new Map();
                                            Object.values(dailyAnalysis).forEach(categoryList => {
                                                if (Array.isArray(categoryList)) {
                                                    categoryList.forEach(m => {
                                                        if (!uniqueMatches.has(m.id)) {
                                                            uniqueMatches.set(m.id, m);
                                                        }
                                                    });
                                                }
                                            });

                                            const allMatches = Array.from(uniqueMatches.values());
                                            if (allMatches.length === 0) return alert('Kopyalanacak maç yok!');

                                            // 2. Format the Bulk Prompt
                                            const bulkPrompt = `📊 GÜNLÜK MAÇ HAVUZU (${allMatches.length} Maç)
Tarih: ${new Date().toLocaleDateString('tr-TR')}
════════════════════════════════════════

${allMatches.map((m, idx) => {
                                                // Extract base prompt content (remove Market line and Task line to act as "raw stats")
                                                let promptContent = m.aiPrompt || m.ai_prompts?.[0] || '';

                                                // Cleaning specifically for Bulk Context
                                                // 1. Remove "Act as..." header
                                                promptContent = promptContent.replace(/^Act as a professional.*$/gm, '');
                                                // 2. Remove "Market: ..." line completely
                                                promptContent = promptContent.replace(/^Market:.*$/gm, '');
                                                // 3. Remove "TASK: ..." footer
                                                promptContent = promptContent.replace(/^TASK:.*$/gm, '');
                                                // 4. Trim whitespace
                                                promptContent = promptContent.trim();

                                                // 5. Add specific header
                                                return `📌 MAÇ ${idx + 1}: ${m.event_home_team} vs ${m.event_away_team}
Lig: ${m.league_name}
${promptContent}
----------------------------------------`;
                                            }).join('\n\n')}

════════════════════════════════════════
GÖREV:
Yukarıdaki maç havuzunu detaylı incele. Amacımız "BANKO" (Güvenilir) kupon oluşturmak.

1. 🎯 **ODAK: BANKO BAHİSLER (1.15 - 1.50 Oran Arası)**
   - Sadece istatistiksel olarak çok güçlü (Win Rate > %80) olan tercihleri seç.
   - Örnek: "Ev Sahibi Yemez", "Deplasman 0.5 Üst", "ÇŞ 1X", "Toplam Gol 1.5 Üst".
   - Sürpriz veya riskli maçları ELE.

2. ÇIKTI FORMATI:
   - [Maç Adı] - [Tahmin] (Güven: %XX) - [Tahmini Oran: 1.XX]
   - Kısa gerekçe (Örn: "Ev sahibi evinde 10 maçtır kaybetmiyor.")
`;
                                            navigator.clipboard.writeText(bulkPrompt);
                                            alert(`✅ ${allMatches.length} maçın detaylı istatistikleri kopyalandı!`);
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.01] transition-all font-bold text-lg flex flex-col items-center gap-1 mb-6"
                                    >
                                        <div className="flex items-center gap-2">
                                            {/* Assuming CopyIcon is defined or imported elsewhere */}
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v2" /></svg> 📑 Tüm Maçları Kopyala (AI Prompt)
                                        </div>
                                        <span className="text-xs font-normal opacity-80 font-mono">1.15 - 1.50 Banko Kupon Odaklı</span>
                                    </button>
                                )}

                                {/* AI AUTO ANALYSIS SECTION REMOVED (Moved to dedicated tab) */}
                            </div>

                            {/* Analysis Content Grid */}
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

                            {/* RESULTS */}
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
                                                                const bulkPrompt = `📊 ${config.name.toUpperCase()} ANALİZİ (${items.length} Maç)
════════════════════════════════════════

${items.map((m, idx) => {
                                                                    const prompt = m.aiPrompt || m.ai_prompts?.[0] || '';
                                                                    return `\n[${idx + 1}/${items.length}] ${m.event_home_team} vs ${m.event_away_team}
----------------------------------------
${prompt}
`;
                                                                }).join('\n')}
════════════════════════════════════════`;
                                                                navigator.clipboard.writeText(bulkPrompt);
                                                                alert('TOPLU AI PROMPT KOPYALANDI! 📋');
                                                            }}
                                                            className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-1 shadow-sm"
                                                        >
                                                            🤖 TOPLU COPY
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
                                                            <th className="p-3 text-center font-medium w-20">Oran</th>
                                                            <th className="p-3 text-center font-medium">AI Prompt</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map((m, i) => {
                                                            const matchId = m.event_key || m.matchId || m.id || i;
                                                            return (
                                                                <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
                                                                    <td className="p-3 font-medium">{m.event_home_team} vs {m.event_away_team}</td>
                                                                    <td className="p-3 text-center text-sm">
                                                                        {m.startTime ? new Date(m.startTime * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                    </td>
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
                                                                    <td className="p-3 text-center">
                                                                        <div className="flex justify-center gap-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const prompt = getPromptWithOdds(m, key);
                                                                                    if (prompt) {
                                                                                        navigator.clipboard.writeText(prompt);
                                                                                        alert(matchOdds[matchId] ? `AI Prompt kopyalandı! (Oran: ${matchOdds[matchId]})` : 'AI Prompt kopyalandı!');
                                                                                    }
                                                                                }}
                                                                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${matchOdds[matchId] ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-muted hover:bg-primary hover:text-primary-foreground'}`}
                                                                                title={matchOdds[matchId] ? `Oran dahil: ${matchOdds[matchId]}` : 'Oran girilmedi'}
                                                                            >
                                                                                {matchOdds[matchId] ? '📋💰' : '📋'}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleAddToPicks(m, key, 'single')}
                                                                                className="px-3 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500 hover:text-white transition-all border border-yellow-500/20"
                                                                                title="Add to Daily Picks"
                                                                            >
                                                                                ⭐ Pick
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleAddToPicks(m, key, 'parlay')}
                                                                                className="px-3 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20"
                                                                                title="Add to Daily Parlay"
                                                                            >
                                                                                🔥 Parlay
                                                                            </button>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        const res = await betsService.approve({
                                                                                            eventId: m.event_key || m.matchId || m.id,
                                                                                            match: `${m.event_home_team} vs ${m.event_away_team}`,
                                                                                            homeTeam: m.event_home_team,
                                                                                            awayTeam: m.event_away_team,
                                                                                            league: m.league_name,
                                                                                            market: key,
                                                                                            prediction: key,
                                                                                            matchDate: m.event_date || new Date().toISOString().split('T')[0],
                                                                                            matchTime: m.startTime || m.event_start_time,
                                                                                            stats: m.filterStats || m.stats || {},
                                                                                            aiPrompt: m.aiPrompt || m.ai_prompts?.[0]
                                                                                        });
                                                                                        if (res.success) {
                                                                                            alert('✅ Bahis onaylandı ve takibe alındı!');
                                                                                        } else {
                                                                                            alert('Hata: ' + res.error);
                                                                                        }
                                                                                    } catch (e) {
                                                                                        alert('Hata: ' + e.message);
                                                                                    }
                                                                                }}
                                                                                className="px-3 py-1 rounded text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                                                                                title="Onayla & Takibe Al"
                                                                            >
                                                                                ✅ Takip
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
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
                    )
                }

                {/* Tab Content: HISTORY */}
                {
                    activeTab === 'history' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold">Bet History</h2>
                                <button
                                    onClick={handleOptimize}
                                    disabled={isOptimizing}
                                    className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded shadow-md font-bold text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
                                >
                                    {isOptimizing ? 'Analiz Ediliyor...' : '🧠 Optimize Strategy (AI)'}
                                </button>
                            </div>

                            {optimizationReport && (
                                <div className="mb-6 p-4 rounded-lg bg-card border border-primary/20 shadow-lg animate-in fade-in zoom-in-95 duration-300">
                                    <div className="flex justify-between items-start border-b pb-2 mb-2">
                                        <h3 className="font-bold text-lg text-primary">📊 AI Strategy Report</h3>
                                        <button onClick={() => setOptimizationReport(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                                    </div>
                                    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-2 bg-muted/30 rounded max-h-[400px] overflow-y-auto">
                                        {optimizationReport}
                                    </div>
                                </div>
                            )}

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
                    )
                }

                {/* SENTIO Management Tab */}
                {
                    activeTab === 'sentio' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        🤖 SENTIO Chat Yönetimi
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        Kullanıcıların sohbet edebileceği maçları yönetin
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await sentioService.getMemoryStatus();
                                            if (res.success) {
                                                setSentioMemory({
                                                    date: res.date,
                                                    matchCount: res.matchCount,
                                                    matches: res.matches || [],
                                                    populatedAt: res.populatedAt
                                                });
                                            }
                                        } catch (e) {
                                            alert('Hafıza durumu alınamadı: ' + e.message);
                                        }
                                    }}
                                    className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-500 font-medium hover:bg-cyan-500/30"
                                >
                                    🔄 Yenile
                                </button>
                            </div>

                            {/* Memory Status Card */}
                            <div className="rounded-xl p-6 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/20">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl shadow-lg">
                                            🧠
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">SENTIO Hafızası</h3>
                                            <p className="text-sm text-white/60">
                                                {sentioMemory.date || 'Henüz yüklenmedi'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-cyan-400">{sentioMemory.matchCount || 0}</div>
                                            <div className="text-xs text-white/50">Maç Sayısı</div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!confirm('SENTIO hafızasını temizlemek istediğinizden emin misiniz?')) return;
                                                try {
                                                    const res = await sentioService.clearMemory();
                                                    if (res.success) {
                                                        setSentioMemory({ date: null, matchCount: 0, matches: [] });
                                                        alert('✅ SENTIO hafızası temizlendi');
                                                    }
                                                } catch (e) {
                                                    alert('Hata: ' + e.message);
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 border border-red-500/30"
                                        >
                                            🗑️ Hafızayı Temizle
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Match List */}
                            {sentioMemory.matches && sentioMemory.matches.length > 0 ? (
                                <div className="rounded-lg border bg-card overflow-hidden">
                                    <div className="p-3 bg-muted border-b">
                                        <h3 className="font-medium">📋 Hafızadaki Maçlar</h3>
                                    </div>
                                    <div className="divide-y max-h-96 overflow-y-auto">
                                        {sentioMemory.matches.map((m, i) => (
                                            <div key={i} className="p-3 flex items-center justify-between hover:bg-muted/50">
                                                <div>
                                                    <div className="font-medium">{m.homeTeam} vs {m.awayTeam}</div>
                                                    <div className="text-xs text-muted-foreground">{m.league}</div>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {m.approvedAt ? new Date(m.approvedAt).toLocaleTimeString('tr-TR') : ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                    <p className="text-lg text-muted-foreground">📭 SENTIO hafızası boş</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        "📊 Ham Data" sekmesinden maçları SENTIO'ya gönderin.
                                    </p>
                                </div>
                            )}

                            {/* Usage Info */}
                            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                <h3 className="font-medium text-cyan-400 mb-2">💡 Nasıl Çalışır?</h3>
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                    <li><strong>"📊 Ham Data"</strong> sekmesine gidin</li>
                                    <li>Maçları tarayın (Lig Filtreli veya Tüm Maçlar)</li>
                                    <li><strong>"🤖 Tümünü SENTIO'ya Gönder"</strong> butonuna tıklayın</li>
                                    <li>Kullanıcılar dashboard'da SENTIO Chat üzerinden bu maçlar hakkında sohbet edebilir</li>
                                </ul>
                            </div>
                        </div>
                    )
                }

                {/* Raw Stats Tab */}
                {
                    activeTab === 'raw-stats' && (
                        <RawStatsTab />
                    )
                }

                {/* Payments Tab */}
                {
                    activeTab === 'payments' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">💰 Ödeme Yönetimi</h2>
                                <button
                                    onClick={async () => {
                                        setLoadingPayments(true);
                                        try {
                                            const res = await paymentService.getPending();
                                            if (res.success) setPendingPayments(res.payments);
                                        } catch (e) { console.error(e); }
                                        finally { setLoadingPayments(false); }
                                    }}
                                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                                >
                                    {loadingPayments ? '...' : '🔄 Yenile'}
                                </button>
                            </div>

                            {pendingPayments.length > 0 ? (
                                <div className="space-y-4">
                                    {pendingPayments.map(payment => (
                                        <div key={payment.id} className="border rounded-lg p-4 bg-card">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="font-bold text-lg">{payment.userName}</div>
                                                    <div className="text-sm text-muted-foreground">{payment.userEmail}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-green-500">${payment.amount}</div>
                                                    <div className="text-xs text-muted-foreground">{payment.planType === 'monthly' ? 'Aylık' : 'Yıllık'}</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                                <div><span className="text-muted-foreground">Kripto:</span> {payment.cryptoType}</div>
                                                <div><span className="text-muted-foreground">Tarih:</span> {new Date(payment.createdAt).toLocaleString('tr-TR')}</div>
                                                <div className="col-span-2"><span className="text-muted-foreground">ID:</span> <code className="text-xs">{payment.id}</code></div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(`${payment.userName} kullanıcısını PRO yapmak istediğinize emin misiniz?`)) return;
                                                        try {
                                                            const res = await paymentService.confirm(payment.id);
                                                            if (res.success) {
                                                                alert('✅ Ödeme onaylandı, kullanıcı PRO yapıldı!');
                                                                setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
                                                            }
                                                        } catch (e) { alert('Hata: ' + e.message); }
                                                    }}
                                                    className="flex-1 py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600"
                                                >
                                                    ✅ Onayla
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        const reason = prompt('Red sebebi (opsiyonel):');
                                                        try {
                                                            const res = await paymentService.reject(payment.id, reason);
                                                            if (res.success) {
                                                                alert('❌ Ödeme reddedildi');
                                                                setPendingPayments(prev => prev.filter(p => p.id !== payment.id));
                                                            }
                                                        } catch (e) { alert('Hata: ' + e.message); }
                                                    }}
                                                    className="flex-1 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600"
                                                >
                                                    ❌ Reddet
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border rounded-lg">
                                    <div className="text-4xl mb-2">💸</div>
                                    <p className="text-muted-foreground">Bekleyen ödeme yok</p>
                                    <p className="text-xs text-muted-foreground mt-1">Yenilemek için butona tıklayın</p>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Market Tabs (Legacy/Other) */}
                {
                    MARKET_CONFIG[activeTab] && (
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
                    )
                }
            </main >

            {/* Logic for Modal */}
            {
                selectedDailyMatch && (
                    <MatchDetailsModal
                        match={selectedDailyMatch}
                        onClose={() => setSelectedDailyMatch(null)}
                    />
                )
            }
        </div >
    );
}
