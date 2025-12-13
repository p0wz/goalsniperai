import { useState, useEffect } from 'react';
import { authService, signalService } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signals State
  const [signals, setSignals] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await authService.getProfile();
      if (res.success) {
        setUser(res.user);
        fetchSignals();
      }
    } catch (err) {
      // Not logged in
      console.log('User not logged in');
    } finally {
      setLoading(false);
    }
  };

  const fetchSignals = async () => {
    try {
      const res = await signalService.getLiveSignals();
      if (res.success) {
        setSignals(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch signals', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await authService.login(email, password);
      if (res.success) {
        setUser(res.user); // Optimistic or re-fetch
        fetchSignals();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setSignals([]);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-foreground">Loading...</div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-lg border bg-card p-8 shadow-lg">
          <h1 className="text-2xl font-bold">GoalGPT Pro Login</h1>
          {error && <div className="rounded bg-destructive/20 p-2 text-red-400">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-input px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-input px-3 py-2 text-sm"
              required
            />
          </div>

          <button type="submit" className="w-full rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">GoalGPT Dashboard</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user.name}</span>
            <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Live Signals</h2>
          {signals.length === 0 ? (
            <p className="text-muted-foreground">No active signals.</p>
          ) : (
            <div className="space-y-4">
              {signals.map((signal) => (
                <div key={signal.id} className="rounded border bg-accent/20 p-4">
                  <div className="flex justify-between">
                    <span className="font-bold">{signal.home} vs {signal.away}</span>
                    <span className="text-green-400">{signal.confidencePercent}%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{signal.strategy} - {signal.league}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
