import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 📅 DAILY ANALYST - STANDALONE APPLICATION
// ============================================
// A dedicated interface for daily match analysis
// Features: Category filters, AI prompts, Delete, Run Analysis

// Category Configuration
const CATEGORIES = {
    over15: { label: 'Over 1.5', icon: '⚽', color: 'green' },
    over25: { label: 'Over 2.5', icon: '⚽⚽', color: 'emerald' },
    doubleChance: { label: '1X DC', icon: '🎯', color: 'blue' },
    homeOver15: { label: 'Home O1.5', icon: '🏠', color: 'cyan' },
    under35: { label: 'Under 3.5', icon: '🛡️', color: 'orange' },
    under25: { label: 'Under 2.5', icon: '🔒', color: 'red' }
};

export default function DailyAnalyst() {
    // State
    const [signals, setSignals] = useState({});
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Load signals from API
    const loadSignals = useCallback(async () => {
        try {
            setError(null);
            const res = await fetch(`${API_URL}/api/daily-analysis`, {
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error(`API Error: ${res.status}`);
            }

            const data = await res.json();

            if (data.success) {
                setSignals(data.data || {});
                setLastUpdated(new Date().toLocaleTimeString('tr-TR'));
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        } catch (err) {
            console.error('Load error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        loadSignals();
    }, [loadSignals]);

    // Run analysis
    const runAnalysis = async (limit = 100) => {
        try {
            setAnalyzing(true);
            setError(null);

            const res = await fetch(`${API_URL}/api/daily-analysis?force=true&limit=${limit}`, {
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error(`Analysis failed: ${res.status}`);
            }

            // Wait for analysis to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Reload signals
            await loadSignals();
        } catch (err) {
            setError(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    // Delete a signal
    const deleteSignal = (signalId, category) => {
        setSignals(prev => ({
            ...prev,
            [category]: (prev[category] || []).filter(s => s.id !== signalId)
        }));
    };

    // Clear entire category
    const clearCategory = (category) => {
        if (window.confirm(`"${CATEGORIES[category]?.label || category}" kategorisini temizlemek istiyor musunuz?`)) {
            setSignals(prev => ({ ...prev, [category]: [] }));
        }
    };

    // Calculate totals
    const allSignals = Object.entries(signals).flatMap(([cat, list]) =>
        (list || []).map(s => ({ ...s, _category: cat }))
    );
    const totalCount = allSignals.length;

    // Filter signals
    const displayedSignals = selectedCategory === 'all'
        ? allSignals
        : allSignals.filter(s => s._category === selectedCategory);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card border-b border-border sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                📅 Daily Analyst
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                {totalCount} sinyal bulundu
                                {lastUpdated && <span className="ml-2">• Son güncelleme: {lastUpdated}</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link to="/admin" className="text-sm text-muted-foreground hover:text-white transition-colors">
                                ← Admin Panel
                            </Link>
                            <button
                                onClick={() => runAnalysis(5)}
                                disabled={analyzing}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 text-sm rounded-lg transition-colors disabled:opacity-50"
                            >
                                Test (5)
                            </button>
                            <button
                                onClick={() => runAnalysis(100)}
                                disabled={analyzing}
                                className="px-4 py-2 bg-accent hover:bg-accent/80 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {analyzing ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analiz Ediliyor...
                                    </>
                                ) : (
                                    '🚀 Tam Analiz'
                                )}
                            </button>
                            <button
                                onClick={loadSignals}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 text-sm rounded-lg transition-colors"
                            >
                                🔄 Yenile
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Error Banner */}
            {error && (
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>❌ Hata: {error}</span>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-6">
                {/* Category Tabs */}
                <div className="flex gap-2 flex-wrap mb-6">
                    <CategoryTab
                        active={selectedCategory === 'all'}
                        onClick={() => setSelectedCategory('all')}
                        label={`Tümü (${totalCount})`}
                        color="gray"
                    />
                    {Object.entries(signals).map(([cat, list]) => (
                        <CategoryTab
                            key={cat}
                            active={selectedCategory === cat}
                            onClick={() => setSelectedCategory(cat)}
                            label={`${CATEGORIES[cat]?.icon || '📊'} ${CATEGORIES[cat]?.label || cat} (${list?.length || 0})`}
                            color={CATEGORIES[cat]?.color || 'gray'}
                        />
                    ))}
                </div>

                {/* Clear Category Button */}
                {selectedCategory !== 'all' && displayedSignals.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => clearCategory(selectedCategory)}
                            className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                        >
                            🗑️ Bu Kategoriyi Temizle ({displayedSignals.length})
                        </button>
                    </div>
                )}

                {/* Signals Grid */}
                {displayedSignals.length === 0 ? (
                    <EmptyState onAnalyze={() => runAnalysis(100)} analyzing={analyzing} />
                ) : (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <AnimatePresence>
                            {displayedSignals.map((signal) => (
                                <SignalCard
                                    key={signal.id}
                                    signal={signal}
                                    category={signal._category}
                                    onDelete={() => deleteSignal(signal.id, signal._category)}
                                />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </main>
        </div>
    );
}

// ============================================
// COMPONENTS
// ============================================

function CategoryTab({ active, onClick, label, color }) {
    const colorClasses = {
        gray: active ? 'bg-gray-600 text-white' : 'bg-gray-800/50 text-gray-400',
        green: active ? 'bg-green-600 text-white' : 'bg-green-900/30 text-green-400',
        emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-900/30 text-emerald-400',
        blue: active ? 'bg-blue-600 text-white' : 'bg-blue-900/30 text-blue-400',
        cyan: active ? 'bg-cyan-600 text-white' : 'bg-cyan-900/30 text-cyan-400',
        orange: active ? 'bg-orange-600 text-white' : 'bg-orange-900/30 text-orange-400',
        red: active ? 'bg-red-600 text-white' : 'bg-red-900/30 text-red-400'
    };

    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${colorClasses[color] || colorClasses.gray}`}
        >
            {label}
        </button>
    );
}

function EmptyState({ onAnalyze, analyzing }) {
    return (
        <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold mb-2">Sinyal Bulunamadı</h3>
            <p className="text-muted-foreground mb-6">
                Bu kategoride henüz sinyal yok. Analizi çalıştırarak yeni sinyaller bulabilirsiniz.
            </p>
            <button
                onClick={onAnalyze}
                disabled={analyzing}
                className="px-6 py-3 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors disabled:opacity-50"
            >
                {analyzing ? 'Analiz Ediliyor...' : '🚀 Analizi Başlat'}
            </button>
        </div>
    );
}

function SignalCard({ signal, category, onDelete }) {
    const [showPrompt, setShowPrompt] = useState(false);
    const [copied, setCopied] = useState(false);

    const catConfig = CATEGORIES[category] || { label: category, icon: '📊', color: 'gray' };

    // Generate AI Prompt
    const generatePrompt = () => {
        const s = signal.stats || {};
        return `You are a professional football betting analyst. Analyze this match for market: ${signal.market || 'Unknown'}.

Match: ${signal.event_home_team} vs ${signal.event_away_team}
League: ${signal.league || 'Unknown'}
Kick-off: ${signal.startTime || 'Unknown'}

Statistics:
- Home Form (Last 5): Over 1.5 Rate ${s.homeForm?.over15Rate?.toFixed(0) || 0}%, Avg Scored ${s.homeForm?.avgScored?.toFixed(2) || 0}
- Away Form (Last 5): Over 1.5 Rate ${s.awayForm?.over15Rate?.toFixed(0) || 0}%, Avg Scored ${s.awayForm?.avgScored?.toFixed(2) || 0}
- Home @ Home: Scored in ${s.homeHomeStats?.scoringRate?.toFixed(0) || 0}% of games
- Away @ Away: Avg Conceded ${s.awayAwayStats?.avgConceded?.toFixed(2) || 0}

This match has ALREADY passed statistical filters.

RESPOND WITH JSON ONLY:
{"verdict": "PLAY" or "SKIP", "confidence": 60-95, "reason": "Brief explanation"}`;
    };

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(generatePrompt());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            alert('Kopyalama başarısız: ' + err.message);
        }
    };

    const handleDelete = () => {
        if (window.confirm(`"${signal.event_home_team} vs ${signal.event_away_team}" maçını silmek istiyor musunuz?`)) {
            onDelete();
        }
    };

    const colorClasses = {
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30',
        gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-card border border-border rounded-xl p-4 hover:border-accent/30 transition-all"
        >
            {/* Category Badge */}
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mb-3 border ${colorClasses[catConfig.color] || colorClasses.gray}`}>
                <span>{catConfig.icon}</span>
                <span>{catConfig.label}</span>
            </div>

            {/* Teams */}
            <div className="mb-3">
                <div className="font-bold text-base">{signal.event_home_team || signal.home || 'Home'}</div>
                <div className="text-xs text-muted-foreground my-1">vs</div>
                <div className="font-bold text-base">{signal.event_away_team || signal.away || 'Away'}</div>
            </div>

            {/* Match Info */}
            <div className="text-xs text-muted-foreground mb-3 space-y-1">
                {signal.league && <div className="flex items-center gap-1">🏆 {signal.league}</div>}
                {signal.startTime && <div className="flex items-center gap-1">⏰ {signal.startTime}</div>}
                {signal.market && <div className="flex items-center gap-1">📊 {signal.market}</div>}
            </div>

            {/* Stats Preview */}
            {signal.stats && (
                <div className="bg-muted/30 rounded-lg p-2 text-xs mb-3 grid grid-cols-2 gap-1">
                    {signal.stats.homeForm && (
                        <div>H O1.5: <span className="font-medium">{signal.stats.homeForm.over15Rate?.toFixed(0) || 0}%</span></div>
                    )}
                    {signal.stats.awayForm && (
                        <div>A O1.5: <span className="font-medium">{signal.stats.awayForm.over15Rate?.toFixed(0) || 0}%</span></div>
                    )}
                    {signal.stats.homeHomeStats?.scoringRate && (
                        <div>H Skor: <span className="font-medium">{signal.stats.homeHomeStats.scoringRate?.toFixed(0)}%</span></div>
                    )}
                    {signal.stats.leagueAvg && (
                        <div>Lig Ort: <span className="font-medium">{signal.stats.leagueAvg?.toFixed(1)}</span></div>
                    )}
                </div>
            )}

            {/* AI Prompt Section */}
            <div className="mb-3">
                <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                >
                    <span>{showPrompt ? '🔽' : '▶️'}</span>
                    <span>{showPrompt ? 'Promptu Gizle' : 'AI Prompt Göster'}</span>
                </button>

                {showPrompt && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2"
                    >
                        <div className="bg-black/60 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto border border-border text-gray-300">
                            {generatePrompt()}
                        </div>
                        <button
                            onClick={copyPrompt}
                            className={`mt-2 text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${copied
                                    ? 'bg-green-600/30 text-green-400'
                                    : 'bg-accent/20 text-accent hover:bg-accent/30'
                                }`}
                        >
                            {copied ? '✅ Kopyalandı!' : '📋 Kopyala'}
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Delete Button */}
            <button
                onClick={handleDelete}
                className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-600/30"
            >
                🗑️ Bu Maçı Sil
            </button>
        </motion.div>
    );
}
