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
 * @param {String} source - 'live' or 'daily'
 * @param {Object} trainingData - Optional {input, analyst_output, critic_output}
 */
function recordBet(matchData, market, strategyCode, confidence, source = 'live', trainingData = null) {
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
        settled_at: null,
        training_data: trainingData
    };

    db.push(newBet);
    saveDb(db);
    console.log(`[BetTracker] 📝 Bet Recorded [${source.toUpperCase()}]: ${newBet.match} - ${market}`);
}

// ============================================
// ⚖️ Settlement Engine (Batch Processing)
// ============================================

// Helper: Fetch Match Details (Targeted)
async function fetchMatchResult(matchId) {
    try {
        const response = await axios.get(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/details/${matchId}`, {
            headers: FLASHSCORE_API.headers
        });
        return response.data; // Returns { DATA: { event: { ... } } } or similar structure
    } catch (e) {
        console.error(`[BetTracker] Details fetch failed for ${matchId}: ${e.message}`);
        return null;
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

        case 'Over 2.5 Goals':
            return total >= 2.5;

        case 'Under 2.5 Goals':
            return total < 2.5;

        case 'MS1 & 1.5 Üst':
            return h > a && total > 1.5;

        case 'Dep 0.5 Üst':
            return a > 0;

        default:
            return null; // Unknown market
    }
}

async function settleBets() {
    console.log('[BetTracker] 🔄 Running Settlement (Targeted Check)...');
    const db = loadDb();
    const pendingBets = db.filter(b => b.status === 'PENDING');

    if (pendingBets.length === 0) {
        console.log('[BetTracker] No pending bets to settle.');
        return;
    }

    let settledCount = 0;

    for (const bet of pendingBets) {
        // Rate Limit Protection (1 request per 1.5s)
        await new Promise(r => setTimeout(r, 1500));

        const mid = bet.api_fixture_id;
        if (!mid) continue;

        // 3-Hour Rule: Don't check if match started recently
        const betDate = new Date(bet.date); // Need start time really, but date is approx
        // Better: We stored match start time in some objects but maybe not all? 
        // If api_fixture_id is 'timestamp_...', use that.
        // Assuming we check regardless if it's been a while since 'date'.

        // Actually, let's just fetch details. The API will tell us if it's 'Finished'.
        const detailsData = await fetchMatchResult(mid);

        if (!detailsData || !detailsData.DATA) continue;
        const event = detailsData.DATA.event;

        // Check Status codes: 3 = Finished, 33 = Finished After Extra Time? 
        // Safer: Check absolute status. Flashscore usually has 'status_type' or similar.
        // Let's rely on scores being final.

        // If event.status_type !== 'FINISHED' (mapping required), skip.
        // Simplified: Check if we have FT scores and status indicates end.
        // Flashscore API v1 generic structure inspection:
        // event.stage_start_time, event.status (e.g., "FINISHED")

        // Logic: If we have scores and it looks done.
        const homeScore = event.home_score?.current;
        const awayScore = event.away_score?.current;

        if (homeScore !== undefined && awayScore !== undefined && event.status_type === 'finished') {
            const isWin = checkWinCondition(bet.market, homeScore, awayScore);

            if (isWin !== null) {
                bet.status = isWin ? 'WON' : 'LOST';
                bet.result_score = `${homeScore}-${awayScore}`;
                bet.settled_at = new Date().toISOString();
                settledCount++;
                console.log(`[BetTracker] 🏁 Settled: ${bet.match} [${bet.market}] -> ${bet.status} (${bet.result_score})`);

                // 🧠 Data Flywheel
                if (bet.training_data) {
                    logToFlywheel(bet);
                }
            }
        }
    }

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

    // Trigger Flywheel if finalized
    if (['WON', 'LOST'].includes(status) && bet.training_data) {
        logToFlywheel(bet);
    }

    return { success: true, bet };
}

// Helper: Log to Training Data (Flywheel)
function logToFlywheel(bet) {
    try {
        const datasetPath = path.join(__dirname, 'data', 'training_dataset.jsonl');
        const trainingEntry = {
            messages: [
                { role: "system", content: "You are a professional football betting analyst." },
                { role: "user", content: bet.training_data.input },
                {
                    role: "assistant",
                    content: bet.status === 'WON'
                        ? bet.training_data.analyst_output
                        : `[CORRECTION] The previous analysis was wrong. The result was ${bet.result_score || 'UNKNOWN'} (LOST). I should have been more skeptical.`
                }
            ],
            meta: {
                match: bet.match,
                market: bet.market,
                result: bet.status,
                score: bet.result_score
            }
        };

        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

        fs.appendFileSync(datasetPath, JSON.stringify(trainingEntry) + '\n');
        console.log(`[Flywheel] 🧠 Saved training example for ${bet.match} (${bet.status})`);
    } catch (err) {
        console.error(`[Flywheel] Error saving dataset: ${err.message}`);
    }
}

module.exports = {
    recordBet,
    settleBets,
    getPerformanceStats,
    startTracking,
    getAllBets,
    manualSettle
};
