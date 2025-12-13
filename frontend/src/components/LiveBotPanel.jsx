import React, { useState, useEffect, useRef } from 'react';
import { BASE_URL } from '../config';

function LiveBotPanel() {
    const [status, setStatus] = useState({ running: false, lastScan: null, matchesProcessed: 0 });
    const [signals, setSignals] = useState([]);
    const [logs, setLogs] = useState([]);
    const [config, setConfig] = useState({
        momentumThresholds: { CORNER_SIEGE: 3, SHOT_SURGE: 4, SOT_THREAT: 2, DA_PRESSURE: 8, XG_SPIKE: 0.4 },
        minConfidence: 60,
        scanInterval: 60
    });
    const [activeSubTab, setActiveSubTab] = useState('status');
    const logsEndRef = useRef(null);

    // Fetch status and signals
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statusRes, signalsRes] = await Promise.all([
                    fetch(`${BASE_URL}/api/status`, { credentials: 'include' }),
                    fetch(`${BASE_URL}/api/signals`, { credentials: 'include' })
                ]);
                if (statusRes.ok) setStatus(await statusRes.json());
                if (signalsRes.ok) setSignals(await signalsRes.json());
            } catch (e) {
                console.error('Fetch error:', e);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    // Fetch logs
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/logs?limit=100`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data.logs || []);
                }
            } catch (e) {
                console.error('Logs fetch error:', e);
            }
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Mark signal result (WON/LOST)
    const markResult = async (signalId, result) => {
        try {
            const res = await fetch(`${BASE_URL}/api/signals/${signalId}/result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ result })
            });
            if (res.ok) {
                setSignals(prev => prev.map(s =>
                    s.id === signalId ? { ...s, result } : s
                ));
            }
        } catch (e) {
            console.error('Mark result error:', e);
        }
    };

    // Reset all signal stats
    const resetStats = async () => {
        if (!window.confirm('Tüm sinyal geçmişini sıfırlamak istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${BASE_URL}/api/signals/reset`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                setSignals([]);
            }
        } catch (e) {
            console.error('Reset stats error:', e);
        }
    };

    const subTabs = [
        { id: 'status', label: 'Durum', icon: '🔴' },
        { id: 'signals', label: 'Sinyaller', icon: '📡' },
        { id: 'history', label: 'Geçmiş', icon: '📊' },
        { id: 'filters', label: 'Filtreler', icon: '🎛️' },
        { id: 'logs', label: 'Loglar', icon: '📜' },
    ];

    return (
        <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex gap-2 border-b border-gray-800 pb-4">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${activeSubTab === tab.id
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Status Panel */}
            {activeSubTab === 'status' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatusCard
                        title="Bot Durumu"
                        value={status.running ? 'AKTİF' : 'BEKLEMEDE'}
                        color={status.running ? 'green' : 'yellow'}
                        icon="🔴"
                    />
                    <StatusCard
                        title="Son Tarama"
                        value={status.lastScan ? new Date(status.lastScan).toLocaleTimeString('tr-TR') : 'Henüz yok'}
                        color="blue"
                        icon="⏱️"
                    />
                    <StatusCard
                        title="İşlenen Maç"
                        value={status.matchesProcessed || 0}
                        color="purple"
                        icon="⚽"
                    />
                    <StatusCard
                        title="Bugün Sinyal"
                        value={signals.filter(s => isToday(s.timestamp)).length}
                        color="orange"
                        icon="📡"
                    />
                    <StatusCard
                        title="Kazanan"
                        value={signals.filter(s => s.result === 'WON').length}
                        color="green"
                        icon="✅"
                    />
                    <StatusCard
                        title="Kaybeden"
                        value={signals.filter(s => s.result === 'LOST').length}
                        color="red"
                        icon="❌"
                    />
                </div>
            )}

            {/* Signals Panel */}
            {activeSubTab === 'signals' && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Aktif Sinyaller</h3>
                    {signals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Henüz sinyal yok
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {signals.slice(0, 20).map((signal, i) => (
                                <SignalCard key={signal.id || i} signal={signal} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* History Panel */}
            {activeSubTab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                            <h3 className="text-lg font-semibold text-white">📊 Maç Geçmişi</h3>
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                    ✅ {signals.filter(s => s.result === 'WON').length} WON
                                </span>
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                                    ❌ {signals.filter(s => s.result === 'LOST').length} LOST
                                </span>
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                                    ⏳ {signals.filter(s => !s.result || s.result === 'PENDING').length} PENDING
                                </span>
                                {signals.filter(s => s.result === 'WON' || s.result === 'LOST').length > 0 && (
                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">
                                        🎯 {Math.round((signals.filter(s => s.result === 'WON').length / signals.filter(s => s.result === 'WON' || s.result === 'LOST').length) * 100)}% WIN
                                    </span>
                                )}
                                <button
                                    onClick={resetStats}
                                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-all"
                                >
                                    🔄 Sıfırla
                                </button>
                            </div>
                        </div>
                    </div>

                    {signals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Henüz geçmiş maç yok
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {signals.map((signal, i) => (
                                <div key={signal.id || i} className={`bg-gray-800/50 border rounded-lg p-4 ${signal.result === 'WON' ? 'border-green-500/50' :
                                    signal.result === 'LOST' ? 'border-red-500/50' :
                                        'border-gray-700'
                                    }`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-white font-semibold">{signal.home} vs {signal.away}</div>
                                            <div className="text-gray-400 text-sm">{signal.league}</div>
                                        </div>
                                        <div className="text-right">
                                            {signal.result === 'WON' && <span className="text-green-400 font-bold">✅ WON</span>}
                                            {signal.result === 'LOST' && <span className="text-red-400 font-bold">❌ LOST</span>}
                                            {(!signal.result || signal.result === 'PENDING') && <span className="text-yellow-400">⏳ Bekliyor</span>}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 mt-2">
                                        <div>📍 {signal.strategyCode}</div>
                                        <div>💯 {signal.confidencePercent}%</div>
                                        <div>⏱️ {signal.elapsed}'</div>
                                        <div>📅 {signal.timestamp ? new Date(signal.timestamp).toLocaleDateString('tr-TR') : '-'}</div>
                                    </div>
                                    {/* Mark WON/LOST buttons */}
                                    {(!signal.result || signal.result === 'PENDING') && (
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => markResult(signal.id, 'WON')}
                                                className="flex-1 py-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 text-xs font-medium transition-all"
                                            >
                                                ✅ Kazandı
                                            </button>
                                            <button
                                                onClick={() => markResult(signal.id, 'LOST')}
                                                className="flex-1 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium transition-all"
                                            >
                                                ❌ Kaybetti
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Filters Panel */}
            {activeSubTab === 'filters' && (
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-white">Momentum Eşikleri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FilterInput label="Corner Siege" value={config.momentumThresholds.CORNER_SIEGE} suffix="korner" />
                        <FilterInput label="Shot Surge" value={config.momentumThresholds.SHOT_SURGE} suffix="şut" />
                        <FilterInput label="SoT Threat" value={config.momentumThresholds.SOT_THREAT} suffix="isabetli şut" />
                        <FilterInput label="DA Pressure" value={config.momentumThresholds.DA_PRESSURE} suffix="tehlikeli atak" />
                        <FilterInput label="xG Spike" value={config.momentumThresholds.XG_SPIKE} suffix="xG" />
                    </div>

                    <h3 className="text-lg font-semibold text-white mt-8">Genel Ayarlar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FilterInput label="Min Güven Skoru" value={config.minConfidence} suffix="%" />
                        <FilterInput label="Tarama Aralığı" value={config.scanInterval} suffix="saniye" />
                    </div>
                </div>
            )}

            {/* Logs Panel */}
            {activeSubTab === 'logs' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Canlı Loglar</h3>
                        <span className="text-sm text-gray-500">{logs.length} kayıt</span>
                    </div>
                    <div className="bg-gray-900 rounded-lg border border-gray-800 h-96 overflow-y-auto font-mono text-sm">
                        {logs.map((log, i) => (
                            <div
                                key={i}
                                className={`px-4 py-1 border-b border-gray-800/50 ${getLogColor(log.level)}`}
                            >
                                <span className="text-gray-500">{log.timestamp}</span>
                                <span className="ml-2">{log.message}</span>
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Components
function StatusCard({ title, value, color, icon }) {
    const colors = {
        green: 'from-green-500/20 to-green-600/10 border-green-500/30',
        red: 'from-red-500/20 to-red-600/10 border-red-500/30',
        blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
        yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30',
        purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
        orange: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-4`}>
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-gray-400 text-sm">{title}</div>
            <div className="text-white text-2xl font-bold">{value}</div>
        </div>
    );
}

function SignalCard({ signal }) {
    const getResultBadge = (result) => {
        if (result === 'WON') return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">✅ WON</span>;
        if (result === 'LOST') return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">❌ LOST</span>;
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">⏳ PENDING</span>;
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="text-white font-semibold">{signal.home} vs {signal.away}</div>
                    <div className="text-gray-400 text-sm">{signal.league}</div>
                </div>
                {getResultBadge(signal.result)}
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                <div>
                    <span className="text-gray-500">Strateji:</span>
                    <span className="text-white ml-2">{signal.strategyCode}</span>
                </div>
                <div>
                    <span className="text-gray-500">Güven:</span>
                    <span className="text-white ml-2">{signal.confidencePercent}%</span>
                </div>
                <div>
                    <span className="text-gray-500">Dakika:</span>
                    <span className="text-white ml-2">{signal.elapsed}'</span>
                </div>
            </div>
            {signal.reason && (
                <div className="mt-3 text-gray-400 text-xs bg-gray-900/50 rounded p-2">
                    {signal.reason}
                </div>
            )}
        </div>
    );
}

function FilterInput({ label, value, suffix, onChange }) {
    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <label className="block text-gray-400 text-sm mb-2">{label}</label>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    value={value}
                    onChange={onChange}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                />
                <span className="text-gray-500 text-sm">{suffix}</span>
            </div>
        </div>
    );
}

function getLogColor(level) {
    switch (level) {
        case 'error': return 'text-red-400';
        case 'warn': return 'text-yellow-400';
        case 'success': return 'text-green-400';
        case 'gemini': return 'text-purple-400';
        default: return 'text-gray-300';
    }
}

function isToday(timestamp) {
    if (!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

export default LiveBotPanel;
