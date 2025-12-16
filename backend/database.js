/**
 * GoalGPT Pro - Database Setup (Turso / LibSQL)
 * Persistent Cloud Database for Render Free Tier
 */

const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// Config
// Force HTTP mode to prevent 400 errors if user accidentally used libsql://
let url = process.env.TURSO_DATABASE_URL || 'file:local.db';
if (url.startsWith('libsql://')) {
    url = url.replace('libsql://', 'https://');
    console.log('[DB Config] Auto-corrected URL scheme from libsql:// to https://');
}

const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
    url,
    authToken,
});

// Debug Connection Config
console.log(`[DB Config] URL: ${url.replace(/:[^:]*@/, ':****@')}`);
console.log(`[DB Config] Token present: ${!!authToken}`);
if (url.startsWith('file:')) {
    console.log('[DB Config] Mode: Local File');
} else if (url.startsWith('libsql:')) {
    console.log('[DB Config] Mode: WebSocket (libsql://)');
} else if (url.startsWith('https:')) {
    console.log('[DB Config] Mode: HTTP (https://)');
}

// ============================================
// 📦 Initialize Database
// ============================================
async function initDatabase() {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
                plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'premium')),
                plan_expires_at TEXT,
                signals_today INTEGER DEFAULT 0,
                last_signal_reset TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS signal_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                match_id TEXT,
                home_team TEXT,
                away_team TEXT,
                strategy TEXT,
                verdict TEXT,
                confidence INTEGER,
                viewed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);


        await db.execute(`
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT,
                message TEXT,
                meta TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.execute(`
            CREATE TABLE IF NOT EXISTS picks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('single', 'parlay')),
                match_data TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'won', 'lost', 'void')),
                confidence INTEGER DEFAULT 0,
                market TEXT,
                category TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Admin
        await createAdminUser();

        console.log('[DB] Turso Tables Initialized');
    } catch (e) {
        console.error('[DB] Init Error:', e);
    }
}

// ... (existing code)

// ============================================
// 🎯 Curated Picks Logic
// ============================================
async function createPick(type, matchData, market, category, confidence) {
    try {
        const result = await db.execute({
            sql: "INSERT INTO picks (type, match_data, market, category, confidence) VALUES (?, ?, ?, ?, ?)",
            args: [type, JSON.stringify(matchData), market, category, confidence]
        });
        return { success: true, id: Number(result.lastInsertRowid) };
    } catch (e) {
        console.error('Create Pick Error:', e);
        return { success: false, error: e.message };
    }
}

async function getDailyPicks() {
    // Get picks from last 24 hours
    try {
        const { rows } = await db.execute(`
            SELECT * FROM picks 
            WHERE created_at >= datetime('now', '-1 day') 
            ORDER BY created_at DESC
        `);
        return rows.map(r => ({
            ...r,
            match_data: JSON.parse(r.match_data)
        }));
    } catch (e) {
        console.error('Get Picks Error:', e);
        return [];
    }
}

async function deletePick(id) {
    await db.execute({
        sql: "DELETE FROM picks WHERE id = ?",
        args: [id]
    });
    return { success: true };
}


module.exports = {
    db,
    initDatabase,
    createUser,
    verifyPassword,
    getUserById,
    getUserByEmail,
    updateLastLogin,
    getAllUsers,
    getUserStats,
    updateUserPlan,
    deleteUser,
    canViewSignal,
    incrementSignalCount,
    addLog,
    getRecentLogs,
    createPick,
    getDailyPicks,
    deletePick
};
