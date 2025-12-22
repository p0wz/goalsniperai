/**
 * Training Pool Storage Module
 * Stores settled bets for AI training
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const POOL_FILE = path.join(__dirname, 'data', 'training_pool.json');

// ============================================
// 📁 Storage Functions
// ============================================

function loadPool() {
    try {
        if (fs.existsSync(POOL_FILE)) {
            const data = fs.readFileSync(POOL_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[TrainingPool] Load error:', e.message);
    }
    return { entries: [], stats: { total: 0, won: 0, lost: 0 } };
}

function savePool(data) {
    try {
        const dir = path.dirname(POOL_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(POOL_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[TrainingPool] Save error:', e.message);
    }
}

// ============================================
// 📝 Add Settled Bet to Training Pool
// ============================================

function addEntry(settledBet) {
    const pool = loadPool();

    const entry = {
        id: uuidv4(),
        // Match Info
        match: settledBet.match,
        homeTeam: settledBet.homeTeam,
        awayTeam: settledBet.awayTeam,
        league: settledBet.league,
        eventId: settledBet.eventId,
        matchDate: settledBet.matchDate,
        matchTime: settledBet.matchTime,
        // Prediction
        market: settledBet.market,
        prediction: settledBet.prediction,
        // Result
        result: settledBet.result,           // WON or LOST
        finalScore: settledBet.finalScore,   // "2-1"
        homeGoals: settledBet.homeGoals,
        awayGoals: settledBet.awayGoals,
        totalGoals: settledBet.homeGoals + settledBet.awayGoals,
        // Stats at approval time (for AI training)
        stats: settledBet.stats || null,
        aiPrompt: settledBet.aiPrompt || null,
        // Timestamps
        approvedAt: settledBet.approvedAt,
        settledAt: new Date().toISOString()
    };

    pool.entries.push(entry);

    // Update stats
    pool.stats.total++;
    if (settledBet.result === 'WON') pool.stats.won++;
    if (settledBet.result === 'LOST') pool.stats.lost++;

    savePool(pool);

    console.log(`[TrainingPool] ✅ Added: ${entry.match} - ${entry.market} → ${entry.result}`);
    return { success: true, entry };
}

// ============================================
// 📋 Get Training Pool
// ============================================

function getAllEntries() {
    const pool = loadPool();
    return pool.entries.sort((a, b) => new Date(b.settledAt) - new Date(a.settledAt));
}

function getStats() {
    const pool = loadPool();
    const entries = pool.entries;

    const total = entries.length;
    const won = entries.filter(e => e.result === 'WON').length;
    const lost = entries.filter(e => e.result === 'LOST').length;
    const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

    // Group by market
    const byMarket = {};
    entries.forEach(e => {
        if (!byMarket[e.market]) {
            byMarket[e.market] = { total: 0, won: 0, lost: 0 };
        }
        byMarket[e.market].total++;
        if (e.result === 'WON') byMarket[e.market].won++;
        if (e.result === 'LOST') byMarket[e.market].lost++;
    });

    // Group by league
    const byLeague = {};
    entries.forEach(e => {
        const league = e.league || 'Unknown';
        if (!byLeague[league]) {
            byLeague[league] = { total: 0, won: 0, lost: 0 };
        }
        byLeague[league].total++;
        if (e.result === 'WON') byLeague[league].won++;
        if (e.result === 'LOST') byLeague[league].lost++;
    });

    return {
        total,
        won,
        lost,
        winRate: parseFloat(winRate),
        byMarket,
        byLeague
    };
}

// ============================================
// 🗑️ Clear Pool (Admin only)
// ============================================

function clearPool() {
    savePool({ entries: [], stats: { total: 0, won: 0, lost: 0 } });
    console.log('[TrainingPool] 🗑️ Pool cleared');
    return { success: true };
}

module.exports = {
    addEntry,
    getAllEntries,
    getStats,
    clearPool
};
