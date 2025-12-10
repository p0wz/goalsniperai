import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Card } from '../components/ui';
import AnalysisTerminal from '../components/AnalysisTerminal';

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

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/approve/${id}`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                // Optimistic UI update
                setSignals(s => s.map(x => x.id === id ? { ...x, isApproved: true } : x));

                // For daily signals, deep update
                const newDaily = { ...dailySignals };
                Object.keys(newDaily).forEach(cat => {
                    newDaily[cat] = newDaily[cat].map(x => x.id === id ? { ...x, isApproved: true } : x);
                });
                setDailySignals(newDaily);
            }
        } catch (e) {
            alert("Error approving: " + e.message);
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
                    <div className="flex gap-2">
                        <Button variant={activeTab === 'users' ? 'primary' : 'secondary'} onClick={() => setActiveTab('users')}>Kullanıcılar</Button>
                        <Button variant={activeTab === 'signals' ? 'primary' : 'secondary'} onClick={() => setActiveTab('signals')}>Sinyal Onayı</Button>
                        <Button variant={activeTab === 'analysis' ? 'primary' : 'secondary'} onClick={() => setActiveTab('analysis')}>🤖 Analiz</Button>
                    </div>
                </div>

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
                    <SignalsView
                        signals={signals}
                        dailySignals={dailySignals}
                        onApprove={handleApprove}
                        handleScan={handleScan}
                        handleDailyScan={handleDailyAnalysis}
                        scanning={scanning}
                        analyzing={analyzing}
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

function SignalsView({ signals, dailySignals, onApprove, handleScan, handleDailyScan, scanning, analyzing }) {
    const [sort, setSort] = useState('newest'); // newest, confidence

    const sortedSignals = [...signals].sort((a, b) => {
        if (sort === 'confidence') return (b.aiAnalysis?.confidence || 0) - (a.aiAnalysis?.confidence || 0);
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    return (
        <div className="space-y-8">
            {/* Live Signals */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Canlı Sinyaller</h2>
                    <div className="flex gap-2">
                        <select className="bg-muted text-xs p-1 rounded border border-border" value={sort} onChange={e => setSort(e.target.value)}>
                            <option value="newest">En Yeni</option>
                            <option value="confidence">Güven Skoru</option>
                        </select>
                        <Button onClick={handleScan} disabled={scanning}>{scanning ? 'Taranıyor...' : 'Yeni Tara'}</Button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {sortedSignals.map((s, i) => (
                        <AdminSignalCard key={i} signal={s} onApprove={onApprove} />
                    ))}
                </div>
            </section>

            {/* Daily Signals */}
            <section>
                <div className="flex justify-between items-center mb-4 border-t pt-8">
                    <h2 className="text-xl font-bold">Maç Önü Analiz</h2>
                    <div className="flex gap-2">
                        <Button onClick={() => handleDailyScan(1)} disabled={analyzing} size="sm">Test (1 Maç)</Button>
                        <Button onClick={() => handleDailyScan(100)} disabled={analyzing}>Tam Analiz</Button>
                    </div>
                </div>
                {Object.entries(dailySignals).map(([cat, list]) => (
                    <div key={cat} className="mb-6">
                        <h3 className="font-semibold capitalize mb-2">{cat}</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {list && list.map((s, i) => (
                                <AdminSignalCard key={i} signal={s} onApprove={onApprove} isDaily />
                            ))}
                        </div>
                    </div>
                ))}
            </section>
        </div>
    )
}

function AdminSignalCard({ signal, onApprove, isDaily }) {
    return (
        <div className={`relative p-4 rounded-xl border ${signal.isApproved ? 'bg-green-500/10 border-green-500/30' : 'bg-card border-border'}`}>
            <div className="flex justify-between mb-2">
                <span className="font-bold text-sm">{isDaily ? signal.event_home_team : signal.home} vs {isDaily ? signal.event_away_team : signal.away}</span>
                {signal.isApproved ? <span className="text-green-500 text-xs font-bold">ONAYLANDI</span> : <span className="text-yellow-500 text-xs font-bold">BEKLİYOR</span>}
            </div>
            {!signal.isApproved && (
                <Button className="w-full mt-2 bg-green-600 hover:bg-green-700 h-8 text-xs" onClick={() => onApprove(signal.id)}>
                    ONAYLA ✅
                </Button>
            )}
        </div>
    )
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
