const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

// ============================================
// 🗄️ MongoDB Connection
// ============================================
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
let isConnected = false;

async function connectDB() {
    if (isConnected || !MONGO_URI) {
        return isConnected;
    }

    try {
        await mongoose.connect(MONGO_URI);
        isConnected = true;
        console.log('[BetTracker] ✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('[BetTracker] ❌ MongoDB connection error:', error.message);
        return false;
    }
}

// ============================================
// 📋 Bet Schema
// ============================================
const BetSchema = new mongoose.Schema({
    betId: { type: String, required: true, unique: true },
    api_fixture_id: String,
    match: String,
    home_team: String,
    away_team: String,
    date: String,
    market: String,
    strategy: String,
    confidence: Number,
    source: { type: String, enum: ['live', 'daily'], default: 'live' },
    status: { type: String, enum: ['PENDING', 'WON', 'LOST', 'VOID'], default: 'PENDING' },
    result_score: String,
    settled_at: Date,
    manual_settle: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
});

const Bet = mongoose.model('Bet', BetSchema);

// ============================================
// 📝 Record Bet
// ============================================
async function recordBet(matchData, market, strategyCode, confidence, source = 'live') {
    await connectDB();

    // Prevent Duplicates
    const exists = await Bet.findOne({
        api_fixture_id: matchData.match_id,
        market: market
    });

    if (exists) {
        console.log(`[BetTracker] Duplicate bet skipped: ${matchData.home_team} vs ${matchData.away_team} (${market})`);
        return;
    }

    const newBet = new Bet({
        betId: `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        api_fixture_id: matchData.match_id,
        match: `${matchData.home_team} vs ${matchData.away_team}`,
        home_team: matchData.home_team,
        away_team: matchData.away_team,
        date: new Date().toISOString().split('T')[0],
        market: market,
        strategy: strategyCode,
        confidence: confidence,
        source: source,
        status: 'PENDING'
    });

    try {
        await newBet.save();
        console.log(`[BetTracker] 📝 Bet Recorded [${source.toUpperCase()}]: ${newBet.match} - ${market}`);
    } catch (error) {
        console.error('[BetTracker] Error saving bet:', error.message);
    }
}

// ============================================
// 📋 Get All Bets (for Frontend)
// ============================================
async function getAllBets() {
    await connectDB();

    try {
        const bets = await Bet.find().sort({ created_at: -1 }).lean();
        // Map _id to id for frontend compatibility
        return bets.map(b => ({
            ...b,
            id: b.betId
        }));
    } catch (error) {
        console.error('[BetTracker] Error fetching bets:', error.message);
        return [];
    }
}

// ============================================
// ✅ Manual Settlement (Won/Lost buttons)
// ============================================
async function manualSettle(betId, status, resultScore = null) {
    if (!['WON', 'LOST', 'VOID'].includes(status)) {
        return { success: false, error: 'Invalid status' };
    }

    await connectDB();

    try {
        const bet = await Bet.findOne({ betId: betId });

        if (!bet) {
            return { success: false, error: 'Bet not found' };
        }

        bet.status = status;
        bet.result_score = resultScore || bet.result_score;
        bet.settled_at = new Date();
        bet.manual_settle = true;

        await bet.save();
        console.log(`[BetTracker] ✅ Manual settle: ${bet.match} -> ${status}`);

        return { success: true, bet };
    } catch (error) {
        console.error('[BetTracker] Error settling bet:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// 📊 Performance Stats
// ============================================
async function getPerformanceStats() {
    await connectDB();

    try {
        const bets = await Bet.find().lean();

        const stats = {
            totalBets: bets.length,
            wins: bets.filter(b => b.status === 'WON').length,
            losses: bets.filter(b => b.status === 'LOST').length,
            pending: bets.filter(b => b.status === 'PENDING').length,
            winRate: '0%',
            profit: 0,
            markets: {}
        };

        // Calculate win rate
        const settled = stats.wins + stats.losses;
        if (settled > 0) {
            stats.winRate = `${Math.round((stats.wins / settled) * 100)}%`;
            stats.profit = stats.wins - stats.losses; // Simple unit profit
        }

        // Market breakdown
        const marketGroups = {};
        bets.forEach(b => {
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
    } catch (error) {
        console.error('[BetTracker] Error getting stats:', error.message);
        return { totalBets: 0, wins: 0, losses: 0, pending: 0, winRate: '0%', profit: 0, markets: {} };
    }
}

// ============================================
// ⏱️ Scheduler (Placeholder - manual settlement preferred)
// ============================================
function startTracking() {
    console.log('[BetTracker] MongoDB Service Started. Using manual settlement.');
    connectDB();
}

// ============================================
// ⚖️ Settlement Engine (Auto - placeholder)
// ============================================
async function settleBets() {
    // With MongoDB, we rely on manual settlement via dashboard
    console.log('[BetTracker] Auto-settlement skipped. Use dashboard for manual settlement.');
}

module.exports = {
    recordBet,
    settleBets,
    getPerformanceStats,
    startTracking,
    getAllBets,
    manualSettle,
    connectDB
};
