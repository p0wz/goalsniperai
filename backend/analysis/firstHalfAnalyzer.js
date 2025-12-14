/**
 * First Half Over 0.5 Goals - Pre-Match Analysis Module
 * 
 * OBJECTIVE: Calculate "First Half Potential Score" (0-100) based on Pure Form.
 * 
 * ALGORITHM:
 * 1. Home Team Factor (Max 40 pts) - Based on Home Team's HOME games
 * 2. Away Team Factor (Max 40 pts) - Based on Away Team's AWAY games
 * 3. H2H Factor (Max 20 pts) - Based on direct meetings
 * 4. ICE COLD PENALTY (-30 pts) - If either team had 0-0 HT in last 2 games
 */

function analyzeFirstHalfPreMatch(match, homeHistory, awayHistory, h2hHistory) {
    const DEBUG = false;
    const log = (msg) => DEBUG && console.log(`[1H Analysis] ${msg}`);

    // --- 0. Helper Functions ---

    /**
     * Checks if a match had a goal in the first half.
     * Supports standard flashscore-style objects where:
     * - score_1st_half might be present (e.g. "1-0")
     * - OR we check periods if available (not typical in this simple history)
     * 
     * We assume history items have `score_1st_half` property or similar indicating HT score.
     * The `dailyAnalyst.js` uses `score_1st_half` property which seems to be an integer or string like "1".
     * Actually, looking at dailyAnalyst.js:201:
     * const htHome = m.home_team?.score_1st_half || 0;
     * const htAway = m.away_team?.score_1st_half || 0;
     * if (htHome + htAway >= 1) htGoalCount++;
     * 
     * We will use the same logic.
     */
    const hasFirstHalfGoal = (m) => {
        const htHome = parseInt(m.home_team?.score_1st_half) || 0;
        const htAway = parseInt(m.away_team?.score_1st_half) || 0;
        return (htHome + htAway) >= 1;
    };

    /**
     * Checks if a match finished 0-0 at Half Time.
     */
    const isZeroZeroHT = (m) => {
        const htHome = parseInt(m.home_team?.score_1st_half) || 0;
        const htAway = parseInt(m.away_team?.score_1st_half) || 0;
        return (htHome + htAway) === 0;
    };


    // --- 1. Home Team Factor (Max 40 Pts) ---
    // Filter: Keep only games played at HOME.
    // Limit: Last 5 to 8 matches.
    const homeLastHomeGames = homeHistory
        .filter(m => m.home_team?.name === match.event_home_team) // Ensure they were the home team
        .slice(0, 8); // Take up to 8, logic says 5-8 is fine. Let's use up to 8 for broader sample if available, but at least 5.

    // Calculate % with 1H Goal
    let homeScore = 0;
    let homeRate = 0;
    if (homeLastHomeGames.length > 0) {
        const homeGamesWithGoal = homeLastHomeGames.filter(hasFirstHalfGoal).length;
        homeRate = (homeGamesWithGoal / homeLastHomeGames.length) * 100;

        if (homeRate === 100) homeScore = 40;
        else if (homeRate >= 80) homeScore = 32;
        else if (homeRate >= 60) homeScore = 24;
        else homeScore = 0;
    }


    // --- 2. Away Team Factor (Max 40 Pts) ---
    // Filter: Keep only games played at AWAY.
    const awayLastAwayGames = awayHistory
        .filter(m => m.away_team?.name === match.event_away_team) // Ensure they were the away team
        .slice(0, 8);

    let awayScore = 0;
    let awayRate = 0;
    if (awayLastAwayGames.length > 0) {
        const awayGamesWithGoal = awayLastAwayGames.filter(hasFirstHalfGoal).length;
        awayRate = (awayGamesWithGoal / awayLastAwayGames.length) * 100;

        if (awayRate === 100) awayScore = 40;
        else if (awayRate >= 80) awayScore = 32;
        else if (awayRate >= 60) awayScore = 24;
        else awayScore = 0;
    }


    // --- 3. H2H Factor (Max 20 Pts) ---
    // Last 5 direct meetings
    const last5H2H = h2hHistory.slice(0, 5);

    let h2hScore = 0;
    let h2hRate = 0;
    if (last5H2H.length > 0) {
        const h2hWithGoal = last5H2H.filter(hasFirstHalfGoal).length;
        h2hRate = (h2hWithGoal / last5H2H.length) * 100;

        // 5/5 -> 20, 4/5 -> 15, 3/5 -> 10, else 0
        // Wait, percentage based?
        // 5/5 is 100%
        // 4/5 is 80%
        // 3/5 is 60%
        if (h2hRate === 100) h2hScore = 20;
        else if (h2hRate >= 80) h2hScore = 15;
        else if (h2hRate >= 60) h2hScore = 10;
        else h2hScore = 0;
    } else {
        // If no H2H, maybe treat as neutral or 0? 
        // Request says "Score 0-100", implies we need points.
        // If no H2H, we can't award points.
        h2hScore = 0;
    }


    // --- Calculate Base Score ---
    let totalScore = homeScore + awayScore + h2hScore;


    // --- 4. The "ICE COLD" Penalty ---
    // Check Last 2 Games for BOTH teams (regardless of Home/Away status in those games)
    // Need raw latest games from history regardless of venue.
    // Assuming `homeHistory` and `awayHistory` are passed as ALL recent matches sorted by date (newest first).
    // If they are filtered or unsorted, this might be an issue. 
    // We assume they are the standard "ALL" history arrays from valid sources.

    // We need just the very last 2 games played by the home team.
    const homeLast2 = homeHistory.slice(0, 2);
    // And very last 2 games by the away team.
    const awayLast2 = awayHistory.slice(0, 2);

    let penaltyApplied = false;
    let penaltyReason = "";

    // Rule: If HomeTeam OR AwayTeam has finished HT with 0-0 in their last 2 consecutive matches
    // Check Home Team Slump
    const homeSlump = homeLast2.length === 2 && homeLast2.every(isZeroZeroHT);

    // Check Away Team Slump
    const awaySlump = awayLast2.length === 2 && awayLast2.every(isZeroZeroHT);

    if (homeSlump || awaySlump) {
        totalScore -= 30;
        penaltyApplied = true;
        penaltyReason = "Penalty: ";
        if (homeSlump) penaltyReason += "Home Team has 2 consecutive 0-0 HTs. ";
        if (awaySlump) penaltyReason += "Away Team has 2 consecutive 0-0 HTs.";
    }

    // Clamp score to 0-100 range? 
    // Logic allows negatives if we subtract 30 from a low score, theoretically.
    // Request says "0-100".
    if (totalScore < 0) totalScore = 0;
    if (totalScore > 100) totalScore = 100;


    // --- Final Output Construction ---
    const isSignal = totalScore >= 80;

    let confidence = "LOW";
    if (totalScore >= 80) confidence = "HIGH";
    else if (totalScore >= 60) confidence = "MEDIUM";

    // Construct Reason String
    const reasonParts = [];
    reasonParts.push(`Home ${homeRate.toFixed(0)}% (1H Goals) in last ${homeLastHomeGames.length} home games.`);
    reasonParts.push(`Away ${awayRate.toFixed(0)}% (1H Goals) in last ${awayLastAwayGames.length} away games.`);
    if (last5H2H.length > 0) {
        reasonParts.push(`H2H ${h2hRate.toFixed(0)}% in last ${last5H2H.length}.`);
    }
    if (penaltyApplied) {
        reasonParts.push(penaltyReason.trim());
    }

    return {
        signal: isSignal,
        score: totalScore,
        market: "First Half Over 0.5",
        confidence: confidence,
        metrics: {
            home_ht_rate: parseFloat(homeRate.toFixed(2)),
            away_ht_rate: parseFloat(awayRate.toFixed(2)),
            h2h_ht_rate: parseFloat(h2hRate.toFixed(2))
        },
        reason: reasonParts.join(" ")
    };
}

module.exports = { analyzeFirstHalfPreMatch };
