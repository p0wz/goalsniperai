/**
 * NBA Props Analysis Tab
 * Hit rate charts for all 8 prop markets with adjustable lines
 */

import { useState, useEffect } from 'react';
import { nbaService } from '../../services/api';
import clsx from 'clsx';

// Market configuration
const MARKETS = {
    pts: { label: 'Points', icon: '🏀', defaultLine: 25.5 },
    reb: { label: 'Rebounds', icon: '📊', defaultLine: 8.5 },
    ast: { label: 'Assists', icon: '🎯', defaultLine: 6.5 },
    pra: { label: 'PRA', icon: '⭐', defaultLine: 38.5 },
    fg3m: { label: '3-Pointers', icon: '🎪', defaultLine: 2.5 },
    stl: { label: 'Steals', icon: '👐', defaultLine: 1.5 },
    blk: { label: 'Blocks', icon: '🛡️', defaultLine: 1.5 },
    tov: { label: 'Turnovers', icon: '⚠️', defaultLine: 3.5 }
};

// Hit Rate Progress Bar Component
function HitRateBar({ rate, label, hits, total, line }) {
    const getColor = (rate) => {
        if (rate >= 70) return 'bg-green-500';
        if (rate >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    return (
        <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{label} @ {line}</span>
                <span className="text-muted-foreground">{hits}/{total} ({rate}%)</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                    className={clsx("h-full rounded-full transition-all", getColor(rate))}
                    style={{ width: `${rate}%` }}
                />
            </div>
        </div>
    );
}

export default function NBAProps() {
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [roster, setRoster] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [hitRates, setHitRates] = useState(null);
    const [lines, setLines] = useState({ ...Object.fromEntries(Object.entries(MARKETS).map(([k, v]) => [k, v.defaultLine])) });
    const [lastN, setLastN] = useState(20);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Load teams on mount
    useEffect(() => {
        loadTeams();
    }, []);

    const loadTeams = async () => {
        try {
            setLoading(true);
            const result = await nbaService.getTeams();
            if (result.teams) {
                setTeams(result.teams.sort((a, b) => a.full_name.localeCompare(b.full_name)));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadRoster = async (teamId) => {
        try {
            setLoading(true);
            setSelectedTeam(teamId);
            setSelectedPlayer(null);
            setHitRates(null);
            const result = await nbaService.getRoster(teamId);
            if (result.success) {
                setRoster(result.players);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadHitRates = async (playerId) => {
        try {
            setLoading(true);
            setSelectedPlayer(playerId);
            const result = await nbaService.getHitRates(playerId, lines, lastN);
            if (result.success) {
                setHitRates(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateLine = (market, value) => {
        setLines(prev => ({ ...prev, [market]: parseFloat(value) }));
    };

    const recalculate = () => {
        if (selectedPlayer) {
            loadHitRates(selectedPlayer);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-2">🏀 NBA Props Analyzer</h2>
                <p className="text-muted-foreground">Hit rate analysis for all prop markets</p>
            </div>

            {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-500 text-sm">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2">✕</button>
                </div>
            )}

            {/* Team Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Team</label>
                    <select
                        value={selectedTeam || ''}
                        onChange={(e) => loadRoster(parseInt(e.target.value))}
                        className="w-full p-3 rounded-lg border bg-background"
                        disabled={loading}
                    >
                        <option value="">-- Choose team --</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>
                                {team.full_name}
                            </option>
                        ))}
                    </select>
                </div>

                {roster.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Player</label>
                        <select
                            value={selectedPlayer || ''}
                            onChange={(e) => loadHitRates(parseInt(e.target.value))}
                            className="w-full p-3 rounded-lg border bg-background"
                            disabled={loading}
                        >
                            <option value="">-- Choose player --</option>
                            {roster.map(player => (
                                <option key={player.id} value={player.id}>
                                    {player.name} ({player.position})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Settings */}
            {selectedPlayer && (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                    <label className="text-sm font-medium">Last N Games:</label>
                    <select
                        value={lastN}
                        onChange={(e) => setLastN(parseInt(e.target.value))}
                        className="p-2 rounded border bg-background"
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                    </select>
                    <button
                        onClick={recalculate}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Recalculate'}
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="text-center py-8 text-muted-foreground">
                    <div className="animate-spin text-4xl mb-2">🏀</div>
                    Loading...
                </div>
            )}

            {/* Hit Rates Display */}
            {hitRates && !loading && (
                <div className="space-y-6">
                    <div className="text-center">
                        <span className="text-sm text-muted-foreground">
                            Based on last {hitRates.games_analyzed} games
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(MARKETS).map(([key, config]) => {
                            const market = hitRates.markets[key];
                            if (!market) return null;

                            return (
                                <div key={key} className="border rounded-xl p-4 bg-card">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xl">{config.icon}</span>
                                        <span className="font-bold">{config.label}</span>
                                    </div>

                                    {/* Line Adjuster */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={lines[key]}
                                            onChange={(e) => updateLine(key, e.target.value)}
                                            className="w-20 p-1 text-center border rounded bg-background text-sm"
                                        />
                                        <span className="text-xs text-muted-foreground">line</span>
                                    </div>

                                    {/* Main Hit Rate */}
                                    <HitRateBar
                                        rate={market.hit_rate}
                                        label={`Last ${hitRates.games_analyzed}`}
                                        hits={market.hits}
                                        total={market.total}
                                        line={market.line}
                                    />

                                    {/* Splits */}
                                    {market.splits && (
                                        <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span>Last 5:</span>
                                                <span className={clsx(
                                                    market.splits.last5?.hit_rate >= 70 ? 'text-green-500' :
                                                        market.splits.last5?.hit_rate >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                )}>
                                                    {market.splits.last5?.hit_rate}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Last 10:</span>
                                                <span className={clsx(
                                                    market.splits.last10?.hit_rate >= 70 ? 'text-green-500' :
                                                        market.splits.last10?.hit_rate >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                )}>
                                                    {market.splits.last10?.hit_rate}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>🏠 Home:</span>
                                                <span className={clsx(
                                                    market.splits.home?.hit_rate >= 70 ? 'text-green-500' :
                                                        market.splits.home?.hit_rate >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                )}>
                                                    {market.splits.home?.hit_rate}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>✈️ Away:</span>
                                                <span className={clsx(
                                                    market.splits.away?.hit_rate >= 70 ? 'text-green-500' :
                                                        market.splits.away?.hit_rate >= 50 ? 'text-yellow-500' : 'text-red-500'
                                                )}>
                                                    {market.splits.away?.hit_rate}%
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!selectedTeam && !loading && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
                    <p className="text-4xl mb-2">🏀</p>
                    <p>Select a team to start analyzing player props</p>
                </div>
            )}
        </div>
    );
}
