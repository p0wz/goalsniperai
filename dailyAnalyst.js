/**
 * dailyAnalyst.js
 * "The Daily Pre-Match Analyst" - Real Data Implementation
 */
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const betTracker = require('./betTracker');
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

// Helper: Calculate Detailed Stats
function calculateAdvancedStats(history, teamName) {
    if (!history || !Array.isArray(history) || history.length === 0) return null;

    let totalMatches = 0;
    let totalGoals = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let over15Count = 0;
    let under35Count = 0;
    let bttsCount = 0;
    let cleanSheetCount = 0;
    let failedToScoreCount = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;

    for (const m of history) {
        let s1 = 0, s2 = 0; // s1=Home, s2=Away (in the match context)

        if (m.home_team?.score !== undefined && m.away_team?.score !== undefined) {
            s1 = parseInt(m.home_team.score);
            s2 = parseInt(m.away_team.score);
        } else {
            // Fallback
            continue;
        }

        if (isNaN(s1) || isNaN(s2)) continue;

        totalMatches++;
        const total = s1 + s2;
        totalGoals += total;

        // Determine if target team is Home or Away in this specific historical match
        const isHome = m.home_team?.name === teamName;
        const myScore = isHome ? s1 : s2;
        const oppScore = isHome ? s2 : s1;

        goalsScored += myScore;
        goalsConceded += oppScore;

        if (total > 1.5) over15Count++;
        if (total <= 3.5) under35Count++;
        if (s1 > 0 && s2 > 0) bttsCount++;
        if (oppScore === 0) cleanSheetCount++;
        if (myScore === 0) failedToScoreCount++;

        if (myScore > oppScore) wins++;
        else if (myScore === oppScore) draws++;
        else losses++;
    }

    if (totalMatches === 0) return null;

    return {
        matches: totalMatches,
        avgTotalGoals: totalGoals / totalMatches,
        avgScored: goalsScored / totalMatches,
        avgConceded: goalsConceded / totalMatches,
        over15Rate: (over15Count / totalMatches) * 100,
        under35Rate: (under35Count / totalMatches) * 100,
        bttsRate: (bttsCount / totalMatches) * 100,
        scoringRate: ((totalMatches - failedToScoreCount) / totalMatches) * 100,
        winRate: (wins / totalMatches) * 100,
        lossCount: losses
    };
}

// 3. The "Scout" Filter Logic (Updated)
async function processAndFilter(matches, log = console, limit = MATCH_LIMIT) {
    const candidates = {
        over15: [],
        btts: [],
        doubleChance: [], // 1X
        homeOver15: [],
        under35: [] // NEW: Sigorta Bahsi
    };

    console.log(`[DailyAnalyst] Processing top ${limit} matches...`);

    let processed = 0;
    let consecutiveErrors = 0;

    for (const m of matches) {
        if (processed >= limit) break;

        // Circuit Breaker
        if (consecutiveErrors >= 3) {
            log.error('[DailyAnalyst] Circuit Breaker: Too many consecutive errors. Aborting.');
            break;
        }

        const mid = m.event_key || m.match_id;
        if (!mid) continue;

        await sleep(800);

        const h2hData = await fetchMatchH2H(mid);
        if (!h2hData) {
            consecutiveErrors++;
            continue;
        }

        const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);

        // 1. All History (For Form)
        const homeAllHistory = sections.filter(x =>
            (x.home_team?.name === m.event_home_team) || (x.away_team?.name === m.event_home_team)
        ).slice(0, 5); // Last 5 for Form

        const awayAllHistory = sections.filter(x =>
            (x.home_team?.name === m.event_away_team) || (x.away_team?.name === m.event_away_team)
        ).slice(0, 5); // Last 5 for Form

        // 2. Venue Specific History (For Stats)
        const homeAtHomeHistory = sections.filter(x => x.home_team?.name === m.event_home_team).slice(0, 8);
        const awayAtAwayHistory = sections.filter(x => x.away_team?.name === m.event_away_team).slice(0, 8);

        // 3. Mutual H2H (Last 3)
        const mutualH2H = sections.filter(x =>
            (x.home_team?.name === m.event_home_team && x.away_team?.name === m.event_away_team) ||
            (x.home_team?.name === m.event_away_team && x.away_team?.name === m.event_home_team)
        ).slice(0, 3);

        // Calc Stats
        const homeForm = calculateAdvancedStats(homeAllHistory, m.event_home_team);
        const awayForm = calculateAdvancedStats(awayAllHistory, m.event_away_team);
        const homeHomeStats = calculateAdvancedStats(homeAtHomeHistory, m.event_home_team);
        const awayAwayStats = calculateAdvancedStats(awayAtAwayHistory, m.event_away_team);

        if (!homeForm || !awayForm || !homeHomeStats || !awayAwayStats) {
            consecutiveErrors = 0;
            continue;
        }

        consecutiveErrors = 0;
        processed++;

        const stats = {
            homeForm, awayForm, homeHomeStats, awayAwayStats, mutual: mutualH2H
        };

        // --- STRATEGY A: Over 1.5 Goals (Garanti) ---
        const proxyLeagueAvg = (homeForm.avgTotalGoals + awayForm.avgTotalGoals) / 2;
        if (proxyLeagueAvg >= 2.5 && homeForm.over15Rate >= 60 && awayForm.over15Rate >= 60) {
            candidates.over15.push({ ...m, filterStats: stats, market: 'Over 1.5 Goals' });
        }

        // --- STRATEGY B: BTTS (Gol Soleni) ---
        if (homeHomeStats.scoringRate >= 70 && awayAwayStats.scoringRate >= 65) {
            candidates.btts.push({ ...m, filterStats: stats, market: 'BTTS' });
        }

        // --- STRATEGY C: 1X Double Chance (Kale) ---
        if (homeHomeStats.lossCount <= 2 && awayAwayStats.winRate < 35) {
            candidates.doubleChance.push({ ...m, filterStats: stats, market: '1X Double Chance' });
        }

        // --- STRATEGY D: Home Over 1.5 (Pro Value) ---
        if (homeHomeStats.avgScored >= 1.4 && awayAwayStats.avgConceded >= 1.2) {
            candidates.homeOver15.push({ ...m, filterStats: stats, market: 'Home Team Over 1.5' });
        }

        // --- STRATEGY E: Under 3.5 Goals (Sigorta) ---
        // 1. League Avg < 2.4
        // 2. Both teams 80% Under 3.5 in last 5
        // 3. Mutual H2H: No match > 4 goals
        let h2hSafe = true;
        if (mutualH2H.length > 0) {
            h2hSafe = mutualH2H.every(g => {
                const t = parseInt(g.home_team?.score || 0) + parseInt(g.away_team?.score || 0);
                return t <= 4; // "Hiç 4'ü geçmemiş" -> Max 4 allowed
            });
        }

        if (proxyLeagueAvg < 2.4 && homeForm.under35Rate >= 80 && awayForm.under35Rate >= 80 && h2hSafe) {
            candidates.under35.push({ ...m, filterStats: stats, market: 'Under 3.5 Goals' });
        }
    }

    log.info(`[DailyAnalyst] Filtered ${processed} matches (Limit: ${limit}). O1.5:${candidates.over15.length}, BTTS:${candidates.btts.length}, 1X:${candidates.doubleChance.length}, H1.5:${candidates.homeOver15.length}, U3.5:${candidates.under35.length}`);

    return candidates;
}

// 4. AI Validation
async function validateWithGemini(match) {
    if (!GEMINI_API_KEY) return { verdict: 'SKIP', reason: 'No API Key' };

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Analyze this football match for market: ${match.market}.
    Match: ${match.event_home_team} vs ${match.event_away_team}
    Stats: 
    - Home Form (Last 5): Over 1.5 Rate ${match.filterStats.homeForm.over15Rate}%, Avg Scored ${match.filterStats.homeForm.avgScored}
    - Away Form (Last 5): Over 1.5 Rate ${match.filterStats.awayForm.over15Rate}%, Avg Scored ${match.filterStats.awayForm.avgScored}
    - Home @ Home: Scored in ${match.filterStats.homeHomeStats.scoringRate}% of games, Avg Scored ${match.filterStats.homeHomeStats.avgScored}
    - Away @ Away: Scored in ${match.filterStats.awayAwayStats.scoringRate}% of games, Avg Conceded ${match.filterStats.awayAwayStats.avgConceded}
    
    Is this bet solid?
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
        return { over15: [], btts: [], doubleChance: [], homeOver15: [], under35: [] };
    }

    log.info(`[DailyAnalyst] Found ${matches.length} raw fixtures. Processing top ${customLimit}...`);

    // 2. Filter
    const candidates = await processAndFilter(matches, log, customLimit);

    const results = {
        over15: [],
        btts: [],
        doubleChance: [],
        homeOver15: [],
        under35: []
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

                // Record Bet for Tracking
                betTracker.recordBet({
                    match_id: match.event_key || match.match_id,
                    home_team: match.event_home_team,
                    away_team: match.event_away_team
                }, match.market, cat, aiRes.confidence);

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
