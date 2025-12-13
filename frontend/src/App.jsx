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

  // Helper to render Daily Analysis Tables
  const renderDailyTable = (title, items) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="mb-2 text-md font-semibold text-primary">{title} ({items.length})</h3>
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
                <tr key={item.id} className="border-t hover:bg-accent/10">
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
                  <div key={signal.id} className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm">
                    <div className="absolute top-0 right-0 p-2 text-xs font-bold text-green-500 bg-green-500/10 rounded-bl-lg">
                      {signal.confidencePercent}% Confidence
                    </div>
                    <div className="mb-2 text-xs text-muted-foreground uppercase">{signal.country} • {signal.league}</div>
                    <div className="mb-3 text-lg font-bold">
                      {signal.home} vs {signal.away}
                    </div>
                    <div className="flex items-center gap-3 text-sm mb-3">
                      <span className="bg-accent px-2 py-0.5 rounded text-xs">Score: {signal.score}</span>
                      <span className="text-yellow-500 font-mono text-xs">{signal.elapsed}'</span>
                    </div>

                    <div className="space-y-1 bg-muted/30 p-2 rounded text-xs text-muted-foreground">
                      <div>Strategy: <span className="text-foreground">{signal.strategy}</span></div>
                      <div>Reason: {signal.reason}</div>
                      <div className="pt-1 border-t mt-1 flex gap-2">
                        <span>SoT: {signal.stats.shots_on_target}</span>
                        <span>Corners: {signal.stats.corners}</span>
                        <span>xG: {signal.stats.xG}</span>
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
              <h2 className="text-xl font-semibold">Signal History</h2>
              <button onClick={fetchHistory} className="px-3 py-1 text-xs rounded border hover:bg-accent">Refresh</button>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Match</th>
                    <th className="p-3">Pick</th>
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
    </div>
  );
}

export default App;
