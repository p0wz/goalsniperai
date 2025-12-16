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

// ============================================
// 👤 User Management
// ============================================

async function createUser(email, password, name, role = 'user') {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    try {
        const result = await db.execute({
            sql: "INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)",
            args: [email, hash, name, role]
        });
        return { success: true, userId: Number(result.lastInsertRowid) };
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return { success: false, error: 'Email already exists' };
        }
        return { success: false, error: e.message };
    }
}

async function verifyPassword(email, password) {
    const rs = await db.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [email]
    });

    if (rs.rows.length === 0) return null;
    const user = rs.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    return user;
}

async function getUserById(id) {
    const rs = await db.execute({
        sql: "SELECT id, email, name, role, plan, plan_expires_at, signals_today, created_at, last_login FROM users WHERE id = ?",
        args: [id]
    });
    return rs.rows[0];
}

async function getUserByEmail(email) {
    const rs = await db.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [email]
    });
    return rs.rows[0];
}

async function updateLastLogin(id) {
    await db.execute({
        sql: "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        args: [id]
    });
}

// ============================================
// 👑 Admin Helpers
// ============================================
async function getAllUsers() {
    const rs = await db.execute("SELECT id, email, name, role, plan, plan_expires_at, signals_today, created_at, last_login FROM users ORDER BY created_at DESC");
    return rs.rows;
}

async function getUserStats() {
    const total = await db.execute("SELECT COUNT(*) as count FROM users");
    const pro = await db.execute("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'");
    const free = await db.execute("SELECT COUNT(*) as count FROM users WHERE plan = 'free'");
    const premium = await db.execute("SELECT COUNT(*) as count FROM users WHERE plan = 'premium'");

    return {
        total: total.rows[0].count,
        pro_users: pro.rows[0].count,
        free_users: free.rows[0].count,
        premium_users: premium.rows[0].count
    };
}

async function updateUserPlan(id, plan, expiresAt) {
    await db.execute({
        sql: "UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?",
        args: [plan, expiresAt, id]
    });
}

async function deleteUser(id) {
    await db.execute({
        sql: "DELETE FROM users WHERE id = ?",
        args: [id]
    });
}

async function createAdminUser() {
    const adminEmail = 'admin@goalsniper.com';
    const existing = await getUserByEmail(adminEmail);

    if (!existing) {
        console.log('[DB] Creating default admin user...');
        await createUser(adminEmail, process.env.ADMIN_PASSWORD || 'admin123', 'Super Admin', 'admin');
    } else if (existing.role !== 'admin') {
        // Fix role if needed
        await db.execute({
            sql: "UPDATE users SET role = 'admin' WHERE email = ?",
            args: [adminEmail]
        });
        console.log('[DB] Fixed admin role');
    }
}

// ============================================
// 🚦 Signal Access Control
// ============================================

async function canViewSignal(userId) {
    const user = await getUserById(userId);
    if (!user) return false;

    // Admins and Paid users always access
    if (user.role === 'admin' || user.plan === 'pro' || user.plan === 'premium') return true;

    // Free users: max 3 signals per day
    // Reset counter if needed (simple logic: if last_login day != today)
    // For now, we rely on the scheduled job to reset counts or simple check
    if (user.signals_today < 3) return true;

    return false;
}

async function incrementSignalCount(userId) {
    await db.execute({
        sql: "UPDATE users SET signals_today = signals_today + 1 WHERE id = ?",
        args: [userId]
    });
}


// ============================================
// 📜 System Logging
// ============================================
async function addLog(level, message, meta = {}) {
    try {
        await db.execute({
            sql: "INSERT INTO system_logs (level, message, meta) VALUES (?, ?, ?)",
            args: [level, message, JSON.stringify(meta)]
        });
    } catch (e) {
        console.error('Logging failed:', e);
    }
}

async function getRecentLogs(limit = 100) {
    const rs = await db.execute({
        sql: "SELECT * FROM system_logs ORDER BY created_at DESC LIMIT ?",
        args: [limit]
    });
    return rs.rows;
}

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
