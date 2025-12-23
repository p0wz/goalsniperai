/**
 * Training Pool Storage Module - Turso/LibSQL Version
 * Stores settled bets for AI training (persistent)
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
// 📝 Add Settled Bet to Training Pool
// ============================================

async function addEntry(settledBet) {
    try {
        const id = uuidv4();
        const now = new Date().toISOString();

        await db.execute({
            sql: `INSERT INTO training_pool (
                id, match, home_team, away_team, league, market, prediction,
                result, final_score, home_goals, away_goals, stats, ai_prompt, settled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                settledBet.match,
                settledBet.homeTeam || null,
                settledBet.awayTeam || null,
                settledBet.league || null,
                settledBet.market,
                settledBet.prediction || null,
                settledBet.result,
                settledBet.finalScore || null,
                settledBet.homeGoals || null,
                settledBet.awayGoals || null,
                settledBet.stats ? JSON.stringify(settledBet.stats) : null,
                settledBet.aiPrompt || null,
                now
            ]
        });

        console.log(`[TrainingPool] ✅ Added: ${settledBet.match} → ${settledBet.result}`);
        return { success: true, id };
    } catch (e) {
        console.error('[TrainingPool] Add Error:', e.message);
        return { success: false, error: e.message };
    }
}

// ============================================
// 📋 Get All Entries
// ============================================

async function getAllEntries() {
    try {
        const result = await db.execute(`
            SELECT * FROM training_pool ORDER BY settled_at DESC
        `);
        return result.rows.map(formatRow);
    } catch (e) {
        console.error('[TrainingPool] Get All Error:', e.message);
        return [];
    }
}

async function getEntriesByResult(result) {
    try {
        const data = await db.execute({
            sql: `SELECT * FROM training_pool WHERE result = ? ORDER BY settled_at DESC`,
            args: [result]
        });
        return data.rows.map(formatRow);
    } catch (e) {
        return [];
    }
}

function formatRow(row) {
    return {
        id: row.id,
        match: row.match,
        homeTeam: row.home_team,
        awayTeam: row.away_team,
        league: row.league,
        market: row.market,
        prediction: row.prediction,
        result: row.result,
        finalScore: row.final_score,
        homeGoals: row.home_goals,
        awayGoals: row.away_goals,
        stats: row.stats ? JSON.parse(row.stats) : null,
        aiPrompt: row.ai_prompt,
        settledAt: row.settled_at
    };
}

// ============================================
// 📊 Statistics
// ============================================

async function getStats() {
    try {
        const result = await db.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN result = 'WON' THEN 1 ELSE 0 END) as won,
                SUM(CASE WHEN result = 'LOST' THEN 1 ELSE 0 END) as lost
            FROM training_pool
        `);

        const row = result.rows[0];
        const total = row.total || 0;
        const won = row.won || 0;
        const lost = row.lost || 0;
        const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

        return { total, won, lost, winRate: parseFloat(winRate) };
    } catch (e) {
        return { total: 0, won: 0, lost: 0, winRate: 0 };
    }
}

// ============================================
// 🗑️ Clear Pool
// ============================================

async function clearPool() {
    try {
        await db.execute(`DELETE FROM training_pool`);
        console.log('[TrainingPool] 🗑️ Pool cleared');
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// ============================================
// 🗑️ Delete Entry
// ============================================

async function deleteEntry(id) {
    try {
        const result = await db.execute({
            sql: `DELETE FROM training_pool WHERE id = ?`,
            args: [id]
        });

        if (result.rowsAffected === 0) {
            return { success: false, error: 'Entry not found' };
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    addEntry,
    getAllEntries,
    getEntriesByResult,
    getStats,
    clearPool,
    deleteEntry
};
