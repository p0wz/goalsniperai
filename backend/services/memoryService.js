const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'bet_history.json');

/**
 * Loads bet history from local JSON file.
 * In a production environment with millions of rows, this should be a Vector DB.
 * For < 10,000 matches, linear scan or simple filtering is fast enough (Heuristic RAG).
 */
function loadHistory() {
    if (!fs.existsSync(DB_FILE)) return [];
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[MemoryService] Failed to load history:', e);
        return [];
    }
}

/**
 * Normalizes stats for comparison.
 * Returns a "Fingerprint" object.
 */
function getFingerprint(match) {
    if (!match.filterStats) return null;

    const { homeHomeStats, awayAwayStats } = match.filterStats;

    return {
        homeWinRate: homeHomeStats.winRate || 0,
        homeScoringRate: homeHomeStats.scoringRate || 0,
        homeAvgScored: homeHomeStats.avgScored || 0,
        awayWinRate: awayAwayStats.winRate || 0,
        awayConcededRate: awayAwayStats.avgConceded || 0, // Using avgConceded for away defense
        leagueAvgGoals: match.filterStats.homeForm.avgTotalGoals || 2.5 // Proxy
    };
}

/**
 * Calculates similarity score between two matches.
 * Lower score = More similar.
 */
function calculateSimilarity(target, candidate) {
    // We don't save full stats in bet_history.json usually, 
    // so we might need to rely on what IS saved. 
    // IF bet_history doesn't have deep stats, we can't do deep comparison yet.
    // MVP: match by 'Market' + 'Team Strength' (if available).

    // Check if candidate has recorded data. 
    // If our betTracker doesn't save stats, we can't compare stats.
    // TODO: We need to update betTracker to save 'stats_snapshot' with the bet.

    // Fallback for current history (which lacks stats):
    // Match by: Market AND (HomeTeam OR AwayTeam).
    // This isn't "stat similarity" but "team history" which is also valuable.

    let score = 0;

    // 1. Market must match
    if (target.market !== candidate.market) return 999;

    // 2. Team match (Big bonus)
    if (target.homeTeam === candidate.home_team) score -= 50;
    if (target.awayTeam === candidate.away_team) score -= 50;

    // 3. Result available?
    if (candidate.status !== 'WON' && candidate.status !== 'LOST') return 999;

    return score;
}

const memoryService = {
    /**
     * Finds most relevant past matches for context injection.
     * @param {Object} currentMatch - The match object from dailyAnalyst
     * @param {String} market - The market being analyzed
     * @returns {Array} - Top 3 similar matches
     */
    findSimilarMatches: (currentMatch, market) => {
        const history = loadHistory();

        // Filter valid finished games
        const candidates = history.filter(h =>
            (h.status === 'WON' || h.status === 'LOST') &&
            h.market === market
        );

        // Sort by recency (assuming id has timestamp or date field)
        // Simple logic: Look for this specific team's past performance in our system.
        // "How did we do last time we bet on Galatasaray?"

        const homeTeamMatches = candidates.filter(c => c.home_team === currentMatch.event_home_team || c.away_team === currentMatch.event_home_team);
        const awayTeamMatches = candidates.filter(c => c.home_team === currentMatch.event_away_team || c.away_team === currentMatch.event_away_team);

        // Combine and distinct
        const relevant = [...homeTeamMatches, ...awayTeamMatches];
        const unique = [...new Map(relevant.map(item => [item.id, item])).values()];

        // Sort by date (newest first)
        unique.sort((a, b) => new Date(b.date) - new Date(a.date));

        return unique.slice(0, 3);
    }
};

module.exports = memoryService;
