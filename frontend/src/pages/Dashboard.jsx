import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../components/layout';
import { Card, Badge, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import useApi from '../hooks/useApi';

const Dashboard = () => {
    const { user } = useAuth();
    const { get } = useApi();
    const [stats, setStats] = useState({ signalsToday: 0, winRate: 0, totalProfit: 0 });
    const [recentSignals, setRecentSignals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Load stats - would come from API
            // For now using mock data
            setStats({
                signalsToday: 5,
                winRate: 72,
                totalProfit: 1250
            });

            setRecentSignals([
                { id: 1, match: 'Real Madrid vs Barcelona', market: 'Gol Var', confidence: 85, status: 'WON', time: '15:30' },
                { id: 2, match: 'Man City vs Liverpool', market: 'Gol Var', confidence: 78, status: 'PENDING', time: '18:00' },
                { id: 3, match: 'Bayern vs Dortmund', market: 'Gol Var', confidence: 82, status: 'LOST', time: '20:45' }
            ]);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'WON': return <Badge variant="success">✓ Kazandı</Badge>;
            case 'LOST': return <Badge variant="danger">✗ Kaybetti</Badge>;
            default: return <Badge variant="warning">⏳ Bekliyor</Badge>;
        }
    };

    return (
        <DashboardLayout title="Dashboard">
            {/* Welcome Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">
                    Hoş geldin, <span className="text-gradient">{user?.name?.split(' ')[0]}</span> 👋
                </h2>
                <p className="text-[var(--text-secondary)]">
                    Bugün harika bir gün! İşte son durumun:
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">Bugünkü Sinyaller</p>
                            <p className="text-3xl font-bold">{stats.signalsToday}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[var(--accent-blue)]/20 flex items-center justify-center text-2xl">
                            ⚡
                        </div>
                    </div>
                </Card>

                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">Win Rate</p>
                            <p className="text-3xl font-bold text-[var(--accent-green)]">{stats.winRate}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[var(--accent-green)]/20 flex items-center justify-center text-2xl">
                            🎯
                        </div>
                    </div>
                </Card>

                <Card className="!p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] mb-1">Bu Ay Kar</p>
                            <p className="text-3xl font-bold text-[var(--accent-gold)]">+{stats.totalProfit}₺</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-[var(--accent-gold)]/20 flex items-center justify-center text-2xl">
                            💰
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Link to="/signals">
                    <Card className="!p-5 cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-[var(--accent-green)]/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                ⚽
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Canlı Sinyaller</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Gerçek zamanlı maç sinyallerini gör</p>
                            </div>
                        </div>
                    </Card>
                </Link>

                <Link to="/coupons">
                    <Card className="!p-5 cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-[var(--accent-purple)]/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                🎫
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">Kupon Oluştur</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Sinyalleri birleştir, kupon oluştur</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>

            {/* Recent Signals */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Son Sinyaller</h3>
                    <Link to="/history" className="text-sm text-[var(--accent-blue)] hover:underline">
                        Tümünü Gör →
                    </Link>
                </div>

                <div className="space-y-3">
                    {recentSignals.map((signal) => (
                        <Card key={signal.id} className="!p-4" hover={false}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-2xl">{signal.status === 'WON' ? '🟢' : signal.status === 'LOST' ? '🔴' : '🟡'}</div>
                                    <div>
                                        <p className="font-semibold">{signal.match}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{signal.market} • {signal.time}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-[var(--accent-green)]">{signal.confidence}%</span>
                                    {getStatusBadge(signal.status)}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Upgrade CTA for Free Users */}
            {user?.plan === 'free' && (
                <Card className="!p-6 mt-8 bg-gradient-to-r from-[var(--accent-purple)]/10 to-[var(--accent-blue)]/10 border-[var(--accent-purple)]/30">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold mb-1">🚀 Pro'ya Yükselt</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Günlük sadece 3 sinyal alıyorsun. Pro ile sınırsız sinyal + kupon özelliği!
                            </p>
                        </div>
                        <Link to="/pricing">
                            <Button variant="primary">
                                Planları Gör
                            </Button>
                        </Link>
                    </div>
                </Card>
            )}
        </DashboardLayout>
    );
};

export default Dashboard;
