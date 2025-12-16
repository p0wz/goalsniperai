import { useState, useEffect } from 'react';
import { authService, signalService, betService, adminService } from './services/api';
import { MarketTab, MARKET_CONFIG } from './MarketTab';
import clsx from 'clsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Login Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard State
  const [activeTab, setActiveTab] = useState('live'); // live, history, daily

  // Data
  const [liveSignals, setLiveSignals] = useState([]);
  const [betHistory, setBetHistory] = useState([]);

  const [dailyAnalysis, setDailyAnalysis] = useState(null);
  const [firstHalfData, setFirstHalfData] = useState(null); // Independent State
  const [showDailyHistory, setShowDailyHistory] = useState(false); // New State for Daily History toggle
  const [selectedDailyMatch, setSelectedDailyMatch] = useState(null);

  // Loaders
  const [refreshing, setRefreshing] = useState(false);

  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isAnalysingFH, setIsAnalysingFH] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [botStatusLoading, setBotStatusLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const profile = await authService.getProfile();
      setUser(profile);

      // Load data based on active tab
      if (activeTab === 'live') {
        fetchLiveSignals();
        fetchBetHistory(); // Pre-load history for Dashboard and Daily History
        fetchBotStatus();
      }
    } catch (err) {
      console.log('User not logged in');
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = () => {
    fetchLiveSignals();
    fetchBetHistory();
    // Daily analysis is usually on demand or cached, we can fetch if needed
    // fetchDaily(); 
  };

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
      fetchBotStatus(); // Refresh status too
      const data = await signalService.getLiveSignals();
      setLiveSignals(data.data.filter(s => s.verdict === 'PLAY').sort((a, b) => b.confidencePercent - a.confidencePercent));
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  const fetchBetHistory = async () => {
    try {
      const data = await betService.getHistory(); // Use service for consistency
      setBetHistory(data.data || []);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await betService.getHistory();
      if (res.success) setBetHistory(res.data);
    } catch (err) { console.error(err); }
  };

  const handleRunDaily = async (force = false) => {
    try {
      setIsAnalysing(true);
      const res = await signalService.getDailyAnalysis(force);
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
    try {
      if (!confirm(`Mark this bet as ${status}?`)) return;

      await betService.settleBet(id, status, actualScore || '0-0');
      fetchHistory(); // Refresh
      alert('Bet updated!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authService.login(email, password);
      if (res.success) {
        setUser(res.user);
        fetchAll();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
  };

  // Handle Approve/Reject for Daily Analysis
  const handleDailyAction = async (match, action, category) => {
    try {
      if (action === 'approve') {
        await signalService.approveSignal(match.id, {
          matchData: {
            matchId: match.matchId,
            home_team: match.event_home_team,
            away_team: match.event_away_team
          },
          market: match.market, // Uses market from match data
          category: category,
          confidence: 85 // Default high confidence for approved
        });
        alert(`Approved: ${match.event_home_team} vs ${match.event_away_team}`);
        fetchBetHistory(); // Refresh history
      } else if (action === 'reject') {
        if (!confirm('Are you sure you want to remove this match?')) return;
        await signalService.rejectSignal(match.id);
      }

      // Remove from local state immediately for better UX
      const newAnalysis = { ...dailyAnalysis };
      for (const cat in newAnalysis) {
        if (Array.isArray(newAnalysis[cat])) {
          newAnalysis[cat] = newAnalysis[cat].filter(m => m.id !== match.id);
        }
      }
      setDailyAnalysis(newAnalysis);

      // Also support FH removal
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

  const handleDeleteHistory = async (id) => {
    if (!confirm('Delete this record permanently?')) return;
    try {
      await betService.deleteBet(id);
      setBetHistory(prev => prev.filter(b => b.id !== id));
    } catch (e) {
      alert('Delete failed');
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-lg">
          <h1 className="text-2xl font-bold">GoalGPT Pro Login</h1>
          {error && <div className="rounded bg-destructive/20 p-2 text-red-500">{error}</div>}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border bg-input px-3 py-2" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border bg-input px-3 py-2" required />
          </div>
          <button type="submit" className="w-full rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90">Login</button>
        </form>
      </div>
    );
  }

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

  // Helper to render Daily Analysis Tables
  const renderDailyTable = (title, items, categoryKey) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-md font-semibold text-primary">{title} ({items.length})</h3>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent modal opening if extracted
              copyMarketPrompt(title, items);
            }}
            className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded flex items-center gap-1"
            title="Copy a huge prompt to ask AI to analyze ALL these matches together"
          >
            🤖 Ask AI (All Matches)
          </button>
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Match</th>
                <th className="p-2">League</th>
                <th className="p-2">Stats</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t hover:bg-accent/10 cursor-pointer transition-colors"
                  onClick={() => setSelectedDailyMatch(item)}
                >
                  <td className="p-2">{new Date(item.startTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="p-2 font-medium">
                    <div className="flex flex-col">
                      <span>{item.event_home_team}</span>
                      <span className="text-muted-foreground text-xs">vs {item.event_away_team}</span>
                    </div>
                  </td>
                  <td className="p-2 text-muted-foreground text-xs">{item.league}</td>
                  <td className="p-2 text-xs">
                    <td className="p-2 text-xs">
                      {categoryKey === 'firstHalfOver05' ? (
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "px-1.5 py-0.5 rounded font-bold",
                            (item.fhStats?.score >= 80) ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-500"
                          )}>
                            Sc: {item.fhStats?.score}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            H{item.fhStats?.metrics?.home_ht_rate}% A{item.fhStats?.metrics?.away_ht_rate}%
                          </span>
                        </div>
                      ) : (
                        <span className={clsx(
                          "px-1.5 py-0.5 rounded",
                          (item.detailed_analysis?.stats?.homeGoalRate > 70) ? "bg-green-500/20 text-green-400" : "bg-gray-800"
                        )}>
                          Gol: {item.detailed_analysis?.stats?.homeGoalRate}%
                        </span>
                      )}
                    </td>
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDailyAction(item, 'approve', categoryKey)}
                        className="p-1.5 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        title="Approve & Save to History"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleDailyAction(item, 'reject', categoryKey)}
                        className="p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20"
                        title="Reject & Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <h1 className="text-xl font-bold">GoalGPT Pro</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">{user.name} <span className="text-xs opacity-50">({user.role})</span></span>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300">Logout</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2 border-b overflow-x-auto">
          {['live', 'analiz', 'history', ...Object.keys(MARKET_CONFIG)].map((tab) => (
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
              {MARKET_CONFIG[tab] && `${MARKET_CONFIG[tab].icon} ${MARKET_CONFIG[tab].name}`}
            </button>
          ))}
        </div>

        {/* Tab Content: ANALYSIS HUB */}
        {activeTab === 'analiz' && (
          <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">🎯 Analiz Merkezi</h2>
              <p className="text-muted-foreground">Tüm marketler için toplu analiz</p>
            </div>

            {/* BULK ANALYSIS BUTTONS */}
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

            {/* MARKET CARDS - Always Visible */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center">📊 Market Sonuçları</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(MARKET_CONFIG).map(([key, config]) => {
                  const items = dailyAnalysis?.[key] || [];
                  return (
                    <div key={key} className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold flex items-center gap-2">
                          {config.icon} {config.name}
                        </h4>
                        <span className={clsx(
                          "px-2 py-1 rounded text-xs font-bold",
                          items.length > 0 ? "bg-green-600/20 text-green-500" : "bg-muted text-muted-foreground"
                        )}>
                          {items.length} Maç
                        </span>
                      </div>
                      {items.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                          {items.slice(0, 3).map((m, i) => (
                            <li key={i} className="truncate text-muted-foreground">
                              • {m.event_home_team} vs {m.event_away_team}
                            </li>
                          ))}
                          {items.length > 3 && (
                            <li className="text-primary cursor-pointer hover:underline" onClick={() => setActiveTab(key)}>
                              +{items.length - 3} daha...
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Analiz bekleniyor...</p>
                      )}
                      <button
                        onClick={() => setActiveTab(key)}
                        className="w-full mt-3 py-2 text-xs rounded bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        Detaylar →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-muted/50 border text-center">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Lig Filtreli:</strong> Sadece seçili liglerdeki maçları tarar.
                <strong>Tüm Maçlar:</strong> Lig filtresi olmadan tüm maçları tarar.
              </p>
            </div>
          </div>
        )}

        {/* Tab Content: LIVE */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Active Live Signals</h2>
              <button
                onClick={fetchLiveSignals}
                disabled={refreshing}
                className="px-3 py-1 text-xs rounded border hover:bg-accent"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>

            {/* BOT CONTROL PANEL (Visible to Owner) */}
            {user && (
              <div className="mb-6 p-4 rounded-lg border bg-card shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={clsx("h-3 w-3 rounded-full animate-pulse", botRunning ? "bg-green-500" : "bg-red-500")} />
                  <div>
                    <h3 className="font-semibold text-sm">Live Bot Status</h3>
                    <p className="text-xs text-muted-foreground">{botRunning ? 'Running (Checking every 3 mins)' : 'Stopped (Manual Control)'}</p>
                  </div>
                </div>
                <button
                  onClick={toggleBot}
                  disabled={botStatusLoading}
                  className={clsx(
                    "px-4 py-2 rounded text-sm font-bold shadow transition-all",
                    botRunning ? "bg-red-100 text-red-600 hover:bg-red-200" : "bg-green-600 text-white hover:bg-green-700 hover:shadow-lg"
                  )}
                >
                  {botStatusLoading ? 'Processing...' : botRunning ? '🛑 STOP BOT' : '▶ START BOT'}
                </button>
              </div>
            )}

            {liveSignals.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                No live signals active right now. Bot is scanning...
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {liveSignals.map((signal) => (
                  <div key={signal.id} className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute top-0 right-0 p-2 text-xs font-bold text-green-500 bg-green-500/10 rounded-bl-lg">
                      {signal.confidencePercent}% Confidence
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      {signal.leagueLogo && <img src={signal.leagueLogo} alt="League" className="h-4 w-4 object-contain" />}
                      <span className="text-xs text-muted-foreground uppercase truncate">{signal.country} • {signal.league}</span>
                    </div>

                    <div className="mb-3">
                      <div className="text-lg font-bold flex items-center gap-2">
                        {signal.home} <span className="text-muted-foreground text-sm">vs</span> {signal.away}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm mb-3">
                      <span className="bg-accent px-2 py-0.5 rounded text-xs font-mono">Score: {signal.score}</span>
                      <span className="text-yellow-500 font-mono text-xs animate-pulse">⏱ {signal.elapsed}'</span>
                    </div>

                    <div className="space-y-2 bg-muted/30 p-3 rounded text-xs">
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Strategy</span>
                        <span className="font-medium text-foreground">{signal.strategy}</span>
                      </div>
                      <div className="flex justify-between border-b pb-1">
                        <span className="text-muted-foreground">Momentum</span>
                        <span className="font-medium text-blue-400">{signal.momentumTrigger || 'Standard'}</span>
                      </div>
                      <div className="pt-1 text-muted-foreground italic">
                        "{signal.reason}"
                      </div>
                      <div className="pt-1 mt-1 flex justify-between gap-1 text-xs font-mono text-foreground/80">
                        <span title="Shots on Target">🎯 {signal.stats.shots_on_target}</span>
                        <span title="Total Shots">💥 {signal.stats.shots}</span>
                        <span title="Corners">🚩 {signal.stats.corners}</span>
                        {signal.stats.xG && <span title="Expected Goals">📊 {signal.stats.xG}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">Signal History</h2>
                {betHistory.length > 0 && (
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded text-sm font-bold border border-green-500/20">
                      Win Rate: {(() => {
                        const settled = betHistory.filter(b => ['WON', 'LOST'].includes(b.status));
                        if (settled.length === 0) return '0%';
                        const wins = settled.filter(b => b.status === 'WON').length;
                        return Math.round((wins / settled.length) * 100) + '%';
                      })()}
                    </span>
                    <span className="px-3 py-1 bg-muted rounded text-sm font-medium border">
                      {betHistory.filter(b => b.status === 'WON').length}W - {betHistory.filter(b => b.status === 'LOST').length}L
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={async () => {
                  if (!confirm('Delete ALL history?')) return;
                  await betService.clearHistory();
                  fetchHistory();
                }} className="px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded border border-red-900/50">
                  Clear History
                </button>
                <button onClick={fetchHistory} className="px-3 py-1 text-xs rounded border hover:bg-accent">Refresh</button>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Match</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Strategy</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {betHistory.map((bet) => (
                    <tr key={bet.id} className="border-t hover:bg-accent/10">
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(bet.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium">
                        <div>{bet.home_team} vs {bet.away_team}</div>
                        <div className="text-xs text-muted-foreground">{bet.league}</div>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {bet.entry_score || '-'}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{bet.strategy}</div>
                        <div className="text-xs text-muted-foreground">Bot Conf: {bet.confidence}%</div>
                      </td>
                      <td className="p-3">
                        <span className={clsx(
                          "px-2 py-1 rounded text-xs font-bold",
                          bet.status === 'WON' && "bg-green-500/20 text-green-500",
                          bet.status === 'LOST' && "bg-red-500/20 text-red-500",
                          bet.status === 'PENDING' && "bg-yellow-500/20 text-yellow-500"
                        )}>
                          {bet.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {bet.status === 'PENDING' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleSettle(bet.id, 'WON')}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                            >
                              WON
                            </button>
                            <button
                              onClick={() => handleSettle(bet.id, 'LOST')}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                            >
                              LOST
                            </button>
                          </div>
                        )}
                        {bet.status !== 'PENDING' && (
                          <span className="text-xs text-muted-foreground">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {betHistory.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-muted-foreground">No history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Content: DAILY ANALYSIS */}
        {activeTab === 'daily' && (
          <div className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex gap-4 items-center">
                <h2 className="text-2xl font-bold tracking-tight">Daily Analysis</h2>
                <div className="flex bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setShowDailyHistory(false)}
                    className={clsx("px-3 py-1 text-sm rounded-md transition-all", !showDailyHistory ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-primary")}
                  >
                    Active Requests
                  </button>
                  <button
                    onClick={() => setShowDailyHistory(true)}
                    className={clsx("px-3 py-1 text-sm rounded-md transition-all", showDailyHistory ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-primary")}
                  >
                    Approved History
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleRunDaily(false)}
                  disabled={isAnalysing}
                  className="bg-secondary hover:bg-secondary/80 px-4 py-2 rounded text-sm font-medium"
                >
                  {isAnalysing ? 'Loading...' : 'Refresh'}
                </button>
                <button
                  onClick={() => handleRunDaily(true)}
                  disabled={isAnalysing}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded text-sm font-medium"
                >
                  {isAnalysing ? 'Scanning...' : 'Analiz Et'}
                </button>
              </div>
            </div>

            {!showDailyHistory ? (
              // ACTIVE ANALYSIS VIEW
              isAnalysing ? (
                <div className="text-center py-20 animate-pulse">
                  <div className="text-4xl mb-4">🔮</div>
                  <h3 className="text-xl font-medium">Analyzing Today's Fixtures...</h3>
                  <p className="text-muted-foreground">This may take up to 30 seconds.</p>
                </div>
              ) : dailyAnalysis ? (
                <div className="grid grid-cols-1 gap-6">
                  {renderDailyTable('🔥 Over 2.5 Goals Candidates', dailyAnalysis.over25, 'over25')}
                  {renderDailyTable('⚽ BTTS (Both Teams To Score)', dailyAnalysis.btts, 'btts')}
                  {renderDailyTable('🛡️ 1X Double Chance (Safe)', dailyAnalysis.doubleChance, 'doubleChance')}
                  {renderDailyTable('🏠 Home Team Over 1.5', dailyAnalysis.homeOver15, 'homeOver15')}
                  {renderDailyTable('🔒 Under 3.5 Goals', dailyAnalysis.under35, 'under35')}
                  {renderDailyTable('🧊 Under 2.5 Goals', dailyAnalysis.under25, 'under25')}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                  <p className="text-muted-foreground">No analysis data found. Click "Analiz Et".</p>
                </div>
              )
            ) : (
              // HISTORY VIEW
              <div className="bg-card rounded-xl border shadow-sm">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Approved Matches History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Match</th>
                        <th className="p-3">Market</th>
                        <th className="p-3">Result</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {betHistory.filter(b => b.source === 'daily').length === 0 ? (
                        <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">No approved matches yet.</td></tr>
                      ) : (
                        betHistory.filter(b => b.source === 'daily').map(bet => (
                          <tr key={bet.id} className="border-t hover:bg-accent/10">
                            <td className="p-3">{new Date(bet.created_at || bet.date).toLocaleDateString()}</td>
                            <td className="p-3 font-medium">{bet.home_team} vs {bet.away_team}</td>
                            <td className="p-3">
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{bet.strategy}</span>
                            </td>
                            <td className="p-3">
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-xs font-semibold",
                                bet.status === 'WON' ? "bg-green-500/20 text-green-500" :
                                  bet.status === 'LOST' ? "bg-red-500/20 text-red-500" :
                                    "bg-yellow-500/20 text-yellow-500"
                              )}>
                                {bet.status} {bet.result_score && `(${bet.result_score})`}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteHistory(bet.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Delete Record"
                              >
                                Trash
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW TAB: FIRST HALF OVER 0.5 */}
        {activeTab === 'iy05' && (
          <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">⏱️ First Half Over 0.5</h2>
                {firstHalfData && (
                  <span className="text-sm text-muted-foreground mt-1">
                    ({firstHalfData.firstHalfOver05?.length || 0} Matches)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRunFirstHalf()}
                  disabled={isAnalysingFH}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 disabled:opacity-50"
                >
                  {isAnalysingFH ? 'Scanning...' : '↻ Refresh Independent Module'}
                </button>
              </div>
            </div>

            {!firstHalfData ? (
              <div className="flex h-64 flex-col items-center justify-center space-y-4 rounded-xl border-2 border-dashed bg-muted/5">
                <p className="text-muted-foreground">Independent First Half Module.</p>
                <button
                  onClick={() => handleRunFirstHalf()}
                  disabled={isAnalysingFH}
                  className="rounded-lg bg-indigo-600 px-8 py-3 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium transition-transform active:scale-95"
                >
                  {isAnalysingFH ? 'Running Pure Form Scan...' : '🚀 Scan 1H Form Only'}
                </button>
              </div>
            ) : (
              <div>
                {(!firstHalfData.firstHalfOver05 || firstHalfData.firstHalfOver05.length === 0) ? (
                  <div className="p-12 text-center text-muted-foreground border rounded-xl bg-muted/5">
                    No matches met the "First Half Over 0.5" criteria today.
                  </div>
                ) : (
                  renderDailyTable('⏱️ First Half Over 0.5 (Pure Form)', firstHalfData.firstHalfOver05, 'firstHalfOver05')
                )}
              </div>
            )}
          </div>
        )}

        {/* Market Tabs - Dynamic Rendering */}
        {Object.keys(MARKET_CONFIG).map((marketKey) => (
          activeTab === marketKey && (
            <div key={marketKey} className="p-4 md:p-6 animate-in fade-in duration-300">
              <MarketTab marketKey={marketKey} />
            </div>
          )
        ))}
      </main>

      {/* Modal */}
      {selectedDailyMatch && (
        <MatchDetailsModal
          match={selectedDailyMatch}
          onClose={() => setSelectedDailyMatch(null)}
        />
      )}
    </div>
  );
}

export default App;
