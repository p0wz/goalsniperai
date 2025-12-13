import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../config';

function DailyAnalystPanel() {
    const [candidates, setCandidates] = useState({
        over25: [],
        doubleChance: [],
        homeOver15: [],
        under35: [],
        under25: []
    });
    const [isRunning, setIsRunning] = useState(false);
    const [analysisLimit, setAnalysisLimit] = useState(150);
    const [logs, setLogs] = useState([]);
    const [activeSubTab, setActiveSubTab] = useState('run');
    const [selectedMarket, setSelectedMarket] = useState('all');

    // Fetch existing candidates on load
    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/daily-analysis`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setCandidates(data);
            }
        } catch (e) {
            console.error('Fetch candidates error:', e);
        }
    };

    const runAnalysis = async () => {
        setIsRunning(true);
        setLogs([{ time: new Date().toLocaleTimeString(), msg: '🚀 Analiz başlatılıyor...' }]);

        try {
            const eventSource = new EventSource(`${BASE_URL}/api/daily-analysis/stream?limit=${analysisLimit}`);

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: data.message }]);
                } else if (data.type === 'complete') {
                    setCandidates(data.candidates);
                    setIsRunning(false);
                    eventSource.close();
                }
            };

            eventSource.onerror = () => {
                setIsRunning(false);
                eventSource.close();
                setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: '❌ Bağlantı hatası' }]);
            };
        } catch (e) {
            setIsRunning(false);
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `❌ Hata: ${e.message}` }]);
        }
    };

    const approveSignal = async (id) => {
        try {
            const res = await fetch(`${BASE_URL}/api/daily-analysis/approve/${id}`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                fetchCandidates();
            }
        } catch (e) {
            console.error('Approve error:', e);
        }
    };

    const rejectSignal = async (id) => {
        try {
            const res = await fetch(`${BASE_URL}/api/daily-analysis/reject/${id}`, { method: 'POST', credentials: 'include' });
            if (res.ok) {
                fetchCandidates();
            }
        } catch (e) {
            console.error('Reject error:', e);
        }
    };

    // Count all candidates
    const totalCandidates = Object.values(candidates).reduce((sum, arr) => sum + (arr?.length || 0), 0);

    const markets = [
        { id: 'all', label: 'Tümü', count: totalCandidates },
        { id: 'over25', label: 'Over 2.5', count: candidates.over25?.length || 0 },
        { id: 'doubleChance', label: '1X DC', count: candidates.doubleChance?.length || 0 },
        { id: 'homeOver15', label: 'Home O1.5', count: candidates.homeOver15?.length || 0 },
        { id: 'under35', label: 'Under 3.5', count: candidates.under35?.length || 0 },
        { id: 'under25', label: 'Under 2.5', count: candidates.under25?.length || 0 },
    ];

    const subTabs = [
        { id: 'run', label: 'Analiz Başlat', icon: '▶️' },
        { id: 'candidates', label: 'Adaylar', icon: '📋' },
        { id: 'history', label: 'Geçmiş', icon: '📊' },
    ];

    // Get filtered candidates
    const getFilteredCandidates = () => {
        if (selectedMarket === 'all') {
            return Object.entries(candidates).flatMap(([market, items]) =>
                (items || []).map(item => ({ ...item, marketKey: market }))
            );
        }
        return (candidates[selectedMarket] || []).map(item => ({ ...item, marketKey: selectedMarket }));
    };

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex gap-2 border-b border-gray-800 pb-4">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === tab.id
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Run Analysis Panel */}
            {activeSubTab === 'run' && (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">📊 Günlük Analiz Başlat</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2">Maç Limiti</label>
                                <input
                                    type="number"
                                    value={analysisLimit}
                                    onChange={(e) => setAnalysisLimit(parseInt(e.target.value) || 50)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                                    min={10}
                                    max={300}
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={runAnalysis}
                                    disabled={isRunning}
                                    className={`w-full py-3 rounded-lg font-semibold transition-all ${isRunning
                                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                                        }`}
                                >
                                    {isRunning ? '⏳ Analiz Devam Ediyor...' : '▶️ Analiz Başlat'}
                                </button>
                            </div>
                        </div>

                        {/* Logs */}
                        {logs.length > 0 && (
                            <div className="bg-gray-900 rounded-lg border border-gray-800 h-64 overflow-y-auto font-mono text-sm">
                                {logs.map((log, i) => (
                                    <div key={i} className="px-4 py-1 text-gray-300 border-b border-gray-800/50">
                                        <span className="text-gray-500">[{log.time}]</span>
                                        <span className="ml-2">{log.msg}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Candidates Panel */}
            {activeSubTab === 'candidates' && (
                <div className="space-y-4">
                    {/* Market Filter */}
                    <div className="flex flex-wrap gap-2">
                        {markets.map(market => (
                            <button
                                key={market.id}
                                onClick={() => setSelectedMarket(market.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedMarket === market.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-800 text-gray-400 hover:text-white'
                                    }`}
                            >
                                {market.label} <span className="ml-1 opacity-60">({market.count})</span>
                            </button>
                        ))}
                    </div>

                    {/* Candidates List */}
                    <div className="space-y-3">
                        {getFilteredCandidates().length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                Henüz aday yok. Analiz başlatın.
                            </div>
                        ) : (
                            getFilteredCandidates().map((candidate, i) => (
                                <CandidateCard
                                    key={candidate.id || i}
                                    candidate={candidate}
                                    onApprove={() => approveSignal(candidate.id)}
                                    onReject={() => rejectSignal(candidate.id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* History Panel */}
            {activeSubTab === 'history' && (
                <div className="text-center py-12 text-gray-500">
                    📊 Geçmiş analiz verileri yakında...
                </div>
            )}
        </div>
    );
}

// Candidate Card Component
function CandidateCard({ candidate, onApprove, onReject }) {
    const marketColors = {
        over25: 'border-green-500/50 bg-green-500/10',
        doubleChance: 'border-blue-500/50 bg-blue-500/10',
        homeOver15: 'border-orange-500/50 bg-orange-500/10',
        under35: 'border-purple-500/50 bg-purple-500/10',
        under25: 'border-pink-500/50 bg-pink-500/10',
    };

    return (
        <div className={`border rounded-lg p-4 ${marketColors[candidate.marketKey] || 'border-gray-700 bg-gray-800/50'}`}>
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="text-white font-semibold">
                        {candidate.event_home_team || candidate.match?.split(' vs ')[0]} vs {candidate.event_away_team || candidate.match?.split(' vs ')[1]}
                    </div>
                    <div className="text-gray-400 text-sm">{candidate.league}</div>
                </div>
                <span className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                    {candidate.market}
                </span>
            </div>

            {/* Stats */}
            {candidate.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-4">
                    <StatBadge label="Home O2.5" value={`${candidate.stats.homeForm?.over25Rate?.toFixed(0) || '-'}%`} />
                    <StatBadge label="Away O2.5" value={`${candidate.stats.awayForm?.over25Rate?.toFixed(0) || '-'}%`} />
                    <StatBadge label="H@H Scored" value={candidate.stats.homeHomeStats?.avgScored?.toFixed(1) || '-'} />
                    <StatBadge label="A@A Conceded" value={candidate.stats.awayAwayStats?.avgConceded?.toFixed(1) || '-'} />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={onApprove}
                    className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 font-medium text-sm transition-all"
                >
                    ✅ Onayla
                </button>
                <button
                    onClick={onReject}
                    className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium text-sm transition-all"
                >
                    ❌ Reddet
                </button>
            </div>
        </div>
    );
}

function StatBadge({ label, value }) {
    return (
        <div className="bg-gray-900/50 rounded px-2 py-1">
            <div className="text-gray-500">{label}</div>
            <div className="text-white font-medium">{value}</div>
        </div>
    );
}

export default DailyAnalystPanel;
