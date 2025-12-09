import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { motion } from 'framer-motion';
import { Button, Card } from '../components/ui';

export default function Admin() {
    const [stats, setStats] = useState({ total: 0, free: 0, pro: 0, premium: 0, revenue: 0 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [logs, setLogs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                credentials: 'include'
            });
            const data = await res.json();

            if (!data.success || data.user.role !== 'admin') {
                navigate('/dashboard');
                return;
            }

            loadData();
        } catch (err) {
            navigate('/login');
        }
    };

    const loadData = async () => {
        try {
            const [statsRes, usersRes, logsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/stats`, { credentials: 'include' }),
                fetch(`${API_URL}/api/admin/users`, { credentials: 'include' }),
                fetch(`${API_URL}/api/admin/logs`, { credentials: 'include' })
            ]);

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();
            const logsData = await logsRes.json();

            if (statsData.success) {
                setStats({
                    total: statsData.stats.total_users,
                    free: statsData.stats.free_users,
                    pro: statsData.stats.pro_users,
                    premium: statsData.stats.premium_users,
                    revenue: statsData.stats.revenue_monthly
                });
            }

            if (usersData.success) {
                setUsers(usersData.users);
            }

            if (logsData.success) {
                setLogs(logsData.logs);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleScan = async () => {
        setScanning(true);
        try {
            const res = await fetch(`${API_URL}/api/scan`, {
                method: 'POST',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                alert(`Scan Complete! Found ${data.data.length} signals.`);
            } else {
                alert('Scan Failed: ' + data.error);
            }
        } catch (error) {
            alert('Scan Error: ' + error.message);
        } finally {
            setScanning(false);
        }
    };

    const handleDailyAnalysis = async () => {
        setAnalyzing(true);
        try {
            const res = await fetch(`${API_URL}/api/daily-analysis`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setAnalysisResults(data.data);
                alert('Analysis Complete! Scroll down to view results.');
            } else {
                alert('Analysis Failed: ' + data.error);
            }
        } catch (error) {
            alert('Analysis Error: ' + error.message);
        } finally {
            setAnalyzing(false);
        }
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

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <motion.aside
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                className="w-60 bg-card border-r border-border p-6 flex flex-col fixed h-full"
            >
                <Link to="/" className="flex items-center gap-3 mb-2 group">
                    <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg">
                        👑
                    </div>
                    <span className="font-display text-xl group-hover:text-accent transition-colors">
                        GoalGPT
                    </span>
                </Link>
                <span className="inline-block px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded mb-10 w-fit">
                    ADMIN
                </span>

                <nav className="flex-1 space-y-1">
                    <SidebarLink href="/admin" icon="📊" active>Dashboard</SidebarLink>
                    <SidebarLink href="/dashboard" icon="📡">Sinyaller</SidebarLink>
                </nav>

                <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:text-foreground hover:border-muted-foreground transition-colors"
                >
                    Çıkış yap
                </button>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 ml-60 p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl"
                >
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="font-display text-3xl">Admin Dashboard</h1>
                            <p className="text-muted-foreground mt-1">Kullanıcı yönetimi ve sistem istatistikleri</p>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleScan}
                            disabled={scanning}
                            className="flex items-center gap-2"
                        >
                            {scanning ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                    Taranıyor...
                                </>
                            ) : (
                                <>
                                    🚀 Şimdi Tara
                                </>
                            )}
                        </Button>
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
                    </div>

                    {/* Analysis Results */}
                    {analysisResults && (
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
                    )}
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

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-10">
                        <StatCard icon="👥" value={stats.total} label="Toplam Kullanıcı" accent />
                        <StatCard icon="🆓" value={stats.free} label="Ücretsiz" />
                        <StatCard icon="⭐" value={stats.pro} label="Pro" />
                        <StatCard icon="💰" value={`${stats.revenue}₺`} label="Aylık Gelir" warning />
                    </div>

                    {/* Users Table */}
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
