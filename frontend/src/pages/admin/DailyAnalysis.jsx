import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout';
import { Card, Badge, Button, Spinner } from '../../components/ui';
import useApi from '../../hooks/useApi';

const DailyAnalysis = () => {
    const { get, post } = useApi();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        loadCandidates();
    }, []);

    const loadCandidates = async () => {
        // Mock data - would come from API
        setTimeout(() => {
            setCandidates([
                { id: '1', match: 'Real Madrid vs Barcelona', market: 'Over 2.5', confidence: 85, league: 'La Liga', time: '21:00', status: 'pending' },
                { id: '2', match: 'Man City vs Liverpool', market: '1X DC', confidence: 78, league: 'Premier League', time: '18:30', status: 'pending' },
                { id: '3', match: 'Bayern vs Dortmund', market: 'Over 2.5', confidence: 82, league: 'Bundesliga', time: '20:30', status: 'approved' },
                { id: '4', match: 'PSG vs Marseille', market: 'Home O1.5', confidence: 75, league: 'Ligue 1', time: '21:00', status: 'rejected' }
            ]);
            setLoading(false);
        }, 500);
    };

    const handleRunAnalysis = async () => {
        setRunning(true);
        // Would call API to run analysis
        setTimeout(() => {
            setRunning(false);
            loadCandidates();
        }, 2000);
    };

    const handleApprove = (id) => {
        setCandidates(candidates.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    };

    const handleReject = (id) => {
        setCandidates(candidates.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
    };

    const handleApproveAll = () => {
        setCandidates(candidates.map(c => c.status === 'pending' ? { ...c, status: 'approved' } : c));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved': return <Badge variant="success">Onaylandı</Badge>;
            case 'rejected': return <Badge variant="danger">Reddedildi</Badge>;
            default: return <Badge variant="warning">Bekliyor</Badge>;
        }
    };

    const pendingCount = candidates.filter(c => c.status === 'pending').length;

    return (
        <DashboardLayout title="Günlük Analiz">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-[var(--text-secondary)]">
                        Pre-match analiz sonuçları • Admin onayı gerekir
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleRunAnalysis} loading={running}>
                        🔄 Analizi Çalıştır
                    </Button>
                    {pendingCount > 0 && (
                        <Button variant="primary" onClick={handleApproveAll}>
                            ✓ Tümünü Onayla ({pendingCount})
                        </Button>
                    )}
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Spinner size="lg" />
                </div>
            )}

            {/* Candidates */}
            {!loading && (
                <div className="space-y-4">
                    {candidates.map((candidate) => (
                        <Card key={candidate.id} className="!p-5" hover={false}>
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--accent-green)]/20 flex items-center justify-center">
                                        <span className="text-[var(--accent-green)] font-bold">{candidate.confidence}%</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold">{candidate.match}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            {candidate.league} • {candidate.time}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge variant="info">{candidate.market}</Badge>
                                    {getStatusBadge(candidate.status)}

                                    {candidate.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={() => handleApprove(candidate.id)}
                                            >
                                                ✓ Onayla
                                            </Button>
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleReject(candidate.id)}
                                            >
                                                ✕ Reddet
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}

                    {candidates.length === 0 && (
                        <Card className="!p-12 text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h3 className="text-xl font-bold mb-2">Analiz Sonucu Yok</h3>
                            <p className="text-[var(--text-secondary)]">
                                Günlük analizi çalıştırarak sonuçları görüntüleyebilirsiniz.
                            </p>
                        </Card>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
};

export default DailyAnalysis;
