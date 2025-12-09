/**
 * dailyAnalyst.js
 * "The Daily Pre-Match Analyst" - Real Data Implementation
 */
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// Config
const FLASHSCORE_API = {
    baseURL: 'https://flashscore4.p.rapidapi.com',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
    }
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MATCH_LIMIT = 15; // Limit analysis to 15 matches to respect API rate limits

// 1. Data Fetching - Today's Schedule
async function fetchTodaysFixtures() {
    try {
        console.log('[DailyAnalyst] Fetching schedule...');
        // Endpoint provided by user: 'match/list/1/0' (1=Today, 0=Page/Offset)
        const response = await axios.get(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/list/1/0`, {
            headers: FLASHSCORE_API.headers
        });

        // Data structure varies by provider version, usually response.data is array of groups/matches
        // Flatten logic
        const data = response.data || [];
        const matches = [];

        // Handle different possible structures (array of leagues or flat matches)
        if (Array.isArray(data)) {
            data.forEach(league => {
                if (league.events) {
                    league.events.forEach(event => {
                        matches.push({ ...event, league_name: league.NAME });
                    });
                }
            });
        }

        return matches;
    } catch (error) {
        console.error('[DailyAnalyst] Fetch Schedule Error:', error.message);
        return [];
    }
}

// 2. Fetch H2H & Form for Stats
async function fetchMatchH2H(matchId) {
    try {
        // Endpoint provided by user: '/match/h2h/{id}'
        const response = await axios.get(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/h2h/${matchId}`, {
            headers: FLASHSCORE_API.headers
        });
        return response.data;
    } catch (error) {
        // console.warn(`[DailyAnalyst] No H2H for ${matchId}`);
        return null;
    }
}

// Helper: Calculate Stats from Last 5 Matches
function calculateFormStats(history, teamType) { // teamType = '1' (Home) or '2' (Away)
    if (!history || !Array.isArray(history)) return null;

    // Most recent 5-8 matches
    const recent = history.slice(0, 8);

    let totalGoals = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let wins = 0;
    let losses = 0;
    let homeLosses = 0; // Lost at home
    let count = 0;

    for (const m of recent) {
        // Parse score "2 : 1"
        const scores = (m.result || "").split(" : ");
        if (scores.length !== 2) continue;

        const score1 = parseInt(scores[0]);
        const score2 = parseInt(scores[1]);

        // Determine isHome (Not always easy from simple array, usually H2H array has markers)
        // Assuming user H2H format has 'host_guest_type' or we infer.
        // Simplified assumption: We trust the list passed is relevant to the team.

        totalGoals += (score1 + score2);

        // Simple heuristic: If we don't know if match was H/A, we take general avg
        // This is "Form" analysis
        count++;
    }

    if (count === 0) return null;

    return {
        avgGoalsMatch: totalGoals / count,
        avgScored: totalGoals / count / 2, // Rough estimate if we don't track side
        avgConceded: totalGoals / count / 2
    };
}

// 3. The "4-Pillar" Filter Logic
async function processAndFilter(matches) {
    const candidates = {
        over15: [],         // Pillar 1: Safety Net
        doubleChance1X: [], // Pillar 2: The Fortress (Skip for now as H/A detection tricky)
        btts: [],           // Pillar 3: Goal Fest
        homeOver15: []      // Pillar 4: Pro Value
    };

    console.log(`[DailyAnalyst] Processing top ${MATCH_LIMIT} matches...`);

    // Prioritize major leagues if we can, or just take first N
    // Filter matches that are NOT started or finished (status logic if needed)

    let processed = 0;
    for (const m of matches) {
        if (processed >= MATCH_LIMIT) break;

        // Fetch H2H
        const h2hData = await fetchMatchH2H(m.event_key || m.match_id); // Adjust key based on API
        if (!h2hData) continue;

        const homeHistory = h2hData.DATA?.find(d => d.GROUPS_LABEL === 'Last matches: Home team')?.ROWS || [];
        const awayHistory = h2hData.DATA?.find(d => d.GROUPS_LABEL === 'Last matches: Away team')?.ROWS || [];

        const homeStats = calculateFormStats(homeHistory, '1');
        const awayStats = calculateFormStats(awayHistory, '2');

        if (!homeStats || !awayStats) continue;

        processed++;

        const stats = {
            leagueAvgGoals: (homeStats.avgGoalsMatch + awayStats.avgGoalsMatch) / 2, // Proxy for league avg
            homeAvgGoals: homeStats.avgGoalsMatch,
            awayAvgGoals: awayStats.avgGoalsMatch
        };

        // 1. Safety Net (Over 1.5 Goals) -> Both teams high goal trends
        if (stats.homeAvgGoals > 2.5 && stats.awayAvgGoals > 2.5) {
            candidates.over15.push({ ...m, filterStats: stats, market: 'Over 1.5 Goals' });
        }

        // 3. Goal Fest (BTTS) -> Both teams typically score/concede (High avg match goals)
        if (stats.homeAvgGoals > 3.0 || stats.awayAvgGoals > 3.0) {
            candidates.btts.push({ ...m, filterStats: stats, market: 'BTTS' });
        }

        // 4. Pro Value (Home Over 1.5) -> High Home Avg
        if (homeStats.avgGoalsMatch > 3.5) { // Adjusted threshold for proxy
            candidates.homeOver15.push({ ...m, filterStats: stats, market: 'Home Team Over 1.5' });
        }
    }

    return candidates;
}

// 4. AI Validation
async function validateWithGemini(match) {
    if (!GEMINI_API_KEY) return { verdict: 'SKIP', reason: 'No API Key' };

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    Analyze this football match for market: ${match.market}.
    Match: ${match.event_home_team || 'Home'} vs ${match.event_away_team || 'Away'} (League: ${match.league_name})
    Stats: Avg Match Goals (Home Form): ${match.filterStats.homeAvgGoals.toFixed(2)}, Away Form: ${match.filterStats.awayAvgGoals.toFixed(2)}
    
    Is this a safe bet?
    Respond in JSON: { "verdict": "PLAY", "confidence": 90, "reason": "Short reason" }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error('Gemini Error:', e.message);
        return { verdict: 'SKIP', reason: 'AI Error' };
    }
}

// Main Runner
async function runDailyAnalysis() {
    // 1. Fetch
    const matches = await fetchTodaysFixtures();
    console.log(`[DailyAnalyst] Found ${matches.length} fixtures. Filtering...`);

    if (matches.length === 0) return { over15: [], btts: [], homeOver15: [] };

    // 2. Filter
    const candidates = await processAndFilter(matches);

    const results = {
        over15: [],
        btts: [],
        homeOver15: []
    };

    // 3. AI Validate (Limit to top 3 per category)
    for (const cat of Object.keys(candidates)) {
        if (!results[cat]) continue;
        for (const match of candidates[cat].slice(0, 3)) {
            const aiRes = await validateWithGemini(match);
            if (aiRes.verdict === 'PLAY') {
                results[cat].push({
                    match: `${match.event_home_team} vs ${match.event_away_team}`,
                    startTime: match.event_start_time,
                    stats: match.filterStats,
                    aiAnalysis: aiRes
                });
            }
        }
    }

    return results;
}

module.exports = { runDailyAnalysis };
