import { useState } from 'react';
import { DashboardLayout } from '../components/layout';
import { Card, Button, Badge, Input } from '../components/ui';

const CouponBuilder = () => {
    const [selections, setSelections] = useState([
        { id: 1, match: 'Real Madrid vs Barcelona', market: 'Gol Var', odds: 1.45, confidence: 85 },
        { id: 2, match: 'Man City vs Liverpool', market: 'Gol Var', odds: 1.52, confidence: 78 }
    ]);
    const [stake, setStake] = useState(100);

    const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
    const potentialWin = (stake * totalOdds).toFixed(2);
    const avgConfidence = selections.length > 0
        ? (selections.reduce((acc, s) => acc + s.confidence, 0) / selections.length).toFixed(0)
        : 0;

    const removeSelection = (id) => {
        setSelections(selections.filter(s => s.id !== id));
    };

    const clearAll = () => {
        setSelections([]);
    };

    return (
        <DashboardLayout title="Kupon Oluştur">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Selections */}
                <div className="lg:col-span-2">
                    <Card hover={false}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Seçimler ({selections.length})</h3>
                            {selections.length > 0 && (
                                <button
                                    onClick={clearAll}
                                    className="text-sm text-[var(--accent-red)] hover:underline"
                                >
                                    Tümünü Sil
                                </button>
                            )}
                        </div>

                        {selections.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">🎫</div>
                                <h4 className="text-lg font-semibold mb-2">Kupon Boş</h4>
                                <p className="text-[var(--text-secondary)]">
                                    Canlı sinyallerden seçim ekle
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selections.map((selection) => (
                                    <div
                                        key={selection.id}
                                        className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)] group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--accent-green)]/20 flex items-center justify-center">
                                                <span className="text-[var(--accent-green)] font-bold">{selection.confidence}%</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold">{selection.match}</p>
                                                <p className="text-sm text-[var(--text-secondary)]">{selection.market}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold mono text-lg">{selection.odds}</span>
                                            <button
                                                onClick={() => removeSelection(selection.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)] transition-all"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Summary */}
                <div>
                    <Card hover={false} className="sticky top-24">
                        <h3 className="text-lg font-semibold mb-4">Kupon Özeti</h3>

                        {/* Odds */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-secondary)]">Toplam Oran</span>
                                <span className="text-xl font-bold mono">{totalOdds.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[var(--text-secondary)]">Ort. Güven</span>
                                <Badge variant={avgConfidence >= 80 ? 'success' : avgConfidence >= 60 ? 'warning' : 'danger'}>
                                    {avgConfidence}%
                                </Badge>
                            </div>
                        </div>

                        {/* Stake Input */}
                        <div className="mb-6">
                            <label className="block text-sm text-[var(--text-secondary)] mb-2">Yatırım (₺)</label>
                            <Input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(Number(e.target.value))}
                                min={1}
                            />
                        </div>

                        {/* Potential Win */}
                        <div className="p-4 rounded-lg bg-gradient-to-r from-[var(--accent-green)]/20 to-[var(--accent-blue)]/20 mb-6">
                            <p className="text-sm text-[var(--text-secondary)] mb-1">Potansiyel Kazanç</p>
                            <p className="text-3xl font-bold text-[var(--accent-green)]">{potentialWin}₺</p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Button variant="primary" className="w-full" disabled={selections.length === 0}>
                                Kuponu Kaydet
                            </Button>
                            <Button variant="secondary" className="w-full" disabled={selections.length === 0}>
                                Paylaş
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default CouponBuilder;
