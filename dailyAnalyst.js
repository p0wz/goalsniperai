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
const MATCH_LIMIT = 100;

// Helper: Delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Fetch with Retry (Handles 429)
async function fetchWithRetry(url, options, retries = 3) {
    try {
        return await axios.get(url, options);
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            console.log(`[DailyAnalyst] Rate limit hit (429). Waiting 2s...`);
            await sleep(2000);
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

// 1. Data Fetching - Today's Schedule
async function fetchTodaysFixtures(log = console) {
    try {
        log.info('[DailyAnalyst] Fetching schedule from /match/list/1/0 ...');
        // Use fetchWithRetry instead of plain axios.get
        const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/list/1/0`, {
            headers: FLASHSCORE_API.headers
        });

        const data = response.data;
        // Debug Log to help user
        // log.info(`[DailyAnalyst] API Response Keys: ${Object.keys(data)}`);

        // Flashscore4 'match/list' structure handling
        const matches = [];
        const list = data.DATA || data;

        if (Array.isArray(list)) {
            list.forEach(item => {
                // Item might be a Tournament object with EVENTS
                if (item.EVENTS && Array.isArray(item.EVENTS)) {
                    item.EVENTS.forEach(event => {
                        matches.push({ ...event, league_name: item.NAME });
                    });
                }
            });
        }

        return matches;
    } catch (error) {
        log.error(`[DailyAnalyst] Fetch Schedule Error: ${error.message}`);
        return [];
    }
}

// 2. Fetch H2H & Form for Stats
async function fetchMatchH2H(matchId) {
    try {
        const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/h2h/${matchId}`, {
            headers: FLASHSCORE_API.headers
        });
        return response.data;
    } catch (error) {
        return null;
    }
}

// Helper: Calculate Stats from Last 5 Matches
function calculateFormStats(history, teamType) {
    if (!history || !Array.isArray(history)) return null;

    // Most recent 8 matches
    const recent = history.slice(0, 8);

    let totalGoals = 0;
    let count = 0;

    for (const m of recent) {
        // Parse score "2 : 1"
        const scores = (m.result || "").split(" : ");
        if (scores.length !== 2) continue;

        const score1 = parseInt(scores[0]);
        const score2 = parseInt(scores[1]);

        totalGoals += (score1 + score2);
        count++;
    }

    if (count === 0) return null;

    return {
        avgGoalsMatch: totalGoals / count
    };
}

// 3. The "4-Pillar" Filter Logic
async function processAndFilter(matches, log = console) {
    const candidates = {
        over15: [],
        btts: [],
        homeOver15: []
    };

    console.log(`[DailyAnalyst] Processing top ${MATCH_LIMIT} matches...`);

    let processed = 0;
    for (const m of matches) {
        if (processed >= MATCH_LIMIT) break;

        // Skip match if missing ID
        const mid = m.event_key || m.match_id;
        if (!mid) continue;

        // Fetch H2H
        const h2hData = await fetchMatchH2H(mid);
        if (!h2hData) continue;

        const homeHistory = h2hData.DATA?.find(d => d.GROUPS_LABEL?.includes('Home'))?.ROWS || [];
        const awayHistory = h2hData.DATA?.find(d => d.GROUPS_LABEL?.includes('Away'))?.ROWS || [];

        const homeStats = calculateFormStats(homeHistory, '1');
        const awayStats = calculateFormStats(awayHistory, '2');

        if (!homeStats || !awayStats) continue;

        processed++;

        const stats = {
            leagueAvgGoals: (homeStats.avgGoalsMatch + awayStats.avgGoalsMatch) / 2, // Proxy
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
        if (homeStats.avgGoalsMatch > 3.5) {
            candidates.homeOver15.push({ ...m, filterStats: stats, market: 'Home Team Over 1.5' });
        }
    }

    log.info(`[DailyAnalyst] Filtered ${processed} matches. Candidates: O1.5(${candidates.over15.length}), BTTS(${candidates.btts.length})`);

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
async function runDailyAnalysis(log = console) {
    // 1. Fetch
    let matches = await fetchTodaysFixtures(log);

    // Fallback: If 0 matches, maybe day '1' is tomorrow and today is empty?
    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Found 0 matches. Please check API schedule endpoint.');
        return { over15: [], btts: [], homeOver15: [] };
    }

    log.info(`[DailyAnalyst] Found ${matches.length} raw fixtures. Processing top ${MATCH_LIMIT}...`);

    // 2. Filter
    const candidates = await processAndFilter(matches, log);

    const results = {
        over15: [],
        btts: [],
        homeOver15: []
    };

    // 3. AI Validate (Limit to top 3 per category)
    let aiCount = 0;
    for (const cat of Object.keys(candidates)) {
        if (!candidates[cat]) continue; // Safety check
        for (const match of candidates[cat].slice(0, 3)) {
            aiCount++;
            log.info(`[DailyAnalyst] Asking Gemini: ${match.event_home_team} vs ${match.event_away_team}`);
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

    log.success(`[DailyAnalyst] Analysis Done. AI Checks: ${aiCount}. Found: ${results.over15.length + results.btts.length} signals.`);
    return results;
}

module.exports = { runDailyAnalysis };
