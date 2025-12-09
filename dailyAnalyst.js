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

// Helper: Fetch with Retry (Handles 429 with Exponential Backoff)
async function fetchWithRetry(url, options, retries = 5, delay = 2000) {
    try {
        return await axios.get(url, options);
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            console.log(`[DailyAnalyst] Rate limit (429). Waiting ${delay / 1000}s...`);
            await sleep(delay);
            // Double the delay for next attempt (Exponential Backoff)
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}

// 1. Data Fetching - Today's Schedule
async function fetchTodaysFixtures(log = console) {
    let matches = [];

    // Helper to fetch/parse a specific day
    const fetchDay = async (day) => {
        try {
            log.info(`[DailyAnalyst] Fetching day ${day}...`);
            const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/list/${day}/0`, {
                headers: FLASHSCORE_API.headers
            });
            const data = response.data;

            // DEEP DEBUG: Log structure to identify the issue
            log.info(`[DailyAnalyst] Response Type: ${typeof data}`);
            if (typeof data === 'object') {
                log.info(`[DailyAnalyst] Keys: ${Object.keys(data).join(', ')}`);
                log.info(`[DailyAnalyst] Preview: ${JSON.stringify(data).slice(0, 300)}`);
            }

            // PARSING STRATEGY:
            // The API returns an Array of Tournaments directly.
            // Structure: [ { name: "League", matches: [ { match_id: "...", home_team: { name: "..." } } ] } ]

            const parsed = [];

            // Handle if data is array or object-array
            const list = Array.isArray(data) ? data : Object.values(data);

            list.forEach(tournament => {
                if (tournament.matches && Array.isArray(tournament.matches)) {
                    tournament.matches.forEach(match => {
                        // Map API fields to our internal format
                        parsed.push({
                            event_key: match.match_id,
                            match_id: match.match_id, // duplicate for safety
                            event_start_time: match.timestamp,
                            event_home_team: match.home_team?.name || 'Unknown Home',
                            event_away_team: match.away_team?.name || 'Unknown Away',
                            league_name: tournament.name || 'Unknown League'
                        });
                    });
                }
            });

            log.info(`[DailyAnalyst] Parsed ${parsed.length} matches from Day ${day}.`);
            return parsed;
        } catch (e) {
            log.error(`[DailyAnalyst] Failed to fetch day ${day}: ${e.message}`);
            return [];
        }
    };

    // Try Day 1 (User provided default)
    matches = await fetchDay(1);

    // Fallback to Day 0 (Today) if Day 1 (Tomorrow?) is empty or failed
    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Day 1 returned 0 matches. Trying Day 0 (Today)...');
        matches = await fetchDay(0);
    }

    return matches;
}

// 2. Fetch H2H & Form for Stats
async function fetchMatchH2H(matchId) {
    try {
        const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/h2h/${matchId}`, {
            headers: FLASHSCORE_API.headers
        });

        return response.data;
    } catch (error) {
        return null; // Silent fail (continue loop)
    }
}

// Helper: Calculate Stats from Last 5 Matches
function calculateFormStats(history, teamType) { // teamType not strictly needed anymore but kept for signature
    if (!history || !Array.isArray(history)) return null;

    // Most recent 8 matches
    const recent = history.slice(0, 8);

    let totalGoals = 0;
    let count = 0;

    for (const m of recent) {
        // New structure: home_team.score, away_team.score
        let s1 = 0, s2 = 0;

        if (m.home_team?.score !== undefined && m.away_team?.score !== undefined) {
            s1 = parseInt(m.home_team.score);
            s2 = parseInt(m.away_team.score);
        } else if (m.result) {
            // Legacy/Fallback parsing
            const scores = m.result.split(" : ");
            if (scores.length === 2) {
                s1 = parseInt(scores[0]);
                s2 = parseInt(scores[1]);
            } else {
                continue;
            }
        } else {
            continue;
        }

        if (isNaN(s1) || isNaN(s2)) continue;

        totalGoals += (s1 + s2);
        count++;
    }

    if (count === 0) return null;

    return {
        avgGoalsMatch: totalGoals / count
    };
}

// 3. The "4-Pillar" Filter Logic
async function processAndFilter(matches, log = console, limit = MATCH_LIMIT) {
    const candidates = {
        over15: [],
        btts: [],
        homeOver15: []
    };

    console.log(`[DailyAnalyst] Processing top ${limit} matches...`);

    let processed = 0;
    let consecutiveErrors = 0;

    for (const m of matches) {
        if (processed >= limit) break;

        // Circuit Breaker: If 3 matches fail in a row (likely 429 or API down), STOP.
        if (consecutiveErrors >= 3) {
            log.error('[DailyAnalyst] Circuit Breaker: Too many consecutive API errors/429s. Aborting analysis to save quota.');
            break;
        }

        // Skip match if missing ID
        const mid = m.event_key || m.match_id;
        if (!mid) continue;

        // Rate Limit: 800ms between calls
        await sleep(800);

        // Fetch H2H
        const h2hData = await fetchMatchH2H(mid);
        if (!h2hData) {
            consecutiveErrors++;
            continue;
        }

        // API returns Array directly now, logic update:
        const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);

        // DEBUG: Log first section to understand structure
        if (consecutiveErrors === 0 && processed === 0) {
            console.log('[DailyAnalyst] H2H Sample Section:', JSON.stringify(sections[0] || "Empty").slice(0, 200));
        }

        const homeHistory = sections.find(d => d.GROUPS_LABEL?.includes('Home'))?.ROWS || [];
        const awayHistory = sections.find(d => d.GROUPS_LABEL?.includes('Away'))?.ROWS || [];

        const homeStats = calculateFormStats(homeHistory, '1');
        const awayStats = calculateFormStats(awayHistory, '2');

        if (!homeStats || !awayStats) {
            consecutiveErrors++; // No stats counts as error for safety
            continue;
        }

        // Success! Reset errors
        consecutiveErrors = 0;
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

    log.info(`[DailyAnalyst] Filtered ${processed} matches (Limit: ${limit}). Candidates: O1.5(${candidates.over15.length}), BTTS(${candidates.btts.length})`);

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
async function runDailyAnalysis(log = console, customLimit = MATCH_LIMIT) {
    // 1. Fetch
    let matches = await fetchTodaysFixtures(log);

    // Fallback: If 0 matches, maybe day '1' is tomorrow and today is empty?
    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Found 0 matches. Please check API schedule endpoint.');
        return { over15: [], btts: [], homeOver15: [] };
    }

    log.info(`[DailyAnalyst] Found ${matches.length} raw fixtures. Processing top ${customLimit}...`);

    // 2. Filter
    const candidates = await processAndFilter(matches, log, customLimit);

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

    log.success(`[DailyAnalyst] Analysis Done (Limit: ${customLimit}). AI Checks: ${aiCount}. Found: ${results.over15.length + results.btts.length} signals.`);
    return results;
}

module.exports = { runDailyAnalysis };
