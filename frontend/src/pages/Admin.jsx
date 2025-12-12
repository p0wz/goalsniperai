import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Card } from '../components/ui';
import AnalysisTerminal from '../components/AnalysisTerminal';
import CouponBuilder from '../components/CouponBuilder';

export default function Admin() {
    const [signals, setSignals] = useState([]);
    const [dailySignals, setDailySignals] = useState({});
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'signals'

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
            const data = await res.json();
            if (!data.success || data.user.role !== 'admin') {
                navigate('/dashboard');
                return;
            }
            loadData();
        } catch (err) { navigate('/login'); }
    };

    const loadData = async () => {
        try {
            const [statsRes, usersRes, logsRes, sigRes, dailyRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' }),
                fetch(`${API_URL}/api/admin/users`, { credentials: 'include' }),
                fetch(`${API_URL}/api/admin/logs`, { credentials: 'include' }),
                fetch(`${API_URL}/api/signals`, { credentials: 'include' }),
                fetch(`${API_URL}/api/daily-analysis`, { credentials: 'include' })
            ]);

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            const logsData = await logsRes.json();
            const sigData = await sigRes.json();
            const dailyData = await dailyRes.json();

            if (statsData.success) setStats(statsData.stats);
            if (usersData.success) setUsers(usersData.users);
            if (logsData.success) setLogs(logsData.logs);
            if (sigData.success) setSignals(sigData.data || []);
            if (dailyData.success) setDailySignals(dailyData.data || {});
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    // DELETE signal from list (no approval needed - signals auto-recorded when analysis runs)
    const handleDeleteSignal = (signalId, category = null) => {
        if (category) {
            // Daily signal: remove from category
            setDailySignals(prev => ({
                ...prev,
                [category]: prev[category]?.filter(s => s.id !== signalId) || []
            }));
        } else {
            // Live signal: remove from signals array
            setSignals(prev => prev.filter(s => s.id !== signalId));
        }
    };

    const handleScan = async () => {
        // ... handled by SignalsView logic via props if needed, or simply trigger API
        try {
            const res = await fetch(`${API_URL}/api/scan`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                alert("Scan started!");
                loadData();
            }
        } catch (e) { alert(e.message); }
    };

    const handleDailyAnalysis = async (limit) => {
        try {
            const url = limit ? `${API_URL}/api/daily-analysis?force=true&limit=${limit}` : `${API_URL}/api/daily-analysis?force=true`;
            const res = await fetch(url, { credentials: 'include' });
            if (res.ok) {
                alert("Analysis started!");
                loadData();
            }
        } catch (e) { alert(e.message); }
    };

    const updatePlan = async (id, plan) => {
        await fetch(`${API_URL}/api/admin/users/${id}/plan`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ plan })
        });
        loadData();
    };

    const deleteUser = async (id) => {
        if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
        await fetch(`${API_URL}/api/admin/users/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        loadData();
    };

    const handleLogout = async () => {
        await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        navigate('/');
    };

    // Need these states for props
    const [stats, setStats] = useState({ total: 0, revenue: 0 });
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [logFilter, setLogFilter] = useState('all'); // all, error, signal, gemini
    const navigate = useNavigate();

    // Log Logic
    const filteredLogs = logs.filter(l => {
        if (logFilter === 'all') return true;
        if (logFilter === 'error') return l.level === 'error' || l.level === 'warn';
        if (logFilter === 'signal') return l.level === 'signal';
        if (logFilter === 'gemini') return l.level === 'gemini';
        return true;
    });

    return (
        <div className="min-h-screen bg-background flex">
            <AdminSidebar logout={handleLogout} />
            <main className="flex-1 ml-60 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="font-display text-3xl">Admin Panel</h1>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant={activeTab === 'users' ? 'primary' : 'secondary'} onClick={() => setActiveTab('users')}>👥 Kullanıcılar</Button>
                        <Button variant={activeTab === 'signals' ? 'primary' : 'secondary'} onClick={() => setActiveTab('signals')}>⚡ Canlı Bot</Button>
                        <Button variant={activeTab === 'daily' ? 'primary' : 'secondary'} onClick={() => setActiveTab('daily')}>📅 Günlük Analiz</Button>
                        <Button variant={activeTab === 'analysis' ? 'primary' : 'secondary'} onClick={() => setActiveTab('analysis')}>🤖 Terminal</Button>
                        <Button variant={activeTab === 'coupons' ? 'primary' : 'secondary'} onClick={() => setActiveTab('coupons')}>🎟️ Kupon</Button>
                    </div>
                </div>

                {activeTab === 'coupons' && <CouponBuilder />}

                {activeTab === 'users' && (
                    <div className="space-y-8">
                        {/* Users & Stats */}
                        <UsersView users={users} stats={stats} updatePlan={updatePlan} deleteUser={deleteUser} />

                        {/* System Logs with Filters */}
                        <Card hover={false} className="p-0 overflow-hidden flex flex-col h-[500px]">
                            <div className="bg-black/90 p-3 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-2 text-xs font-mono text-muted-foreground">system_logs.log</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setLogFilter('all')} className={`text-xs ${logFilter === 'all' ? 'text-white font-bold' : 'text-muted-foreground'}`}>ALL</button>
                                    <button onClick={() => setLogFilter('error')} className={`text-xs ${logFilter === 'error' ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>ERRORS</button>
                                    <button onClick={() => setLogFilter('signal')} className={`text-xs ${logFilter === 'signal' ? 'text-blue-400 font-bold' : 'text-muted-foreground'}`}>SIGNALS</button>
                                    <button onClick={() => setLogFilter('gemini')} className={`text-xs ${logFilter === 'gemini' ? 'text-purple-400 font-bold' : 'text-muted-foreground'}`}>AI</button>
                                    <div className="w-px h-4 bg-white/20 mx-2" />
                                    <button onClick={loadData} className="text-xs text-accent hover:text-white transition-colors">
                                        🔄 Yenile
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 bg-black/95 p-4 overflow-y-auto font-mono text-xs space-y-1 scrollbar-hide">
                                {filteredLogs.length === 0 && (
                                    <div className="text-muted-foreground italic">Kayıt bulunamadı ({logFilter})...</div>
                                )}
                                {filteredLogs.map((log) => (
                                    <div key={log.id} className="flex gap-2">
                                        <span className="text-gray-500 shrink-0">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                        <span className={`uppercase font-bold shrink-0 w-16 ${log.level === 'error' ? 'text-red-500' :
                                            log.level === 'warn' ? 'text-yellow-500' :
                                                log.level === 'success' ? 'text-green-500' :
                                                    log.level === 'gemini' ? 'text-purple-400' :
                                                        log.level === 'signal' ? 'text-blue-400' :
                                                            'text-gray-300'
                                            }`}>{log.level}</span>
                                        <span className="text-gray-300 break-all">{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'signals' && (
                    <LiveSignalsView
                        signals={signals}
                        onDelete={handleDeleteSignal}
                        handleScan={handleScan}
                        scanning={scanning}
                    />
                )}

                {activeTab === 'daily' && (
                    <DailyAnalystView
                        dailySignals={dailySignals}
                        setDailySignals={setDailySignals}
                        onDelete={handleDeleteSignal}
                        handleDailyScan={handleDailyAnalysis}
                        analyzing={analyzing}
                        loadData={loadData}
                    />
                )}

                {activeTab === 'analysis' && (
                    <div className="space-y-6">
                        <div className="bg-card p-4 rounded-xl border border-border">
                            <h2 className="text-xl font-bold mb-2">🤖 Canlı Analiz Terminali</h2>
                            <p className="text-sm text-muted-foreground">Gerçek zamanlı maç analizi başlatın ve Gemini AI yanıtlarını canlı olarak izleyin.</p>
                        </div>
                        <AnalysisTerminal onComplete={(results) => setDailySignals(results)} />
                    </div>
                )}
            </main>
        </div>
    );
}

// ============================================
// LIVE SIGNALS VIEW (Canlı Bot Sinyalleri)
// ============================================
function LiveSignalsView({ signals, onDelete, handleScan, scanning }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">⚡ Canlı Bot Sinyalleri</h2>
                <Button onClick={handleScan} disabled={scanning}>
                    {scanning ? '🔄 Taranıyor...' : '🔍 Yeni Tara'}
                </Button>
            </div>

            {signals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3">📭</div>
                    <p>Henüz canlı sinyal yok</p>
                    <p className="text-xs mt-1">Bot 3 dakikada bir otomatik tarama yapar</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4">
                    {signals.map((s, i) => (
                        <SignalCard key={i} signal={s} onDelete={() => onDelete(s.id)} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// DAILY ANALYST VIEW (Günlük Analiz)
// ============================================
function DailyAnalystView({ dailySignals, setDailySignals, onDelete, handleDailyScan, analyzing, loadData }) {
    const [selectedCategory, setSelectedCategory] = useState('all');

    const CATEGORY_COLORS = {
        over15: 'bg-green-500/20 text-green-400 border-green-500/30',
        over25: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        doubleChance: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        homeOver15: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        under35: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        under25: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    const CATEGORY_LABELS = {
        over15: '⚽ Over 1.5',
        over25: '⚽⚽ Over 2.5',
        doubleChance: '🎯 1X DC',
        homeOver15: '🏠 Home O1.5',
        under35: '🛡️ Under 3.5',
        under25: '🔒 Under 2.5'
    };

    const allSignals = Object.entries(dailySignals).flatMap(([cat, list]) =>
        (list || []).map(s => ({ ...s, category: cat }))
    );

    const filteredSignals = selectedCategory === 'all'
        ? allSignals
        : allSignals.filter(s => s.category === selectedCategory);

    const totalCount = allSignals.length;

    const clearCategory = (cat) => {
        if (confirm(`${CATEGORY_LABELS[cat] || cat} kategorisindeki tüm sinyalleri silmek istiyor musunuz?`)) {
            setDailySignals(prev => ({ ...prev, [cat]: [] }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">📅 Günlük Maç Analizi</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {totalCount} sinyal bulundu
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => handleDailyScan(5)} disabled={analyzing} size="sm" variant="secondary">
                        Test (5)
                    </Button>
                    <Button onClick={() => handleDailyScan(100)} disabled={analyzing}>
                        {analyzing ? '🔄 Analiz Ediliyor...' : '🚀 Tam Analiz'}
                    </Button>
                </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === 'all'
                        ? 'bg-accent text-white'
                        : 'bg-muted text-muted-foreground hover:text-white'
                        }`}
                >
                    Tümü ({totalCount})
                </button>
                {Object.entries(dailySignals).map(([cat, list]) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${selectedCategory === cat
                            ? CATEGORY_COLORS[cat] || 'bg-accent text-white'
                            : 'bg-muted/50 text-muted-foreground hover:text-white border-transparent'
                            }`}
                    >
                        {CATEGORY_LABELS[cat] || cat} ({list?.length || 0})
                    </button>
                ))}
            </div>

            {/* Clear Category Button */}
            {selectedCategory !== 'all' && filteredSignals.length > 0 && (
                <div className="flex justify-end">
                    <button
                        onClick={() => clearCategory(selectedCategory)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                        🗑️ Bu Kategoriyi Temizle
                    </button>
                </div>
            )}

            {/* Signals Grid */}
            {filteredSignals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3">📭</div>
                    <p>Bu kategoride sinyal yok</p>
                    <p className="text-xs mt-1">Analizi çalıştırarak yeni sinyaller bulabilirsiniz</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSignals.map((s) => (
                        <DailySignalCard
                            key={s.id}
                            signal={s}
                            categoryColor={CATEGORY_COLORS[s.category]}
                            categoryLabel={CATEGORY_LABELS[s.category]}
                            onDelete={() => onDelete(s.id, s.category)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// SIGNAL CARD (Live Bot)
// ============================================
function SignalCard({ signal, onDelete }) {
    return (
        <div className="p-4 rounded-xl border bg-card border-border hover:border-accent/50 transition-all group">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="font-bold text-sm">{signal.home}</div>
                    <div className="text-xs text-muted-foreground">vs</div>
                    <div className="font-bold text-sm">{signal.away}</div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-accent">{signal.score}</div>
                    <div className="text-xs text-muted-foreground">{signal.elapsed}'</div>
                </div>
            </div>

            <div className="text-xs text-accent font-semibold mb-2">{signal.strategy}</div>

            {signal.confidencePercent && (
                <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Olasılık</span>
                        <span className="font-bold">{signal.confidencePercent}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${signal.confidencePercent >= 70 ? 'bg-green-500' : 'bg-yellow-500'}`}
                            style={{ width: `${signal.confidencePercent}%` }}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={onDelete}
                className="w-full mt-2 bg-red-600/10 hover:bg-red-600/30 text-red-400 h-7 text-xs rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
                🗑️ Kaldır
            </button>
        </div>
    );
}

// ============================================
// DAILY SIGNAL CARD
// ============================================
function DailySignalCard({ signal, categoryColor, categoryLabel, onDelete }) {
    return (
        <div className="p-4 rounded-xl border bg-card border-border hover:border-accent/30 transition-all group">
            {/* Category Badge */}
            <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-3 border ${categoryColor}`}>
                {categoryLabel}
            </div>

            {/* Teams */}
            <div className="mb-3">
                <div className="font-bold">{signal.event_home_team || signal.home}</div>
                <div className="text-xs text-muted-foreground my-0.5">vs</div>
                <div className="font-bold">{signal.event_away_team || signal.away}</div>
            </div>

            {/* Match Info */}
            <div className="text-xs text-muted-foreground mb-3 space-y-1">
                {signal.league && <div>🏆 {signal.league}</div>}
                {signal.startTime && <div>⏰ {signal.startTime}</div>}
            </div>

            {/* Stats Summary */}
            {signal.stats && (
                <div className="bg-muted/30 rounded-lg p-2 text-xs mb-3">
                    <div className="grid grid-cols-2 gap-1">
                        {signal.stats.homeForm && (
                            <div>Home O1.5: {signal.stats.homeForm.over15Rate?.toFixed(0)}%</div>
                        )}
                        {signal.stats.awayForm && (
                            <div>Away O1.5: {signal.stats.awayForm.over15Rate?.toFixed(0)}%</div>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Button */}
            <button
                onClick={onDelete}
                className="w-full bg-red-600/10 hover:bg-red-600/30 text-red-400 h-7 text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
            >
                🗑️ Kaldır
            </button>
        </div>
    );
}

function AdminSidebar({ logout }) {
    return (
        <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} className="w-60 bg-card border-r border-border p-6 flex flex-col fixed h-full">
            <div className="mb-10 font-display text-xl">GoalGPT Admin</div>
            <button onClick={logout} className="text-sm text-muted-foreground">Log Out</button>
        </motion.aside>
    )
}

function UsersView({ users, stats, updatePlan, deleteUser }) {
    return (
        <div>
            {/* User Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <Card className="p-4"><div className="text-sm text-muted-foreground">Users</div><div className="text-2xl">{users.length}</div></Card>
                <Card className="p-4"><div className="text-sm text-muted-foreground">Revenue</div><div className="text-2xl">${stats.revenue}</div></Card>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border bg-muted/50">
                            <th className="p-3 text-left">Email</th>
                            <th className="p-3 text-left">Role</th>
                            <th className="p-3 text-left">Plan</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-border hover:bg-muted/20">
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{user.role}</td>
                                <td className="p-3">
                                    <select
                                        value={user.plan}
                                        onChange={(e) => updatePlan(user.id, e.target.value)}
                                        className="bg-transparent border rounded p-1"
                                    >
                                        <option value="free">Free</option>
                                        <option value="pro">Pro</option>
                                        <option value="premium">Premium</option>
                                    </select>
                                </td>
                                <td className="p-3 text-right">
                                    <button onClick={() => deleteUser(user.id)} className="text-red-500 hover:text-red-400">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
