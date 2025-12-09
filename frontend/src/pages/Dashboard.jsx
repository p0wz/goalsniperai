import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Card, Badge, StatusBadge } from '../components/ui';

export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [signals, setSignals] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ total: 0, iy: 0, ms: 0, quota: 500 });
    const navigate = useNavigate();

    useEffect(() => {
        checkAuth();
        fetchSignals();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                credentials: 'include' // Use httpOnly cookie
            });
            const data = await res.json();

            if (data.success) {
                setUser(data.user);
            } else {
                navigate('/login');
            }
        } catch (err) {
            navigate('/login');
        }
    };

    const fetchSignals = async () => {
        try {
            const res = await fetch(`${API_URL}/api/signals`);
            const data = await res.json();
            if (data.success) {
                setSignals(data.data || []);
                setStats({
                    total: data.meta?.totalSignals || 0,
                    iy: data.meta?.iySignals || 0,
                    ms: data.meta?.msSignals || 0,
                    quota: data.meta?.quotaRemaining || 0
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleScan = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/scan`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setSignals(data.data || []);
                setStats(s => ({ ...s, total: data.meta?.signalCount || 0, quota: data.meta?.quotaRemaining || 0 }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        navigate('/');
    };

    const filteredSignals = filter === 'all'
        ? signals
        : signals.filter(s => s.strategyCode === filter);

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                className="w-60 bg-card border-r border-border p-6 flex flex-col fixed h-full"
            >
                <Link to="/" className="flex items-center gap-3 mb-10 group">
                    <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-accent">
                        ⚽
                    </div>
                    <span className="font-display text-xl group-hover:text-accent transition-colors">
                        GoalGPT
                    </span>
                </Link>

                <nav className="flex-1 space-y-1">
                    <SidebarLink href="/dashboard" icon="📊" active>Dashboard</SidebarLink>
                    <SidebarLink href="/pricing" icon="💎">Planlar</SidebarLink>
                </nav>

                {user && (
                    <div className="bg-muted rounded-xl p-4 border border-border">
                        <div className="font-semibold text-sm">{user.name}</div>
                        <div className="text-xs text-accent uppercase font-medium mt-0.5">{user.plan}</div>
                        <button
                            onClick={handleLogout}
                            className="w-full mt-3 px-3 py-2 text-xs text-muted-foreground border border-border rounded-lg hover:text-foreground hover:border-muted-foreground transition-colors"
                        >
                            Çıkış yap
                        </button>
                    </div>
                )}
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 ml-60 p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="font-display text-3xl">Canlı Sinyaller</h1>
                        <Button onClick={handleScan} disabled={loading}>
                            {loading ? '⏳ Taranıyor...' : '🔄 Tara'}
                        </Button>
                    </div>

                    {/* Upgrade Banner */}
                    {user?.plan === 'free' && (
                        <div className="gradient-bg rounded-xl p-6 mb-8 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white">Pro'ya yükselt</h3>
                                <p className="text-sm text-white/70 mt-1">Sınırsız sinyal ve tüm stratejilere eriş</p>
                            </div>
                            <Link to="/pricing">
                                <Button variant="secondary" className="bg-white text-foreground hover:bg-white/90">
                                    Planları gör
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <StatCard label="Toplam Sinyal" value={stats.total} accent />
                        <StatCard label="IY 0.5 Üst" value={stats.iy} />
                        <StatCard label="MS Gol" value={stats.ms} />
                        <StatCard label="API Kota" value={stats.quota} />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {['all', 'IY_05', 'MS_GOL'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'gradient-bg text-white'
                                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {f === 'all' ? 'Tümü' : f === 'IY_05' ? 'IY 0.5 Üst' : 'MS Gol'}
                            </button>
                        ))}
                    </div>

                    {/* Signals Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {filteredSignals.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="col-span-2 text-center py-20 bg-card border border-dashed border-border rounded-xl"
                            >
                                <div className="text-5xl mb-4 animate-float">📡</div>
                                <h3 className="font-display text-xl mb-2">Sinyal bekleniyor</h3>
                                <p className="text-muted-foreground">Tarama yaparak canlı sinyalleri görebilirsiniz</p>
                            </motion.div>
                        ) : (
                            filteredSignals.map((signal, i) => (
                                <SignalCard key={i} signal={signal} index={i} />
                            ))
                        )}
                    </div>
                </motion.div>
            </main>
        </div>
    );
}

function SidebarLink({ href, icon, children, active = false }) {
    return (
        <Link
            to={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active
                ? 'bg-accent/10 text-accent'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            <span>{icon}</span>
            {children}
        </Link>
    );
}

function StatCard({ label, value, accent = false }) {
    return (
        <Card hover={false} className="p-5">
            <div className="text-sm text-muted-foreground mb-1">{label}</div>
            <div className={`font-display text-2xl ${accent ? 'gradient-text' : ''}`}>{value}</div>
        </Card>
    );
}

function SignalCard({ signal, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className="overflow-hidden group">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <StatusBadge variant="accent">
                        {signal.strategy}
                    </StatusBadge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        {signal.elapsed}'
                    </div>
                </div>

                {/* Teams */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col items-center flex-1">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
                            ⚽
                        </div>
                        <span className="text-sm font-medium text-center">{signal.home}</span>
                    </div>

                    <div className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/30">
                        <span className="font-display text-xl gradient-text">{signal.score}</span>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
                            ⚽
                        </div>
                        <span className="text-sm font-medium text-center">{signal.away}</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="font-display text-lg gradient-text">{signal.stats?.shots || 0}</div>
                        <div className="text-xs text-muted-foreground">Şut</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="font-display text-lg gradient-text">{signal.stats?.xG || '0.00'}</div>
                        <div className="text-xs text-muted-foreground">xG</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="font-display text-lg gradient-text">{signal.stats?.corners || 0}</div>
                        <div className="text-xs text-muted-foreground">Korner</div>
                    </div>
                </div>

                {/* AI Analysis */}
                <div className="p-4 bg-muted rounded-lg border border-border relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-2 mb-2 relative">
                        <span className="text-xs font-bold gradient-text">GEMINI AI</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${signal.verdict === 'PLAY' ? 'bg-accent text-white' : 'bg-red-500 text-white'
                            }`}>
                            {signal.verdict}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground relative">{signal.geminiReason || signal.reason || 'Analiz tamamlandı'}</p>
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">{signal.league}</span>
                </div>
            </Card>
        </motion.div>
    );
}
