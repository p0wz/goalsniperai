/**
 * dailyAnalyst.js
 * "The Daily Pre-Match Analyst" - Real Data Implementation
 */
const axios = require('axios');
const betTracker = require('./betTracker');
const { analyzeFirstHalfPreMatch, validateWithRealHTScores } = require('./analysis/firstHalfAnalyzer');
const vectorDB = require('./vectorDB');
require('dotenv').config();

// Config
const FLASHSCORE_API = {
    baseURL: 'https://flashscore4.p.rapidapi.com',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
    }
};

const MATCH_LIMIT = 500; // Increased limit

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
async function fetchDay(day, log = console, ignoreLeagues = false) {
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

                // Filter: Skip leagues not in allowed list (UNLESS ignoreLeagues is true)
                if (!ignoreLeagues && !isLeagueAllowed(leagueName)) {
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

// Helper: Fetch Match Details (Scrapes for HT scores)
async function fetchMatchDetails(matchId) {
    try {
        const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/details/${matchId}`, {
            headers: FLASHSCORE_API.headers
        });
        return response.data;
    } catch (error) {
        return null;
    }
}

// Helper: Fetch Match Odds (Optional - not all matches have odds)
async function fetchMatchOdds(matchId) {
    try {
        const response = await fetchWithRetry(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/odds/${matchId}`, {
            headers: FLASHSCORE_API.headers
        });
        return response.data;
    } catch (error) {
        return null; // Odds not available
    }
}

// Helper: Format Odds for Prompt (based on actual Flashscore API structure)
function formatOddsForPrompt(oddsData) {
    if (!oddsData || !Array.isArray(oddsData) || oddsData.length === 0) return '';

    // Use first bookmaker (usually bet365 or best available)
    const bookmaker = oddsData[0];
    if (!bookmaker || !bookmaker.odds) return '';

    const oddsArray = bookmaker.odds;
    let oddsText = `\n5. BETTING ODDS (${bookmaker.name}):\n`;
    let hasOdds = false;

    // Helper: Find odds by type and scope
    const findOdds = (type, scope = 'FULL_TIME') =>
        oddsArray.find(o => o.bettingType === type && o.bettingScope === scope);

    // 1X2 Full Time
    const hda = findOdds('HOME_DRAW_AWAY');
    if (hda && hda.odds && hda.odds.length >= 3) {
        const home = hda.odds.find(o => o.eventParticipantId && o.eventParticipantId !== null)?.value || hda.odds[0]?.value;
        const away = hda.odds.find((o, i) => i === 1)?.value;
        const draw = hda.odds.find(o => o.eventParticipantId === null)?.value || hda.odds[2]?.value;
        oddsText += `   - 1X2: Home ${home || 'N/A'} | Draw ${draw || 'N/A'} | Away ${away || 'N/A'}\n`;
        hasOdds = true;
    }

    // Over/Under Full Time
    const ou = findOdds('OVER_UNDER');
    if (ou && ou.odds) {
        // Group by handicap value
        const overUnder = {};
        ou.odds.forEach(o => {
            if (o.handicap && o.handicap.value && o.selection) {
                const line = o.handicap.value;
                if (!overUnder[line]) overUnder[line] = {};
                overUnder[line][o.selection] = o.value;
            }
        });

        // Display key lines: 1.5, 2.5, 3.5
        ['1.5', '2.5', '3.5'].forEach(line => {
            if (overUnder[line] && (overUnder[line].OVER || overUnder[line].UNDER)) {
                oddsText += `   - O/U ${line}: Over ${overUnder[line].OVER || 'N/A'} | Under ${overUnder[line].UNDER || 'N/A'}\n`;
                hasOdds = true;
            }
        });
    }

    // BTTS Full Time
    const btts = findOdds('BOTH_TEAMS_TO_SCORE');
    if (btts && btts.odds && btts.odds.length >= 2) {
        const yesOdd = btts.odds.find(o => o.bothTeamsToScore === true)?.value;
        const noOdd = btts.odds.find(o => o.bothTeamsToScore === false)?.value;
        if (yesOdd || noOdd) {
            oddsText += `   - BTTS: Yes ${yesOdd || 'N/A'} | No ${noOdd || 'N/A'}\n`;
            hasOdds = true;
        }
    }

    // Double Chance Full Time
    const dc = findOdds('DOUBLE_CHANCE');
    if (dc && dc.odds && dc.odds.length >= 3) {
        // DC order: 1X, 12, X2 (positions vary by bookmaker)
        const dcOdds = dc.odds.map(o => o.value);
        if (dcOdds.length >= 3) {
            oddsText += `   - DC: 1X ${dcOdds[1] || 'N/A'} | 12 ${dcOdds[0] || 'N/A'} | X2 ${dcOdds[2] || 'N/A'}\n`;
            hasOdds = true;
        }
    }

    return hasOdds ? oddsText : '';
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
    let under45Count = 0;  // NEW: For 2-4 goal range
    let bttsCount = 0;
    let cleanSheetCount = 0;
    let failedToScoreCount = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let htGoalCount = 0;  // First Half goals
    let firstHalfWins = 0;  // NEW: Won first half
    let secondHalfWins = 0;  // NEW: Won second half
    let eitherHalfWins = 0;  // NEW: Won at least one half
    let goals24Count = 0;  // NEW: Goals between 2-4

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
        if (total <= 4.5) under45Count++;  // NEW
        if (total >= 2 && total <= 4) goals24Count++;  // NEW: 2-4 goal range
        if (s1 > 0 && s2 > 0) bttsCount++;
        if (oppScore === 0) cleanSheetCount++;
        if (myScore === 0) failedToScoreCount++;

        if (myScore > oppScore) wins++;
        else if (myScore === oppScore) draws++;
        else losses++;

        // Track first half goals and half-wins (if HT data available)
        const htHome = parseInt(m.home_team?.score_1st_half) || 0;
        const htAway = parseInt(m.away_team?.score_1st_half) || 0;
        if (htHome + htAway >= 1) htGoalCount++;

        // Calculate second half scores
        const h2Home = s1 - htHome;
        const h2Away = s2 - htAway;

        const myHT = isHome ? htHome : htAway;
        const oppHT = isHome ? htAway : htHome;
        const myH2 = isHome ? h2Home : h2Away;
        const oppH2 = isHome ? h2Away : h2Home;

        // NEW: Track half wins
        const wonFirstHalf = myHT > oppHT;
        const wonSecondHalf = myH2 > oppH2;

        if (wonFirstHalf) firstHalfWins++;
        if (wonSecondHalf) secondHalfWins++;
        if (wonFirstHalf || wonSecondHalf) eitherHalfWins++;
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
        under45Rate: (under45Count / totalMatches) * 100,  // NEW
        goals24Rate: (goals24Count / totalMatches) * 100,  // NEW
        bttsRate: (bttsCount / totalMatches) * 100,
        scoringRate: ((totalMatches - failedToScoreCount) / totalMatches) * 100,
        winRate: (wins / totalMatches) * 100,
        lossCount: losses,
        cleanSheetRate: (cleanSheetCount / totalMatches) * 100,
        htGoalRate: (htGoalCount / totalMatches) * 100,
        firstHalfWinRate: (firstHalfWins / totalMatches) * 100,  // NEW
        secondHalfWinRate: (secondHalfWins / totalMatches) * 100,  // NEW
        eitherHalfWinRate: (eitherHalfWins / totalMatches) * 100  // NEW
    };
}

// 3. Process & Filter
async function processAndFilter(matches, log = console, limit = MATCH_LIMIT) {
    const candidates = {
        over25: [],
        doubleChance: [],
        homeOver15: [],
        under35: [],
        under25: [],
        btts: [],
        firstHalfOver05: [],
        ms1AndOver15: [],
        awayOver05: [],
        handicap: [],
        // NEW MARKETS
        doubleChanceOver15: [],  // 1X + 1.5 Üst
        homeWinsEitherHalf: [],  // Ev Herhangi Yarı
        awayDNB: []              // Dep DNB
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
        // Use full history for 1H Analysis
        const homeRawHistory = sections.filter(x => (x.home_team?.name === m.event_home_team) || (x.away_team?.name === m.event_home_team));
        const awayRawHistory = sections.filter(x => (x.home_team?.name === m.event_away_team) || (x.away_team?.name === m.event_away_team));

        const homeAllHistory = homeRawHistory.slice(0, 5);
        const awayAllHistory = awayRawHistory.slice(0, 5);
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

        // ============================================
        // UNIVERSAL: Fetch Match Details for HT validation (both teams' last 3 matches)
        // ============================================
        log.info(`   🔬 Fetching match details for HT validation...`);
        const homeLast3 = homeRawHistory.slice(0, 3);
        const awayLast3 = awayRawHistory.slice(0, 3);

        const homeMatchDetails = [];
        for (const hm of homeLast3) {
            const mId = hm.match_id || hm.id;
            if (mId) {
                await sleep(300);
                const details = await fetchMatchDetails(mId);
                homeMatchDetails.push(details);
            }
        }

        const awayMatchDetails = [];
        for (const am of awayLast3) {
            const mId = am.match_id || am.id;
            if (mId) {
                await sleep(300);
                const details = await fetchMatchDetails(mId);
                awayMatchDetails.push(details);
            }
        }

        // Store match details in stats for market evaluations
        stats.homeMatchDetails = homeMatchDetails;
        stats.awayMatchDetails = awayMatchDetails;

        log.info(`   ✅ Fetched ${homeMatchDetails.length + awayMatchDetails.length} match details`);

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


        // Logic C: BTTS (TIGHTENED CRITERIA)
        // Home Scoring ≥85%, Away Scoring ≥80%, Both Form BTTS ≥70%, H2H BTTS validation
        const h2hBttsCount = mutualH2H.filter(g =>
            parseInt(g.home_team?.score || 0) > 0 && parseInt(g.away_team?.score || 0) > 0
        ).length;
        const h2hBttsRate = mutualH2H.length > 0 ? (h2hBttsCount / mutualH2H.length) * 100 : 0;

        const bttsCheck = {
            homeScoring: homeHomeStats.scoringRate >= 85,
            awayScoring: awayAwayStats.scoringRate >= 80,
            homeBtts: homeForm.bttsRate >= 70,
            awayBtts: awayForm.bttsRate >= 70,
            h2hBtts: h2hBttsRate >= 50 || mutualH2H.length === 0  // 50% H2H BTTS veya H2H yok
        };
        log.info(`   📊 [BTTS] HomeScrg≥85: ${homeHomeStats.scoringRate?.toFixed(0)}%(${bttsCheck.homeScoring ? '✓' : '✗'}) | AwayScrg≥80: ${awayAwayStats.scoringRate?.toFixed(0)}%(${bttsCheck.awayScoring ? '✓' : '✗'}) | HomeBTTS≥70: ${homeForm.bttsRate?.toFixed(0)}%(${bttsCheck.homeBtts ? '✓' : '✗'}) | AwayBTTS≥70: ${awayForm.bttsRate?.toFixed(0)}%(${bttsCheck.awayBtts ? '✓' : '✗'}) | H2H-BTTS≥50: ${h2hBttsRate.toFixed(0)}%(${bttsCheck.h2hBtts ? '✓' : '✗'})`);

        if (Object.values(bttsCheck).every(v => v)) {
            candidates.btts.push({ ...m, filterStats: stats, market: 'BTTS (Both Teams To Score)' });
            passedFilters.push('BTTS');
            log.info(`   ✅ BTTS PASSED!`);
        }

        // Logic D: 1X Double Chance (IMPROVED)
        // Ev mağlubiyet ≤1, Dep kazanma <30%, Ev winRate ≥50%, Ev scoringRate ≥75%
        if (homeHomeStats.lossCount <= 1 && awayAwayStats.winRate < 30 &&
            homeHomeStats.winRate >= 50 && homeHomeStats.scoringRate >= 75) {
            candidates.doubleChance.push({ ...m, filterStats: stats, market: '1X Double Chance' });
            passedFilters.push('1X DC');
        }

        // Logic E: Home Over 1.5 (STRICTER CRITERIA)
        // Ev avgScored >= 2.2, Dep avgConceded >= 1.6, Ev scoringRate >= 90%, Ev over15Rate >= 85%
        if (homeHomeStats.avgScored >= 2.2 && awayAwayStats.avgConceded >= 1.6 &&
            homeHomeStats.scoringRate >= 90 && homeForm.over15Rate >= 85) {
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

        // Logic G: First Half Over 0.5 (ENHANCED with Real HT Validation)
        // Uses pre-fetched match details for HT validation
        const fhAnalysis = analyzeFirstHalfPreMatch(m, homeRawHistory, awayRawHistory, mutualH2H);
        if (fhAnalysis.signal) {
            log.info(`   🔬 1Y 0.5+ passed heuristic, validating with HT scores...`);

            // Use pre-fetched match details (already in stats object)
            const htValidation = validateWithRealHTScores(
                stats.homeMatchDetails,
                stats.awayMatchDetails,
                m.event_home_team,
                m.event_away_team
            );

            if (htValidation.passed) {
                candidates.firstHalfOver05.push({
                    ...m,
                    filterStats: stats,
                    fhStats: { ...fhAnalysis, htValidation },
                    market: 'First Half Over 0.5'
                });
                passedFilters.push('1H Over 0.5');
                log.info(`   ✅ ${htValidation.reason}`);
            } else {
                log.info(`   ❌ ${htValidation.reason}`);
            }
        }

        // Logic H: MS1 & 1.5 Üst (IMPROVED - STRICTER)
        // Home Win >= 60%, Home Avg Scored > 1.9, Away Avg Conceded > 1.2
        if (homeHomeStats.winRate >= 60 && homeHomeStats.avgScored >= 1.9 &&
            awayAwayStats.avgConceded >= 1.2 &&
            homeForm.over15Rate >= 75) {
            candidates.ms1AndOver15.push({ ...m, filterStats: stats, market: 'MS1 & 1.5 Üst' });
            passedFilters.push('MS1 & 1.5+');
        }

        // Logic I: Dep 0.5 Üst (NEW)
        // Away Scoring Rate >= 70% AND Home Clean Sheet Rate <= 30%
        const homeConcedeRate = 100 - (homeHomeStats.cleanSheetRate || (100 - (homeHomeStats.lossCount + homeHomeStats.draws) * 10)); // Approximate check if simple stats
        // Actually cleaner: homeHomeStats.scoringRate is offense. Defense check:
        // Let's use avgConceded.
        // Logic I: Dep 0.5 Üst (IMPROVED - STRICTER)
        // Away Scoring Rate >= 80%, Away Avg Scored >= 1.2, Home Concede Rate >= 80% (CleanSheet <= 20%)
        if (awayAwayStats.scoringRate >= 80 && awayAwayStats.avgScored >= 1.2 &&
            (100 - (homeHomeStats.cleanSheetRate || 0)) >= 80) {
            candidates.awayOver05.push({ ...m, filterStats: stats, market: 'Dep 0.5 Üst' });
            passedFilters.push('Away 0.5+');
        }

        // Logic J: Handikaplı Maç Sonucu (-1) (NEW)
        // Strong Home: WinRate >= 60%, Avg Scored > Conceded + 1.2
        // Logic J: Handicap Match Result (-1.5) (DUAL SIDE)
        // Home Fav: Win >= 70%, GoalDiff >= 1.8 | Away Fav: Win >= 70%, GoalDiff >= 1.8
        const homeGoalDiff = homeHomeStats.avgScored - homeHomeStats.avgConceded;
        const awayGoalDiff = awayAwayStats.avgScored - awayAwayStats.avgConceded;

        if (homeHomeStats.winRate >= 70 && homeGoalDiff >= 1.8) {
            candidates.handicap.push({ ...m, filterStats: stats, market: 'Hnd. MS1 (-1.5)' });
            passedFilters.push('Hnd. MS1 -1.5');
        } else if (awayAwayStats.winRate >= 70 && awayGoalDiff >= 1.8) {
            candidates.handicap.push({ ...m, filterStats: stats, market: 'Hnd. MS2 (-1.5)' });
            passedFilters.push('Hnd. MS2 -1.5');
        }

        // ============================================
        // NEW MARKET K: 1X + 1.5 Üst (Double Chance + Over 1.5)
        // ============================================
        const dc15Check = {
            lossCount: homeHomeStats.lossCount <= 1,
            awayWinRate: awayAwayStats.winRate < 35,
            homeWinRate: homeHomeStats.winRate >= 45,
            scoringRate: homeHomeStats.scoringRate >= 80,
            leagueAvg: proxyLeagueAvg >= 2.3,
            over15Rate: homeForm.over15Rate >= 70
        };
        log.info(`   📊 [1X+1.5Ü] HomeLoss≤1: ${homeHomeStats.lossCount}(${dc15Check.lossCount ? '✓' : '✗'}) | AwayWin<35: ${awayAwayStats.winRate?.toFixed(0)}%(${dc15Check.awayWinRate ? '✓' : '✗'}) | HomeWin≥45: ${homeHomeStats.winRate?.toFixed(0)}%(${dc15Check.homeWinRate ? '✓' : '✗'}) | Scoring≥80: ${homeHomeStats.scoringRate?.toFixed(0)}%(${dc15Check.scoringRate ? '✓' : '✗'}) | LeagueAvg≥2.3: ${proxyLeagueAvg?.toFixed(2)}(${dc15Check.leagueAvg ? '✓' : '✗'}) | O15≥70: ${homeForm.over15Rate?.toFixed(0)}%(${dc15Check.over15Rate ? '✓' : '✗'})`);

        if (Object.values(dc15Check).every(v => v)) {
            candidates.doubleChanceOver15.push({ ...m, filterStats: stats, market: '1X + 1.5 Üst' });
            passedFilters.push('1X + 1.5Ü');
            log.info(`   ✅ 1X + 1.5 Üst PASSED!`);
        }

        // ============================================
        // NEW MARKET L: Ev Herhangi Yarıyı Kazanır
        // Uses eitherHalfWinRate from calculateAdvancedStats + matchDetails validation
        // ============================================
        const evHalfCheck = {
            eitherHalf: (homeHomeStats.eitherHalfWinRate || 0) >= 70,
            firstHalf: (homeHomeStats.firstHalfWinRate || 0) >= 45,
            secondHalf: (homeHomeStats.secondHalfWinRate || 0) >= 45,
            winRate: homeHomeStats.winRate >= 55,
            scoring: homeHomeStats.scoringRate >= 85,
            awayEitherHalf: (awayAwayStats.eitherHalfWinRate || 0) < 45
        };
        log.info(`   📊 [Ev Yarı] EitherHalf≥70: ${(homeHomeStats.eitherHalfWinRate || 0).toFixed(0)}%(${evHalfCheck.eitherHalf ? '✓' : '✗'}) | 1H≥45: ${(homeHomeStats.firstHalfWinRate || 0).toFixed(0)}%(${evHalfCheck.firstHalf ? '✓' : '✗'}) | 2H≥45: ${(homeHomeStats.secondHalfWinRate || 0).toFixed(0)}%(${evHalfCheck.secondHalf ? '✓' : '✗'}) | Win≥55: ${homeHomeStats.winRate?.toFixed(0)}%(${evHalfCheck.winRate ? '✓' : '✗'}) | Scr≥85: ${homeHomeStats.scoringRate?.toFixed(0)}%(${evHalfCheck.scoring ? '✓' : '✗'}) | AwayEither<45: ${(awayAwayStats.eitherHalfWinRate || 0).toFixed(0)}%(${evHalfCheck.awayEitherHalf ? '✓' : '✗'})`);

        if (Object.values(evHalfCheck).every(v => v)) {
            candidates.homeWinsEitherHalf.push({ ...m, filterStats: stats, market: 'Ev Herhangi Yarı' });
            passedFilters.push('Ev Her.Yarı');
            log.info(`   ✅ Ev Herhangi Yarı PASSED!`);
        }

        // ============================================
        // NEW MARKET M: Dep DNB (Deplasman Beraberlikte İade)
        // ============================================
        const depDnbCheck = {
            awayWinRate: awayAwayStats.winRate >= 45,
            awayLossCount: awayAwayStats.lossCount <= 1,
            homeWinRate: homeHomeStats.winRate < 45,
            awayScoring: awayAwayStats.scoringRate >= 80,
            awayFormScored: awayForm.avgScored >= 1.5,
            homeLossCount: homeHomeStats.lossCount >= 2
        };
        log.info(`   📊 [Dep DNB] AwayWin≥45: ${awayAwayStats.winRate?.toFixed(0)}%(${depDnbCheck.awayWinRate ? '✓' : '✗'}) | AwayLoss≤1: ${awayAwayStats.lossCount}(${depDnbCheck.awayLossCount ? '✓' : '✗'}) | HomeWin<45: ${homeHomeStats.winRate?.toFixed(0)}%(${depDnbCheck.homeWinRate ? '✓' : '✗'}) | AwayScr≥80: ${awayAwayStats.scoringRate?.toFixed(0)}%(${depDnbCheck.awayScoring ? '✓' : '✗'}) | AwayFormScr≥1.5: ${awayForm.avgScored?.toFixed(2)}(${depDnbCheck.awayFormScored ? '✓' : '✗'}) | HomeLoss≥2: ${homeHomeStats.lossCount}(${depDnbCheck.homeLossCount ? '✓' : '✗'})`);

        if (Object.values(depDnbCheck).every(v => v)) {
            candidates.awayDNB.push({ ...m, filterStats: stats, market: 'Dep DNB' });
            passedFilters.push('Dep DNB');
            log.info(`   ✅ Dep DNB PASSED!`);
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
    log.info(`   • BTTS candidates: ${candidates.btts.length}`);
    log.info(`   • 1X DC candidates: ${candidates.doubleChance.length}`);
    log.info(`   • Home O1.5 candidates: ${candidates.homeOver15.length}`);
    log.info(`   • Under 3.5 candidates: ${candidates.under35.length}`);
    log.info(`   • Under 2.5 candidates: ${candidates.under25.length}`);
    log.info(`   • 1H Over 0.5 candidates: ${candidates.firstHalfOver05.length}`);
    log.info(`   • MS1 & 1.5+ candidates: ${candidates.ms1AndOver15.length}`);
    log.info(`   • Away 0.5+ candidates: ${candidates.awayOver05.length}`);
    log.info(`   • Handicap candidates: ${candidates.handicap.length}`);
    log.info(`   • 1X + 1.5 Üst candidates: ${candidates.doubleChanceOver15.length}`);
    log.info(`   • Ev Herhangi Yarı candidates: ${candidates.homeWinsEitherHalf.length}`);
    log.info(`   • Dep DNB candidates: ${candidates.awayDNB.length}`);
    log.info(`═══════════════════════════════════════════════════════`);

    return candidates;
}

// 4. AI Validation with Retry (Groq - Llama 4 Scout)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

async function validateWithAI(match, retries = 3) {
    if (!GROQ_API_KEY) return { verdict: 'SKIP', reason: 'GROQ_API_KEY not configured' };

    // Build market-specific prompt based on market type
    let prompt;
    const marketLower = (match.market || '').toLowerCase();

    if (marketLower.includes('ev herhangi') || marketLower.includes('home wins either half')) {
        // Special prompt for "Home Wins Either Half" with HT statistics
        const homeStats = match.filterStats.homeHomeStats;
        const awayStats = match.filterStats.awayAwayStats;

        prompt = `You are a professional football analyst specializing in HALF-TIME markets. Analyze this match for: "${match.market}".

Match: ${match.event_home_team} vs ${match.event_away_team}

HALF-TIME STATISTICS (Critical for this market):
- Home Team @ Home - First Half Win Rate: ${(homeStats.firstHalfWinRate || 0).toFixed(0)}%
- Home Team @ Home - Second Half Win Rate: ${(homeStats.secondHalfWinRate || 0).toFixed(0)}%
- Home Team @ Home - Either Half Win Rate: ${(homeStats.eitherHalfWinRate || 0).toFixed(0)}%
- Away Team @ Away - Either Half Win Rate: ${(awayStats.eitherHalfWinRate || 0).toFixed(0)}%

SCORING STATS:
- Home @ Home: Win Rate ${homeStats.winRate?.toFixed(0)}%, Scoring Rate ${homeStats.scoringRate?.toFixed(0)}%, Avg Scored ${homeStats.avgScored?.toFixed(2)}
- Away @ Away: Win Rate ${awayStats.winRate?.toFixed(0)}%, Scoring Rate ${awayStats.scoringRate?.toFixed(0)}%, Avg Conceded ${awayStats.avgConceded?.toFixed(2)}

MARKET INFO: "Home Wins Either Half" means home team must score MORE goals than away team in AT LEAST one half (1st half OR 2nd half).

CRITICAL FACTORS:
1. Does home team consistently dominate at least one half?
2. Is their first half or second half performance stronger?
3. Does away team struggle to win halves on the road?

RESPOND WITH ONLY JSON: {"verdict": "PLAY" or "SKIP", "confidence": 70-95, "reason": "Brief reason focusing on half-time patterns"}`;
    }
    else if (marketLower.includes('1x + 1.5') || marketLower.includes('1x ve 1.5')) {
        // Special prompt for Double Chance + Over 1.5
        prompt = `You are a professional football analyst. Analyze this match for: "${match.market}".

Match: ${match.event_home_team} vs ${match.event_away_team}

Statistics:
- Home @ Home: Win Rate ${match.filterStats.homeHomeStats.winRate?.toFixed(0)}%, Loss Count ${match.filterStats.homeHomeStats.lossCount}, Scoring Rate ${match.filterStats.homeHomeStats.scoringRate?.toFixed(0)}%
- Away @ Away: Win Rate ${match.filterStats.awayAwayStats.winRate?.toFixed(0)}%
- Home Form Over 1.5 Rate: ${match.filterStats.homeForm.over15Rate?.toFixed(0)}%
- League Avg Goals: ${match.filterStats.proxyLeagueAvg?.toFixed(2) || 'N/A'}

MARKET INFO: "1X + Over 1.5" means: Home Win OR Draw AND at least 2 goals total.

CRITICAL FACTORS:
1. Home team rarely loses at home (strong 1X probability)
2. Games involving home team tend to have 2+ goals
3. Away team struggles to win away

RESPOND WITH ONLY JSON: {"verdict": "PLAY" or "SKIP", "confidence": 70-95, "reason": "Brief reason"}`;
    }
    else if (marketLower.includes('dep dnb') || marketLower.includes('away dnb')) {
        // Special prompt for Away DNB (Draw No Bet)
        prompt = `You are a professional football analyst. Analyze this match for: "${match.market}".

Match: ${match.event_home_team} vs ${match.event_away_team}

Statistics:
- Home @ Home: Win Rate ${match.filterStats.homeHomeStats.winRate?.toFixed(0)}%, Loss Count ${match.filterStats.homeHomeStats.lossCount}
- Away @ Away: Win Rate ${match.filterStats.awayAwayStats.winRate?.toFixed(0)}%, Loss Count ${match.filterStats.awayAwayStats.lossCount}, Scoring Rate ${match.filterStats.awayAwayStats.scoringRate?.toFixed(0)}%
- Away Form Avg Scored: ${match.filterStats.awayForm.avgScored?.toFixed(2)}

MARKET INFO: "Away Draw No Bet" means: Away Win = WON, Draw = REFUND, Home Win = LOST.

CRITICAL FACTORS:
1. Away team is strong on the road (high win rate, low losses)
2. Home team is weak at home (low win rate, multiple losses)
3. Away team scores consistently (high scoring rate)

RESPOND WITH ONLY JSON: {"verdict": "PLAY" or "SKIP", "confidence": 70-95, "reason": "Brief reason"}`;
    }
    else {
        // Default prompt for other markets
        prompt = `You are a professional football betting analyst. Analyze this match for market: ${match.market}.

Match: ${match.event_home_team} vs ${match.event_away_team}

Statistics:
- Home Form (Last 5): Over 1.5 Rate ${match.filterStats.homeForm.over15Rate.toFixed(0)}%, Avg Scored ${match.filterStats.homeForm.avgScored.toFixed(2)}
- Away Form (Last 5): Over 1.5 Rate ${match.filterStats.awayForm.over15Rate.toFixed(0)}%, Avg Scored ${match.filterStats.awayForm.avgScored.toFixed(2)}
- Home @ Home: Scored in ${match.filterStats.homeHomeStats.scoringRate.toFixed(0)}% of games, Avg Scored ${match.filterStats.homeHomeStats.avgScored.toFixed(2)}
- Away @ Away: Scored in ${match.filterStats.awayAwayStats.scoringRate.toFixed(0)}% of games, Avg Conceded ${match.filterStats.awayAwayStats.avgConceded.toFixed(2)}

IMPORTANT: These matches have ALREADY passed strict statistical filters. If you recommend PLAY, give confidence between 80-95%. Only use 70-79% if there are significant concerns.

RESPOND WITH ONLY JSON: {"verdict": "PLAY", "confidence": 85, "reason": "Brief reason"}`;
    }

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
async function runDailyAnalysis(log = console, customLimit = MATCH_LIMIT, leagueFilter = true) {
    const startTime = Date.now();

    log.info(`\n`);
    log.info(`╔═══════════════════════════════════════════════════════╗`);
    log.info(`║        🎯 DAILY ANALYST - PRE-MATCH SCAN              ║`);
    log.info(`║        Started: ${new Date().toISOString()}      ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);

    // 1. Fetch
    log.info(`\n📅 STEP 1: Fetching Match List`);

    // Fetch Day 1 (Today) only
    log.info(`[DailyAnalyst] Fetching Day 1 (Today), League Filter: ${leagueFilter}...`);
    let matches = await fetchDay(1, log, !leagueFilter); // Pass !leagueFilter as ignoreLeagues

    if (matches.length === 0) {
        log.warn('[DailyAnalyst] Found 0 matches. Please check API schedule endpoint.');
        return { over25: [], doubleChance: [], homeOver15: [], under35: [], under25: [], btts: [], firstHalfOver05: [], ms1AndOver15: [], awayOver05: [], handicap: [], doubleChanceOver15: [], homeWinsEitherHalf: [], awayDNB: [] };
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
        over25: [], doubleChance: [], homeOver15: [], under35: [], under25: [], btts: [], firstHalfOver05: [], ms1AndOver15: [], awayOver05: [], handicap: [], doubleChanceOver15: [], homeWinsEitherHalf: [], awayDNB: []
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
    function generateAIPrompts(match, stats, market, oddsText = '') {
        const { homeForm, awayForm, homeHomeStats, awayAwayStats, mutual } = stats;

        const basePrompt = `Act as a professional football betting analyst (English/Turkish). Analyze this match:
Match: ${match.event_home_team} vs ${match.event_away_team}
League: ${match.league_name}
Market Candidate: ${market}

DETAILED STATISTICS:
1. LEAGUE CONTEXT
   - League Average Goals: ${((homeForm.avgTotalGoals + awayForm.avgTotalGoals) / 2).toFixed(2)}

2. HOME TEAM (${match.event_home_team})
   - General Form (Last 5): Scored ${homeForm.avgScored.toFixed(2)}/game, Conceded ${homeForm.avgConceded.toFixed(2)}/game.
   - Over 2.5 Rate: ${homeForm.over25Rate}%
   - Under 2.5 Rate: ${homeForm.under25Rate}%
   - BTTS Rate: ${homeForm.bttsRate}%
   - AT HOME (Last 8): Scored in ${homeHomeStats.scoringRate}% of games, Win Rate ${homeHomeStats.winRate}%. Avg Scored ${homeHomeStats.avgScored.toFixed(2)}.

3. AWAY TEAM (${match.event_away_team})
   - General Form (Last 5): Scored ${awayForm.avgScored.toFixed(2)}/game, Conceded ${awayForm.avgConceded.toFixed(2)}/game.
   - Over 2.5 Rate: ${awayForm.over25Rate}%
   - Under 2.5 Rate: ${awayForm.under25Rate}%
   - BTTS Rate: ${awayForm.bttsRate}%
   - AWAY FROM HOME (Last 8): Conceded in ${Math.max(0, 100 - awayAwayStats.cleanSheetRate || 0)}% of games. Avg Conceded ${awayAwayStats.avgConceded.toFixed(2)}.

4. HEAD-TO-HEAD (Last ${mutual.length})
   ${mutual.map(g => `- ${g.home_team.name} ${g.home_team.score}-${g.away_team.score} ${g.away_team.name} (${new Date(g.timestamp * 1000).toLocaleDateString()})`).join('\n   ')}
${oddsText}`;
        // CUSTOM PROMPT FOR FIRST HALF OVER 0.5
        if (market === 'First Half Over 0.5' && match.fhStats) {
            const fh = match.fhStats;
            return [
                `Act as a professional football betting analyst.
Match: ${match.event_home_team} vs ${match.event_away_team}
Market: First Half Over 0.5 Goals

PURE FORM SCORE: ${fh.score}/100
 Confidence: ${fh.confidence}
 Reason: ${fh.reason}

KEY METRICS:
- Home Team FH Goal Potential: ${fh.metrics?.home_pot ?? 'N/A'}%
- Away Team FH Goal Potential: ${fh.metrics?.away_pot ?? 'N/A'}%
- H2H FH Goal Potential: ${fh.metrics?.h2h_pot ?? 'N/A'}%

TASK:
Based on these specific First Half statistics, write a short, punchy analysis for a bettor. Confirm if the statistics make this a "Solid Pick". Mention any risks if standard form (not just 1H) suggests a slow start.`,

                `Match: ${match.event_home_team} vs ${match.event_away_team}
Market: First Half Over 0.5 Goals
Score: ${fh.score}/100

TASK:
What is the "Ice Cold" risk here? Even with high percentage rates, could a recent defensive trend (last 2 games) spoil this? Analyze the "Momentum" based on the provided reason: "${fh.reason}".`
            ];
        }

        return [
            `${basePrompt}\n\nTASK: Based on these detailed statistics, provide a comprehensive analysis for the '${market}' bet. Is it a solid value? Give a probability percentage.`,
            `${basePrompt}\n\nTASK: Identify the biggest RISK factors for this specific '${market}' bet given the H2H and recent form. What could go wrong?`,
            `${basePrompt}\n\nTASK: Ignore the '${market}' suggestion for a moment. Based purely on the data, what is the single BEST value bet for this match (e.g. Winner, Goals, BTTS) and why?`
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

            // Fetch odds (optional - may not be available for all matches)
            let oddsText = '';
            let oddsData = null;
            try {
                oddsData = await fetchMatchOdds(match.event_key || match.match_id);
                oddsText = formatOddsForPrompt(oddsData);
                if (oddsText) log.info(`   💰 Odds fetched for ${match.event_home_team} vs ${match.event_away_team}`);
            } catch (e) {
                // Odds not available - continue without them
            }

            const aiPrompts = generateAIPrompts(match, match.filterStats, match.market, oddsText);

            results[cat].push({
                match: `${match.event_home_team} vs ${match.event_away_team}`,
                event_home_team: match.event_home_team,
                event_away_team: match.event_away_team,
                id: generatedId,
                matchId: match.event_key || match.match_id,
                startTime: match.event_start_time,
                league: match.league_name,
                league_name: match.league_name,
                market: match.market,
                stats: match.filterStats,
                detailed_analysis: analysisDetails,
                ai_prompts: aiPrompts,
                aiPrompt: aiPrompts[0], // Primary prompt for easy access
                odds: oddsData, // Raw odds data (if available)
                oddsText: oddsText, // Formatted odds text
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
    log.info(`║  O2.5: ${results.over25.length} | BTTS: ${results.btts.length} | 1X: ${results.doubleChance.length} | HO1.5: ${results.homeOver15.length} | U3.5: ${results.under35.length} | U2.5: ${results.under25.length} | 1H: ${results.firstHalfOver05.length} ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);
    log.info(`\n⏳ Waiting for Admin Approval in Admin Panel...`);

    return results;
}

// ============================================
// ⚡ INDEPENDENT MODULE: FIRST HALF ONLY
// ============================================
async function runFirstHalfScan(log = console, customLimit = MATCH_LIMIT) {
    const startTime = Date.now();
    log.info(`\n╔═══════════════════════════════════════════════════════╗`);
    log.info(`║      ⚡ FIRST HALF PURE FORM SCANNER                 ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);

    // 1. Fetch
    log.info('[FirstHalfScan] Fetching Today\'s Matches (IGNORING LEAGUE FILTER)...');
    // Pass true for ignoreLeagues
    let matches = await fetchDay(1, log, true);
    if (matches.length === 0) return { firstHalfOver05: [] };

    // 2. Process Only First Half
    const candidates = [];
    const AnalyzedMatches = [];

    for (const match of matches) {
        // Basic Stats Check
        if (!match.event_home_team || !match.event_away_team) continue;

        // Rate Limit Protection
        await sleep(1000);

        // Fetch History (H2H Endpoint returns Home, Away, and Mutual history in one go)
        const h2hData = await fetchMatchH2H(match.event_key);
        if (!h2hData) continue;

        const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);

        // Filter History
        const homeHistory = sections.filter(x => (x.home_team?.name === match.event_home_team) || (x.away_team?.name === match.event_home_team));
        const awayHistory = sections.filter(x => (x.home_team?.name === match.event_away_team) || (x.away_team?.name === match.event_away_team));
        const mutualH2H = sections.filter(x =>
            (x.home_team?.name === match.event_home_team && x.away_team?.name === match.event_away_team) ||
            (x.home_team?.name === match.event_away_team && x.away_team?.name === match.event_home_team)
        );

        if (homeHistory.length === 0 || awayHistory.length === 0) continue;

        // Run Analyzer (Heuristic Mode - Uses FT Scores)
        const result = analyzeFirstHalfPreMatch(match, homeHistory, awayHistory, mutualH2H);

        // DEBUG: Log first 5 matches analysis
        if (AnalyzedMatches.length < 1) { // Just need 1 deep inspection
            log.info(`[DEBUG-DATA] Raw History Item: ${JSON.stringify(homeHistory[0])}`);
            log.info(`[DEBUG-FH] ${match.event_home_team} vs ${match.event_away_team} -> Score: ${result.score}`);
            log.info(`[DEBUG-FH]   HomeHist: ${homeHistory.length}, AwayHist: ${awayHistory.length}, Mutual: ${mutualH2H.length}`);
            log.info(`[DEBUG-FH]   Reason: ${result.reason}`);
        }
        AnalyzedMatches.push(match);

        if (result && result.score >= 70) { // Keep even candidates around 70 for review
            candidates.push({
                ...match,
                fhStats: result,
                market: 'First Half Over 0.5',
                filterStats: { // Minimal stats for frontend compatibility
                    homeForm: { avgScored: 0, avgConceded: 0, over25Rate: 0 },
                    awayForm: { avgScored: 0, avgConceded: 0, over25Rate: 0 },
                    homeHomeStats: { scoringRate: 0, winRate: 0 },
                    awayAwayStats: { cleanSheetRate: 0 },
                    mutual: []
                }
            });
        }
    }

    // 3. Prepare Results
    const results = { firstHalfOver05: [] };

    for (const match of candidates) {
        // Generate AI Prompt just for this
        const prompt = `Act as a professional football betting analyst.
Match: ${match.event_home_team} vs ${match.event_away_team}
Market: First Half Over 0.5 Goals
PURE FORM SCORE: ${match.fhStats.score}/100
Reason: ${match.fhStats.reason}
KEY METRICS:
- Home Team FH Goal Potential: ${match.fhStats?.metrics?.home_pot ?? 'N/A'}%
- Away Team FH Goal Potential: ${match.fhStats?.metrics?.away_pot ?? 'N/A'}%
- H2H FH Goal Potential: ${match.fhStats?.metrics?.h2h_pot ?? 'N/A'}%

TASK:
Analyze this "First Half Over 0.5 Goal" pick based on the pure form score. Is it a solid value?`;

        results.firstHalfOver05.push({
            match: `${match.event_home_team} vs ${match.event_away_team}`,
            event_home_team: match.event_home_team,
            event_away_team: match.event_away_team,
            id: `${match.event_key}_fh`,
            matchId: match.event_key,
            startTime: match.event_start_time,
            league: match.league_name,
            market: 'First Half Over 0.5',
            fhStats: match.fhStats,
            ai_prompts: [prompt],
            status: 'PENDING_APPROVAL'
        });
    }

    log.info(`✅ First Half Scan Complete: Found ${results.firstHalfOver05.length} candidates.`);
    return results;
}

// ============================================
// ⚡ SINGLE MARKET ANALYSIS (New Modular Approach)
// ============================================
const MARKET_MAP = {
    'over25': { name: 'Over 2.5 Goals', key: 'over25' },
    'btts': { name: 'BTTS (Both Teams To Score)', key: 'btts' },
    'doubleChance': { name: '1X Double Chance', key: 'doubleChance' },
    'homeOver15': { name: 'Home Team Over 1.5', key: 'homeOver15' },
    'under35': { name: 'Under 3.5 Goals', key: 'under35' },
    'under25': { name: 'Under 2.5 Goals', key: 'under25' },
    'firstHalfOver05': { name: 'First Half Over 0.5', key: 'firstHalfOver05' },
    'ms1AndOver15': { name: 'MS1 & 1.5 Üst', key: 'ms1AndOver15' },
    'awayOver05': { name: 'Dep 0.5 Üst', key: 'awayOver05' },
    'handicap': { name: 'Hnd. MS1', key: 'handicap' },
    'ms1xOver15': { name: 'MS1X & 1.5 Üst', key: 'ms1xOver15' },
    'totalGoals24': { name: 'Toplam Gol 2-4', key: 'totalGoals24' },
    'homeWinsHalf': { name: 'Ev Sahibi Yarı Kazanır', key: 'homeWinsHalf' },
    'awayDNB': { name: 'Deplasman DNB', key: 'awayDNB' }
};

async function runSingleMarketAnalysis(marketKey, leagueFilter = true, log = console, customLimit = MATCH_LIMIT) {
    const startTime = Date.now();
    const marketInfo = MARKET_MAP[marketKey];

    if (!marketInfo) {
        throw new Error(`Unknown market: ${marketKey}`);
    }

    log.info(`\n╔═══════════════════════════════════════════════════════╗`);
    log.info(`║  📊 SINGLE MARKET ANALYSIS: ${marketInfo.name.padEnd(22)} ║`);
    log.info(`║  League Filter: ${leagueFilter ? 'ON' : 'OFF'}                              ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);

    // 1. Fetch Matches
    log.info('[SingleMarket] Fetching matches...');
    const ignoreLeagues = !leagueFilter;
    let matches = await fetchDay(1, log, ignoreLeagues);

    if (matches.length === 0) {
        log.warn('[SingleMarket] No matches found.');
        return { candidates: [], market: marketKey };
    }

    log.info(`✅ Found ${matches.length} matches. Processing top ${customLimit}...`);

    // 2. Process & Filter (Only for requested market)
    const candidates = [];
    let processed = 0;
    let consecutiveErrors = 0;

    for (const m of matches) {
        if (processed >= customLimit) break;
        if (consecutiveErrors >= 3) break;

        const mid = m.event_key || m.match_id;
        if (!mid) continue;

        await sleep(800);

        const h2hData = await fetchMatchH2H(mid);
        if (!h2hData) {
            consecutiveErrors++;
            continue;
        }

        const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);

        // Filter History
        const homeRawHistory = sections.filter(x => (x.home_team?.name === m.event_home_team) || (x.away_team?.name === m.event_home_team));
        const awayRawHistory = sections.filter(x => (x.home_team?.name === m.event_away_team) || (x.away_team?.name === m.event_away_team));
        const homeAllHistory = homeRawHistory.slice(0, 5);
        const awayAllHistory = awayRawHistory.slice(0, 5);
        const homeAtHomeHistory = sections.filter(x => x.home_team?.name === m.event_home_team).slice(0, 8);
        const awayAtAwayHistory = sections.filter(x => x.away_team?.name === m.event_away_team).slice(0, 8);
        const mutualH2H = sections.filter(x =>
            (x.home_team?.name === m.event_home_team && x.away_team?.name === m.event_away_team) ||
            (x.home_team?.name === m.event_away_team && x.away_team?.name === m.event_home_team)
        ).slice(0, 3);

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
        const stats = { homeForm, awayForm, homeHomeStats, awayAwayStats, mutual: mutualH2H };
        const proxyLeagueAvg = (homeForm.avgTotalGoals + awayForm.avgTotalGoals) / 2;

        // Check ONLY the requested market
        let passes = false;
        let matchData = { ...m, filterStats: stats };

        switch (marketKey) {
            case 'over25':
                passes = proxyLeagueAvg >= 3.0 && homeForm.over25Rate >= 70 && awayForm.over25Rate >= 70 && homeHomeStats.avgScored >= 1.5;
                matchData.market = 'Over 2.5 Goals';
                break;
            case 'btts':
                passes = homeHomeStats.scoringRate >= 75 && awayAwayStats.scoringRate >= 70 && homeForm.bttsRate >= 60 && awayForm.bttsRate >= 60;
                matchData.market = 'BTTS (Both Teams To Score)';
                break;
            case 'doubleChance':
                passes = homeHomeStats.lossCount <= 1 && awayAwayStats.winRate < 30 && homeHomeStats.winRate >= 50 && homeHomeStats.scoringRate >= 75;
                matchData.market = '1X Double Chance';
                break;
            case 'homeOver15':
                // TIGHTENED CRITERIA: Stricter scoring and form requirements
                passes = homeHomeStats.avgScored >= 2.1 && awayAwayStats.avgConceded >= 1.6 &&
                    homeHomeStats.scoringRate >= 90 && homeForm.over15Rate >= 85 &&
                    (awayAwayStats.cleanSheetRate || 0) <= 20;
                matchData.market = 'Home Team Over 1.5';
                break;
            case 'under35':
                const h2hSafe35 = mutualH2H.every(g => (parseInt(g.home_team?.score || 0) + parseInt(g.away_team?.score || 0)) <= 4);
                passes = proxyLeagueAvg < 2.4 && homeForm.under35Rate >= 80 && awayForm.under35Rate >= 80 && h2hSafe35;
                matchData.market = 'Under 3.5 Goals';
                break;
            case 'under25':
                const mutualOver35 = mutualH2H.some(g => (parseInt(g.home_team?.score || 0) + parseInt(g.away_team?.score || 0)) > 3);
                passes = proxyLeagueAvg < 2.5 && homeForm.under25Rate >= 75 && awayForm.under25Rate >= 75 && !mutualOver35;
                matchData.market = 'Under 2.5 Goals';
                break;
            case 'firstHalfOver05':
                const fhAnalysis = analyzeFirstHalfPreMatch(m, homeRawHistory, awayRawHistory, mutualH2H);
                if (fhAnalysis.signal) {
                    // Secondary validation: Fetch real HT scores from match details
                    log.info(`   🔬 1Y 0.5+ passed heuristic, fetching real HT scores...`);

                    // Get last 3 match IDs for each team
                    const homeLast3 = homeRawHistory.slice(0, 3);
                    const awayLast3 = awayRawHistory.slice(0, 3);

                    // Fetch match details for each (with rate limiting)
                    const homeMatchDetails = [];
                    for (const hm of homeLast3) {
                        const mid = hm.match_id || hm.id;
                        if (mid) {
                            await sleep(300);
                            const details = await fetchMatchDetails(mid);
                            homeMatchDetails.push(details);
                        }
                    }

                    const awayMatchDetails = [];
                    for (const am of awayLast3) {
                        const mid = am.match_id || am.id;
                        if (mid) {
                            await sleep(300);
                            const details = await fetchMatchDetails(mid);
                            awayMatchDetails.push(details);
                        }
                    }

                    // Run secondary validation
                    const htValidation = validateWithRealHTScores(
                        homeMatchDetails,
                        awayMatchDetails,
                        m.event_home_team,
                        m.event_away_team
                    );

                    if (htValidation.passed) {
                        passes = true;
                        matchData.fhStats = { ...fhAnalysis, htValidation };
                        log.info(`   ✅ ${htValidation.reason}`);
                    } else {
                        passes = false;
                        log.info(`   ❌ ${htValidation.reason}`);
                    }
                } else {
                    passes = false;
                }
                matchData.market = 'First Half Over 0.5';
                break;
            case 'ms1AndOver15':
                passes = homeHomeStats.winRate >= 60 && homeHomeStats.avgScored >= 1.9 &&
                    awayAwayStats.avgConceded >= 1.2 && homeForm.over15Rate >= 75;
                matchData.market = 'MS1 & 1.5 Üst';
                break;
            case 'awayOver05':
                passes = awayAwayStats.scoringRate >= 80 && awayAwayStats.avgScored >= 1.2 &&
                    (100 - (homeHomeStats.cleanSheetRate || 0)) >= 80;
                matchData.market = 'Dep 0.5 Üst';
                break;
            // NEW MARKETS
            case 'ms1xOver15':
                passes = homeHomeStats.lossCount <= 1 && homeHomeStats.scoringRate >= 85 &&
                    awayAwayStats.avgConceded >= 1.2 && proxyLeagueAvg >= 2.0 &&
                    homeForm.over15Rate >= 75;
                matchData.market = 'MS1X & 1.5 Üst';
                break;
            case 'totalGoals24':
                // Range 2-4: Needs goals but not too many. 
                // Using new stats from calculateAdvancedStats: goals24Rate, under45Rate
                passes = proxyLeagueAvg >= 2.0 && proxyLeagueAvg <= 3.5 &&
                    (homeForm.goals24Rate || 0) >= 70 && (awayForm.goals24Rate || 0) >= 70 &&
                    homeForm.under45Rate >= 90 && awayForm.under45Rate >= 90;
                matchData.market = 'Toplam Gol 2-4';
                break;
            case 'homeWinsHalf':
                // Home team wins either first OR second half
                // Requires good win rate and specifically half-win stats
                if (homeHomeStats.winRate >= 50 && homeHomeStats.avgScored >= 1.5) {

                    log.info(`   🔬 Checking Home Wins Half validation...`);
                    const homeLast4 = homeRawHistory.slice(0, 4);
                    const homeMatchDetails = [];

                    for (const hm of homeLast4) {
                        const mid = hm.match_id || hm.id;
                        if (mid) {
                            await sleep(250); // Faster sleep
                            const details = await fetchMatchDetails(mid);
                            homeMatchDetails.push(details);
                        }
                    }

                    // Simple validation: Did they win a half in at least 3 of last 4 home games?
                    // We need to parse HT scores from details if possible, or use the 'score_1st_half' if available in basic details
                    // The basic detail fetch might just return the same object if not enriched.
                    // Assuming fetchMatchDetails returns object with 'score_1st_half', 'score_2nd_half' etc.

                    let halfWinCount = 0;
                    for (const d of homeMatchDetails) {
                        // Check if we have valid scores
                        if (d && d.score_1st_half !== undefined && d.score_2nd_half !== undefined) {
                            const htHome = parseInt(d.score_1st_half.split('-')[0]);
                            const htAway = parseInt(d.score_1st_half.split('-')[1]);
                            const ftHome = parseInt(d.score_full_time.split('-')[0]);
                            const ftAway = parseInt(d.score_full_time.split('-')[1]);

                            const secondHome = ftHome - htHome;
                            const secondAway = ftAway - htAway;

                            if (htHome > htAway || secondHome > secondAway) {
                                halfWinCount++;
                            }
                        } else if (d && d.home_team && d.away_team) {
                            // Fallback if structure is different
                            // ... logic similar to calculateAdvancedStats ...
                        }
                    }

                    passes = halfWinCount >= 3;
                    if (passes) log.info(`   ✅ Home won a half in ${halfWinCount}/4 recent matches`);
                }
                matchData.market = 'Ev Sahibi Yarı Kazanır';
                break;
            case 'awayDNB':
                // Away Draw No Bet: Away win or draw. Away should be decent, Home shouldn't be too strong.
                passes = awayAwayStats.winRate >= 40 && awayAwayStats.lossCount <= 2 &&
                    homeHomeStats.winRate < 50 && awayForm.avgScored >= homeForm.avgScored;
                matchData.market = 'Deplasman DNB';
                break;
            case 'handicap':
                const hDiff = homeHomeStats.avgScored - homeHomeStats.avgConceded;
                const aDiff = awayAwayStats.avgScored - awayAwayStats.avgConceded;

                if (homeHomeStats.winRate >= 70 && hDiff >= 1.8) {
                    passes = true;
                    matchData.market = 'Hnd. MS1 (-1.5)';
                } else if (awayAwayStats.winRate >= 70 && aDiff >= 1.8) {
                    passes = true;
                    matchData.market = 'Hnd. MS2 (-1.5)';
                }
                break;
        }

        if (passes) {
            // Query Vector DB for similar matches
            let similarMatchesText = '';
            try {
                const similarMatches = await vectorDB.findSimilarMatches({
                    homeTeam: m.event_home_team,
                    awayTeam: m.event_away_team,
                    league: m.league_name,
                    market: matchData.market,
                    stats: {
                        homeAvgGoals: homeForm.avgScored,
                        awayAvgGoals: awayForm.avgScored,
                        h2hAvgGoals: mutualH2H.length > 0 ?
                            mutualH2H.reduce((sum, g) => sum + (g.home_team?.score || 0) + (g.away_team?.score || 0), 0) / mutualH2H.length : 0,
                        homePPG: homeForm.winRate / 33.33,
                        awayPPG: awayForm.winRate / 33.33
                    }
                }, 5);

                if (similarMatches.length > 0) {
                    similarMatchesText = vectorDB.formatSimilarMatchesForPrompt(similarMatches);
                    log.info(`   📊 Found ${similarMatches.length} similar matches from history`);
                }
            } catch (e) {
                // Vector DB not configured - continue without
            }

            // Generate AI Prompt (with similar matches if available)
            matchData.aiPrompt = generateDetailedPrompt(m, stats, matchData.market, matchData.fhStats, similarMatchesText);
            matchData.similarMatches = similarMatchesText; // Store for bulk copy
            candidates.push(matchData);
            log.info(`   ✅ ${m.event_home_team} vs ${m.event_away_team} → PASS`);
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(`\n✅ Analysis Complete: ${candidates.length} candidates found in ${duration}s`);

    return { candidates, market: marketKey, marketName: marketInfo.name };
}

// Helper: Generate Detailed AI Prompt for a single match
function generateDetailedPrompt(match, stats, market, fhStats = null, similarMatchesText = '') {
    const { homeForm, awayForm, homeHomeStats, awayAwayStats, mutual } = stats;

    // Similar matches section (from Vector DB)
    const similarSection = similarMatchesText ? `
${similarMatchesText}
` : '';

    if (market === 'First Half Over 0.5' && fhStats) {
        const metrics = fhStats.metrics || {};
        return `Act as a professional football betting analyst.
${similarSection}
Match: ${match.event_home_team} vs ${match.event_away_team}
League: ${match.league_name}
Market: First Half Over 0.5 Goals

PURE FORM SCORE: ${fhStats.score || 'N/A'}/100
Confidence: ${fhStats.confidence || 'N/A'}
Reason: ${fhStats.reason || 'N/A'}

KEY METRICS:
- Home Team FH Goal Potential: ${metrics.home_pot ?? 'N/A'}%
- Away Team FH Goal Potential: ${metrics.away_pot ?? 'N/A'}%
- H2H FH Goal Potential: ${metrics.h2h_pot ?? 'N/A'}%

Analyze and provide your verdict.`;
    }

    return `Act as a professional football betting analyst.
${similarSection}
Match: ${match.event_home_team} vs ${match.event_away_team}
League: ${match.league_name}


DETAILED STATISTICS:
1. HOME TEAM (${match.event_home_team})
   - General Form (Last 5): Scored ${homeForm.avgScored.toFixed(2)}/game, Conceded ${homeForm.avgConceded.toFixed(2)}/game.
   - Over 2.5 Rate: ${homeForm.over25Rate.toFixed(0)}%
   - Under 2.5 Rate: ${homeForm.under25Rate.toFixed(0)}%
   - BTTS Rate: ${homeForm.bttsRate.toFixed(0)}%
   - AT HOME (Last 8): Scored in ${homeHomeStats.scoringRate.toFixed(0)}% of games, Win Rate ${homeHomeStats.winRate.toFixed(0)}%. Avg Scored ${homeHomeStats.avgScored.toFixed(2)}.

2. AWAY TEAM (${match.event_away_team})
   - General Form (Last 5): Scored ${awayForm.avgScored.toFixed(2)}/game, Conceded ${awayForm.avgConceded.toFixed(2)}/game.
   - Over 2.5 Rate: ${awayForm.over25Rate.toFixed(0)}%
   - Under 2.5 Rate: ${awayForm.under25Rate.toFixed(0)}%
   - BTTS Rate: ${awayForm.bttsRate.toFixed(0)}%
   - AWAY FROM HOME (Last 8): Conceded in ${Math.max(0, 100 - (awayAwayStats.cleanSheetRate || 0)).toFixed(0)}% of games. Avg Conceded ${awayAwayStats.avgConceded.toFixed(2)}.

3. HEAD-TO-HEAD (Last ${mutual.length})
   ${mutual.map(g => `- ${g.home_team.name} ${g.home_team.score}-${g.away_team.score} ${g.away_team.name}`).join('\n   ')}

TASK: Analyze this match based on the detailed statistics above. Identify the SINGLE BEST betting market for this match (e.g., Over 2.5, BTTS, Home Win, etc.). Provide your verdict and reasoning with a confidence score.`;
}

// ============================================
// 🤖 AUTOMATED AI BANKER ANALYSIS
// ============================================
async function runAIAutomatedAnalysis(leagueFilter = true, log = console) {
    const aiService = require('./services/aiService'); // Lazy load
    log.info(`\n🤖 STARTING AI AUTO-ANALYSIS (Groq Llama 4 Scout)`);

    // 1. Fetch Matches
    const matches = await fetchDay(1, log, !leagueFilter);
    if (matches.length === 0) return [];

    log.info(`🔍 Scanned ${matches.length} matches. Filtering for AI candidates...`);

    const aiCandidates = [];
    let processed = 0;

    for (const m of matches) {
        if (processed >= 20) break; // Limit to 20 AI calls to prevent rate limits/cost

        // PRE-FILTER: Only send statistically interesting matches to AI
        // This saves API tokens and time.
        // Logic: Checks basic stats first.
        try {
            await sleep(500);
            const h2hData = await fetchMatchH2H(m.event_key || m.match_id);
            if (!h2hData) continue;

            const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);
            const homeAllHistory = sections.filter(x => (x.home_team?.name === m.event_home_team) || (x.away_team?.name === m.event_home_team)).slice(0, 5);
            const awayAllHistory = sections.filter(x => (x.home_team?.name === m.event_away_team) || (x.away_team?.name === m.event_away_team)).slice(0, 5);

            // Basic check using existing calc
            const homeForm = calculateAdvancedStats(homeAllHistory, m.event_home_team);
            const awayForm = calculateAdvancedStats(awayAllHistory, m.event_away_team);
            const homeHomeStats = calculateAdvancedStats(sections.filter(x => x.home_team?.name === m.event_home_team).slice(0, 8), m.event_home_team);
            const awayAwayStats = calculateAdvancedStats(sections.filter(x => x.away_team?.name === m.event_away_team).slice(0, 8), m.event_away_team);

            if (!homeForm || !awayForm) continue;

            // PRE-FILTER LOGIC (LOOSE):
            // Either Team Win Rate > 50% OR Over 1.5 Rate > 70%
            const isInteresting =
                (homeHomeStats.winRate > 50) ||
                ((awayAwayStats.lossCount / 8) * 100 > 50) ||
                (homeForm.over15Rate > 70 && awayForm.over15Rate > 70);

            if (!isInteresting) continue;

            // Prepare Match Object for AI
            const matchForAI = {
                ...m,
                filterStats: { homeForm, awayForm, homeHomeStats, awayAwayStats }
            };

            log.info(`🤖 Asking AI: ${m.event_home_team} vs ${m.event_away_team}...`);
            log.info(`🤖 Asking AI: ${m.event_home_team} vs ${m.event_away_team}...`);
            // 3. AI Analysis (SINGLE BEST)
            const aiDecision = await aiService.analyzeMatchForBanker(matchForAI);

            if (aiDecision && aiDecision.market) {
                // Check User Constraints again (Confidence > 80, Odds < 1.60)
                if (aiDecision.estimated_odds <= 1.60 && aiDecision.estimated_odds >= 1.10) {
                    aiCandidates.push({
                        id: m.event_key, // Single result per match
                        matchId: m.event_key,
                        match: `${m.event_home_team} vs ${m.event_away_team}`,
                        league: m.league_name,
                        home_team: m.event_home_team,
                        away_team: m.event_away_team,
                        ai: aiDecision, // { market, confidence, estimated_odds, reason }
                        startTime: m.event_start_time
                    });
                    log.info(`✅ AI FOUND BANKER: ${aiDecision.market} (${aiDecision.estimated_odds})`);
                }
            }

            processed++;

        } catch (e) {
            log.error(`Skipping match ${m.event_home_team}: ${e.message}`);
        }
    }

    // STAGE 2: GENERATE COUPONS FROM POOL
    log.info(` Generating Coupons from ${aiCandidates.length} candidates...`);
    const coupons = await aiService.generateDailyCoupons(aiCandidates);

    return { candidates: aiCandidates, coupons };
}

// ============================================
// 📊 RAW STATS COLLECTION (No Market Filtering)
// ============================================
async function runRawStatsCollection(leagueFilter = true, log = console, customLimit = 50) {
    const startTime = Date.now();

    log.info(`\n╔═══════════════════════════════════════════════════════╗`);
    log.info(`║      📊 RAW STATS COLLECTION                         ║`);
    log.info(`║      League Filter: ${leagueFilter ? 'ON' : 'OFF'}                              ║`);
    log.info(`╚═══════════════════════════════════════════════════════╝`);

    // 1. Fetch Matches
    log.info('[RawStats] Fetching matches...');
    const ignoreLeagues = !leagueFilter;
    let matches = await fetchDay(1, log, ignoreLeagues);

    if (matches.length === 0) {
        log.warn('[RawStats] No matches found.');
        return { matches: [] };
    }

    log.info(`✅ Found ${matches.length} matches. Processing top ${customLimit}...`);

    const results = [];
    let processed = 0;
    let consecutiveErrors = 0;

    for (const m of matches) {
        if (processed >= customLimit) break;
        if (consecutiveErrors >= 3) break;

        const mid = m.event_key || m.match_id;
        if (!mid) continue;

        log.info(`\n[${processed + 1}/${customLimit}] ${m.event_home_team} vs ${m.event_away_team}`);

        await sleep(800);

        const h2hData = await fetchMatchH2H(mid);
        if (!h2hData) {
            consecutiveErrors++;
            log.warn(`   ❌ H2H fetch failed`);
            continue;
        }

        const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);

        // Filter History
        const homeRawHistory = sections.filter(x => (x.home_team?.name === m.event_home_team) || (x.away_team?.name === m.event_home_team));
        const awayRawHistory = sections.filter(x => (x.home_team?.name === m.event_away_team) || (x.away_team?.name === m.event_away_team));
        const homeAllHistory = homeRawHistory.slice(0, 5);
        const awayAllHistory = awayRawHistory.slice(0, 5);
        const homeAtHomeHistory = sections.filter(x => x.home_team?.name === m.event_home_team).slice(0, 8);
        const awayAtAwayHistory = sections.filter(x => x.away_team?.name === m.event_away_team).slice(0, 8);
        const mutualH2H = sections.filter(x =>
            (x.home_team?.name === m.event_home_team && x.away_team?.name === m.event_away_team) ||
            (x.home_team?.name === m.event_away_team && x.away_team?.name === m.event_home_team)
        ).slice(0, 5);

        const homeForm = calculateAdvancedStats(homeAllHistory, m.event_home_team);
        const awayForm = calculateAdvancedStats(awayAllHistory, m.event_away_team);
        const homeHomeStats = calculateAdvancedStats(homeAtHomeHistory, m.event_home_team);
        const awayAwayStats = calculateAdvancedStats(awayAtAwayHistory, m.event_away_team);

        if (!homeForm || !awayForm || !homeHomeStats || !awayAwayStats) {
            log.warn(`   ❌ Insufficient stats`);
            consecutiveErrors = 0;
            continue;
        }

        consecutiveErrors = 0;
        processed++;

        const stats = { homeForm, awayForm, homeHomeStats, awayAwayStats, mutual: mutualH2H };

        // Query Vector DB for similar matches
        let similarMatchesText = '';
        try {
            const similarMatches = await vectorDB.findSimilarMatches({
                homeTeam: m.event_home_team,
                awayTeam: m.event_away_team,
                league: m.league_name,
                stats: {
                    homeAvgGoals: homeForm.avgScored,
                    awayAvgGoals: awayForm.avgScored,
                    h2hAvgGoals: mutualH2H.length > 0 ?
                        mutualH2H.reduce((sum, g) => sum + (g.home_team?.score || 0) + (g.away_team?.score || 0), 0) / mutualH2H.length : 0,
                    homePPG: homeForm.winRate / 33.33,
                    awayPPG: awayForm.winRate / 33.33
                }
            }, 5);

            if (similarMatches.length > 0) {
                similarMatchesText = vectorDB.formatSimilarMatchesForPrompt(similarMatches);
                log.info(`   📊 Found ${similarMatches.length} similar matches from history`);
            }
        } catch (e) {
            // Vector DB not configured or error - continue without
        }

        // Generate comprehensive AI prompt with ALL stats (including similar matches)
        const aiPrompt = generateRawStatsPrompt(m, stats, mutualH2H, similarMatchesText);

        results.push({
            id: mid,
            matchId: mid,
            match: `${m.event_home_team} vs ${m.event_away_team}`,
            event_home_team: m.event_home_team,
            event_away_team: m.event_away_team,
            league: m.league_name,
            league_name: m.league_name,
            startTime: m.event_start_time,
            stats: stats,
            aiPrompt: aiPrompt
        });

        log.info(`   ✅ Stats collected`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(`\n✅ Raw Stats Collection Complete: ${results.length} matches in ${duration}s`);

    return { matches: results };
}

// Helper: Generate Comprehensive AI Prompt with ALL Stats
function generateRawStatsPrompt(match, stats, mutualH2H, similarMatchesText = '') {
    const { homeForm, awayForm, homeHomeStats, awayAwayStats } = stats;

    // Format H2H games
    const h2hGames = mutualH2H.map(g => {
        const date = g.timestamp ? new Date(g.timestamp * 1000).toLocaleDateString('tr-TR') : 'N/A';
        return `   - ${g.home_team?.name} ${g.home_team?.score}-${g.away_team?.score} ${g.away_team?.name} (${date})`;
    }).join('\n') || '   - Karşılıklı maç bulunamadı';

    // Similar matches section (from Vector DB)
    const similarSection = similarMatchesText ? `
${similarMatchesText}
` : '';

    return `SEN PROFESİYONEL BİR FUTBOL ANALİSTİSİN. AŞAĞIDAKİ İSTATİSTİKLERE DAYANARAK BU MAÇ İÇİN EN İYİ BAHİS TAHMİNİNİ YAP.
${similarSection}
═══════════════════════════════════════════════════════
📊 MAÇ: ${match.event_home_team} vs ${match.event_away_team}
📍 LİG: ${match.league_name}
═══════════════════════════════════════════════════════

🏠 EV SAHİBİ: ${match.event_home_team}
────────────────────────────────────────────
GENEL FORM (Son 5 Maç):
  • Maç Sayısı: ${homeForm.matches}
  • Ort. Attığı Gol: ${homeForm.avgScored.toFixed(2)}
  • Ort. Yediği Gol: ${homeForm.avgConceded.toFixed(2)}
  • Ort. Toplam Gol: ${homeForm.avgTotalGoals.toFixed(2)}
  • Kazanma Oranı: %${homeForm.winRate.toFixed(0)}
  • Mağlubiyet Sayısı: ${homeForm.lossCount}
  • Gol Atma Oranı: %${homeForm.scoringRate.toFixed(0)}
  • Clean Sheet: %${homeForm.cleanSheetRate.toFixed(0)}
  • Over 1.5 Maç Oranı: %${homeForm.over15Rate.toFixed(0)}
  • Over 2.5 Maç Oranı: %${homeForm.over25Rate.toFixed(0)}
  • Under 2.5 Maç Oranı: %${homeForm.under25Rate.toFixed(0)}
  • Under 3.5 Maç Oranı: %${homeForm.under35Rate.toFixed(0)}
  • BTTS Maç Oranı: %${homeForm.bttsRate.toFixed(0)}

EVİNDE PERFORMANSI (Son 8 Ev Maçı):
  • Maç Sayısı: ${homeHomeStats.matches}
  • Ort. Attığı Gol: ${homeHomeStats.avgScored.toFixed(2)}
  • Ort. Yediği Gol: ${homeHomeStats.avgConceded.toFixed(2)}
  • Kazanma Oranı: %${homeHomeStats.winRate.toFixed(0)}
  • Gol Atma Oranı: %${homeHomeStats.scoringRate.toFixed(0)}
  • Clean Sheet: %${homeHomeStats.cleanSheetRate.toFixed(0)}
  • Over 2.5 Maç Oranı: %${homeHomeStats.over25Rate.toFixed(0)}
  • BTTS Maç Oranı: %${homeHomeStats.bttsRate.toFixed(0)}

🚌 DEPLASMAN: ${match.event_away_team}
────────────────────────────────────────────
GENEL FORM (Son 5 Maç):
  • Maç Sayısı: ${awayForm.matches}
  • Ort. Attığı Gol: ${awayForm.avgScored.toFixed(2)}
  • Ort. Yediği Gol: ${awayForm.avgConceded.toFixed(2)}
  • Ort. Toplam Gol: ${awayForm.avgTotalGoals.toFixed(2)}
  • Kazanma Oranı: %${awayForm.winRate.toFixed(0)}
  • Mağlubiyet Sayısı: ${awayForm.lossCount}
  • Gol Atma Oranı: %${awayForm.scoringRate.toFixed(0)}
  • Clean Sheet: %${awayForm.cleanSheetRate.toFixed(0)}
  • Over 1.5 Maç Oranı: %${awayForm.over15Rate.toFixed(0)}
  • Over 2.5 Maç Oranı: %${awayForm.over25Rate.toFixed(0)}
  • Under 2.5 Maç Oranı: %${awayForm.under25Rate.toFixed(0)}
  • Under 3.5 Maç Oranı: %${awayForm.under35Rate.toFixed(0)}
  • BTTS Maç Oranı: %${awayForm.bttsRate.toFixed(0)}

DEPLASMANDA PERFORMANSI (Son 8 Deplasman Maçı):
  • Maç Sayısı: ${awayAwayStats.matches}
  • Ort. Attığı Gol: ${awayAwayStats.avgScored.toFixed(2)}
  • Ort. Yediği Gol: ${awayAwayStats.avgConceded.toFixed(2)}
  • Kazanma Oranı: %${awayAwayStats.winRate.toFixed(0)}
  • Gol Atma Oranı: %${awayAwayStats.scoringRate.toFixed(0)}
  • Clean Sheet: %${awayAwayStats.cleanSheetRate.toFixed(0)}
  • Over 2.5 Maç Oranı: %${awayAwayStats.over25Rate.toFixed(0)}
  • BTTS Maç Oranı: %${awayAwayStats.bttsRate.toFixed(0)}

⚔️ KARŞILIKLI GEÇMİŞ (Son 5 Maç)
────────────────────────────────────────────
${h2hGames}

═══════════════════════════════════════════════════════
🎯 GÖREV: Yukarıdaki tüm istatistikleri analiz et ve bu maç için:
1. En güvenli bahis marketini belirle (Maç Sonucu, Over/Under, BTTS, Handikap vb.)
2. Tahminin güven skorunu belirt (%0-100)
3. Kısa ve net gerekçeni yaz

ÖNEMLİ: Sadece istatistiksel verilere dayan, duygusal yorum yapma.
═══════════════════════════════════════════════════════`;
}

module.exports = { runDailyAnalysis, runFirstHalfScan, runSingleMarketAnalysis, runAIAutomatedAnalysis, runRawStatsCollection, MARKET_MAP };

