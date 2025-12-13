import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Save, Plus, Wallet, Zap, Trophy, TrendingUp } from 'lucide-react';
import { Button } from './ui/Button';

// Draggable Item Component
function DraggableMatch({ match, id }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: id, data: { match } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-slate-800 p-3 mb-2 rounded border border-slate-700 cursor-grab hover:border-blue-500 group touch-none">
            <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                    <GripVertical className="text-slate-500 w-4 h-4" />
                    <span className="font-bold text-white">{match.home_team}</span>
                    <span className="text-slate-400">vs</span>
                    <span className="font-bold text-white">{match.away_team}</span>
                </div>
                <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-blue-400">
                    {match.prediction}
                </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>{match.league}</span>
                <span className="text-emerald-400 font-bold">{match.prob}% Güven</span>
            </div>
        </div>
    );
}

// Drop Zone (Coupon) Component
function CouponContainer({ id, title, matches, totalOdds, onRemove, onSave, onOddsChange }) {
    const { setNodeRef } = useSortable({ id: id });

    return (
        <div ref={setNodeRef} className="bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-700 min-h-[300px] flex flex-col relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-200 flex items-center gap-2">
                    {id === 'coupon-1' && <Wallet className="text-emerald-400 w-4 h-4" />}
                    {id === 'coupon-2' && <Zap className="text-yellow-400 w-4 h-4" />}
                    {id === 'coupon-3' && <Trophy className="text-purple-400 w-4 h-4" />}
                    {id === 'coupon-4' && <TrendingUp className="text-blue-400 w-4 h-4" />}
                    {title}
                </h3>
                <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                    <span className="text-slate-400 text-xs">Oran:</span>
                    <input
                        type="number"
                        value={totalOdds}
                        onChange={(e) => onOddsChange(id, e.target.value)}
                        className="w-16 bg-transparent text-right text-emerald-400 font-bold focus:outline-none"
                        step="0.01"
                    />
                </div>
            </div>

            <div className="flex-1 space-y-2">
                {matches.map((match) => (
                    <div key={match.id} className="bg-slate-800 p-2 rounded flex justify-between items-center group border border-slate-700">
                        <div className="text-xs text-slate-300">
                            {match.home_team} - {match.away_team} <span className="text-blue-400 ml-1">[{match.prediction}]</span>
                        </div>
                        <button onClick={() => onRemove(id, match.id)} className="text-slate-500 hover:text-red-400">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {matches.length === 0 && (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                        Maçları buraya sürükle
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
                <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => onSave(id)}
                    disabled={matches.length === 0}
                >
                    <Save size={14} className="mr-2" /> Yayınla
                </Button>
            </div>
        </div>
    );
}

export default function CouponBuilder() {
    const [candidates, setCandidates] = useState([]);
    const [coupons, setCoupons] = useState({
        'coupon-1': { title: 'Günün Kasası', matches: [], odds: 2.15 },
        'coupon-2': { title: 'Yüksek Oran (Sürpriz)', matches: [], odds: 5.50 },
        'coupon-3': { title: 'Haftanın Bombası', matches: [], odds: 12.00 },
        'coupon-4': { title: 'Sistem Kuponu', matches: [], odds: 3.40 }
    });
    const [activeDragId, setActiveDragId] = useState(null);
    const [activeDragItem, setActiveDragItem] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Fetch Candidates Mock (Replace with API)
    useEffect(() => {
        // In production, fetch from /api/daily-analysis
        fetch('/api/daily-analysis?limit=150').then(res => res.json()).then(data => {
            // Flatten categories to get all unique matches
            const all = [];
            if (data.data) {
                ['over15', 'over25', 'homeOver15'].forEach(cat => {
                    if (data.data[cat]) data.data[cat].forEach(m => all.push({ ...m, prediction: cat.toUpperCase() }));
                });
            }
            setCandidates(all.slice(0, 15)); // Take top 15 for demo
        }).catch(() => {
            // Fallback Mock
            setCandidates([
                { id: 'm1', home_team: 'Galatasaray', away_team: 'Fenerbahçe', league: 'Süper Lig', prediction: 'KG VAR', prob: 88, odds: 1.70 },
                { id: 'm2', home_team: 'Man City', away_team: 'Arsenal', league: 'Premier League', prediction: 'MS 1', prob: 75, odds: 1.85 },
                { id: 'm3', home_team: 'Real Madrid', away_team: 'Sevilla', league: 'La Liga', prediction: '2.5 ÜST', prob: 82, odds: 1.60 },
                { id: 'm4', home_team: 'Bayern', away_team: 'Dortmund', league: 'Bundesliga', prediction: 'IY 1.5 ÜST', prob: 65, odds: 2.10 },
            ]);
        });
    }, []);

    const handleDragStart = (event) => {
        const { active } = event;
        setActiveDragId(active.id);
        const item = candidates.find(c => c.id === active.id) ||
            Object.values(coupons).flatMap(c => c.matches).find(m => m.id === active.id);
        setActiveDragItem(item);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragId(null);
        setActiveDragItem(null);

        if (!over) return;

        const sourceId = active.id;
        const targetContainerId = over.id;

        // Find source item
        const item = candidates.find(c => c.id === sourceId) ||
            Object.values(coupons).flatMap(c => c.matches).find(m => m.id === sourceId);

        if (!item) return;

        // Logic: Dragging from Candidates List -> Coupon
        if (targetContainerId.startsWith('coupon-')) {
            // Check if match already exists in target coupon
            if (coupons[targetContainerId].matches.find(m => m.id === item.id)) return;

            setCoupons(prev => {
                const newCoupons = { ...prev };
                newCoupons[targetContainerId].matches.push(item);
                // Auto calc odds (simplified multiplication)
                const currentOdds = parseFloat(newCoupons[targetContainerId].odds);
                const itemOdds = item.odds || 1.50; // default if missing
                newCoupons[targetContainerId].odds = (currentOdds * itemOdds > 50 ? currentOdds : (currentOdds * itemOdds)).toFixed(2);
                return newCoupons;
            });
        }
    };

    const handleRemoveFromCoupon = (couponId, matchId) => {
        setCoupons(prev => {
            const newCoupons = { ...prev };
            newCoupons[couponId].matches = newCoupons[couponId].matches.filter(m => m.id !== matchId);
            return newCoupons;
        });
    };

    const handleOddsChange = (couponId, newOdds) => {
        setCoupons(prev => ({
            ...prev,
            [couponId]: { ...prev[couponId], odds: newOdds }
        }));
    };

    const handleSaveCoupon = async (couponId) => {
        const coupon = coupons[couponId];
        try {
            const res = await fetch('/api/admin/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: JSON.stringify({
                    title: coupon.title,
                    matches: coupon.matches,
                    totalOdds: coupon.odds
                })
            });
            if (res.ok) {
                alert('Kupon yayınlandı! 🚀');
                // Clear coupon logic here if desired
            } else {
                alert('Hata oluştu.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-100px)]">
                {/* Left: Candidates */}
                <div className="lg:col-span-1 bg-slate-900/50 p-4 rounded-xl border border-slate-800 overflow-y-auto">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Plus className="text-blue-500" /> Analiz Maçları
                    </h2>
                    <div className="space-y-2">
                        <SortableContext items={candidates.map(c => c.id)} strategy={verticalListSortingStrategy}>
                            {candidates.map(match => (
                                <DraggableMatch key={match.id} id={match.id} match={match} />
                            ))}
                        </SortableContext>
                    </div>
                </div>

                {/* Right: Coupon Slots */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 auto-rows-min overflow-y-auto">
                    {Object.entries(coupons).map(([id, coupon]) => (
                        <CouponContainer
                            key={id}
                            id={id}
                            title={coupon.title}
                            matches={coupon.matches}
                            totalOdds={coupon.odds}
                            onRemove={handleRemoveFromCoupon}
                            onSave={handleSaveCoupon}
                            onOddsChange={handleOddsChange}
                        />
                    ))}
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeDragItem ? (
                    <div className="bg-slate-800 p-3 rounded border border-blue-500 shadow-xl w-64 opacity-90 cursor-grabbing">
                        <div className="font-bold text-white">{activeDragItem.home_team} vs {activeDragItem.away_team}</div>
                        <div className="text-sm text-blue-400">{activeDragItem.prediction}</div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
