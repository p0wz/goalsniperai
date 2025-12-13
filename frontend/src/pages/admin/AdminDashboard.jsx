import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, Spinner } from '../../components/ui';
import useApi from '../../hooks/useApi';

const AdminDashboard = () => {
    const { get } = useApi();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const result = await get('/api/admin/stats');
        if (result.success) {
            setStats(result.data.stats);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <DashboardLayout title="Admin Dashboard">
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Admin Dashboard">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="!p-5" hover={false}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Toplam Kullanıcı</p>
                            <p className="text-3xl font-bold">{stats?.total_users || 0}</p>
                        </div>
                        <div className="text-3xl">👥</div>
                    </div>
                </Card>

                <Card className="!p-5" hover={false}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Pro Üyeler</p>
                            <p className="text-3xl font-bold text-[var(--accent-gold)]">{stats?.pro_users || 0}</p>
                        </div>
                        <div className="text-3xl">⭐</div>
                    </div>
                </Card>

                <Card className="!p-5" hover={false}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Premium Üyeler</p>
                            <p className="text-3xl font-bold text-[var(--accent-purple)]">{stats?.premium_users || 0}</p>
                        </div>
                        <div className="text-3xl">💎</div>
                    </div>
                </Card>

                <Card className="!p-5" hover={false}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Aylık Gelir</p>
                            <p className="text-3xl font-bold text-[var(--accent-green)]">{stats?.revenue_monthly || 0}₺</p>
                        </div>
                        <div className="text-3xl">💰</div>
                    </div>
                </Card>
            </div>

            {/* Activity Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <Card className="!p-5" hover={false}>
                    <h3 className="font-semibold mb-4">Aktivite</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)]">Son 24 Saat Aktif</span>
                            <Badge variant="success">{stats?.active_last_24h || 0} kullanıcı</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[var(--text-secondary)]">Son 7 Gün Kayıt</span>
                            <Badge variant="info">{stats?.new_last_7d || 0} yeni</Badge>
                        </div>
                    </div>
                </Card>

                <Card className="!p-5" hover={false}>
                    <h3 className="font-semibold mb-4">Plan Dağılımı</h3>
                    <div className="flex gap-2">
                        <div className="flex-1 p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
                            <p className="text-lg font-bold">{stats?.free_users || 0}</p>
                            <p className="text-xs text-[var(--text-muted)]">Free</p>
                        </div>
                        <div className="flex-1 p-3 rounded-lg bg-[var(--accent-gold)]/20 text-center">
                            <p className="text-lg font-bold text-[var(--accent-gold)]">{stats?.pro_users || 0}</p>
                            <p className="text-xs text-[var(--text-muted)]">Pro</p>
                        </div>
                        <div className="flex-1 p-3 rounded-lg bg-[var(--accent-purple)]/20 text-center">
                            <p className="text-lg font-bold text-[var(--accent-purple)]">{stats?.premium_users || 0}</p>
                            <p className="text-xs text-[var(--text-muted)]">Premium</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <h3 className="font-semibold mb-4">Hızlı Erişim</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link to="/admin/users">
                    <Card className="!p-5 cursor-pointer group">
                        <div className="text-center">
                            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">👥</div>
                            <p className="font-semibold">Kullanıcılar</p>
                        </div>
                    </Card>
                </Link>

                <Link to="/admin/analysis">
                    <Card className="!p-5 cursor-pointer group">
                        <div className="text-center">
                            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📈</div>
                            <p className="font-semibold">Günlük Analiz</p>
                        </div>
                    </Card>
                </Link>

                <Link to="/admin/logs">
                    <Card className="!p-5 cursor-pointer group">
                        <div className="text-center">
                            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                            <p className="font-semibold">Sistem Logları</p>
                        </div>
                    </Card>
                </Link>

                <Link to="/signals">
                    <Card className="!p-5 cursor-pointer group">
                        <div className="text-center">
                            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">⚡</div>
                            <p className="font-semibold">Canlı Sinyaller</p>
                        </div>
                    </Card>
                </Link>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
