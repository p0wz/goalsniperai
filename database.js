/**
 * GoalGPT Pro - Database Setup (Turso / LibSQL)
 * Persistent Cloud Database for Render Free Tier
 */

const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// Config
const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
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

        // Create Admin
        await createAdminUser();

        console.log('[DB] Turso Tables Initialized');
    } catch (e) {
        console.error('[DB] Init Error:', e);
    }
}

// ============================================
// 🔐 Create Admin User
// ============================================
async function createAdminUser() {
    const adminEmail = 'admin@goalgpt.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'yousaywhat123@';

    if (!process.env.ADMIN_PASSWORD) {
        console.warn('[DB] ⚠️ WARNING: Using default admin password! Set ADMIN_PASSWORD in environment!');
    }

    const { rows } = await db.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [adminEmail]
    });

    if (rows.length === 0) {
        const passwordHash = bcrypt.hashSync(adminPassword, 12);
        await db.execute({
            sql: "INSERT INTO users (email, password_hash, name, role, plan) VALUES (?, ?, ?, ?, ?)",
            args: [adminEmail, passwordHash, 'Admin', 'admin', 'premium']
        });
        console.log('[DB] Admin user created');
    }
}

// ============================================
// 🛠️ Helper Functions (Async)
// ============================================

async function createUser(email, password, name) {
    const passwordHash = bcrypt.hashSync(password, 12);
    try {
        const result = await db.execute({
            sql: "INSERT INTO users (email, password_hash, name, role, plan) VALUES (?, ?, ?, ?, ?)",
            args: [email, passwordHash, name, 'user', 'free']
        });
        return { success: true, userId: Number(result.lastInsertRowid) };
    } catch (error) {
        if (error.message.includes('UNIQUE constraint') || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return { success: false, error: 'Email already exists' };
        }
        return { success: false, error: error.message };
    }
}

function verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
}

async function getUserById(id) {
    const { rows } = await db.execute({
        sql: "SELECT * FROM users WHERE id = ?",
        args: [id]
    });
    return rows[0] || null;
}

async function getUserByEmail(email) {
    const { rows } = await db.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [email]
    });
    return rows[0] || null;
}

async function updateLastLogin(userId) {
    await db.execute({
        sql: "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
        args: [userId]
    });
}

async function getAllUsers() {
    const { rows } = await db.execute("SELECT * FROM users ORDER BY created_at DESC");
    return rows;
}

async function getUserStats() {
    const { rows } = await db.execute(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN plan = 'free' THEN 1 ELSE 0 END) as free_users,
            SUM(CASE WHEN plan = 'pro' THEN 1 ELSE 0 END) as pro_users,
            SUM(CASE WHEN plan = 'premium' THEN 1 ELSE 0 END) as premium_users
        FROM users
    `);
    return rows[0];
}

async function updateUserPlan(userId, plan, expiresAt) {
    await db.execute({
        sql: "UPDATE users SET plan = ?, plan_expires_at = ? WHERE id = ?",
        args: [plan, expiresAt, userId]
    });
}

async function deleteUser(userId) {
    await db.execute({
        sql: "DELETE FROM users WHERE id = ? AND role != 'admin'",
        args: [userId]
    });
}

// Signal logic checks (requires DB write if daily limit resets)
async function canViewSignal(user) {
    // If premium, always allow
    if (user.plan === 'premium' || user.plan === 'pro') {
        return { allowed: true };
    }

    const today = new Date().toISOString().split('T')[0];

    // Reset daily limit if needed
    if (user.last_signal_reset !== today) {
        await db.execute({
            sql: "UPDATE users SET signals_today = 0, last_signal_reset = ? WHERE id = ?",
            args: [today, user.id]
        });
        user.signals_today = 0;
    }

    if (user.signals_today >= 3) {
        return { allowed: false, reason: 'Daily limit reached (3/3). Upgrade to PRO!' };
    }

    return { allowed: true, remaining: 3 - user.signals_today };
}

async function incrementSignalCount(userId) {
    const user = await getUserById(userId);
    if (user && user.plan === 'free') {
        const today = new Date().toISOString().split('T')[0];
        await db.execute({
            sql: "UPDATE users SET signals_today = (COALESCE(signals_today, 0) + 1), last_signal_reset = ? WHERE id = ?",
            args: [today, userId]
        });
    }
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
    incrementSignalCount
};
