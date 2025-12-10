import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Card } from '../components/ui';

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

    // ... (rest of scan/users logic) ...

    return (
        <div className="min-h-screen bg-background flex">
            <AdminSidebar logout={handleLogout} />
            <main className="flex-1 ml-60 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="font-display text-3xl">Admin Panel</h1>
                    <div className="flex gap-2">
                        <Button variant={activeTab === 'users' ? 'primary' : 'secondary'} onClick={() => setActiveTab('users')}>Kullanıcılar</Button>
                        <Button variant={activeTab === 'signals' ? 'primary' : 'secondary'} onClick={() => setActiveTab('signals')}>Sinyal Onayı</Button>
                    </div>
                </div>

                {activeTab === 'users' && (
                    <UsersView users={users} stats={stats} updatePlan={updatePlan} deleteUser={deleteUser} />
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
            </main>
        </div>
    );
}

function SignalsView({ signals, dailySignals, onApprove, handleScan, handleDailyScan, scanning, analyzing }) {
    // Combine for display or separate? Separate is better.
    return (
        <div className="space-y-8">
            {/* Live Signals */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Canlı Sinyaller</h2>
                    <Button onClick={handleScan} disabled={scanning}>{scanning ? 'Taranıyor...' : 'Yeni Tara'}</Button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {signals.map((s, i) => (
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
    // ... Copy existing users table logic here or keep simplified ...
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
}                        >
{
    scanning?(
                                <>
    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    Taranıyor...
                                </>
                            ) : (
    <>
        🚀 Şimdi Tara
    </>
)}
                        </Button >
                        <Button
                            variant="secondary"
                            onClick={handleDailyAnalysis}
                            disabled={analyzing}
                            className="flex items-center gap-2"
                        >
                            {analyzing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    Analiz Ediliyor...
                                </>
                            ) : (
                                <>
                                    📈 Günlük Analiz (100 Maç)
                                </>
                            )}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => handleDailyAnalysis(1)}
                            disabled={analyzing}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {analyzing ? '...' : '🧪 Test (1 Maç)'}
                        </Button>
                    </div >

    {/* Analysis Results */ }
{
    analysisResults && (
        <div className="mb-10 space-y-6">
            <h2 className="font-display text-2xl">📊 Günlük Analiz Sonuçları</h2>
            {['over15', 'btts', 'homeOver15'].map(cat => (
                <Card key={cat} hover={false} className="p-4">
                    <h3 className="font-bold text-lg mb-2 capitalize border-b border-white/10 pb-2">
                        {cat === 'over15' ? '🔥 Over 1.5 Goals' : cat === 'btts' ? '🤝 BTTS (KG Var)' : '🏠 Home 1.5+'}
                    </h3>
                    {analysisResults[cat]?.length === 0 ? (
                        <div className="text-muted-foreground text-sm">Uygun maç bulunamadı.</div>
                    ) : (
                        <div className="space-y-2">
                            {analysisResults[cat]?.map((match, i) => (
                                <div key={i} className="bg-black/40 p-3 rounded border border-white/5 flex flex-col gap-1">
                                    <div className="flex justify-between font-bold text-accent">
                                        <span>{match.match}</span>
                                        <span>{match.aiAnalysis?.verdict} ({match.aiAnalysis?.confidence}%)</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(match.startTime * 1000).toLocaleString()} |
                                        Avg Goals: {match.stats?.leagueAvgGoals?.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-green-400 italic">
                                        🤖 AI: {match.aiAnalysis?.reason}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ))}
        </div>
    )
}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
    {/* System Logs */}
    <Card hover={false} className="p-0 overflow-hidden flex flex-col h-[500px]">
        <div className="bg-black/90 p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-2 text-xs font-mono text-muted-foreground">system_logs.log</span>
            </div>
            <button onClick={loadData} className="text-xs text-accent hover:text-white transition-colors">
                🔄 Yenile
            </button>
        </div>
        <div className="flex-1 bg-black/95 p-4 overflow-y-auto font-mono text-xs space-y-1 scrollbar-hide">
            {logs.length === 0 && (
                <div className="text-muted-foreground italic">Henüz log kaydı yok...</div>
            )}
            {logs.map((log) => (
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

    {/* Recent Users / Quick Actions placeholder or kept empty for layout */}
</div>

{/* Stats */ }
<div className="grid grid-cols-4 gap-4 mb-10">
    <StatCard icon="👥" value={stats.total} label="Toplam Kullanıcı" accent />
    <StatCard icon="🆓" value={stats.free} label="Ücretsiz" />
    <StatCard icon="⭐" value={stats.pro} label="Pro" />
    <StatCard icon="💰" value={`${stats.revenue}₺`} label="Aylık Gelir" warning />
</div>

{/* Users Table */ }
                    <h2 className="font-display text-xl mb-4">👤 Kullanıcılar</h2>
                    <Card hover={false} className="overflow-hidden p-0">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kullanıcı</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kayıt</th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-sm">{user.email}</div>
                                            <div className="text-xs text-muted-foreground">{user.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.plan === 'premium' ? 'bg-orange-500/20 text-orange-500' :
                                                user.plan === 'pro' ? 'bg-accent/20 text-accent' :
                                                    'bg-muted text-muted-foreground'
                                                }`}>
                                                {user.plan}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.role !== 'admin' && (
                                                <div className="flex gap-2">
                                                    <select
                                                        value={user.plan}
                                                        onChange={(e) => updatePlan(user.id, e.target.value)}
                                                        className="px-2 py-1 bg-muted border border-border rounded text-xs"
                                                    >
                                                        <option value="free">Free</option>
                                                        <option value="pro">Pro</option>
                                                        <option value="premium">Premium</option>
                                                    </select>
                                                    <button
                                                        onClick={() => deleteUser(user.id)}
                                                        className="px-2 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded text-xs hover:bg-red-500 hover:text-white transition-colors"
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </motion.div >
            </main >
        </div >
    );
}

function SidebarLink({ href, icon, children, active = false }) {
    return (
        <Link
            to={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active
                ? 'bg-orange-500/10 text-orange-500'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
        >
            <span>{icon}</span>
            {children}
        </Link>
    );
}

function StatCard({ icon, value, label, accent = false, warning = false }) {
    return (
        <Card hover={false} className="p-5">
            <div className="text-2xl mb-3">{icon}</div>
            <div className={`font-display text-2xl ${accent ? 'gradient-text' : warning ? 'text-orange-500' : ''}`}>
                {value}
            </div>
            <div className="text-sm text-muted-foreground mt-1">{label}</div>
        </Card>
    );
}
