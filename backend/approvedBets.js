/**
 * Approved Bets Storage Module - Turso/LibSQL Version
 * Persistent database storage for admin-approved bets
 */

const { createClient } = require('@libsql/client');
const { v4: uuidv4 } = require('uuid');

// Config - Use same Turso connection
let url = process.env.TURSO_DATABASE_URL || 'file:local.db';
if (url.startsWith('libsql://')) {
    url = url.replace('libsql://', 'https://');
}

const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
    url,
    authToken,
});

// ============================================
// 📝 Approve Bet (from Daily Analysis)
// ============================================

async function approveBet(betData) {
    try {
        // Check for duplicate (same match + market + pending)
        const existing = await db.execute({
            sql: `SELECT id FROM approved_bets WHERE match = ? AND market = ? AND status = 'PENDING'`,
            args: [betData.match, betData.market]
        });

        if (existing.rows.length > 0) {
            return { success: false, error: 'Bet already exists', duplicate: true };
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        await db.execute({
            sql: `INSERT INTO approved_bets (
                id, match, home_team, away_team, league, match_date, match_time,
                event_id, market, prediction, odds, confidence, stats,
                ai_prompt, ai_reason, status, approved_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
            args: [
                id,
                betData.match,
                betData.homeTeam || null,
                betData.awayTeam || null,
                betData.league || null,
                betData.matchDate || null,
                betData.matchTime || null,
                betData.eventId || null,
                betData.market,
                betData.prediction || null,
                betData.odds || null,
                betData.confidence || null,
                betData.stats ? JSON.stringify(betData.stats) : null,
                betData.aiPrompt || null,
                betData.aiReason || null,
                now
            ]
        });

        console.log(`[ApprovedBets] ✅ Approved: ${betData.match} - ${betData.market}`);
        return { success: true, bet: { id, ...betData, status: 'PENDING', approvedAt: now } };
    } catch (e) {
        console.error('[ApprovedBets] Error:', e.message);
        return { success: false, error: e.message };
    }
}

// ============================================
// 📋 Get All Bets
// ============================================

async function getAllBets() {
    try {
        const result = await db.execute(`
            SELECT * FROM approved_bets ORDER BY approved_at DESC
        `);
        return result.rows.map(formatBetRow);
    } catch (e) {
        console.error('[ApprovedBets] Get All Error:', e.message);
        return [];
    }
}

async function getPendingBets() {
    try {
        const result = await db.execute(`
            SELECT * FROM approved_bets WHERE status = 'PENDING' ORDER BY approved_at DESC
        `);
        return result.rows.map(formatBetRow);
    } catch (e) {
        console.error('[ApprovedBets] Get Pending Error:', e.message);
        return [];
    }
}

async function getSettledBets(marketFilter = null) {
    try {
        let query = `SELECT * FROM approved_bets WHERE status IN ('WON', 'LOST', 'REFUND')`;
        if (marketFilter) {
            query += ` AND market = '${marketFilter}'`;
        }
        query += ` ORDER BY settled_at DESC`;

        const result = await db.execute(query);
        return result.rows.map(formatBetRow);
    } catch (e) {
        console.error('[ApprovedBets] Get Settled Error:', e.message);
        return [];
    }
}

// Helper to format row to object
function formatBetRow(row) {
    return {
        id: row.id,
        match: row.match,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        league: row.league,
        matchDate: row.match_date,
        matchTime: row.match_time,
        eventId: row.event_id,
        market: row.market,
        prediction: row.prediction,
        odds: row.odds,
        confidence: row.confidence,
        stats: row.stats ? JSON.parse(row.stats) : null,
        aiPrompt: row.ai_prompt,
        aiReason: row.ai_reason,
        status: row.status,
        resultScore: row.result_score,
        approvedAt: row.approved_at,
        settledAt: row.settled_at,
        isMobile: row.is_mobile === 1 // Convert to boolean
    };
}

// ============================================
// 📱 Toggle Mobile Status
// ============================================

async function toggleMobile(betId, isMobile) {
    try {
        const val = isMobile ? 1 : 0;
        await db.execute({
            sql: `UPDATE approved_bets SET is_mobile = ? WHERE id = ?`,
            args: [val, betId]
        });
        console.log(`[ApprovedBets] 📱 Mobile Toggle: ${betId} -> ${isMobile}`);
        return { success: true, isMobile: !!val };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================
// ✅ Settle Bet (Manual: WON/LOST)
// ============================================

async function settleBet(betId, status, resultScore = null) {
    if (!['WON', 'LOST', 'REFUND'].includes(status)) {
        return { success: false, error: 'Status must be WON, LOST, or REFUND' };
    }

    try {
        const now = new Date().toISOString();

        const result = await db.execute({
            sql: `UPDATE approved_bets SET status = ?, result_score = ?, settled_at = ? WHERE id = ?`,
            args: [status, resultScore, now, betId]
        });

        if (result.rowsAffected === 0) {
            return { success: false, error: 'Bet not found' };
        }

        console.log(`[ApprovedBets] ⚖️ Settled: ${betId} → ${status}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================
// 🗑️ Delete Bet
// ============================================

async function deleteBet(betId) {
    try {
        const result = await db.execute({
            sql: `DELETE FROM approved_bets WHERE id = ?`,
            args: [betId]
        });

        if (result.rowsAffected === 0) {
            return { success: false, error: 'Bet not found' };
        }

        console.log(`[ApprovedBets] 🗑️ Deleted: ${betId}`);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function clearAllBets() {
    try {
        await db.execute(`DELETE FROM approved_bets`);
        console.log('[ApprovedBets] 🗑️ All bets cleared');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================
// 📊 Statistics
// ============================================

async function getStats() {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'WON' THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN status = 'LOST' THEN 1 ELSE 0 END) as lost,
                SUM(CASE WHEN status = 'REFUND' THEN 1 ELSE 0 END) as refund
            FROM approved_bets
        `);

        const row = result.rows[0];
        const total = row.total || 0;
        const pending = row.pending || 0;
        const won = row.won || 0;
        const lost = row.lost || 0;
        const refund = row.refund || 0;
        const settled = won + lost + refund;
        const winRate = (won + lost) > 0 ? ((won / (won + lost)) * 100).toFixed(1) : 0;

        // Get by market stats
        const marketResult = await db.execute(`
            SELECT market, 
                   COUNT(*) as total,
                   SUM(CASE WHEN status = 'WON' THEN 1 ELSE 0 END) as won,
                   SUM(CASE WHEN status = 'LOST' THEN 1 ELSE 0 END) as lost,
                   SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
            FROM approved_bets 
            GROUP BY market
        `);

        const byMarket = {};
        marketResult.rows.forEach(r => {
            const mWon = r.won || 0;
            const mLost = r.lost || 0;
            const mWinRate = (mWon + mLost) > 0 ? ((mWon / (mWon + mLost)) * 100).toFixed(1) : 0;
            byMarket[r.market] = {
                total: r.total,
                won: mWon,
                lost: mLost,
                pending: r.pending || 0,
                winRate: parseFloat(mWinRate)
            };
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
    } catch (e) {
        console.error('[ApprovedBets] Stats Error:', e.message);
        return { total: 0, pending: 0, won: 0, lost: 0, settled: 0, winRate: 0, byMarket: {} };
    }
}

// ============================================
// 🔄 For Auto-Settlement
// ============================================

async function updateBetResult(betId, status, resultScore) {
    return settleBet(betId, status, resultScore);
}

// ============================================
// 🗑️ Clear Pending Bets (For Mobile Reset)
// ============================================

async function clearPendingBets() {
    try {
        const result = await db.execute(`
            DELETE FROM approved_bets WHERE status = 'PENDING'
        `);
        console.log(`[ApprovedBets] 🗑️ Cleared all pending bets`);
        return { success: true, deleted: result.rowsAffected || 0 };
    } catch (e) {
        console.error('[ApprovedBets] Clear Pending Error:', e.message);
        return { success: false, error: e.message };
    }
}

module.exports = {
    approveBet,
    getAllBets,
    getPendingBets,
    getSettledBets,
    settleBet,
    deleteBet,
    clearAllBets,
    clearPendingBets,
    getStats,
    updateBetResult,
    toggleMobile
};
