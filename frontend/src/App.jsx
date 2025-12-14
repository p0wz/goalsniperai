import { useState, useEffect } from 'react';
import { authService, signalService, betService } from './services/api';
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
  const [selectedDailyMatch, setSelectedDailyMatch] = useState(null);

  // Loaders
  const [refreshing, setRefreshing] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await authService.getProfile();
      if (res.success) {
        setUser(res.user);
        fetchAll();
      }
    } catch (err) {
      console.log('User not logged in');
    } finally {
      setLoading(false);
    }
  };

  const fetchAll = () => {
    fetchSignals();
    fetchHistory();
    // Daily analysis is usually on demand or cached, we can fetch if needed
    // fetchDaily(); 
  };

  const fetchSignals = async () => {
    try {
      setRefreshing(true);
      const res = await signalService.getLiveSignals();
      if (res.success) setLiveSignals(res.data);
    } catch (err) { console.error(err); }
    finally { setRefreshing(false); }
  };

  const fetchHistory = async () => {
    try {
      const res = await betService.getHistory();
      if (res.success) setBetHistory(res.data);
    } catch (err) { console.error(err); }
  };

  const handleRunDaily = async () => {
    try {
      setIsAnalysing(true);
      // Force run
      const res = await signalService.getDailyAnalysis(true);
      if (res.success) setDailyAnalysis(res.data);
    } catch (err) {
      alert('Analysis failed: ' + err.message);
    } finally {
      setIsAnalysing(false);
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
            {match.detailed_analysis && (
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
  const renderDailyTable = (title, items) => {
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
                  <td className="p-2 font-medium">{item.event_home_team} vs {item.event_away_team}</td>
                  <td className="p-2 text-muted-foreground">{item.league}</td>
                  <td className="p-2 text-xs">
                    H2H: {(item.stats.mutual || []).length} games
                    {/* Add more stats if needed */}
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
            <span className="text-muted-foreground">{user.name}</span>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-300">Logout</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">

        {/* Navigation Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          {['live', 'history', 'daily'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === 'live' && '📡 Live Signals'}
              {tab === 'history' && '📜 Signal History'}
              {tab === 'daily' && '📅 Daily Analysis'}
            </button>
          ))}
        </div>

        {/* Tab Content: LIVE */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Active Live Signals</h2>
              <button
                onClick={fetchSignals}
                disabled={refreshing}
                className="px-3 py-1 text-xs rounded border hover:bg-accent"
              >
                {refreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>

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
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <div>
                <h2 className="text-xl font-semibold">Daily Pre-Match Analysis</h2>
                <p className="text-sm text-muted-foreground">Analysis for top leagues based on H2H and Form.</p>
              </div>
              <button
                onClick={handleRunDaily}
                disabled={isAnalysing}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium shadow-sm w-full md:w-auto"
              >
                {isAnalysing ? 'Running Analysis (Please Wait)...' : '▶ Run New Analysis'}
              </button>
            </div>

            {isAnalysing && (
              <div className="p-8 text-center border rounded bg-accent/10 animate-pulse">
                <div className="text-lg font-bold mb-2">Analyzing 40+ Leagues...</div>
                <div className="text-sm text-muted-foreground">Fetching Data • Calculating Statistics • Comparing Form</div>
              </div>
            )}

            {dailyAnalysis && !isAnalysing && (
              <div className="space-y-4">
                {renderDailyTable('🔥 Over 2.5 Goals Candidates', dailyAnalysis.over25)}
                {renderDailyTable('🛡️ 1X Double Chance (Safe)', dailyAnalysis.doubleChance)}
                {renderDailyTable('🏠 Home Team Over 1.5', dailyAnalysis.homeOver15)}
                {renderDailyTable('🔒 Under 3.5 Goals', dailyAnalysis.under35)}
                {renderDailyTable('🧊 Under 2.5 Goals', dailyAnalysis.under25)}

                {Object.values(dailyAnalysis).every(arr => arr.length === 0) && (
                  <div className="text-center p-8 border rounded text-muted-foreground">
                    Analysis complete. No matches met the strict criteria for today.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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
