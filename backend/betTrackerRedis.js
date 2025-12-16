const axios = require('axios');
require('dotenv').config();

// ============================================
// 🗄️ Upstash Redis Configuration
// ============================================
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Redis Key
const BETS_KEY = 'goalsniper:bets';
const COUPONS_KEY = 'goalsniper:coupons';

// ============================================
// 🔧 Redis Helper Functions
// ============================================
async function redisGet(key) {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.log('[BetTracker] ⚠️ Upstash not configured, using empty array');
        return null;
    }

    try {
        const response = await axios.get(`${UPSTASH_URL}/get/${key}`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        return response.data.result;
    } catch (error) {
        console.error('[BetTracker] Redis GET error:', error.message);
        return null;
    }
}

async function redisSet(key, value) {
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.log('[BetTracker] ⚠️ Upstash not configured');
        return false;
    }

    try {
        const encodedValue = encodeURIComponent(JSON.stringify(value));
        await axios.get(`${UPSTASH_URL}/set/${key}/${encodedValue}`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        return true;
    } catch (error) {
        console.error('[BetTracker] Redis SET error:', error.message);
        return false;
    }
}

// ============================================
// 📁 Database Layer
// ============================================
async function loadDb() {
    const data = await redisGet(BETS_KEY);
    if (!data) return [];

    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('[BetTracker] Parse error:', e.message);
        return [];
    }
}

async function saveDb(data) {
    return await redisSet(BETS_KEY, data);
}

// ============================================
// 📝 Record Bet
// ============================================
async function recordBet(matchData, market, strategyCode, confidence, source = 'live', entryScore = null) {
    const db = await loadDb();

    // Prevent Duplicates
    // General Rule: Same match + Same strategy = DUPLICATE
    // EXCEPTION: For 'LATE_GAME', if the score is different, we allow it (max 2 managed by server.js)
    const existingBet = db.find(b => b.api_fixture_id == matchData.match_id && b.strategy === strategyCode);

    if (existingBet) {
        // If it's Late Game AND score is different, allow it
        if (strategyCode === 'LATE_GAME' && existingBet.entry_score !== entryScore) {
            console.log(`[BetTracker] allowing 2nd Late Game bet due to score change (${existingBet.entry_score} -> ${entryScore})`);
        } else {
            console.log(`[BetTracker] Duplicate bet skipped: ${matchData.home_team} vs ${matchData.away_team} (${market}) - Strategy: ${strategyCode}`);
            return;
        }
    }

    const newBet = {
        id: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        api_fixture_id: matchData.match_id,
        match: `${matchData.home_team} vs ${matchData.away_team}`,
        home_team: matchData.home_team,
        away_team: matchData.away_team,
        date: new Date().toISOString().split('T')[0],
        market: market,
        strategy: strategyCode,
        confidence: confidence,
        source: source,
        entry_score: entryScore, // Score when bet was placed (e.g., "1-0")
        status: 'PENDING',
        result_score: null,
        settled_at: null,
        created_at: new Date().toISOString()
    };

    db.push(newBet);
    await saveDb(db);
    console.log(`[BetTracker] 📝 Bet Recorded [${source.toUpperCase()}]: ${newBet.match} @ ${entryScore || 'N/A'} - ${market}`);
}

// ============================================
// 📋 Get All Bets (for Frontend)
// ============================================
async function getAllBets() {
    const db = await loadDb();
    // Sort by date descending (newest first)
    return db.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
}

// ============================================
// ✅ Manual Settlement (Won/Lost buttons)
// ============================================
async function manualSettle(betId, status, resultScore = null) {
    if (!['WON', 'LOST', 'VOID'].includes(status)) {
        return { success: false, error: 'Invalid status' };
    }

    const db = await loadDb();
    const bet = db.find(b => b.id === betId);

    if (!bet) {
        return { success: false, error: 'Bet not found' };
    }

    bet.status = status;
    bet.result_score = resultScore || bet.result_score;
    bet.settled_at = new Date().toISOString();
    bet.manual_settle = true;

    await saveDb(db);
    console.log(`[BetTracker] ✅ Manual settle: ${bet.match} -> ${status}`);

    return { success: true, bet };
}

// ============================================
// 📊 Performance Stats
// ============================================
async function getPerformanceStats() {
    const db = await loadDb();

    const stats = {
        totalBets: db.length,
        wins: db.filter(b => b.status === 'WON').length,
        losses: db.filter(b => b.status === 'LOST').length,
        pending: db.filter(b => b.status === 'PENDING').length,
        winRate: '0%',
        profit: 0,
        markets: {}
    };

    // Calculate win rate
    const settled = stats.wins + stats.losses;
    if (settled > 0) {
        stats.winRate = `${Math.round((stats.wins / settled) * 100)}%`;
        stats.profit = stats.wins - stats.losses;
    }

    // Market breakdown
    const marketGroups = {};
    db.forEach(b => {
        if (!marketGroups[b.market]) {
            marketGroups[b.market] = { wins: 0, losses: 0 };
        }
        if (b.status === 'WON') marketGroups[b.market].wins++;
        if (b.status === 'LOST') marketGroups[b.market].losses++;
    });

    Object.entries(marketGroups).forEach(([market, data]) => {
        const total = data.wins + data.losses;
        if (total > 0) {
            stats.markets[market] = `${Math.round((data.wins / total) * 100)}%`;
        }
    });

    return stats;
}

// ============================================
// ⏱️ Scheduler
// ============================================
function startTracking() {
    console.log('[BetTracker] 🚀 Upstash Redis Service Started');
    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.log('[BetTracker] ⚠️ Warning: UPSTASH credentials not set!');
    }
}

// ============================================
// ⚖️ Settlement Engine (placeholder)
// ============================================
async function settleBets() {
    console.log('[BetTracker] Auto-settlement skipped. Use dashboard for manual settlement.');
}

// ============================================
// 🗑️ Clear All Bets (Admin)
// ============================================
async function clearAllBets(source = null) {
    if (source) {
        const db = await loadDb();
        const filtered = db.filter(b => b.source !== source);
        await saveDb(filtered);
        return { success: true, message: `Cleared all ${source} bets` };
    } else {
        await saveDb([]); // Clear full DB
        return { success: true, message: 'Cleared all history (Live + Daily)' };
    }
}

async function deleteBet(id) {
    const db = await loadDb();
    const filtered = db.filter(b => b.id !== id);
    if (filtered.length === db.length) {
        return { success: false, error: 'Bet not found' };
    }
    await saveDb(filtered);
    return { success: true, message: 'Bet deleted' };
}

// Clear history for a specific market (by market name or strategyCode)
async function clearMarketHistory(market) {
    const db = await loadDb();
    const filtered = db.filter(b => b.market !== market && b.strategyCode !== market);
    const deleted = db.length - filtered.length;
    await saveDb(filtered);
    return { success: true, message: `Cleared ${deleted} bets for market: ${market}` };
}

// ============================================
// 🤖 Auto-Settlement Helpers
// ============================================
async function getPendingBets() {
    const db = await loadDb();
    // Return only live bets for now? Or daily too? Daily logic is different?
    // Let's settle ALL pending bets. logic in server.js will decide what to do.
    return db.filter(b => b.status === 'PENDING');
}

async function updateBetStatus(betId, status, resultScore) {
    const db = await loadDb();
    const bet = db.find(b => b.id === betId);
    if (bet) {
        bet.status = status;
        bet.result_score = resultScore;
        bet.settled_at = new Date().toISOString();
        bet.auto_settled = true;
        await saveDb(db);
        console.log(`[BetTracker] 🤖 Auto-Settle: ${bet.match} -> ${status} (${bet.entry_score} -> ${resultScore})`);
        return true;
    }
    return false;
}

// ============================================
// 🎫 Coupon Management
// ============================================
async function getCoupons() {
    const data = await redisGet(COUPONS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error('[BetTracker] Parse coupons error:', e.message);
        return [];
    }
}

async function saveCoupon(couponData) {
    const coupons = await getCoupons();

    const newCoupon = {
        id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        title: couponData.title || 'Daily Coupon',
        matches: couponData.matches || [], // Array of match objects
        totalOdds: couponData.totalOdds || 0,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        settled_at: null
    };

    coupons.unshift(newCoupon); // Add to top

    // Limit to 50 coupons history
    if (coupons.length > 50) coupons.pop();

    await redisSet(COUPONS_KEY, coupons);
    return newCoupon;
}

async function settleCoupon(couponId, status) {
    const coupons = await getCoupons();
    const index = coupons.findIndex(c => c.id === couponId);

    if (index === -1) return { success: false, error: 'Coupon not found' };

    coupons[index].status = status;
    coupons[index].settled_at = new Date().toISOString();

    await redisSet(COUPONS_KEY, coupons);
    return { success: true, coupon: coupons[index] };
}

async function deleteCoupon(couponId) {
    const coupons = await getCoupons();
    const filtered = coupons.filter(c => c.id !== couponId);
    await redisSet(COUPONS_KEY, filtered);
    return { success: true };
}

module.exports = {
    recordBet,
    getAllBets,
    getPerformanceStats,
    manualSettle,
    startTracking,
    clearAllBets,
    clearMarketHistory,
    getPendingBets,
    updateBetStatus,
    // Coupon Exports
    getCoupons,
    saveCoupon,
    settleCoupon,
    deleteCoupon,
    deleteBet
};
