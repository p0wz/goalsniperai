/**
 * Test Script for First Half Pre-Match Analysis
 * Run with: node backend/analysis/test_firstHalfAnalyzer.js
 */

const { analyzeFirstHalfPreMatch } = require('./firstHalfAnalyzer');

console.log("Running First Half Analysis Tests...\n");

// --- HELPER: Create Mock Match ---
const createMatch = (homeScore1H, awayScore1H, isHome) => {
    return {
        home_team: { name: isHome ? 'Team A' : 'Opponent', score_1st_half: homeScore1H },
        away_team: { name: isHome ? 'Opponent' : 'Team A', score_1st_half: awayScore1H }
    };
};

/* 
 * Mock standard arrays
 * We need:
 * - homeHistory (Array of recent games for Home Team)
 * - awayHistory (Array of recent games for Away Team)
 * - h2hHistory (Array of mutual games)
 */

// CASE 1: PERFECTION (100 Pts)
// Home Team: Last 5 Home Games all have 1H goals (40 pts)
// Away Team: Last 5 Away Games all have 1H goals (40 pts)
// H2H: Last 5 Games all have 1H goals (20 pts)
// No penalty (Last 2 games not 0-0)

const case1_match = { event_home_team: 'TeamHome', event_away_team: 'TeamAway' };

// Create 5 games where "TeamHome" played at HOME and there was a 1H goal (1-0)
const case1_homeHistory = Array(5).fill(null).map(() => ({
    home_team: { name: 'TeamHome', score_1st_half: 1 },
    away_team: { name: 'SomeTeam', score_1st_half: 0 }
}));
// Add 2 older games to test slicing? Nah 5 is enough for 100%.

// Create 5 games where "TeamAway" played at AWAY and there was a 1H goal (0-1)
const case1_awayHistory = Array(5).fill(null).map(() => ({
    home_team: { name: 'SomeTeam', score_1st_half: 0 },
    away_team: { name: 'TeamAway', score_1st_half: 1 }
}));

const case1_h2h = Array(5).fill(null).map(() => ({
    home_team: { name: 'TeamHome', score_1st_half: 1 },
    away_team: { name: 'TeamAway', score_1st_half: 1 }
}));

const result1 = analyzeFirstHalfPreMatch(case1_match, case1_homeHistory, case1_awayHistory, case1_h2h);
console.log("CASE 1: PERFECTION");
console.log("Expected: 100, Signal: true");
console.log("Actual:", JSON.stringify(result1, null, 2));
console.log(result1.score === 100 ? "PASS ✅" : "FAIL ❌");
console.log("---------------------------------------------------");


// CASE 2: ZEROS (0 Pts)
// No goals in 1H for anyone.
const case2_match = { event_home_team: 'TeamHome', event_away_team: 'TeamAway' };

const case2_homeHistory = Array(5).fill(null).map(() => ({
    home_team: { name: 'TeamHome', score_1st_half: 0 },
    away_team: { name: 'SomeTeam', score_1st_half: 0 }
}));

const case2_awayHistory = Array(5).fill(null).map(() => ({
    home_team: { name: 'SomeTeam', score_1st_half: 0 },
    away_team: { name: 'TeamAway', score_1st_half: 0 }
}));

const case2_h2h = Array(5).fill(null).map(() => ({
    home_team: { name: 'TeamHome', score_1st_half: 0 },
    away_team: { name: 'TeamAway', score_1st_half: 0 }
}));

const result2 = analyzeFirstHalfPreMatch(case2_match, case2_homeHistory, case2_awayHistory, case2_h2h);
console.log("CASE 2: ZEROS");
console.log("Expected: 0, Signal: false");
console.log("Actual:", JSON.stringify(result2, null, 2));
console.log(result2.score === 0 ? "PASS ✅" : "FAIL ❌");
console.log("---------------------------------------------------");


// CASE 3: ICE COLD PENALTY
// Perfect stats (100 pts) BUT Home Team has two 0-0 HTs recently.
// Should be 100 - 30 = 70 pts.

const case3_match = { event_home_team: 'TeamHome', event_away_team: 'TeamAway' };

// Create history where deep history is good, but RECENT 2 games are 0-0 HT.
// Note: History is usually sorted NEWEST first.
// So index 0 and 1 should be 0-0 HT.
// Index 2,3,4,5,6 should be 1-0 HT.
const case3_homeHistory = [
    { home_team: { name: 'TeamHome', score_1st_half: 0 }, away_team: { name: 'X', score_1st_half: 0 } }, // recent 1
    { home_team: { name: 'X', score_1st_half: 0 }, away_team: { name: 'TeamHome', score_1st_half: 0 } }, // recent 2 (Away context shouldn't matter for specific penalty rule "regardless of venue", but my code checks unfiltered history for penalty)
    { home_team: { name: 'TeamHome', score_1st_half: 1 }, away_team: { name: 'X', score_1st_half: 0 } },
    { home_team: { name: 'TeamHome', score_1st_half: 1 }, away_team: { name: 'X', score_1st_half: 0 } },
    { home_team: { name: 'TeamHome', score_1st_half: 1 }, away_team: { name: 'X', score_1st_half: 0 } },
    { home_team: { name: 'TeamHome', score_1st_half: 1 }, away_team: { name: 'X', score_1st_half: 0 } },
    { home_team: { name: 'TeamHome', score_1st_half: 1 }, away_team: { name: 'X', score_1st_half: 0 } }
];
// For the "Home Factor" calc, it filters for 'TeamHome' as HOME. 
// In the array above:
// Item 0: Home (0-0) -> Counts for Home Factor (Miss)
// Item 1: Away (0-0) -> Does NOT count for Home Factor (Filtered out)
// Items 2-6: Home (1-0) -> Count (Hit)
// So for Home Factor: We have 6 games at home. 1 is Miss, 5 are Hits.
// 5/6 = 83%. Score should be 32 (since >= 80%).
// Wait, case 1 was perfect 100%. 
// Let's adjust to ensure stats stay high. 
// Actually if I have 5 hits out of 6, that's 32pts. 

// Away Team: Perfect 100% (40pts)
const case3_awayHistory = Array(5).fill(null).map(() => ({
    home_team: { name: 'SomeTeam', score_1st_half: 0 },
    away_team: { name: 'TeamAway', score_1st_half: 1 }
}));

// H2H: Perfect (20pts)
const case3_h2h = Array(5).fill(null).map(() => ({
    home_team: { name: 'TeamHome', score_1st_half: 1 },
    away_team: { name: 'TeamAway', score_1st_half: 1 }
}));

// Expected Total without penalty:
// Home: 5/6 = 83% -> 32 pts
// Away: 5/5 = 100% -> 40 pts
// H2H: 5/5 = 100% -> 20 pts
// Base Score: 32 + 40 + 20 = 92 pts.
// Penalty: -30 pts.
// Final Score: 62 pts.

const result3 = analyzeFirstHalfPreMatch(case3_match, case3_homeHistory, case3_awayHistory, case3_h2h);
console.log("CASE 3: ICE COLD PENALTY");
console.log("Expected: Around 62, Signal: false (due to penalty)");
console.log("Actual:", JSON.stringify(result3, null, 2));
console.log((result3.score === 62) ? "PASS ✅" : `FAIL ❌ (Got ${result3.score})`);
console.log("---------------------------------------------------"); 
