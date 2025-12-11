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

    const [activeTab, setActiveTab] = useState('live'); // 'live' | 'daily' | 'history'
    const [dailySignals, setDailySignals] = useState({ over15: [], over25: [], doubleChance: [], homeOver15: [], under35: [] });
    const [betHistory, setBetHistory] = useState([]);
    const [betStats, setBetStats] = useState({ totalBets: 0, winRate: '0%', profit: 0, markets: {} });

    useEffect(() => {
        const init = async () => {
            await checkAuth();
            fetchSignals();
            fetchDailySignals();
            fetchBetHistory();
        }
        init();

        // Auto-refresh live signals every 30 seconds
        const intervalId = setInterval(() => {
            fetchSignals();
        }, 30000);

        // Cleanup interval on unmount
        return () => clearInterval(intervalId);
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setUser(data.user);
            else navigate('/login');
        } catch (err) { navigate('/login'); }
    };

    const fetchSignals = async () => {
        try {
            const res = await fetch(`${API_URL}/api/signals`, { credentials: 'include' });
            if (res.status === 403) return; // Free user handled by UI
            const data = await res.json();
            if (data.success) {
                setSignals(data.data || []);
                setStats(s => ({
                    ...s,
                    total: data.meta?.totalSignals || 0,
                    iy: data.meta?.iySignals || 0,
                    ms: data.meta?.msSignals || 0,
                    quota: data.meta?.quotaRemaining || 0
                }));
            }
        } catch (err) { console.error(err); }
    };

    const fetchDailySignals = async () => {
        try {
            const res = await fetch(`${API_URL}/api/daily-analysis`, { credentials: 'include' });
            if (res.status === 403) return;
            const data = await res.json();
            if (data.success) {
                setDailySignals(data.data || { over15: [], over25: [], doubleChance: [], homeOver15: [], under35: [] });
            }
        } catch (e) { console.error(e); }
    };

    const fetchBetHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/api/bet-history`, { credentials: 'include' });
            if (res.status === 403) return;
            const data = await res.json();
            if (data.success) {
                setBetHistory(data.data || []);
                setBetStats(data.stats || { totalBets: 0, winRate: '0%', profit: 0, markets: {} });
            }
        } catch (e) { console.error(e); }
    };

    const handleSettle = async (betId, status) => {
        try {
            const res = await fetch(`${API_URL}/api/bet-history/${betId}/settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) {
                fetchBetHistory(); // Refresh
            }
        } catch (e) { console.error(e); }
    };

    const handleClearHistory = async (source = null) => {
        const confirmMsg = source
            ? `${source === 'live' ? 'Canlı bot' : 'Daily analyst'} geçmişini silmek istediğinize emin misiniz?`
            : 'TÜM geçmişi silmek istediğinize emin misiniz?';

        if (!window.confirm(confirmMsg)) return;

        try {
            const url = source
                ? `${API_URL}/api/bet-history/clear?source=${source}`
                : `${API_URL}/api/bet-history/clear`;

            const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                alert(`${data.clearedCount} kayıt silindi`);
                fetchBetHistory(); // Refresh
            }
        } catch (e) {
            console.error(e);
            alert('Silme işlemi başarısız');
        }
    };

    const handleScan = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/scan`, { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                fetchSignals(); // Refresh
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleLogout = async () => {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        navigate('/');
    };

    const filteredLive = filter === 'all' ? signals : signals.filter(s => s.strategyCode === filter);

    // Render Logic for Free Users
    if (user?.plan === 'free') {
        return (
            <div className="min-h-screen bg-background flex">
                <DashboardSidebar user={user} logout={handleLogout} />
                <main className="flex-1 ml-60 p-8 flex items-center justify-center">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center">
                        <div className="w-24 h-24 mx-auto bg-accent/20 rounded-full flex items-center justify-center text-5xl mb-6">🔒</div>
                        <h1 className="font-display text-3xl mb-4">Pro Üyelik Gerekli</h1>
                        <p className="text-muted-foreground mb-8">Canlı sinyallere ve günlük analizlere erişmek için üyeliğinizi yükseltin.</p>

                        <div className="bg-card p-6 rounded-xl border border-border mb-8">
                            <h3 className="font-semibold mb-2">Ücretsiz Telegram Grubumuz</h3>
                            <a href="https://t.me/deneme_link" target="_blank" className="text-accent hover:underline">t.me/goalsniper_free</a>
                        </div>

                        <Link to="/pricing">
                            <Button className="w-full h-12 text-lg">Hemen Yükselt</Button>
                        </Link>
                    </motion.div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex">
            <DashboardSidebar user={user} logout={handleLogout} />
            <main className="flex-1 ml-60 p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">

                    {/* Header & Tabs */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="font-display text-3xl mb-2">Dashboard</h1>
                            <div className="flex gap-4">
                                <TabBtn active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon="⚡">Canlı Bot</TabBtn>
                                <TabBtn active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} icon="📅">Maç Önü Analiz</TabBtn>
                                <TabBtn active={activeTab === 'liveHistory'} onClick={() => { setActiveTab('liveHistory'); fetchBetHistory(); }} icon="📊">Canlı Geçmiş</TabBtn>
                                <TabBtn active={activeTab === 'dailyHistory'} onClick={() => { setActiveTab('dailyHistory'); fetchBetHistory(); }} icon="📋">Daily Geçmiş</TabBtn>
                            </div>
                        </div>
                        {activeTab === 'live' && (
                            <Button onClick={handleScan} disabled={loading}>{loading ? '⏳...' : '🔄 Tara'}</Button>
                        )}
                    </div>

                    {/* LIVE TAB */}
                    {activeTab === 'live' && (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4 mb-8">
                                <StatCard label="Toplam Sinyal" value={stats.total} accent />
                                <StatCard label="IY 0.5 Üst" value={stats.iy} />
                                <StatCard label="MS Gol" value={stats.ms} />
                                <StatCard label="API Kota" value={stats.quota} />
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2 mb-6">
                                {['all', 'IY_05', 'MS_GOL'].map(f => (
                                    <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'gradient-bg text-white' : 'bg-card border border-border text-muted-foreground'}`}>{f === 'all' ? 'Tümü' : f}</button>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredLive.length === 0 ? (
                                    <div className="col-span-full text-center py-20 text-muted-foreground">Sinyal bulunamadı veya onay bekleniyor.</div>
                                ) : (
                                    filteredLive.map((s, i) => <SignalCard key={i} signal={s} index={i} />)
                                )}
                            </div>
                        </>
                    )}

                    {/* DAILY TAB */}
                    {activeTab === 'daily' && (
                        <div className="space-y-8">
                            {/* Info Banner */}
                            <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
                                <p className="text-sm text-muted-foreground">
                                    💡 Yeni analiz başlatmak için <span className="text-accent font-semibold">Admin Panel → Analiz</span> sekmesine gidin.
                                </p>
                            </div>

                            {/* Results */}
                            {Object.entries(dailySignals).map(([cat, list]) => (
                                <section key={cat}>
                                    <h3 className="font-display text-xl mb-4 capitalize flex items-center gap-2">
                                        <div className="w-2 h-8 rounded-full bg-accent"></div>
                                        {cat.replace(/([A-Z])/g, ' $1').trim()}
                                        <Badge variant="outline" className="ml-2">{list?.length || 0}</Badge>
                                    </h3>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(!list || list.length === 0) ? <div className="text-sm text-muted-foreground px-4">Bu strateji için uygun maç yok.</div> : (
                                            list.map((m, i) => <DailyCard key={i} match={m} index={i} category={cat} />)
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    {/* LIVE HISTORY TAB */}
                    {activeTab === 'liveHistory' && (() => {
                        const liveBets = betHistory.filter(b => b.source === 'live' || !b.source);
                        const liveStats = {
                            total: liveBets.length,
                            won: liveBets.filter(b => b.status === 'WON').length,
                            lost: liveBets.filter(b => b.status === 'LOST').length,
                            pending: liveBets.filter(b => b.status === 'PENDING').length
                        };
                        liveStats.winRate = liveStats.won + liveStats.lost > 0
                            ? Math.round((liveStats.won / (liveStats.won + liveStats.lost)) * 100) + '%'
                            : '-';
                        return (
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-4">
                                    <StatCard label="Toplam" value={liveStats.total} accent />
                                    <StatCard label="Kazanma Oranı" value={liveStats.winRate} />
                                    <StatCard label="Kazandı" value={liveStats.won} />
                                    <StatCard label="Bekleyen" value={liveStats.pending} />
                                </div>
                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-border flex items-center justify-between">
                                        <h3 className="font-semibold">⚡ Canlı Bot Geçmişi ({liveBets.length})</h3>
                                        {liveBets.length > 0 && (
                                            <button onClick={() => handleClearHistory('live')} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">🗑️ Temizle</button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-border">
                                        {liveBets.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground">Henüz canlı bot kaydı yok.</div>
                                        ) : (
                                            liveBets.slice(0, 50).map((bet) => (
                                                <div key={bet.id} className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
                                                    <div className="flex-1">
                                                        <div className="font-medium">{bet.match} {bet.entry_score && <span className="text-accent ml-2">@ {bet.entry_score}</span>}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {bet.strategy} • {bet.date} {bet.result_score && `• Son: ${bet.result_score}`}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {bet.status === 'PENDING' ? (
                                                            <>
                                                                <button onClick={() => handleSettle(bet.id, 'WON')} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors">✅</button>
                                                                <button onClick={() => handleSettle(bet.id, 'LOST')} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">❌</button>
                                                            </>
                                                        ) : (
                                                            <Badge variant={bet.status === 'WON' ? 'default' : 'destructive'}>
                                                                {bet.status === 'WON' ? '✅' : '❌'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* DAILY HISTORY TAB */}
                    {activeTab === 'dailyHistory' && (() => {
                        const dailyBets = betHistory.filter(b => b.source === 'daily');
                        const dailyStats = {
                            total: dailyBets.length,
                            won: dailyBets.filter(b => b.status === 'WON').length,
                            lost: dailyBets.filter(b => b.status === 'LOST').length,
                            pending: dailyBets.filter(b => b.status === 'PENDING').length
                        };
                        dailyStats.winRate = dailyStats.won + dailyStats.lost > 0
                            ? Math.round((dailyStats.won / (dailyStats.won + dailyStats.lost)) * 100) + '%'
                            : '-';
                        return (
                            <div className="space-y-6">
                                <div className="grid grid-cols-4 gap-4">
                                    <StatCard label="Toplam" value={dailyStats.total} accent />
                                    <StatCard label="Kazanma Oranı" value={dailyStats.winRate} />
                                    <StatCard label="Kazandı" value={dailyStats.won} />
                                    <StatCard label="Bekleyen" value={dailyStats.pending} />
                                </div>
                                <div className="bg-card border border-border rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-border flex items-center justify-between">
                                        <h3 className="font-semibold">📅 Daily Analyst Geçmişi ({dailyBets.length})</h3>
                                        {dailyBets.length > 0 && (
                                            <button onClick={() => handleClearHistory('daily')} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">🗑️ Temizle</button>
                                        )}
                                    </div>
                                </div>
                                <div className="divide-y divide-border">
                                    {dailyBets.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground">Henüz daily analyst kaydı yok.</div>
                                    ) : (
                                        dailyBets.slice(0, 50).map((bet) => (
                                            <div key={bet.id} className="p-4 flex items-center justify-between hover:bg-accent/5 transition-colors">
                                                <div className="flex-1">
                                                    <div className="font-medium">{bet.match}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {bet.market} • {bet.date} {bet.result_score && `• ${bet.result_score}`}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {bet.status === 'PENDING' ? (
                                                        <>
                                                            <button onClick={() => handleSettle(bet.id, 'WON')} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors">✅</button>
                                                            <button onClick={() => handleSettle(bet.id, 'LOST')} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">❌</button>
                                                        </>
                                                    ) : (
                                                        <Badge variant={bet.status === 'WON' ? 'default' : 'destructive'}>
                                                            {bet.status === 'WON' ? '✅' : '❌'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            </div>
                );
                    })()}

            </motion.div>
        </main>
        </div >
    );
}

// Sub-components
function DashboardSidebar({ user, logout }) {
    return (
        <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} className="w-60 bg-card border-r border-border p-6 flex flex-col fixed h-full z-10">
            <Link to="/" className="flex items-center gap-3 mb-10 group">
                <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shadow-accent">⚽</div>
                <span className="font-display text-xl">GoalGPT</span>
            </Link>
            <nav className="flex-1 space-y-1">
                <SidebarLink href="/dashboard" icon="📊" active>Dashboard</SidebarLink>
                <SidebarLink href="/pricing" icon="💎">Planlar</SidebarLink>
                {user?.role === 'admin' && <SidebarLink href="/admin" icon="⚙️">Admin</SidebarLink>}
            </nav>
            {user && (
                <div className="bg-muted rounded-xl p-4 border border-border">
                    <div className="font-semibold text-sm">{user.name}</div>
                    <div className="text-xs text-accent uppercase font-medium">{user.role} | {user.plan}</div>
                    <button onClick={logout} className="w-full mt-3 px-3 py-2 text-xs border border-border rounded-lg hover:bg-background">Çıkış yap</button>
                </div>
            )}
        </motion.aside>
    );
}

function SidebarLink({ href, icon, children, active = false }) {
    return (
        <Link to={href} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
            <span>{icon}</span>{children}
        </Link>
    );
}

function TabBtn({ active, onClick, icon, children }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2 rounded-full border transition-all ${active ? 'bg-foreground text-background border-foreground' : 'bg-transparent border-border text-muted-foreground hover:border-foreground'}`}>
            <span>{icon}</span> <span className="font-medium">{children}</span>
        </button>
    );
}

function StatCard({ label, value, accent }) {
    return (
        <Card className="p-5">
            <div className="text-sm text-muted-foreground mb-1">{label}</div>
            <div className={`font-display text-2xl ${accent ? 'gradient-text' : ''}`}>{value}</div>
        </Card>
    );
}

function SignalCard({ signal, index }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card className="overflow-hidden h-full flex flex-col border-l-4 border-l-accent">
                <div className="flex justify-between items-center mb-4">
                    <Badge variant="secondary" className="font-mono text-xs">{signal.strategy}</Badge>
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-bold text-red-500">{signal.elapsed}'</span>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-between text-center mb-6 relative">
                    {/* Vs Line */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground z-0">VS</div>

                    <div className="flex-1 z-10">
                        <div className="font-bold text-lg leading-tight">{signal.home}</div>
                    </div>
                    <div className="px-4 py-2 bg-accent/5 rounded-xl font-display text-2xl mx-2 z-10 min-w-[60px] border border-accent/10">
                        {signal.score}
                    </div>
                    <div className="flex-1 z-10">
                        <div className="font-bold text-lg leading-tight">{signal.away}</div>
                    </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-2 border border-border/50">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Analiz</span>
                        <span className="font-bold text-foreground">{signal.verdict}</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Confidence</span>
                            <span>{signal.confidencePercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${signal.confidencePercent}%` }}
                                className={`h-full rounded-full ${signal.confidencePercent > 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

function DailyCard({ match, category, index }) {
    const confidence = match.aiAnalysis?.confidence || 0;

    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.02 }}>
            <div className="relative group hover:-translate-y-1 transition-transform duration-300">
                {/* Ticket Style Dashed Top/Bottom */}
                <div className="absolute -left-1.5 top-[70%] w-3 h-3 rounded-full bg-background z-20" />
                <div className="absolute -right-1.5 top-[70%] w-3 h-3 rounded-full bg-background z-20" />

                <Card className="h-full border-2 border-dashed border-border group-hover:border-accent/30 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="text-xs text-muted-foreground mb-4 flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <span className="text-lg">📅</span>
                            <span className="font-mono">{match.event_date || 'Today'}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{category}</Badge>
                    </div>

                    <div className="text-center mb-6">
                        <div className="font-display text-lg leading-6 mb-1">{match.event_home_team}</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest my-1">vs</div>
                        <div className="font-display text-lg leading-6">{match.event_away_team}</div>
                    </div>

                    <div className="border-t-2 border-dashed border-border pt-4 pb-2">
                        {match.aiAnalysis ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">AI Skoru</span>
                                    <span className={`font-bold ${confidence > 80 ? 'text-green-500' : 'text-yellow-500'}`}>{confidence}/100</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full">
                                    <div
                                        className={`h-full rounded-full ${confidence > 80 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                        style={{ width: `${confidence}%` }}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                    "{match.aiAnalysis.reason}"
                                </p>
                            </div>
                        ) : (
                            <div className="text-center text-xs text-muted-foreground py-2">
                                Analiz bekleniyor...
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </motion.div>
    )
}
