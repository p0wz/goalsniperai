/**
 * goalProbabilityEngine.js
 * "The Live Goal Probability Engine" - Data Science Approach
 * 
 * Replaces simple momentum triggers with a weighted Pressure Index algorithm.
 * Calculates probability of a goal in the next 15 minutes.
 */

// ============================================
// 📊 Event Weights (Points)
// ============================================
const EVENT_WEIGHTS = {
    SHOT_ON_TARGET: 15,
    SHOT_OFF_TARGET: 5,
    CORNER: 8,
    DANGEROUS_ATTACK: 1,
    HIGH_POSSESSION_BONUS: 10,  // If possession > 65%
    XG_MULTIPLIER: 20           // xG * 20 points
};

// ============================================
// 🎯 Context Multipliers
// ============================================
const CONTEXT_MULTIPLIERS = {
    FAVORITE_LOSING: 1.5,       // Desperation mode
    RED_CARD_ADVANTAGE: 1.3,    // Playing against 10 men
    UNDERDOG_WINNING: 0.8       // Parking the bus
};

// ============================================
// ⏱️ Time Bonuses
// ============================================
const TIME_BONUSES = {
    KILL_ZONE_START: 70,
    KILL_ZONE_END: 85,
    KILL_ZONE_BONUS: 10         // Flat +10% probability
};

/**
 * Calculate Goal Probability for the next 15 minutes
 * @param {Object} match - Match object with team info, score, elapsed time
 * @param {Object} liveStats - Current live stats (shots, corners, xG, etc.)
 * @param {Object} odds - Pre-match or live odds { home: 1.5, away: 4.0, draw: 3.5 }
 * @returns {Object} Probability result with recommendation
 */
function calculateGoalProbability(match, liveStats, odds = {}) {
    const elapsed = match.elapsed || 0;
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const homeOdds = odds.home || odds['1'] || 2.0;
    const awayOdds = odds.away || odds['2'] || 2.0;

    // ============================================
    // STEP 1: Calculate Base Pressure Scores
    // ============================================
    const homePressure = calculateTeamPressure(liveStats, 'home');
    const awayPressure = calculateTeamPressure(liveStats, 'away');

    let homeAdjusted = homePressure.score;
    let awayAdjusted = awayPressure.score;

    const reasons = [];

    // ============================================
    // STEP 2: Apply Context Multipliers
    // ============================================

    // 2a. Favorite Losing Multiplier (Desperation Mode)
    const homeFavorite = homeOdds < 1.50;
    const awayFavorite = awayOdds < 1.50;

    if (homeFavorite && homeScore < awayScore) {
        homeAdjusted *= CONTEXT_MULTIPLIERS.FAVORITE_LOSING;
        reasons.push(`🔥 Fav Losing -> Home 1.5x`);
    }
    if (awayFavorite && awayScore < homeScore) {
        awayAdjusted *= CONTEXT_MULTIPLIERS.FAVORITE_LOSING;
        reasons.push(`🔥 Fav Losing -> Away 1.5x`);
    }

    // 2b. Underdog Winning (Parking the Bus)
    const homeUnderdog = homeOdds > 3.00;
    const awayUnderdog = awayOdds > 3.00;

    if (homeUnderdog && homeScore > awayScore) {
        homeAdjusted *= CONTEXT_MULTIPLIERS.UNDERDOG_WINNING;
        reasons.push(`🛡️ Underdog leading -> Home 0.8x`);
    }
    if (awayUnderdog && awayScore > homeScore) {
        awayAdjusted *= CONTEXT_MULTIPLIERS.UNDERDOG_WINNING;
        reasons.push(`🛡️ Underdog leading -> Away 0.8x`);
    }

    // 2c. Red Card Advantage
    const homeRedCards = liveStats?.redCards?.home || 0;
    const awayRedCards = liveStats?.redCards?.away || 0;

    if (awayRedCards > 0) {
        homeAdjusted *= CONTEXT_MULTIPLIERS.RED_CARD_ADVANTAGE;
        reasons.push(`🟥 Away Red Card -> Home 1.3x`);
    }
    if (homeRedCards > 0) {
        awayAdjusted *= CONTEXT_MULTIPLIERS.RED_CARD_ADVANTAGE;
        reasons.push(`🟥 Home Red Card -> Away 1.3x`);
    }

    // ============================================
    // STEP 3: Determine Dominant Team
    // ============================================
    const totalPressure = homeAdjusted + awayAdjusted;
    const dominantTeam = homeAdjusted > awayAdjusted ? 'Home' : 'Away';
    const dominantPressure = Math.max(homeAdjusted, awayAdjusted);
    const pressureDiff = Math.abs(homeAdjusted - awayAdjusted);

    // ============================================
    // STEP 4: Map Pressure Score to Probability
    // ============================================
    let probabilityPercent = mapPressureToProbability(dominantPressure);

    // 4a. Time Decay Bonus (The Kill Zone: 70-85')
    if (elapsed >= TIME_BONUSES.KILL_ZONE_START && elapsed <= TIME_BONUSES.KILL_ZONE_END) {
        probabilityPercent += TIME_BONUSES.KILL_ZONE_BONUS;
        reasons.push(`⏱️ Kill Zone (${elapsed}'): +10%`);
    }

    // 4b. Close Game Bonus (0-0 or 1-1 = More urgency)
    if (homeScore === awayScore && elapsed > 60) {
        probabilityPercent += 5;
        reasons.push(`⚖️ Tied game urgency: +5%`);
    }

    // Cap probability at 95%
    probabilityPercent = Math.min(probabilityPercent, 95);

    // ============================================
    // STEP 5: Calculate Confidence Stars (1-5)
    // ============================================
    const confidenceStars = calculateConfidenceStars(dominantPressure, pressureDiff, liveStats);

    // ============================================
    // STEP 6: Generate Recommended Market
    // ============================================
    const recommendedMarket = generateMarketRecommendation(
        dominantTeam,
        pressureDiff,
        homeScore + awayScore,
        elapsed
    );

    // Build detailed reason string
    const dominantStats = dominantTeam === 'Home' ? homePressure : awayPressure;
    const reasonSummary = `Pressure Index: ${Math.round(dominantPressure)} | ${dominantStats.breakdown} | ${reasons.join(' | ')}`;

    return {
        probabilityPercent: Math.round(probabilityPercent),
        confidenceStars,
        dominantTeam,
        dominantPressure: Math.round(dominantPressure),
        homePressure: Math.round(homeAdjusted),
        awayPressure: Math.round(awayAdjusted),
        reason: reasonSummary,
        recommendedMarket,
        rawScores: {
            home: homePressure,
            away: awayPressure
        }
    };
}

/**
 * Calculate Pressure Score for a single team
 * @param {Object} stats - Live stats object
 * @param {string} team - 'home' or 'away'
 * @returns {Object} { score, breakdown }
 */
function calculateTeamPressure(stats, team) {
    if (!stats) return { score: 0, breakdown: 'No stats' };

    const shots = stats?.shots?.[team] || 0;
    const shotsOnTarget = stats?.shotsOnTarget?.[team] || 0;
    const shotsOffTarget = shots - shotsOnTarget;
    const corners = stats?.corners?.[team] || 0;
    const dangerousAttacks = stats?.dangerousAttacks?.[team] || 0;
    const possession = stats?.possession?.[team] || 50;
    const xG = stats?.xG?.[team] || 0;

    let score = 0;
    const parts = [];

    // Shots on Target (Most valuable)
    if (shotsOnTarget > 0) {
        const sotPoints = shotsOnTarget * EVENT_WEIGHTS.SHOT_ON_TARGET;
        score += sotPoints;
        parts.push(`${shotsOnTarget}SoT(${sotPoints})`);
    }

    // Shots off Target
    if (shotsOffTarget > 0) {
        const shotPoints = shotsOffTarget * EVENT_WEIGHTS.SHOT_OFF_TARGET;
        score += shotPoints;
        parts.push(`${shotsOffTarget}Shots(${shotPoints})`);
    }

    // Corners
    if (corners > 0) {
        const cornerPoints = corners * EVENT_WEIGHTS.CORNER;
        score += cornerPoints;
        parts.push(`${corners}Cor(${cornerPoints})`);
    }

    // Dangerous Attacks (if available)
    if (dangerousAttacks > 0) {
        const daPoints = dangerousAttacks * EVENT_WEIGHTS.DANGEROUS_ATTACK;
        score += daPoints;
        parts.push(`${dangerousAttacks}DA(${daPoints})`);
    }

    // Possession Bonus (if dominating > 65%)
    if (possession > 65) {
        score += EVENT_WEIGHTS.HIGH_POSSESSION_BONUS;
        parts.push(`Poss(${possession}%)`);
    }

    // xG Bonus (Strong predictor)
    if (xG > 0) {
        const xgPoints = xG * EVENT_WEIGHTS.XG_MULTIPLIER;
        score += xgPoints;
        parts.push(`xG(${xG.toFixed(2)})`);
    }

    return {
        score,
        breakdown: parts.length > 0 ? parts.join(' + ') : 'Minimal activity'
    };
}

/**
 * Map Pressure Score to Probability Percentage
 * @param {number} pressure - Adjusted pressure score
 * @returns {number} Probability percentage
 */
function mapPressureToProbability(pressure) {
    // Logarithmic-ish mapping for natural feel
    if (pressure < 20) return 10 + (pressure / 20) * 10;           // 10-20%
    if (pressure < 40) return 20 + ((pressure - 20) / 20) * 20;    // 20-40%
    if (pressure < 60) return 40 + ((pressure - 40) / 20) * 15;    // 40-55%
    if (pressure < 80) return 55 + ((pressure - 60) / 20) * 15;    // 55-70%
    if (pressure < 100) return 70 + ((pressure - 80) / 20) * 10;   // 70-80%
    // 100+ = 80-95%
    return Math.min(80 + ((pressure - 100) / 50) * 15, 95);
}

/**
 * Calculate Confidence Stars (1-5)
 * @param {number} dominantPressure - Winning team's pressure
 * @param {number} pressureDiff - Gap between teams
 * @param {Object} stats - For additional quality checks
 * @returns {number} Stars 1-5
 */
function calculateConfidenceStars(dominantPressure, pressureDiff, stats) {
    let stars = 1;

    // Base stars from pressure magnitude
    if (dominantPressure >= 100) stars = 5;
    else if (dominantPressure >= 70) stars = 4;
    else if (dominantPressure >= 50) stars = 3;
    else if (dominantPressure >= 30) stars = 2;

    // Bonus star if clear dominance (gap > 30)
    if (pressureDiff > 30 && stars < 5) stars++;

    // Penalty if low shot accuracy
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalSoT = (stats?.shotsOnTarget?.home || 0) + (stats?.shotsOnTarget?.away || 0);
    if (totalShots >= 10 && (totalSoT / totalShots) < 0.25 && stars > 1) {
        stars--;
    }

    return stars;
}

/**
 * Generate Market Recommendation based on context
 * @param {string} dominantTeam - 'Home' or 'Away'
 * @param {number} pressureDiff - Gap between teams
 * @param {number} totalGoals - Current total goals
 * @param {number} elapsed - Current minute
 * @returns {string} Recommended market
 */
function generateMarketRecommendation(dominantTeam, pressureDiff, totalGoals, elapsed) {
    // Very clear dominance -> Next Goal X
    if (pressureDiff > 40) {
        return `Next Goal ${dominantTeam}`;
    }

    // Balanced but active -> Total Goals
    if (pressureDiff < 20) {
        if (totalGoals === 0 && elapsed > 30) return 'Over 0.5 Goals';
        if (totalGoals <= 1 && elapsed > 50) return 'Over 1.5 Goals';
        return 'Next Goal Any';
    }

    // Default to dominant team market
    return `Next Goal ${dominantTeam}`;
}

// ============================================
// 🎯 Integration Helper - Convert from old format
// ============================================
function convertOldStatsFormat(oldStats) {
    return {
        shots: {
            home: oldStats?.shots?.home || 0,
            away: oldStats?.shots?.away || 0
        },
        shotsOnTarget: {
            home: oldStats?.shotsOnTarget?.home || 0,
            away: oldStats?.shotsOnTarget?.away || 0
        },
        corners: {
            home: oldStats?.corners?.home || 0,
            away: oldStats?.corners?.away || 0
        },
        dangerousAttacks: {
            home: oldStats?.dangerousAttacks?.home || 0,
            away: oldStats?.dangerousAttacks?.away || 0
        },
        possession: {
            home: oldStats?.possession?.home || 50,
            away: oldStats?.possession?.away || 50
        },
        xG: {
            home: oldStats?.xG?.home || 0,
            away: oldStats?.xG?.away || 0
        },
        redCards: {
            home: oldStats?.redCards?.home || 0,
            away: oldStats?.redCards?.away || 0
        }
    };
}

module.exports = {
    calculateGoalProbability,
    calculateTeamPressure,
    mapPressureToProbability,
    convertOldStatsFormat,
    EVENT_WEIGHTS,
    CONTEXT_MULTIPLIERS
};
