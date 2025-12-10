/**
 * dailyAnalyst.js
 * "The Daily Pre-Match Analyst" - Real Data Implementation
 */
const axios = require('axios');
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

const MATCH_LIMIT = 50; // Quota safe limit

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

// Helper: Fetch Day
async function fetchDay(day, log = console) {
    try {
        log.info(`[DailyAnalyst] Fetching day ${day}...`);
        const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/list/${day}/0`, {
            headers: FLASHSCORE_API.headers
        });
        const data = response.data;
        const parsed = [];
        const list = Array.isArray(data) ? data : Object.values(data);
        const now = Date.now();

        list.forEach(tournament => {
            if (tournament.matches && Array.isArray(tournament.matches)) {
                tournament.matches.forEach(match => {
                    // Filter: Skip matches that have already started or finished
                    const matchTime = match.timestamp ? match.timestamp * 1000 : 0; // API is seconds, JS is ms
                    if (matchTime < now) {
                        return; // Skip this match
                    }

                    parsed.push({
                        event_key: match.match_id,
                        match_id: match.match_id,
                        event_start_time: match.timestamp,
                        event_home_team: match.home_team?.name || 'Unknown Home',
                        event_away_team: match.away_team?.name || 'Unknown Away',
                        league_name: tournament.name || 'Unknown League'
                    });
                });
            }
        });
        log.info(`[DailyAnalyst] Parsed ${parsed.length} UPCOMING matches from Day ${day}.`);
        return parsed;
    } catch (e) {
        log.error(`[DailyAnalyst] Failed to fetch day ${day}: ${e.message}`);
        return [];
    }
}

// 2. Fetch H2H
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

// Helper: Calculate Stats
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
        let s1 = 0, s2 = 0;
        if (m.home_team?.score !== undefined && m.away_team?.score !== undefined) {
            s1 = parseInt(m.home_team.score);
            s2 = parseInt(m.away_team.score);
        } else continue;

        if (isNaN(s1) || isNaN(s2)) continue;

        totalMatches++;
        const total = s1 + s2;
        totalGoals += total;

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

// 3. Process & Filter
async function processAndFilter(matches, log = console, limit = MATCH_LIMIT) {
    const candidates = {
        over15: [],
        btts: [],
        doubleChance: [],
        homeOver15: [],
        under35: []
    };

    let processed = 0;
    let consecutiveErrors = 0;
    let skippedNoH2H = 0;
    let skippedNoStats = 0;

    log.info(`═══════════════════════════════════════════════════════`);
    log.info(`📊 DAILY ANALYST - PROCESSING ${Math.min(matches.length, limit)} MATCHES`);
    log.info(`═══════════════════════════════════════════════════════`);

    for (const m of matches) {
        if (processed >= limit) {
            log.info(`\n⏹️ Reached limit of ${limit} matches. Stopping.`);
            break;
        }
        if (consecutiveErrors >= 3) {
            log.error('[DailyAnalyst] Circuit Breaker: Too many consecutive errors. Aborting.');
            break;
        }

        const mid = m.event_key || m.match_id;
        if (!mid) continue;

        const matchNum = processed + 1;
        log.info(`\n───────────────────────────────────────────────────────`);
        log.info(`📌 [${matchNum}/${limit}] ${m.event_home_team} vs ${m.event_away_team}`);
        log.info(`   📍 League: ${m.league_name}`);

        await sleep(800);

        log.info(`   🔍 Fetching H2H data...`);
        const h2hData = await fetchMatchH2H(mid);
        if (!h2hData) {
            log.warn(`   ❌ H2H fetch failed - skipping`);
            consecutiveErrors++;
            skippedNoH2H++;
            continue;
        }

        const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);
        log.info(`   ✅ H2H fetched: ${sections.length} historical matches`);

        // Filter History
        const homeAllHistory = sections.filter(x => (x.home_team?.name === m.event_home_team) || (x.away_team?.name === m.event_home_team)).slice(0, 5);
        const awayAllHistory = sections.filter(x => (x.home_team?.name === m.event_away_team) || (x.away_team?.name === m.event_away_team)).slice(0, 5);
        const homeAtHomeHistory = sections.filter(x => x.home_team?.name === m.event_home_team).slice(0, 8);
        const awayAtAwayHistory = sections.filter(x => x.away_team?.name === m.event_away_team).slice(0, 8);
        const mutualH2H = sections.filter(x =>
            (x.home_team?.name === m.event_home_team && x.away_team?.name === m.event_away_team) ||
            (x.home_team?.name === m.event_away_team && x.away_team?.name === m.event_home_team)
        ).slice(0, 3);

        log.info(`   📈 History: Home(${homeAllHistory.length}) Away(${awayAllHistory.length}) H@H(${homeAtHomeHistory.length}) A@A(${awayAtAwayHistory.length}) Mutual(${mutualH2H.length})`);

        const homeForm = calculateAdvancedStats(homeAllHistory, m.event_home_team);
        const awayForm = calculateAdvancedStats(awayAllHistory, m.event_away_team);
        const homeHomeStats = calculateAdvancedStats(homeAtHomeHistory, m.event_home_team);
        const awayAwayStats = calculateAdvancedStats(awayAtAwayHistory, m.event_away_team);

        if (!homeForm || !awayForm || !homeHomeStats || !awayAwayStats) {
            log.warn(`   ❌ Insufficient stats - skipping`);
            consecutiveErrors = 0;
            skippedNoStats++;
            continue;
        }

        consecutiveErrors = 0;
        processed++;
        const stats = { homeForm, awayForm, homeHomeStats, awayAwayStats, mutual: mutualH2H };
        const proxyLeagueAvg = (homeForm.avgTotalGoals + awayForm.avgTotalGoals) / 2;

        // Log calculated stats
        log.info(`   📊 STATS:`);
        log.info(`      • League Avg Goals: ${proxyLeagueAvg.toFixed(2)}`);
        log.info(`      • Home Over1.5: ${homeForm.over15Rate.toFixed(0)}% | Away Over1.5: ${awayForm.over15Rate.toFixed(0)}%`);
        log.info(`      • Home Scoring@Home: ${homeHomeStats.scoringRate.toFixed(0)}% | Away Scoring@Away: ${awayAwayStats.scoringRate.toFixed(0)}%`);
        log.info(`      • Home AvgScored@Home: ${homeHomeStats.avgScored.toFixed(2)} | Away AvgConceded@Away: ${awayAwayStats.avgConceded.toFixed(2)}`);

        // Check each filter
        const passedFilters = [];

        // Logic A: Over 1.5
        if (proxyLeagueAvg >= 2.5 && homeForm.over15Rate >= 60 && awayForm.over15Rate >= 60) {
            candidates.over15.push({ ...m, filterStats: stats, market: 'Over 1.5 Goals' });
            passedFilters.push('Over 1.5');
        }
        // Logic B: BTTS
        if (homeHomeStats.scoringRate >= 70 && awayAwayStats.scoringRate >= 65) {
            candidates.btts.push({ ...m, filterStats: stats, market: 'BTTS' });
            passedFilters.push('BTTS');
        }
        // Logic C: 1X
        if (homeHomeStats.lossCount <= 2 && awayAwayStats.winRate < 35) {
            candidates.doubleChance.push({ ...m, filterStats: stats, market: '1X Double Chance' });
            passedFilters.push('1X DC');
        }
        // Logic D: Home Over 1.5
        if (homeHomeStats.avgScored >= 1.4 && awayAwayStats.avgConceded >= 1.2) {
            candidates.homeOver15.push({ ...m, filterStats: stats, market: 'Home Team Over 1.5' });
            passedFilters.push('Home O1.5');
        }
        // Logic E: Under 3.5
        let h2hSafe = mutualH2H.every(g => (parseInt(g.home_team?.score || 0) + parseInt(g.away_team?.score || 0)) <= 4);
        if (proxyLeagueAvg < 2.4 && homeForm.under35Rate >= 80 && awayForm.under35Rate >= 80 && h2hSafe) {
            candidates.under35.push({ ...m, filterStats: stats, market: 'Under 3.5 Goals' });
            passedFilters.push('Under 3.5');
        }

        if (passedFilters.length > 0) {
            log.info(`   ✅ PASSED: ${passedFilters.join(', ')}`);
        } else {
            log.info(`   ⏭️ No filters passed`);
        }
    }

    // Summary
    log.info(`\n═══════════════════════════════════════════════════════`);
    log.info(`📊 FILTER SUMMARY`);
    log.info(`   • Processed: ${processed}/${limit}`);
    log.info(`   • Skipped (No H2H): ${skippedNoH2H}`);
    log.info(`   • Skipped (No Stats): ${skippedNoStats}`);
    log.info(`   • Over 1.5 candidates: ${candidates.over15.length}`);
    log.info(`   • BTTS candidates: ${candidates.btts.length}`);
    log.info(`   • 1X DC candidates: ${candidates.doubleChance.length}`);
    log.info(`   • Home O1.5 candidates: ${candidates.homeOver15.length}`);
    log.info(`   • Under 3.5 candidates: ${candidates.under35.length}`);
    log.info(`═══════════════════════════════════════════════════════`);

    return candidates;
}

// 4. AI Validation with Retry (Groq - Llama 3 70B)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

async function validateWithAI(match, retries = 3) {
    if (!GROQ_API_KEY) return { verdict: 'SKIP', reason: 'GROQ_API_KEY not configured' };

    const prompt = `Analyze this football match for market: ${match.market}.
Match: ${match.event_home_team} vs ${match.event_away_team}
Stats:
- Home Form (Last 5): Over 1.5 Rate ${match.filterStats.homeForm.over15Rate.toFixed(0)}%, Avg Scored ${match.filterStats.homeForm.avgScored.toFixed(2)}
- Away Form (Last 5): Over 1.5 Rate ${match.filterStats.awayForm.over15Rate.toFixed(0)}%, Avg Scored ${match.filterStats.awayForm.avgScored.toFixed(2)}
- Home @ Home: Scored in ${match.filterStats.homeHomeStats.scoringRate.toFixed(0)}% of games, Avg Scored ${match.filterStats.homeHomeStats.avgScored.toFixed(2)}
- Away @ Away: Scored in ${match.filterStats.awayAwayStats.scoringRate.toFixed(0)}% of games, Avg Conceded ${match.filterStats.awayAwayStats.avgConceded.toFixed(2)}

Is this bet solid?
Respond in JSON: { "verdict": "PLAY" or "SKIP", "confidence": 0-100, "reason": "Short reason" }`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Groq API
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'llama3-70b-8192',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                    max_tokens: 200
                },
                {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            let text = response.data?.choices?.[0]?.message?.content || '{}';

            // Log raw response
            console.log(`[DeepSeek Raw] ${text.substring(0, 200)}...`);

            // Clean up markdown formatting
            text = text.trim();
            if (text.startsWith('```json')) text = text.slice(7);
            if (text.startsWith('```')) text = text.slice(3);
            if (text.endsWith('```')) text = text.slice(0, -3);
            text = text.trim();

            console.log(`[DeepSeek Clean] ${text}`);

            return JSON.parse(text);
        } catch (e) {
            const isRateLimited = e.message?.includes('429') || e.message?.includes('quota');
            const isOverloaded = e.message?.includes('503') || e.message?.includes('overloaded');

            if ((isRateLimited || isOverloaded) && attempt < retries) {
                const delay = attempt * 2000;
                console.log(`[AI] ${isRateLimited ? '429' : '503'} - Retrying in ${delay / 1000}s (${attempt}/${retries})...`);
                await sleep(delay);
                continue;
            }
            console.error('AI Error:', e.message);
            return { verdict: 'SKIP', reason: 'AI Error' };
        }
    }
    return { verdict: 'SKIP', reason: 'Max retries exceeded' };
}

// Main Runner
async function runDailyAnalysis(log = console, customLimit = MATCH_LIMIT) {
    const startTime = Date.now();

    log.info(`\n`);
    log.info(`╔═══════════════════════════════════════════════════════╗`);
    log.info(`║        🎯 DAILY ANALYST - PRE-MATCH SCAN              ║`);
    log.info(`║        Started: ${new Date().toISOString()}      ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);

    // 1. Fetch
    log.info(`\n📅 STEP 1: Fetching Match List`);
    log.info('[DailyAnalyst] Fetching Day 1 (Target: Today)...');
    let matches = await fetchDay(1, log);

    // Fallback to Day 2 (Tomorrow) if Today is empty
    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Day 1 returned 0 matches. Trying Day 2 (Tomorrow)...');
        matches = await fetchDay(2, log);
    }

    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Found 0 matches. Please check API schedule endpoint.');
        return { over15: [], btts: [], doubleChance: [], homeOver15: [], under35: [] };
    }

    log.info(`✅ Found ${matches.length} upcoming fixtures. Processing top ${customLimit}...`);

    // 2. Process & Filter
    log.info(`\n📈 STEP 2: H2H Analysis & Filtering`);
    const candidates = await processAndFilter(matches, log, customLimit);

    const results = {
        over15: [], btts: [], doubleChance: [], homeOver15: [], under35: []
    };

    // 3. AI Validation
    const totalCandidates = Object.values(candidates).reduce((sum, arr) => sum + arr.length, 0);
    log.info(`\n🤖 STEP 3: AI VALIDATION (${totalCandidates} candidates)`);
    log.info(`═══════════════════════════════════════════════════════`);

    let aiCount = 0;
    let playCount = 0;
    let skipCount = 0;

    for (const cat of Object.keys(candidates)) {
        if (!candidates[cat] || candidates[cat].length === 0) continue;

        log.info(`\n📂 Category: ${cat.toUpperCase()} (${candidates[cat].length} candidates, max 3 to AI)`);

        for (const match of candidates[cat].slice(0, 3)) {
            aiCount++;
            log.info(`\n   [AI ${aiCount}] ${match.event_home_team} vs ${match.event_away_team}`);
            log.info(`          Market: ${match.market}`);

            const aiRes = await validateWithAI(match);

            // Log AI Response Details
            if (aiRes.verdict === 'PLAY') {
                playCount++;
                log.info(`          ✅ PLAY - ${aiRes.confidence}%`);
                log.info(`          📝 ${aiRes.reason}`);

                betTracker.recordBet({
                    match_id: match.event_key || match.match_id,
                    home_team: match.event_home_team,
                    away_team: match.event_away_team
                }, match.market, cat, aiRes.confidence);

                results[cat].push({
                    match: `${match.event_home_team} vs ${match.event_away_team}`,
                    event_home_team: match.event_home_team,
                    event_away_team: match.event_away_team,
                    id: `${match.event_key || match.match_id}_${cat}`,
                    startTime: match.event_start_time,
                    stats: match.filterStats,
                    aiAnalysis: aiRes
                });
            } else {
                skipCount++;
                log.info(`          ⏭️ SKIP - ${aiRes.reason || 'No reason'}`);
            }
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalSignals = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);

    log.info(`\n`);
    log.info(`╔═══════════════════════════════════════════════════════╗`);
    log.info(`║              📊 DAILY ANALYST COMPLETE                ║`);
    log.info(`╠═══════════════════════════════════════════════════════╣`);
    log.info(`║  Duration: ${duration}s                                    ║`);
    log.info(`║  Matches Scanned: ${customLimit}                               ║`);
    log.info(`║  AI Validations: ${aiCount}                                  ║`);
    log.info(`║  PLAY Signals: ${playCount}                                    ║`);
    log.info(`║  SKIP Count: ${skipCount}                                      ║`);
    log.info(`╠═══════════════════════════════════════════════════════╣`);
    log.info(`║  Over 1.5: ${results.over15.length} | BTTS: ${results.btts.length} | 1X: ${results.doubleChance.length} | Home O1.5: ${results.homeOver15.length} | U3.5: ${results.under35.length}  ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);
    log.info(`\n`);

    return results;
}

module.exports = { runDailyAnalysis };
