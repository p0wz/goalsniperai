const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Configuration
const DB_FILE = path.join(__dirname, 'bet_history.json');
const CHECK_INTERVAL_MINUTES = 60;

// API Config (Flashscore4)
const FLASHSCORE_API = {
    baseURL: 'https://flashscore4.p.rapidapi.com',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
    }
};

// ============================================
// 📁 Database Layer (JSON)
// ============================================
function loadDb() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
        return [];
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[BetTracker] DB Read Error:', e);
        return [];
    }
}

function saveDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[BetTracker] DB Write Error:', e);
    }
}

// ============================================
// 📝 Record Bet
// ============================================
/**
 * Records a new bet into the system.
 * @param {Object} matchData - Match info (id, home, away, date)
 * @param {String} market - 'Over 1.5 Goals', 'BTTS', etc.
 * @param {String} strategyCode - Code for the strategy used
 * @param {Number} confidence - Confidence score
 */
function recordBet(matchData, market, strategyCode, confidence, source = 'live') {
    const db = loadDb();

    // Prevent Duplicates: Check if we already have a bet for this match & market
    const exists = db.find(b => b.api_fixture_id == matchData.match_id && b.market === market);
    if (exists) {
        console.log(`[BetTracker] Duplicate bet skipped: ${matchData.home_team} vs ${matchData.away_team} (${market})`);
        return;
    }

    const newBet = {
        id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        api_fixture_id: matchData.match_id,
        match: `${matchData.home_team} vs ${matchData.away_team}`,
        home_team: matchData.home_team,
        away_team: matchData.away_team,
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        market: market,
        strategy: strategyCode,
        confidence: confidence,
        source: source, // 'live' or 'daily'
        status: 'PENDING', // PENDING, WON, LOST, VOID
        result_score: null,
        settled_at: null
    };

    db.push(newBet);
    saveDb(db);
    console.log(`[BetTracker] 📝 Bet Recorded [${source.toUpperCase()}]: ${newBet.match} - ${market}`);
}

// ============================================
// ⚖️ Settlement Engine (Batch Processing)
// ============================================

// Helper: Fetch finished matches for a specific day
async function fetchFinishedMatches(dayOffset) {
    try {
        const response = await axios.get(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/list/${dayOffset}/0`, {
            headers: FLASHSCORE_API.headers
        });

        const data = response.data;
        const list = Array.isArray(data) ? data : Object.values(data);
        const finishedMatches = [];

        list.forEach(tournament => {
            if (tournament.matches) {
                tournament.matches.forEach(m => {
                    // Filter for Finished matches: score must be present and not null
                    // API returns null score for unplayed/live matches sometimes
                    if (m.home_team && m.home_team.score !== null && m.away_team && m.away_team.score !== null) {
                        finishedMatches.push(m);
                    }
                });
            }
        });

        return finishedMatches;
    } catch (e) {
        console.error(`[BetTracker] Batch fetch failed for day ${dayOffset}: ${e.message}`);
        return [];
    }
}

// Core Logic: Resolve specific markets
function checkWinCondition(market, homeScore, awayScore) {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    const total = h + a;

    switch (market) {
        case 'Over 1.5 Goals':
            return total >= 2;

        case 'Under 3.5 Goals':
            return total < 4;

        case 'BTTS': // KG Var
            return h > 0 && a > 0;

        case '1X Double Chance':
            return h >= a;

        case 'Home Team Over 1.5':
            return h >= 2;

        // Note: 'Home Win Either Half' requires HT scores.
        // The list endpoint often does not provide HT scores.
        // We skip this market for batch settlement to avoid false negatives.

        default:
            return null; // Unknown market
    }
}

async function settleBets() {
    console.log('[BetTracker] 🔄 Running Batch Settlement...');
    const db = loadDb();
    const pendingBets = db.filter(b => b.status === 'PENDING');

    if (pendingBets.length === 0) {
        console.log('[BetTracker] No pending bets to settle.');
        return;
    }

    // Optimization: Fetch Day 0 (Today) and Day -1 (Yesterday)
    const batches = [
        await fetchFinishedMatches(0),
        await fetchFinishedMatches(-1)
    ];
    const allFinishedRaw = batches.flat();

    // Index map for O(1) lookup
    const resultMap = {};
    allFinishedRaw.forEach(m => {
        resultMap[m.match_id] = m;
    });

    let settledCount = 0;

    pendingBets.forEach(bet => {
        const matchResult = resultMap[bet.api_fixture_id];

        if (matchResult) {
            // SAFEGUARD: The API list endpoint often lacks a specific 'Finished' status string.
            // To prevent settling LIVE matches (e.g., min 10, score 1-0) as finished,
            // we enforce a "3-Hour Rule": Only process if current time > match_start + 3 hours.
            const matchTime = parseInt(matchResult.timestamp) * 1000;
            const threeHoursAgo = Date.now() - (3 * 60 * 60 * 1000);

            if (matchTime > threeHoursAgo) {
                // Match started less than 3 hours ago, likely still playing or just finished.
                // Skip to be safe.
                return;
            }

            // In new format, we check if scores exist
            if (matchResult.home_team.score !== null && matchResult.away_team.score !== null) {
                // NOTE: We use 'score' (Regular Time) instead of 'score_after' (Penalties/ET).
                // Standard betting markets (O1.5, BTTS) settle on 90 mins.
                const homeScore = matchResult.home_team.score;
                const awayScore = matchResult.away_team.score;

                const isWin = checkWinCondition(bet.market, homeScore, awayScore);

                if (isWin !== null) {
                    bet.status = isWin ? 'WON' : 'LOST';
                    bet.result_score = `${homeScore}-${awayScore}`;
                    bet.settled_at = new Date().toISOString();
                    settledCount++;
                    console.log(`[BetTracker] 🏁 Settled: ${bet.match} [${bet.market}] -> ${bet.status} (${bet.result_score})`);
                }
            }
        }
    });

    if (settledCount > 0) {
        saveDb(db);
        console.log(`[BetTracker] Saved ${settledCount} settled bets.`);
    } else {
        console.log('[BetTracker] No pending bets matched with finished games.');
    }
}

// ============================================
// 📊 Analytics
// ============================================
function getPerformanceStats() {
    const db = loadDb();
    const settled = db.filter(b => b.status === 'WON' || b.status === 'LOST');
    const total = settled.length;

    if (total === 0) {
        return { totalBets: 0, winRate: 0, profit: 0, markets: {} };
    }

    const won = settled.filter(b => b.status === 'WON').length;
    const winRate = ((won / total) * 100).toFixed(1);

    // Breakdown by Market
    const marketStats = {};
    settled.forEach(b => {
        if (!marketStats[b.market]) {
            marketStats[b.market] = { total: 0, won: 0 };
        }
        marketStats[b.market].total++;
        if (b.status === 'WON') marketStats[b.market].won++;
    });

    // Format Market Stats
    const markets = {};
    Object.keys(marketStats).forEach(m => {
        const ms = marketStats[m];
        markets[m] = `${((ms.won / ms.total) * 100).toFixed(0)}% (${ms.won}/${ms.total})`;
    });

    return {
        totalBets: total,
        winRate: `${winRate}%`,
        profit: won - (total - won), // Simple Flat Stake (+1 unit win, -1 unit loss)
        markets: markets
    };
}

// ============================================
// ⏱️ Scheduler
// ============================================
function startTracking() {
    console.log('[BetTracker] Service Started. Monitoring bets...');

    // Run immediately on start
    settleBets();

    // Schedule: Every 60 minutes
    setInterval(() => {
        settleBets();
    }, CHECK_INTERVAL_MINUTES * 60 * 1000);
}

// ============================================
// 📋 Get All Bets (for Frontend)
// ============================================
function getAllBets() {
    const db = loadDb();
    // Sort by date descending (newest first)
    return db.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ============================================
// ✅ Manual Settlement (Won/Lost buttons)
// ============================================
function manualSettle(betId, status, resultScore = null) {
    if (!['WON', 'LOST', 'VOID'].includes(status)) {
        return { success: false, error: 'Invalid status' };
    }

    const db = loadDb();
    const bet = db.find(b => b.id === betId);

    if (!bet) {
        return { success: false, error: 'Bet not found' };
    }

    bet.status = status;
    bet.result_score = resultScore || bet.result_score;
    bet.settled_at = new Date().toISOString();
    bet.manual_settle = true;

    saveDb(db);
    console.log(`[BetTracker] ✅ Manual settle: ${bet.match} -> ${status}`);

    return { success: true, bet };
}

module.exports = {
    recordBet,
    settleBets,
    getPerformanceStats,
    startTracking,
    getAllBets,
    manualSettle
};
