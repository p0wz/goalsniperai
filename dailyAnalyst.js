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
const MATCH_LIMIT = 50; // Reduced to save quota

// Helper: Delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Fetch with Retry
async function fetchWithRetry(url, options, retries = 2, delay = 1000) {
    try {
        return await axios.get(url, options);
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            console.log(`[DailyAnalyst] Rate limit (429). Waiting ${delay / 1000}s...`);
            await sleep(delay);
            return fetchWithRetry(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}

// ... (fetchTodaysFixtures remains same)

// 4. AI Validation
async function validateWithGemini(match) {
    if (!GEMINI_API_KEY) return { verdict: 'SKIP', reason: 'No API Key' };

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Switched to 'gemini-pro' as 'gemini-1.5-flash' returned 404 for this library version
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
