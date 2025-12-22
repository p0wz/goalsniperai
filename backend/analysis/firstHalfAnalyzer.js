/**
 * First Half Over 0.5 Goals - Heuristic Analysis Module (Zero-Cost)
 * 
 * OBJECTIVE: Estimate "First Half Potential" based on FULL TIME scores.
 * REASON: API does not provide HT scores without costly extra requests.
 * 
 * LOGIC:
 * We use Full Time (FT) Total Goals as a proxy for 1H Goal Probability.
 * - FT Goals >= 3: Very High chance of 1H Goal (~90%). Weight: 1.0
 * - FT Goals == 2: Moderate chance (~65%).           Weight: 0.65
 * - FT Goals == 1: Low chance (~30%).                Weight: 0.30
 * - FT Goals == 0: No chance (0%).                   Weight: 0.0
 * 
 * SCORING:
 * 1. Home Team Factor (Max 40 pts)
 * 2. Away Team Factor (Max 40 pts)
 * 3. H2H Factor (Max 20 pts)
 * 4. Penalty: Recent 0-0 FT results (-30 pts)
 */

function analyzeFirstHalfPreMatch(match, homeHistory, awayHistory, h2hHistory) {

    // --- Helper: Calculate Weighted 1H Potential ---
    const calculatePotential = (matches) => {
        if (!matches || matches.length === 0) return 0;
        let totalWeight = 0;

        matches.forEach(m => {
            const hs = parseInt(m.home_team?.score) || 0;
            const as = parseInt(m.away_team?.score) || 0;
            const total = hs + as;

            if (total >= 3) totalWeight += 1.0;       // Strong indicator
            else if (total === 2) totalWeight += 0.65; // Medium indicator
            else if (total === 1) totalWeight += 0.30; // Weak indicator
            // 0 goals = 0 weight
        });

        return (totalWeight / matches.length) * 100;
    };

    // --- Helper: Check for recent 0-0 FT ---
    const hasRecentZeroZero = (matches) => {
        const last2 = matches.slice(0, 2);
        if (last2.length < 2) return false;
        return last2.every(m => {
            const t = (parseInt(m.home_team?.score) || 0) + (parseInt(m.away_team?.score) || 0);
            return t === 0;
        });
    };

    // --- 1. Home Team Analysis (at Home) ---
    const homeLastHome = homeHistory
        .filter(m => m.home_team?.name === match.event_home_team) // Venue filter
        .slice(0, 8); // Last 8 games

    const homePotentialRate = calculatePotential(homeLastHome);
    let homeScore = 0;
    if (homeLastHome.length > 0) {
        if (homePotentialRate >= 80) homeScore = 40;
        else if (homePotentialRate >= 60) homeScore = 30;
        else if (homePotentialRate >= 40) homeScore = 20;
        else homeScore = 10;
    }

    // --- 2. Away Team Analysis (at Away) ---
    const awayLastAway = awayHistory
        .filter(m => m.away_team?.name === match.event_away_team) // Venue filter
        .slice(0, 8);

    const awayPotentialRate = calculatePotential(awayLastAway);
    let awayScore = 0;
    if (awayLastAway.length > 0) {
        if (awayPotentialRate >= 80) awayScore = 40;
        else if (awayPotentialRate >= 60) awayScore = 30;
        else if (awayPotentialRate >= 40) awayScore = 20;
        else awayScore = 10;
    }

    // --- 3. H2H Analysis ---
    const last5H2H = h2hHistory.slice(0, 5);
    const h2hRate = calculatePotential(last5H2H);
    let h2hScore = 0;
    if (last5H2H.length > 0) {
        if (h2hRate >= 80) h2hScore = 20;
        else if (h2hRate >= 60) h2hScore = 15;
        else if (h2hRate >= 40) h2hScore = 10;
    }

    // --- Calculate Total ---
    let totalScore = homeScore + awayScore + h2hScore;

    // --- 4. Penalties ---
    const homeSlump = hasRecentZeroZero(homeHistory.slice(0, 5)); // Check recent pure form
    const awaySlump = hasRecentZeroZero(awayHistory.slice(0, 5));

    let penaltyReason = "";
    if (homeSlump || awaySlump) {
        totalScore -= 30;
        penaltyReason = "Penalty: Recent 0-0 FT results detected.";
    }

    // --- Clamp ---
    if (totalScore > 100) totalScore = 100;
    if (totalScore < 0) totalScore = 0;

    // --- Output ---
    const isSignal = totalScore >= 75; // Slightly lower threshold for heuristic

    return {
        signal: isSignal,
        score: totalScore,
        market: "First Half Over 0.5 (Heuristic)",
        confidence: totalScore >= 80 ? "HIGH" : "MEDIUM",
        metrics: {
            home_pot: parseFloat(homePotentialRate.toFixed(1)),
            away_pot: parseFloat(awayPotentialRate.toFixed(1)),
            h2h_pot: parseFloat(h2hRate.toFixed(1))
        },
        reason: `Home Pot: ${homePotentialRate.toFixed(0)}%, Away Pot: ${awayPotentialRate.toFixed(0)}%. ${penaltyReason}`.trim()
    };
}

/**
 * Secondary Validation: Check REAL First Half Scores from Match Details
 * 
 * @param {Array} homeMatchDetails - Last 3 match details for home team
 * @param {Array} awayMatchDetails - Last 3 match details for away team  
 * @param {string} homeTeamName - Home team name
 * @param {string} awayTeamName - Away team name
 * @returns {Object} { passed: boolean, htGoalRate: number, reason: string }
 */
function validateWithRealHTScores(homeMatchDetails, awayMatchDetails, homeTeamName, awayTeamName) {
    // Extract HT scores from match details
    const extractHTGoals = (details) => {
        if (!details) return null;

        // Match details structure varies, try common patterns
        // Pattern 1: details.score contains period scores
        if (details.home_team?.score_1st_half !== undefined && details.away_team?.score_1st_half !== undefined) {
            const htHome = parseInt(details.home_team.score_1st_half) || 0;
            const htAway = parseInt(details.away_team.score_1st_half) || 0;
            return htHome + htAway;
        }

        // Pattern 2: Scoreboard or periods array
        if (details.scoreboard) {
            const sb = details.scoreboard;
            if (sb.period_1) {
                const h = parseInt(sb.period_1.home) || 0;
                const a = parseInt(sb.period_1.away) || 0;
                return h + a;
            }
        }

        // Pattern 3: Periods array
        if (details.periods && Array.isArray(details.periods)) {
            const p1 = details.periods.find(p => p.period === 1 || p.name === '1st Half');
            if (p1) {
                const h = parseInt(p1.home_score || p1.home) || 0;
                const a = parseInt(p1.away_score || p1.away) || 0;
                return h + a;
            }
        }

        // Pattern 4: Check if result contains HT info (e.g., "2-1 (1-0)")
        if (details.result && details.result.includes('(')) {
            const htMatch = details.result.match(/\((\d+)-(\d+)\)/);
            if (htMatch) {
                return parseInt(htMatch[1]) + parseInt(htMatch[2]);
            }
        }

        return null; // Could not extract HT score
    };

    let homeHTGoalCount = 0;
    let homeValidMatches = 0;
    let awayHTGoalCount = 0;
    let awayValidMatches = 0;

    // Process home team's last 3 matches
    for (const details of homeMatchDetails) {
        if (!details) continue;
        const htGoals = extractHTGoals(details);
        if (htGoals !== null) {
            homeValidMatches++;
            if (htGoals >= 1) homeHTGoalCount++;
        }
    }

    // Process away team's last 3 matches
    for (const details of awayMatchDetails) {
        if (!details) continue;
        const htGoals = extractHTGoals(details);
        if (htGoals !== null) {
            awayValidMatches++;
            if (htGoals >= 1) awayHTGoalCount++;
        }
    }

    // Calculate rates
    const homeHTRate = homeValidMatches > 0 ? (homeHTGoalCount / homeValidMatches) * 100 : 0;
    const awayHTRate = awayValidMatches > 0 ? (awayHTGoalCount / awayValidMatches) * 100 : 0;
    const combinedRate = (homeHTRate + awayHTRate) / 2;

    // Validation criteria:
    // - At least 2 valid matches per team
    // - Combined HT goal rate >= 60%
    const hasEnoughData = homeValidMatches >= 2 && awayValidMatches >= 2;
    const passesThreshold = combinedRate >= 60;

    const passed = hasEnoughData && passesThreshold;

    let reason = '';
    if (!hasEnoughData) {
        reason = `Yetersiz veri: Ev(${homeValidMatches}/3), Dep(${awayValidMatches}/3)`;
    } else if (!passesThreshold) {
        reason = `Düşük 1Y gol oranı: Ev ${homeHTRate.toFixed(0)}%, Dep ${awayHTRate.toFixed(0)}% (Ort: ${combinedRate.toFixed(0)}%)`;
    } else {
        reason = `✅ 1Y Doğrulama: Ev ${homeHTRate.toFixed(0)}%, Dep ${awayHTRate.toFixed(0)}% (Ort: ${combinedRate.toFixed(0)}%)`;
    }

    return {
        passed,
        homeHTRate: parseFloat(homeHTRate.toFixed(1)),
        awayHTRate: parseFloat(awayHTRate.toFixed(1)),
        combinedRate: parseFloat(combinedRate.toFixed(1)),
        homeValidMatches,
        awayValidMatches,
        reason
    };
}

module.exports = { analyzeFirstHalfPreMatch, validateWithRealHTScores };
