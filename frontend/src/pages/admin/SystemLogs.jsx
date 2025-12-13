import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, Button, Spinner, Input } from '../../components/ui';
import useApi from '../../hooks/useApi';

const SystemLogs = () => {
    const { get } = useApi();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        const result = await get('/api/admin/logs');
        if (result.success) {
            setLogs(result.data.logs || []);
        } else {
            // Mock data
            setLogs([
                { id: 1, level: 'info', message: 'Canlı bot başlatıldı', timestamp: new Date().toISOString() },
                { id: 2, level: 'success', message: 'Sinyal gönderildi: Real Madrid vs Barcelona', timestamp: new Date().toISOString() },
                { id: 3, level: 'warn', message: 'API rate limit yaklaşıyor (28/30)', timestamp: new Date().toISOString() },
                { id: 4, level: 'error', message: 'H2H fetch failed: timeout', timestamp: new Date().toISOString() },
                { id: 5, level: 'info', message: 'Maç analizi tamamlandı: 5 aday', timestamp: new Date().toISOString() },
                { id: 6, level: 'success', message: 'Kupon kaydedildi: user_123', timestamp: new Date().toISOString() }
            ]);
        }
        setLoading(false);
    };

    const getLevelBadge = (level) => {
        switch (level) {
            case 'success': return <Badge variant="success">SUCCESS</Badge>;
            case 'error': return <Badge variant="danger">ERROR</Badge>;
            case 'warn': return <Badge variant="warning">WARN</Badge>;
            default: return <Badge variant="info">INFO</Badge>;
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesFilter = filter === 'all' || log.level === filter;
        const matchesSearch = log.message?.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <DashboardLayout title="Sistem Logları">
            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex gap-2">
                    {['all', 'info', 'success', 'warn', 'error'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setFilter(level)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === level
                                    ? 'bg-[var(--accent-green)] text-black'
                                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                                }`}
                        >
                            {level.toUpperCase()}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Log ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="!w-48"
                    />
                    <Button variant="secondary" onClick={loadLogs}>
                        🔄 Yenile
                    </Button>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            )}

            {/* Logs */}
            {!loading && (
                <Card hover={false} className="!p-0 overflow-hidden">
                    <div className="max-h-[600px] overflow-y-auto">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-[var(--text-muted)]">Log bulunamadı</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-color)]">
                                {filteredLogs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start gap-4 p-4 hover:bg-[var(--bg-tertiary)] transition-colors"
                                    >
                                        <div className="w-20 flex-shrink-0">
                                            {getLevelBadge(log.level)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm mono break-all">{log.message}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-xs text-[var(--text-muted)] mono">
                                            {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* Stats */}
            <div className="flex gap-4 mt-4 text-sm text-[var(--text-muted)]">
                <span>Toplam: {logs.length}</span>
                <span>Gösterilen: {filteredLogs.length}</span>
            </div>
        </DashboardLayout>
    );
};

export default SystemLogs;
