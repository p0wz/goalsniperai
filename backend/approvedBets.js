/**
 * Approved Bets Storage Module
 * Simple JSON-based storage for admin-approved bets from Daily Analysis
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BETS_FILE = path.join(__dirname, 'data', 'approved_bets.json');

// ============================================
// 📁 Storage Functions
// ============================================

function loadBets() {
    try {
        if (fs.existsSync(BETS_FILE)) {
            const data = fs.readFileSync(BETS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[ApprovedBets] Load error:', e.message);
    }
    return { bets: [] };
}

function saveBets(data) {
    try {
        // Ensure data directory exists
        const dir = path.dirname(BETS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(BETS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[ApprovedBets] Save error:', e.message);
    }
}

// ============================================
// 📝 Approve Bet (from Daily Analysis)
// ============================================

function approveBet(betData) {
    const db = loadBets();

    // Check for duplicate (same match + market)
    const exists = db.bets.some(b =>
        b.match === betData.match &&
        b.market === betData.market &&
        b.status === 'PENDING'
    );

    if (exists) {
        return { success: false, error: 'Bet already exists', duplicate: true };
    }

    const newBet = {
        id: uuidv4(),
        match: betData.match,
        homeTeam: betData.homeTeam,
        awayTeam: betData.awayTeam,
        league: betData.league,
        matchTime: betData.matchTime,
        market: betData.market,
        prediction: betData.prediction,
        odds: betData.odds || null,
        confidence: betData.confidence || null,
        stats: betData.stats || null,        // Full match stats for AI training
        aiPrompt: betData.aiPrompt || null,  // AI-generated analysis
        status: 'PENDING',
        resultScore: null,
        approvedAt: new Date().toISOString(),
        settledAt: null
    };

    db.bets.push(newBet);
    saveBets(db);

    console.log(`[ApprovedBets] ✅ Approved: ${newBet.match} - ${newBet.market}`);
    return { success: true, bet: newBet };
}

// ============================================
// 📋 Get All Bets
// ============================================

function getAllBets() {
    const db = loadBets();
    // Return newest first
    return db.bets.sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));
}

function getPendingBets() {
    const db = loadBets();
    return db.bets.filter(b => b.status === 'PENDING');
}

function getSettledBets() {
    const db = loadBets();
    return db.bets.filter(b => b.status === 'WON' || b.status === 'LOST');
}

// ============================================
// ✅ Settle Bet (Manual: WON/LOST)
// ============================================

function settleBet(betId, status, resultScore = null) {
    if (!['WON', 'LOST'].includes(status)) {
        return { success: false, error: 'Status must be WON or LOST' };
    }

    const db = loadBets();
    const bet = db.bets.find(b => b.id === betId);

    if (!bet) {
        return { success: false, error: 'Bet not found' };
    }

    bet.status = status;
    bet.resultScore = resultScore;
    bet.settledAt = new Date().toISOString();

    saveBets(db);

    console.log(`[ApprovedBets] ⚖️ Settled: ${bet.match} → ${status}`);
    return { success: true, bet };
}

// ============================================
// 🗑️ Delete Bet
// ============================================

function deleteBet(betId) {
    const db = loadBets();
    const index = db.bets.findIndex(b => b.id === betId);

    if (index === -1) {
        return { success: false, error: 'Bet not found' };
    }

    const deleted = db.bets.splice(index, 1)[0];
    saveBets(db);

    console.log(`[ApprovedBets] 🗑️ Deleted: ${deleted.match}`);
    return { success: true, deleted };
}

function clearAllBets() {
    saveBets({ bets: [] });
    console.log('[ApprovedBets] 🗑️ All bets cleared');
    return { success: true };
}

// ============================================
// 📊 Statistics
// ============================================

function getStats() {
    const db = loadBets();
    const bets = db.bets;

    const total = bets.length;
    const pending = bets.filter(b => b.status === 'PENDING').length;
    const won = bets.filter(b => b.status === 'WON').length;
    const lost = bets.filter(b => b.status === 'LOST').length;
    const settled = won + lost;

    const winRate = settled > 0 ? ((won / settled) * 100).toFixed(1) : 0;

    // Group by market
    const byMarket = {};
    bets.forEach(b => {
        if (!byMarket[b.market]) {
            byMarket[b.market] = { total: 0, won: 0, lost: 0, pending: 0 };
        }
        byMarket[b.market].total++;
        if (b.status === 'WON') byMarket[b.market].won++;
        if (b.status === 'LOST') byMarket[b.market].lost++;
        if (b.status === 'PENDING') byMarket[b.market].pending++;
    });

    return {
        total,
        pending,
        won,
        lost,
        settled,
        winRate: parseFloat(winRate),
        byMarket
    };
}

// ============================================
// 🔄 For Auto-Settlement (to be implemented)
// ============================================

function updateBetResult(betId, status, resultScore) {
    return settleBet(betId, status, resultScore);
}

module.exports = {
    approveBet,
    getAllBets,
    getPendingBets,
    getSettledBets,
    settleBet,
    deleteBet,
    clearAllBets,
    getStats,
    updateBetResult
};
