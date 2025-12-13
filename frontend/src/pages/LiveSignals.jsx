import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout';
import { Card, Badge, Button, Spinner } from '../components/ui';
import { API_URL } from '../config';

const LiveSignals = () => {
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // Connect to SSE stream
        const eventSource = new EventSource(`${API_URL}/api/signals/stream`);

        eventSource.onmessage = (event) => {
            try {
                const signal = JSON.parse(event.data);
                setSignals((prev) => {
                    // Check if signal already exists
                    const exists = prev.find(s => s.id === signal.id);
                    if (exists) {
                        return prev.map(s => s.id === signal.id ? signal : s);
                    }
                    return [signal, ...prev].slice(0, 20); // Keep last 20
                });
            } catch (err) {
                console.error('SSE parse error:', err);
            }
        };

        eventSource.onerror = () => {
            setLoading(false);
            // Load mock data for demo
            loadMockSignals();
        };

        // Cleanup
        return () => eventSource.close();
    }, []);

    const loadMockSignals = () => {
        setSignals([
            {
                id: '1',
                home: 'Real Madrid',
                away: 'Barcelona',
                score: '1-0',
                elapsed: 35,
                strategy: 'FIRST_HALF',
                confidence: 85,
                reason: 'Corner Siege (+5 köşe 10dk)',
                league: 'La Liga',
                isNew: true
            },
            {
                id: '2',
                home: 'Man City',
                away: 'Liverpool',
                score: '0-0',
                elapsed: 42,
                strategy: 'FIRST_HALF',
                confidence: 78,
                reason: 'Shooting Threat (+3 SoT)',
                league: 'Premier League',
                isNew: false
            },
            {
                id: '3',
                home: 'Bayern',
                away: 'Dortmund',
                score: '2-1',
                elapsed: 67,
                strategy: 'LATE_GAME',
                confidence: 82,
                reason: 'xG Spike (+0.8)',
                league: 'Bundesliga',
                isNew: false
            }
        ]);
        setLoading(false);
    };

    const getStrategyBadge = (strategy) => {
        return strategy === 'FIRST_HALF'
            ? <Badge variant="info">1. Yarı</Badge>
            : <Badge variant="warning">Geç Gol</Badge>;
    };

    const filteredSignals = filter === 'all'
        ? signals
        : signals.filter(s => {
            if (filter === 'first_half') return s.strategy === 'FIRST_HALF';
            if (filter === 'late_game') return s.strategy === 'LATE_GAME';
            return true;
        });

    return (
        <DashboardLayout title="Canlı Sinyaller">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-[var(--text-secondary)]">
                        Gerçek zamanlı maç sinyalleri • Otomatik güncellenir
                    </p>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                                ? 'bg-[var(--accent-green)] text-black'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white'
                            }`}
                    >
                        Tümü
                    </button>
                    <button
                        onClick={() => setFilter('first_half')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'first_half'
                                ? 'bg-[var(--accent-blue)] text-white'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white'
                            }`}
                    >
                        1. Yarı
                    </button>
                    <button
                        onClick={() => setFilter('late_game')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'late_game'
                                ? 'bg-[var(--accent-gold)] text-black'
                                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white'
                            }`}
                    >
                        Geç Gol
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            )}

            {/* No Signals */}
            {!loading && filteredSignals.length === 0 && (
                <Card className="!p-12 text-center">
                    <div className="text-6xl mb-4">📡</div>
                    <h3 className="text-xl font-bold mb-2">Sinyal Bekleniyor...</h3>
                    <p className="text-[var(--text-secondary)]">
                        Şu an aktif sinyal yok. Maçlar başladığında burada göreceksin.
                    </p>
                </Card>
            )}

            {/* Signal Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredSignals.map((signal) => (
                    <Card
                        key={signal.id}
                        className={`!p-5 ${signal.isNew ? 'border-[var(--accent-green)] animate-pulse' : ''}`}
                        glow={signal.isNew}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                {getStrategyBadge(signal.strategy)}
                                <span className="text-sm text-[var(--text-muted)]">{signal.league}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 rounded bg-[var(--bg-tertiary)] text-sm mono">
                                    {signal.elapsed}'
                                </span>
                                {signal.isNew && (
                                    <span className="px-2 py-1 rounded-full bg-[var(--accent-green)] text-black text-xs font-bold">
                                        YENİ
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Teams */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-lg font-bold">{signal.home}</p>
                                <p className="text-lg font-bold">{signal.away}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold mono">{signal.score}</p>
                            </div>
                        </div>

                        {/* Confidence & Reason */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                            <div>
                                <p className="text-xs text-[var(--text-muted)] mb-1">Sinyal</p>
                                <p className="text-sm">{signal.reason}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-[var(--text-muted)] mb-1">Güven</p>
                                <p className="text-2xl font-bold text-[var(--accent-green)]">{signal.confidence}%</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                            <Button variant="primary" size="sm" className="flex-1">
                                Kupona Ekle
                            </Button>
                            <Button variant="secondary" size="sm">
                                Detay
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default LiveSignals;
