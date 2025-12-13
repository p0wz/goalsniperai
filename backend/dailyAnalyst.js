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

const MATCH_LIMIT = 150; // Increased limit

// Allowed Leagues Filter (Only analyze these leagues)
// Format: "COUNTRY: League" - matches API format exactly
// Allowed Leagues Filter (Shared with Live Bot)
const ALLOWED_LEAGUES = require('./allowed_leagues');

// Helper: Normalize Turkish/special characters
function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ç/g, 'c')
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ö/g, 'o')
        .replace(/é/g, 'e')
        .replace(/á/g, 'a')
        .replace(/ñ/g, 'n')
        .replace(/[^a-z0-9\s]/g, ''); // Remove other special chars
}

// Helper: Check if league is allowed (fuzzy match with normalization)
function isLeagueAllowed(leagueName) {
    if (!leagueName) return false;
    const normalizedInput = normalizeText(leagueName);
    return ALLOWED_LEAGUES.some(allowed => {
        const normalizedAllowed = normalizeText(allowed);
        return normalizedInput.includes(normalizedAllowed) ||
            normalizedAllowed.includes(normalizedInput);
    });
}

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
        const skippedLeagues = [];
        const list = Array.isArray(data) ? data : Object.values(data);
        const now = Date.now();

        list.forEach(tournament => {
            if (tournament.matches && Array.isArray(tournament.matches)) {
                const leagueName = tournament.name || 'Unknown League';

                // Filter: Skip leagues not in allowed list
                if (!isLeagueAllowed(leagueName)) {
                    if (skippedLeagues.length < 10) {
                        skippedLeagues.push(leagueName);
                    }
                    return; // Skip this tournament
                }

                tournament.matches.forEach(match => {
                    // Filter: Skip matches that have already started or finished
                    const matchTime = match.timestamp ? match.timestamp * 1000 : 0; // API is seconds, JS is ms
                    if (matchTime < now) {
                        return; // Skip this match
                    }

                    // Generate a unique match ID (fallback if API doesn't provide one)
                    const apiMatchId = match.match_id || match.id || match.eventId;
                    // Fallback: timestamp + first 3 chars of home + first 3 chars of away
                    const homePart = (match.home_team?.name || 'UNK').substring(0, 3).toUpperCase();
                    const awayPart = (match.away_team?.name || 'UNK').substring(0, 3).toUpperCase();
                    const fallbackId = `${match.timestamp}_${homePart}_${awayPart}`;
                    const uniqueMatchId = apiMatchId || fallbackId;

                    parsed.push({
                        event_key: uniqueMatchId,
                        match_id: uniqueMatchId,
                        event_start_time: match.timestamp,
                        event_home_team: match.home_team?.name || 'Unknown Home',
                        event_away_team: match.away_team?.name || 'Unknown Away',
                        league_name: leagueName
                    });
                });
            }
        });

        // Debug: Show skipped leagues
        if (skippedLeagues.length > 0) {
            log.info(`[DailyAnalyst] ⚠️ Skipped leagues (first 10): ${skippedLeagues.join(', ')}`);
        }

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
    let over25Count = 0;
    let under25Count = 0;
    let under35Count = 0;
    let bttsCount = 0;
    let cleanSheetCount = 0;
    let failedToScoreCount = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let htGoalCount = 0;  // First Half goals

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
        if (total > 2.5) over25Count++;
        if (total <= 2.5) under25Count++;
        if (total <= 3.5) under35Count++;
        if (s1 > 0 && s2 > 0) bttsCount++;
        if (oppScore === 0) cleanSheetCount++;
        if (myScore === 0) failedToScoreCount++;

        if (myScore > oppScore) wins++;
        else if (myScore === oppScore) draws++;
        else losses++;

        // Track first half goals (if HT data available)
        const htHome = m.home_team?.score_1st_half || 0;
        const htAway = m.away_team?.score_1st_half || 0;
        if (htHome + htAway >= 1) htGoalCount++;
    }

    if (totalMatches === 0) return null;

    return {
        matches: totalMatches,
        avgTotalGoals: totalGoals / totalMatches,
        avgScored: goalsScored / totalMatches,
        avgConceded: goalsConceded / totalMatches,
        over15Rate: (over15Count / totalMatches) * 100,
        over25Rate: (over25Count / totalMatches) * 100,
        under25Rate: (under25Count / totalMatches) * 100,
        under35Rate: (under35Count / totalMatches) * 100,
        bttsRate: (bttsCount / totalMatches) * 100,
        scoringRate: ((totalMatches - failedToScoreCount) / totalMatches) * 100,
        winRate: (wins / totalMatches) * 100,
        lossCount: losses,
        htGoalRate: (htGoalCount / totalMatches) * 100  // First Half goal rate
    };
}

// 3. Process & Filter
async function processAndFilter(matches, log = console, limit = MATCH_LIMIT) {
    const candidates = {
        over25: [],
        doubleChance: [],
        homeOver15: [],
        under35: [],
        under25: []
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

        // Logic A: Over 2.5 (IMPROVED)
        // Lig ort ≥3.0, Her iki takım O2.5 ≥70%, Ev avgScored ≥1.5
        if (proxyLeagueAvg >= 3.0 &&
            homeForm.over25Rate >= 70 && awayForm.over25Rate >= 70 &&
            homeHomeStats.avgScored >= 1.5) {
            candidates.over25.push({ ...m, filterStats: stats, market: 'Over 2.5 Goals' });
            passedFilters.push('Over 2.5');
        }

        // Logic C: BTTS - REMOVED
        // if (homeHomeStats.scoringRate >= 70 && awayAwayStats.scoringRate >= 65) {
        //     candidates.btts.push({ ...m, filterStats: stats, market: 'BTTS' });
        //     passedFilters.push('BTTS');
        // }

        // Logic D: 1X Double Chance (IMPROVED)
        // Ev mağlubiyet ≤1, Dep kazanma <30%, Ev winRate ≥50%, Ev scoringRate ≥75%
        if (homeHomeStats.lossCount <= 1 && awayAwayStats.winRate < 30 &&
            homeHomeStats.winRate >= 50 && homeHomeStats.scoringRate >= 75) {
            candidates.doubleChance.push({ ...m, filterStats: stats, market: '1X Double Chance' });
            passedFilters.push('1X DC');
        }

        // Logic E: Home Over 1.5 (IMPROVED)
        // Ev avgScored ≥1.6, Dep avgConceded ≥1.4, Ev scoringRate ≥80%, Ev over15Rate ≥60%
        if (homeHomeStats.avgScored >= 1.6 && awayAwayStats.avgConceded >= 1.4 &&
            homeHomeStats.scoringRate >= 80 && homeForm.over15Rate >= 60) {
            candidates.homeOver15.push({ ...m, filterStats: stats, market: 'Home Team Over 1.5' });
            passedFilters.push('Home O1.5');
        }
        // Logic E: Under 3.5
        let h2hSafe = mutualH2H.every(g => (parseInt(g.home_team?.score || 0) + parseInt(g.away_team?.score || 0)) <= 4);
        if (proxyLeagueAvg < 2.4 && homeForm.under35Rate >= 80 && awayForm.under35Rate >= 80 && h2hSafe) {
            candidates.under35.push({ ...m, filterStats: stats, market: 'Under 3.5 Goals' });
            passedFilters.push('Under 3.5');
        }

        // Logic F: Under 2.5 (NEW)
        // Strict low-scoring check: League Avg < 2.5, Both Teams U2.5 Rate >= 75%
        if (proxyLeagueAvg < 2.5 && homeForm.under25Rate >= 75 && awayForm.under25Rate >= 75) {
            // Extra Safety: Check H2H history for high scoring games
            const mutualOver35 = mutualH2H.some(g => (parseInt(g.home_team?.score || 0) + parseInt(g.away_team?.score || 0)) > 3);

            if (!mutualOver35) {
                candidates.under25.push({ ...m, filterStats: stats, market: 'Under 2.5 Goals' });
                passedFilters.push('Under 2.5');
            }
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
    log.info(`   • Over 2.5 candidates: ${candidates.over25.length}`);
    log.info(`   • 1X DC candidates: ${candidates.doubleChance.length}`);
    log.info(`   • Home O1.5 candidates: ${candidates.homeOver15.length}`);
    log.info(`   • Under 3.5 candidates: ${candidates.under35.length}`);
    log.info(`   • Under 2.5 candidates: ${candidates.under25.length}`);
    log.info(`═══════════════════════════════════════════════════════`);

    return candidates;
}

// 4. AI Validation with Retry (Groq - Llama 4 Scout)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

async function validateWithAI(match, retries = 3) {
    if (!GROQ_API_KEY) return { verdict: 'SKIP', reason: 'GROQ_API_KEY not configured' };

    const prompt = `You are a professional football betting analyst. Analyze this match for market: ${match.market}.

Match: ${match.event_home_team} vs ${match.event_away_team}

Statistics:
- Home Form (Last 5): Over 1.5 Rate ${match.filterStats.homeForm.over15Rate.toFixed(0)}%, Avg Scored ${match.filterStats.homeForm.avgScored.toFixed(2)}
- Away Form (Last 5): Over 1.5 Rate ${match.filterStats.awayForm.over15Rate.toFixed(0)}%, Avg Scored ${match.filterStats.awayForm.avgScored.toFixed(2)}
- Home @ Home: Scored in ${match.filterStats.homeHomeStats.scoringRate.toFixed(0)}% of games, Avg Scored ${match.filterStats.homeHomeStats.avgScored.toFixed(2)}
- Away @ Away: Scored in ${match.filterStats.awayAwayStats.scoringRate.toFixed(0)}% of games, Avg Conceded ${match.filterStats.awayAwayStats.avgConceded.toFixed(2)}

IMPORTANT: These matches have ALREADY passed strict statistical filters. If you recommend PLAY, give confidence between 80-95%. Only use 70-79% if there are significant concerns.

RESPOND WITH ONLY JSON: {"verdict": "PLAY", "confidence": 85, "reason": "Brief reason"}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Groq API
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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

    // Fetch Day 1 (Today) only
    log.info('[DailyAnalyst] Fetching Day 1 (Today)...');
    let matches = await fetchDay(1, log);

    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Found 0 matches. Please check API schedule endpoint.');
        return { over25: [], doubleChance: [], homeOver15: [], under35: [], under25: [] };
    }

    log.info(`✅ Found ${matches.length} upcoming fixtures. Processing top ${customLimit}...`);

    // 2. Process & Filter
    log.info(`\n📈 STEP 2: H2H Analysis & Filtering`);
    const candidates = await processAndFilter(matches, log, customLimit);

    // Count total candidates
    const totalCandidates = Object.values(candidates).reduce((sum, arr) => sum + arr.length, 0);

    // 3. Prepare results for admin approval (NO AI - direct return)
    log.info(`\n📋 STEP 3: Preparing candidates for Admin Approval`);
    log.info(`═══════════════════════════════════════════════════════`);

    const results = {
        over25: [], doubleChance: [], homeOver15: [], under35: [], under25: []
    };

    // Helper: Generate Detailed Analysis Text
    function generateAnalysisDetails(match, stats) {
        const { homeForm, awayForm, homeHomeStats, awayAwayStats, mutual } = stats;

        return {
            form: {
                home: `Home Form (Last 5): scored ${homeForm.avgScored.toFixed(1)} avg, conceded ${homeForm.avgConceded.toFixed(1)} avg. Over 2.5 in ${homeForm.over25Rate}% of games.`,
                away: `Away Form (Last 5): scored ${awayForm.avgScored.toFixed(1)} avg, conceded ${awayForm.avgConceded.toFixed(1)} avg. Over 2.5 in ${awayForm.over25Rate}% of games.`
            },
            h2h: {
                summary: `Mutual Games: ${mutual.length} played.`,
                games: mutual.map(g => `${g.home_team.name} ${g.home_team.score}-${g.away_team.score} ${g.away_team.name} (${new Date(g.timestamp * 1000).toLocaleDateString()})`)
            },
            stats: {
                leagueAvg: ((homeForm.avgTotalGoals + awayForm.avgTotalGoals) / 2).toFixed(2),
                homeAtHome: `Scoring Rate: ${homeHomeStats.scoringRate}%, Win Rate: ${homeHomeStats.winRate}%`,
                awayAtAway: `Conceding Rate: ${Math.max(0, 100 - awayAwayStats.cleanSheetRate || 0)}%, Loss Rate: ${awayAwayStats.lossCount / (awayAwayStats.matches || 1) * 100}%`
            }
        };
    }

    // Helper: Generate AI Prompts
    function generateAIPrompts(match, stats, market) {
        const basePrompt = `Analyze this football match: ${match.event_home_team} vs ${match.event_away_team}. League: ${match.league_name}. Market: ${market}.`;

        const statsPrompt = `
Stats Context:
- Home Team (${match.event_home_team}) Last 5 Avg Goals: ${stats.homeForm.avgScored.toFixed(2)}
- Away Team (${match.event_away_team}) Last 5 Avg Goals: ${stats.awayForm.avgScored.toFixed(2)}
- H2H: ${stats.mutual.length > 0 ? 'Available' : 'None'}
`;

        return [
            `${basePrompt} Give me a probability estimation for ${market} based on team forms.`,
            `${basePrompt} ${statsPrompt} What are the key risk factors for this bet?`,
            `Act as a professional sports bettor. Why might I want to AVOID betting on ${market} for ${match.event_home_team} vs ${match.event_away_team}?`
        ];
    }

    // Convert candidates to results format (no AI validation)
    for (const cat of Object.keys(candidates)) {
        if (!candidates[cat] || candidates[cat].length === 0) continue;

        // Safety: Ensure result category exists
        if (!results[cat]) results[cat] = [];

        log.info(`\n📂 Category: ${cat.toUpperCase()} (${candidates[cat].length} candidates)`);

        for (const match of candidates[cat]) {
            const generatedId = `${match.event_key || match.match_id}_${cat}`;
            const analysisDetails = generateAnalysisDetails(match, match.filterStats);
            const aiPrompts = generateAIPrompts(match, match.filterStats, match.market);

            results[cat].push({
                match: `${match.event_home_team} vs ${match.event_away_team}`,
                event_home_team: match.event_home_team,
                event_away_team: match.event_away_team,
                id: generatedId,
                matchId: match.event_key || match.match_id,
                startTime: match.event_start_time,
                league: match.league_name,
                market: match.market,
                stats: match.filterStats,
                detailed_analysis: analysisDetails,
                ai_prompts: aiPrompts,
                status: 'PENDING_APPROVAL' // Admin needs to approve
            });
            log.info(`   ✅ [ID: ${generatedId}] ${match.event_home_team} vs ${match.event_away_team} - ${match.market}`);
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
    log.info(`║  Candidates Found: ${totalCandidates}                             ║`);
    log.info(`╠═══════════════════════════════════════════════════════╣`);
    log.info(`║  Over 2.5: ${results.over25.length} | 1X: ${results.doubleChance.length} | Home O1.5: ${results.homeOver15.length} | U3.5: ${results.under35.length} | U2.5: ${results.under25.length} ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);
    log.info(`\n⏳ Waiting for Admin Approval in Admin Panel...`);

    return results;
}

module.exports = { runDailyAnalysis };
