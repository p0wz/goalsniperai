import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout';
import { Card, Badge, Button, Spinner } from '../components/ui';

const SignalHistory = () => {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('week');

    useEffect(() => {
        loadHistory();
    }, [dateFilter]);

    const loadHistory = async () => {
        setLoading(true);
        // Mock data
        setTimeout(() => {
            setSignals([
                { id: 1, match: 'Real Madrid vs Barcelona', market: 'Gol Var', confidence: 85, status: 'WON', date: '2024-12-13', time: '15:30', odds: 1.45 },
                { id: 2, match: 'Man City vs Liverpool', market: 'Gol Var', confidence: 78, status: 'WON', date: '2024-12-13', time: '18:00', odds: 1.52 },
                { id: 3, match: 'Bayern vs Dortmund', market: 'Gol Var', confidence: 82, status: 'LOST', date: '2024-12-12', time: '20:45', odds: 1.38 },
                { id: 4, match: 'PSG vs Marseille', market: 'Gol Var', confidence: 88, status: 'WON', date: '2024-12-12', time: '21:00', odds: 1.55 },
                { id: 5, match: 'Juventus vs Inter', market: 'Gol Var', confidence: 75, status: 'LOST', date: '2024-12-11', time: '18:45', odds: 1.48 },
                { id: 6, match: 'Chelsea vs Arsenal', market: 'Gol Var', confidence: 80, status: 'WON', date: '2024-12-11', time: '17:30', odds: 1.42 }
            ]);
            setLoading(false);
        }, 500);
    };

    const filteredSignals = filter === 'all'
        ? signals
        : signals.filter(s => s.status === filter);

    const stats = {
        total: signals.length,
        won: signals.filter(s => s.status === 'WON').length,
        lost: signals.filter(s => s.status === 'LOST').length,
        winRate: signals.length > 0 ? ((signals.filter(s => s.status === 'WON').length / signals.length) * 100).toFixed(1) : 0
    };

    return (
        <DashboardLayout title="Sinyal Geçmişi">
            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="!p-4" hover={false}>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Toplam</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </Card>
                <Card className="!p-4" hover={false}>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Kazanan</p>
                    <p className="text-2xl font-bold text-[var(--accent-green)]">{stats.won}</p>
                </Card>
                <Card className="!p-4" hover={false}>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Kaybeden</p>
                    <p className="text-2xl font-bold text-[var(--accent-red)]">{stats.lost}</p>
                </Card>
                <Card className="!p-4" hover={false}>
                    <p className="text-xs text-[var(--text-muted)] mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-[var(--accent-gold)]">{stats.winRate}%</p>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => setFilter('WON')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'WON' ? 'bg-[var(--accent-green)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                    >
                        Kazanan
                    </button>
                    <button
                        onClick={() => setFilter('LOST')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'LOST' ? 'bg-[var(--accent-red)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                            }`}
                    >
                        Kaybeden
                    </button>
                </div>

                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="input !w-auto"
                >
                    <option value="today">Bugün</option>
                    <option value="week">Bu Hafta</option>
                    <option value="month">Bu Ay</option>
                    <option value="all">Tüm Zamanlar</option>
                </select>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            )}

            {/* Table */}
            {!loading && (
                <div className="table-container bg-[var(--bg-card)]">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Tarih</th>
                                <th>Maç</th>
                                <th>Market</th>
                                <th>Güven</th>
                                <th>Oran</th>
                                <th>Sonuç</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSignals.map((signal) => (
                                <tr key={signal.id}>
                                    <td>
                                        <p className="font-medium">{signal.date}</p>
                                        <p className="text-xs text-[var(--text-muted)]">{signal.time}</p>
                                    </td>
                                    <td className="font-medium">{signal.match}</td>
                                    <td>
                                        <Badge variant="info">{signal.market}</Badge>
                                    </td>
                                    <td>
                                        <span className="font-bold text-[var(--accent-green)]">{signal.confidence}%</span>
                                    </td>
                                    <td className="mono">{signal.odds}</td>
                                    <td>
                                        {signal.status === 'WON'
                                            ? <Badge variant="success">✓ Kazandı</Badge>
                                            : <Badge variant="danger">✗ Kaybetti</Badge>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Export Button */}
            <div className="mt-6 flex justify-end">
                <Button variant="secondary">
                    📥 CSV İndir
                </Button>
            </div>
        </DashboardLayout>
    );
};

export default SignalHistory;
