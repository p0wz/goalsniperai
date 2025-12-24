/**
 * GoalGPT Pro v3.0 - Full SaaS Platform
 * Features: Multi-page, Auth, Admin Dashboard, Subscriptions
 * API: Flashscore4 via RapidAPI + Google Gemini AI
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('./config/passport'); // Import passport config
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Database & Auth
const { initDatabase } = require('./database');
const database = require('./database');
const { requireAuth, optionalAuth } = require('./auth');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const picksRoutes = require('./routes/picks');
const { runDailyAnalysis, runFirstHalfScan, runSingleMarketAnalysis, runAIAutomatedAnalysis, runRawStatsCollection, MARKET_MAP } = require('./dailyAnalyst');
const betTracker = require('./betTrackerRedis');
const ALLOWED_LEAGUES = require('./allowed_leagues');

// New Bet Tracking System
const approvedBets = require('./approvedBets');
const trainingPool = require('./trainingPool');
const autoSettlement = require('./autoSettlement');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS configuration
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
// Normalize origins: remove trailing slashes and whitespace
const allowedOrigins = rawAllowedOrigins.map(url => url.trim().replace(/\/$/, ''));

app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Normalize incoming origin
        const cleanOrigin = origin.replace(/\/$/, '');

        // 1. Check strict allowed list
        if (allowedOrigins.indexOf(cleanOrigin) !== -1) {
            return callback(null, true);
        }

        // 2. Allow any Cloudflare Pages domain (Dynamic wildcard)
        if (cleanOrigin.endsWith('.pages.dev')) {
            return callback(null, true);
        }

        // 3. Allow localhost (Vite default port)
        if (cleanOrigin.includes('localhost')) {
            return callback(null, true);
        }

        console.log(`[CORS] Blocked Origin: ${origin}`); // Debug log
        console.log(`[CORS] Allowed config: ${JSON.stringify(allowedOrigins)}`);
        return callback(new Error('CORS policy violation'), false);
    }
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' })); // Increased for SENTIO bulk operations
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Session for Passport (Required for OAuth state)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 // 1 hour
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Security: XSS protection
app.use(xss());

// Security: HTTP Parameter Pollution protection
app.use(hpp());

// Static files - React build (Optional, for local dev only if built)
// On production (Render), we are API-only.
if (fs.existsSync(path.join(__dirname, '..', 'frontend', 'dist'))) {
    app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

// ============================================
// 🎨 Console Styling
// ============================================
// Helper for logging
const log = {
    info: (msg, meta = {}) => {
        console.log(`[INFO] ${msg}`, meta);
        database.addLog('info', msg, meta);
    },
    error: (msg, error = null) => {
        console.error(`[ERROR] ${msg}`, error);
        database.addLog('error', msg, { error: error?.message || error });
    },
    success: (msg, meta = {}) => {
        console.log(`[SUCCESS] ${msg}`, meta);
        database.addLog('success', msg, meta);
    },
    warn: (msg, meta = {}) => {
        console.warn(`[WARN] ${msg}`, meta);
        database.addLog('warn', msg, meta);
    },
    api: (msg) => console.log(`\x1b[35m[API]\x1b[0m ${msg}`),
    signal: (msg) => console.log(`\x1b[32m[SIGNAL]\x1b[0m ${msg}`),
    gemini: (msg) => console.log(`\x1b[33m[GEMINI]\x1b[0m ${msg}`)
};

// ============================================
// ⚙️ Configuration
// ============================================
const PORT = process.env.PORT || 3000;
const POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes

// EXPLICIT EXTRA LEAGUES FOR LIVE BOT (Expanded Coverage)
const EXTRA_LIVE_LEAGUES = [
    // --- UK & IRELAND ---
    'ENGLAND: National League', 'ENGLAND: EFL Trophy', 'SCOTLAND: League One', 'SCOTLAND: League Two',
    'NORTHERN IRELAND: Premiership', 'WALES: Cymru Premier',

    // --- EUROPE LOWER TIERS ---
    'ITALY: Serie C', 'SPAIN: Primera RFEF', 'GERMANY: Regionalliga',
    'FRANCE: National 2', 'NETHERLANDS: Tweede Divisie', 'PORTUGAL: Liga 3',
    'TURKEY: 2. Lig', 'TURKEY: 3. Lig',

    // --- SCANDINAVIA & BALTICS ---
    'DENMARK: 1st Division', 'SWEDEN: Superettan', 'NORWAY: 1. Division',
    'FINLAND: Ykkonen', 'ICELAND: 1. Deild', 'ESTONIA: Meistriliiga',
    'LATVIA: Virsliga', 'LITHUANIA: A Lyga',

    // --- EASTERN EUROPE ---
    'POLAND: Division 1', 'CZECH REPUBLIC: FNL', 'ROMANIA: Liga 2',
    'HUNGARY: Merkantil Bank Liga', 'BULGARIA: Second League',
    'SLOVAKIA: 2. liga', 'SLOVENIA: 2. SNL', 'UKRAINE: Premier League',
    'RUSSIA: Premier League', 'BELARUS: Vysshaya Liga',

    // --- SOUTH AMERICA ---
    'BRAZIL: Serie C', 'BRAZIL: Paulista', 'BRAZIL: Carioca', 'BRAZIL: Mineiro', 'BRAZIL: Gaucho',
    'ARGENTINA: Primera Nacional', 'COLOMBIA: Primera B', 'CHILE: Primera B',
    'URUGUAY: Segunda Division', 'PARAGUAY: Division Intermedia',
    'PERU: Liga 2', 'ECUADOR: Serie B', 'VENEZUELA: Liga FUTVE',

    // --- ASIA & OCEANIA ---
    'JAPAN: J3 League', 'SOUTH KOREA: K3 League',
    'THAILAND: Thai League 1', 'VIETNAM: V.League 1', 'INDONESIA: Liga 1',
    'MALAYSIA: Super League', 'INDIA: ISL', 'INDIA: I-League',
    'UZBEKISTAN: Super League', 'AUSTRALIA: NPL',

    // --- MENA ---
    'EGYPT: Premier League', 'MOROCCO: Botola Pro', 'TUNISIA: Ligue 1',
    'ALGERIA: Ligue 1', 'QATAR: Stars League', 'UAE: Pro League',
    'IRAN: Pro League',

    // --- CONCACAF ---
    'USA: USL Championship', 'MEXICO: Liga de Expansion MX',
    'COSTA RICA: Primera Division'
];

// Validate required environment variables
if (!process.env.RAPIDAPI_KEY) {
    console.warn('[WARN] RAPIDAPI_KEY not set - API calls will fail');
}

const FLASHSCORE_API = {
    baseURL: 'https://flashscore4.p.rapidapi.com',
    headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
        'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
    }
};

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// ============================================
// 💾 Cache & State
// ============================================
let CACHED_DATA = {
    signals: [],
    lastUpdated: null,
    quotaRemaining: 500,
    quotaLimit: 500,
    isLive: false
};

const APPROVED_IDS = new Set();
const APPROVALS_FILE = path.join(__dirname, 'approvals.json');

// Load Approvals
if (fs.existsSync(APPROVALS_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(APPROVALS_FILE));
        saved.forEach(id => APPROVED_IDS.add(id));
        console.log(`Loaded ${saved.length} approved signals.`);
    } catch (e) {
        console.error('Failed to load approvals:', e);
    }
}

// Helper to save approvals
const saveApprovals = () => {
    try {
        fs.writeFileSync(APPROVALS_FILE, JSON.stringify([...APPROVED_IDS]));
    } catch (e) {
        console.error('Failed to save approvals:', e);
    }
};

const REJECTED_IDS = new Set();
const REJECTIONS_FILE = path.join(__dirname, 'rejections.json');

// Load Rejections
if (fs.existsSync(REJECTIONS_FILE)) {
    try {
        const saved = JSON.parse(fs.readFileSync(REJECTIONS_FILE));
        saved.forEach(id => REJECTED_IDS.add(id));
        console.log(`Loaded ${saved.length} rejected signals.`);
    } catch (e) {
        console.error('Failed to load rejections:', e);
    }
}

// Helper to save rejections
const saveRejections = () => {
    try {
        fs.writeFileSync(REJECTIONS_FILE, JSON.stringify([...REJECTED_IDS]));
    } catch (e) {
        console.error('Failed to save rejections:', e);
    }
};

// ============================================
// 📊 Match History Buffer (Dynamic Lookback)
// ============================================
// Structure: { matchId: [{ timestamp, stats }] }
// Max history: 4 snapshots (~12 minutes at 3-min intervals)
const MATCH_HISTORY = {};
const MAX_HISTORY_LENGTH = 4;
const MAX_LOOKBACK_MS = 12 * 60 * 1000; // 12 minutes

// ============================================
// 🔒 Daily Signal Limiter (Max 1 per match per strategy)
// ============================================
// Structure: { "YYYY-MM-DD": { "matchId_STRATEGY": { count: number, lastScore: string } } }
let DAILY_SIGNAL_COUNTS = {};
let DAILY_SIGNAL_DATE = null;
const MAX_SIGNALS_PER_MATCH_STRATEGY = 1;

function checkSignalLimit(matchId, strategyCode, currentScore) {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily counters if new day
    if (DAILY_SIGNAL_DATE !== today) {
        DAILY_SIGNAL_COUNTS = {};
        DAILY_SIGNAL_DATE = today;
        log.info(`[SignalLimiter] New day detected, counters reset`);
    }

    const key = `${matchId}_${strategyCode}`;
    const data = DAILY_SIGNAL_COUNTS[key] || { count: 0, lastScore: null };

    // Standard Limit Check
    if (data.count < MAX_SIGNALS_PER_MATCH_STRATEGY) {
        return true;
    }

    // EXCEPTION: Late Game Strategy allows 2nd signal IF score changed
    if (strategyCode === 'LATE_GAME' && data.count < 2) {
        if (data.lastScore && data.lastScore !== currentScore) {
            log.info(`[SignalLimiter] Allowing 2nd signal for ${key} (Score changed: ${data.lastScore} -> ${currentScore})`);
            return true;
        }
    }

    return false;
}

function recordSignal(matchId, strategyCode, currentScore) {
    const key = `${matchId}_${strategyCode}`;
    const data = DAILY_SIGNAL_COUNTS[key] || { count: 0, lastScore: null };

    data.count += 1;
    data.lastScore = currentScore;
    DAILY_SIGNAL_COUNTS[key] = data;

    log.info(`[SignalLimiter] Recorded signal: ${key} (count: ${data.count}/${MAX_SIGNALS_PER_MATCH_STRATEGY}+)`);
}

function recordMatchStats(matchId, stats, score = '0-0') {
    if (!MATCH_HISTORY[matchId]) {
        MATCH_HISTORY[matchId] = [];
    }

    MATCH_HISTORY[matchId].push({
        timestamp: Date.now(),
        score: score,
        stats: { ...stats }
    });

    // Keep only last N snapshots
    if (MATCH_HISTORY[matchId].length > MAX_HISTORY_LENGTH) {
        MATCH_HISTORY[matchId].shift();
    }
}

function getMatchHistory(matchId) {
    return MATCH_HISTORY[matchId] || [];
}

function cleanOldHistory() {
    const now = Date.now();
    for (const matchId of Object.keys(MATCH_HISTORY)) {
        // Remove matches with no recent activity
        const lastEntry = MATCH_HISTORY[matchId][MATCH_HISTORY[matchId].length - 1];
        if (lastEntry && (now - lastEntry.timestamp) > MAX_LOOKBACK_MS * 2) {
            delete MATCH_HISTORY[matchId];
        }
    }
}

let dailyRequestCount = 0;
const DAILY_LIMIT = 2000;

// ============================================
// 🕐 Parse Match Time
// ============================================
function parseElapsedTime(stage) {
    if (!stage) return 0;
    const stageStr = String(stage).toLowerCase();

    // Try to extract actual minute number first (handles "2nd half 65'", "65'", "65")
    const minuteMatch = stageStr.match(/(\d+)/);
    if (minuteMatch) {
        const mins = parseInt(minuteMatch[1]);
        // Sanity check: if we have a valid minute in football range
        if (mins >= 1 && mins <= 120) {
            return mins;
        }
    }

    // Fallback for text-only stages
    if (stageStr.includes('halftime') || stageStr.includes('ht')) return 45;
    if (stageStr.includes('2nd half')) return 60;
    if (stageStr.includes('1st half')) return 25;

    return 0;
}

// ============================================
// 📊 Parse Stats from API Response
// ============================================
function parseMatchStats(statsData) {
    const stats = {
        possession: { home: 50, away: 50 },
        shots: { home: 0, away: 0 },
        shotsOnTarget: { home: 0, away: 0 },
        corners: { home: 0, away: 0 },
        dangerousAttacks: { home: 0, away: 0 },
        xG: { home: 0, away: 0 },
        redCards: { home: 0, away: 0 }
    };

    // Try keys in order of preference, checking for non-empty arrays
    let statsList = [];
    let usedKey = 'none';

    // Log all available keys first
    const allKeys = Object.keys(statsData || {});
    log.info(`[StatsDebug] API response keys: ${allKeys.join(', ') || 'empty'}`);

    // Priority order: match (likely full game) > all-match > 2nd-half > 1st-half
    const priorityKeys = ['match', 'all-match', 'ALL', 'all', 'full-match', '2nd-half', '2nd half', '1st-half', '1st half'];

    for (const key of priorityKeys) {
        if (statsData[key] && Array.isArray(statsData[key]) && statsData[key].length > 0) {
            statsList = statsData[key];
            usedKey = key;
            break;
        }
    }

    // If still empty, try any array in the response
    if (statsList.length === 0 && typeof statsData === 'object') {
        for (const key of Object.keys(statsData)) {
            if (Array.isArray(statsData[key]) && statsData[key].length > 0) {
                statsList = statsData[key];
                usedKey = key;
                break;
            }
        }
    }

    log.info(`[StatsDebug] Using key: "${usedKey}" (${statsList.length} stats)`);

    // Debug: Log available stat names
    const availableStats = statsList.map(s => s.name).filter(Boolean);
    if (availableStats.length > 0) {
        log.info(`[StatsDebug] Stats: ${availableStats.join(', ')}`);
    }

    for (const stat of statsList) {
        const name = stat.name?.toLowerCase() || '';
        const home = stat.home_team;
        const away = stat.away_team;

        if (name.includes('ball possession')) {
            stats.possession.home = parseInt(home) || 50;
            stats.possession.away = parseInt(away) || 50;
        }
        if (name === 'total shots' || name === 'shots total') {
            stats.shots.home = parseInt(home) || 0;
            stats.shots.away = parseInt(away) || 0;
        }
        if (name === 'shots on target' || name.includes('on target')) {
            stats.shotsOnTarget.home = parseInt(home) || 0;
            stats.shotsOnTarget.away = parseInt(away) || 0;
        }
        if (name === 'corner kicks' || name === 'corners') {
            stats.corners.home = parseInt(home) || 0;
            stats.corners.away = parseInt(away) || 0;
        }
        if (name.includes('expected goals') || name.includes('xg')) {
            stats.xG.home = parseFloat(home) || 0;
            stats.xG.away = parseFloat(away) || 0;
        }
        // Check multiple possible names for Dangerous Attacks
        if (name.includes('dangerous attacks') || name.includes('dangerous attack') ||
            name.includes('big chances') || name === 'attacks') {
            stats.dangerousAttacks.home = parseInt(home) || 0;
            stats.dangerousAttacks.away = parseInt(away) || 0;
        }
        // Check for Red Cards
        if (name.includes('red cards') || name.includes('red card')) {
            stats.redCards.home = parseInt(home) || 0;
            stats.redCards.away = parseInt(away) || 0;
        }
    }

    return stats;
}

// ============================================
// 🔍 Base Activity Check (Dynamic Linear Thresholds)
// ============================================
function checkBaseActivity(elapsed, stats) {
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalCorners = (stats?.corners?.home || 0) + (stats?.corners?.away || 0);

    // 1. Safety Buffer
    if (elapsed < 16) {
        return {
            phase: 'EARLY',
            isAlive: true,
            reason: 'Early game buffer',
            stats: { shots: totalShots, corners: totalCorners }
        };
    }

    // 2. Dynamic Threshold Calculation
    // Slope: 0.14 shots/min => 15'->2, 30'->4, 45'->6, 60'->8, 75'->10
    // Slope: 0.06 corners/min => 15'->1, 30'->2, 45'->3, 60'->4
    const minShots = Math.floor(elapsed * 0.14);
    const minCorners = Math.floor(elapsed * 0.06);

    // 3. Evaluation (Must meet at least one criteria to be "Alive")
    // We use OR logic: High shots OR high corners = Active game.
    // If BOTH are low, it's a dead game.
    const isAlive = totalShots >= minShots || totalCorners >= minCorners;

    const reason = isAlive
        ? `Active Match ✓ (Stats: ${totalShots}S/${totalCorners}C vs Req: ${minShots}S/${minCorners}C)`
        : `💀 Dead Match (Need >${minShots} Shots or >${minCorners} Corners)`;

    return {
        phase: elapsed <= 45 ? '1H' : '2H',
        isAlive,
        reason,
        stats: { shots: totalShots, corners: totalCorners }
    };
}

// ============================================
// 🎯 Dynamic Momentum Detection (Lookback)
// ============================================
// Thresholds for momentum triggers (HARDENED)
const MOMENTUM_THRESHOLDS = {
    CORNER_SIEGE: 3,        // +3 corners (was 2)
    SHOT_SURGE: 4,          // +4 shots (was 2)
    SOT_THREAT: 2,          // +2 shots on target (was 1)
    DA_PRESSURE: 8,         // +8 dangerous attacks (was 5)
    XG_SPIKE: 0.4           // +0.4 xG increase (was 0.3)
};

function detectMomentum(matchId, currentStats, currentScore = '0-0') {
    const history = getMatchHistory(matchId);
    const now = Date.now();

    if (history.length === 0) {
        return { detected: false, trigger: null, timeframe: null };
    }

    // Get totals from current stats
    const currentCorners = (currentStats?.corners?.home || 0) + (currentStats?.corners?.away || 0);
    const currentShots = (currentStats?.shots?.home || 0) + (currentStats?.shots?.away || 0);
    const currentSoT = (currentStats?.shotsOnTarget?.home || 0) + (currentStats?.shotsOnTarget?.away || 0);
    const currentDA = (currentStats?.dangerousAttacks?.home || 0) + (currentStats?.dangerousAttacks?.away || 0);
    const currentxG = (currentStats?.xG?.home || 0) + (currentStats?.xG?.away || 0);

    // Check each historical snapshot (most recent first)
    for (let i = history.length - 1; i >= 0; i--) {
        const snapshot = history[i];

        // CRITICAL: Stop if score changed (Goal reset momentum)
        if (snapshot.score && snapshot.score !== currentScore) {
            // A goal happened between this snapshot and now.
            // We do not want to compare against stats BEFORE the goal, 
            // as the goal event itself spikes the stats (momentum resolved).
            break;
        }

        const timeDiffMs = now - snapshot.timestamp;
        const timeDiffMins = Math.round(timeDiffMs / 60000);

        // Skip if older than max lookback
        if (timeDiffMs > MAX_LOOKBACK_MS) continue;

        const oldCorners = (snapshot.stats?.corners?.home || 0) + (snapshot.stats?.corners?.away || 0);
        const oldShots = (snapshot.stats?.shots?.home || 0) + (snapshot.stats?.shots?.away || 0);
        const oldSoT = (snapshot.stats?.shotsOnTarget?.home || 0) + (snapshot.stats?.shotsOnTarget?.away || 0);
        const oldDA = (snapshot.stats?.dangerousAttacks?.home || 0) + (snapshot.stats?.dangerousAttacks?.away || 0);
        const oldxG = (snapshot.stats?.xG?.home || 0) + (snapshot.stats?.xG?.away || 0);

        const deltaCorners = currentCorners - oldCorners;
        const deltaShots = currentShots - oldShots;
        const deltaSoT = currentSoT - oldSoT;
        const deltaDA = currentDA - oldDA;
        const deltaxG = currentxG - oldxG;

        // Trigger 1: Corner Siege
        if (deltaCorners >= MOMENTUM_THRESHOLDS.CORNER_SIEGE) {
            return {
                detected: true,
                trigger: 'CORNER_SIEGE',
                reason: `Corner Siege (+${deltaCorners} corners in ~${timeDiffMins} mins)`,
                timeframe: timeDiffMins,
                deltas: { corners: deltaCorners, shots: deltaShots, sot: deltaSoT }
            };
        }

        // Trigger 2: Shooting Threat (OR Logic)
        if (deltaShots >= MOMENTUM_THRESHOLDS.SHOT_SURGE || deltaSoT >= MOMENTUM_THRESHOLDS.SOT_THREAT) {
            const triggerType = deltaSoT >= 1 ? 'SHOOTING_THREAT_SOT' : 'SHOOTING_THREAT';
            return {
                detected: true,
                trigger: triggerType,
                reason: deltaSoT >= 1
                    ? `Shooting Threat (+${deltaSoT} on target in ~${timeDiffMins} mins)`
                    : `Shot Surge (+${deltaShots} shots in ~${timeDiffMins} mins)`,
                timeframe: timeDiffMins,
                deltas: { corners: deltaCorners, shots: deltaShots, sot: deltaSoT }
            };
        }

        // Trigger 3: Attacking Pressure (DA, if available)
        if (currentDA > 0 && deltaDA >= MOMENTUM_THRESHOLDS.DA_PRESSURE) {
            return {
                detected: true,
                trigger: 'ATTACKING_PRESSURE',
                reason: `Attacking Pressure (+${deltaDA} DA in ~${timeDiffMins} mins)`,
                timeframe: timeDiffMins,
                deltas: { corners: deltaCorners, shots: deltaShots, sot: deltaSoT, da: deltaDA }
            };
        }

        // Trigger 4: xG Spike (strong scoring threat)
        if (currentxG > 0 && deltaxG >= MOMENTUM_THRESHOLDS.XG_SPIKE) {
            return {
                detected: true,
                trigger: 'XG_SPIKE',
                reason: `🔥 xG Spike (+${deltaxG.toFixed(2)} xG in ~${timeDiffMins} mins)`,
                timeframe: timeDiffMins,
                deltas: { corners: deltaCorners, shots: deltaShots, sot: deltaSoT, xg: deltaxG }
            };
        }
    }

    return { detected: false, trigger: null, timeframe: null };
}

// ============================================
// 📱 Telegram Notifications
// ============================================
async function sendTelegramNotification(signal) {
    log.info(`[Telegram] ═══════════════════════════════════════`);
    log.info(`[Telegram] 📱 Attempting to send notification...`);
    log.info(`[Telegram] Bot Token: ${TELEGRAM_BOT_TOKEN ? '✅ Configured (' + TELEGRAM_BOT_TOKEN.substring(0, 10) + '...)' : '❌ NOT SET'}`);
    log.info(`[Telegram] Chat ID: ${TELEGRAM_CHAT_ID ? '✅ ' + TELEGRAM_CHAT_ID : '❌ NOT SET'}`);

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        log.warn(`[Telegram] ⚠️ Skipping - Telegram not configured`);
        return;
    }

    try {
        const emoji = signal.strategyCode === 'IY_05' ? '⚽' : '🎯';
        const confidenceEmoji = signal.confidencePercent >= 75 ? '🔥' : signal.confidencePercent >= 60 ? '✅' : '⚠️';

        const message = `
${emoji} *YENİ SİNYAL* ${emoji}

🏟️ *${signal.home} vs ${signal.away}*
🏆 ${signal.league}
⏱️ ${signal.elapsed}'  |  📊 ${signal.score}

📌 *Strateji:* ${signal.strategy}
${confidenceEmoji} *Güven:* ${signal.confidencePercent}%

📈 *İstatistikler:*
• Şutlar: ${signal.stats?.shots || 0} (İsabetli: ${signal.stats?.shots_on_target || 0})
• Kornerler: ${signal.stats?.corners || 0}
• xG: ${signal.stats?.xG || 'N/A'}

💡 *AI Analizi:*
${signal.geminiReason || 'Analiz yok'}

⏰ ${new Date().toLocaleTimeString('tr-TR')}
        `.trim();

        log.info(`[Telegram] 📝 Message preview: ${signal.home} vs ${signal.away} (${signal.strategy})`);
        log.info(`[Telegram] 🔄 Sending to Telegram API...`);

        const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });

        log.success(`[Telegram] ✅ Message sent successfully!`);
        log.info(`[Telegram] Response: ok=${response.data?.ok}, message_id=${response.data?.result?.message_id}`);
    } catch (error) {
        log.error(`[Telegram] ❌ FAILED to send message`);
        log.error(`[Telegram] Error: ${error.message}`);
        if (error.response) {
            log.error(`[Telegram] Status: ${error.response.status}`);
            log.error(`[Telegram] Data: ${JSON.stringify(error.response.data)}`);
        }
    }
    log.info(`[Telegram] ═══════════════════════════════════════`);
}
// ============================================
// 🧠 AI Analyst (Groq - Llama 4 Scout)
// ============================================
async function askAIAnalyst(candidate) {
    if (!GROQ_API_KEY) {
        log.warn('[AI] GROQ_API_KEY not configured, using local analysis');
        return { verdict: 'PLAY', confidence: candidate.confidencePercent, reason: 'Local analysis (Groq not configured)' };
    }

    const prompt = `You are an elite football betting analyst with 15+ years of experience.

=== MATCH INFO ===
Strategy: ${candidate.strategy} (${candidate.strategyCode})
Match: ${candidate.home} vs ${candidate.away}
League: ${candidate.league} (${candidate.country || 'Unknown'})
Current Time: ${candidate.elapsed}' | Score: ${candidate.score}

=== KEY STATISTICS ===
Shots: ${candidate.stats.shots} total | ${candidate.stats.shots_on_target} on target
Corners: ${candidate.stats.corners}
Dangerous Attacks: ${candidate.stats.dangerousAttacks || 'N/A'}
xG: ${candidate.stats.xG || 'N/A'}

=== MOMENTUM TRIGGERS ===
Trigger: ${candidate.momentumTrigger || 'None'}
Reason: ${candidate.reason}

=== H2H & FORM ANALYSIS ===
${candidate.h2h ? `
Home Form: ${candidate.h2h.homeForm}
Away Form: ${candidate.h2h.awayForm}
Home Goal Rate: ${candidate.h2h.homeGoalRate}%
Away Goal Rate: ${candidate.h2h.awayGoalRate}%
1H Goal Rate (H2H): ${candidate.h2h.htGoalRate}%
2H Goal Rate (H2H): ${candidate.h2h.shGoalRate}%
Expected Total Goals: ${candidate.h2h.expectedTotal}
` : 'No Historical Data Available'}

=== PREDICTION TASK ===
Analyze the match context, momentum, and historical form.
Verdict options: "PLAY" or "SKIP".
Confidence: 0-100%.

Output JSON only: { "verdict": "PLAY" | "SKIP", "confidence": number, "reason": "brief explanation" }`;


    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            let text = '';

            // Groq API
            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                    max_tokens: 200
                },
                {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY} `,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            text = response.data?.choices?.[0]?.message?.content || '{}';
            log.info(`[Groq Raw] ${text.substring(0, 200)}...`);

            // Clean up markdown formatting
            text = text.trim();
            if (text.startsWith('```json')) text = text.slice(7);
            if (text.startsWith('```')) text = text.slice(3);
            if (text.endsWith('```')) text = text.slice(0, -3);
            text = text.trim();
            log.info(`[Groq Clean] ${text}`);

            // Try to extract JSON from response using regex (handles partial/malformed responses)
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                // Try to extract JSON object using regex
                const jsonMatch = text.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                    try {
                        result = JSON.parse(jsonMatch[0]);
                    } catch (e) {
                        // Manual extraction as last resort
                        const verdictMatch = text.match(/"verdict"\s*:\s*"(PLAY|SKIP)"/i);
                        const confidenceMatch = text.match(/"confidence"\s*:\s*(\d+)/);
                        const reasonMatch = text.match(/"reason"\s*:\s*"([^"]+)"/);

                        result = {
                            verdict: verdictMatch ? verdictMatch[1].toUpperCase() : 'SKIP',
                            confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : candidate.confidencePercent,
                            reason: reasonMatch ? reasonMatch[1] : 'AI analysis incomplete'
                        };
                        log.warn(`[Gemini] Extracted partial JSON: ${JSON.stringify(result)}`);
                    }
                } else {
                    // Check if response contains PLAY or SKIP keywords
                    const hasPlay = text.toUpperCase().includes('PLAY');
                    const hasSkip = text.toUpperCase().includes('SKIP');

                    // Try to extract confidence from text (e.g., "85%" or "confidence: 85")
                    const confMatch = text.match(/(\d{2,3})\s*%/) || text.match(/confidence[:\s]+(\d{2,3})/i);
                    const extractedConf = confMatch ? parseInt(confMatch[1]) : null;

                    // If high base confidence and no explicit SKIP, default to PLAY
                    let inferredVerdict;
                    if (hasPlay && !hasSkip) {
                        inferredVerdict = 'PLAY';
                    } else if (hasSkip) {
                        inferredVerdict = 'SKIP';
                    } else if (candidate.confidencePercent >= 70 || (extractedConf && extractedConf >= 70)) {
                        // High confidence without explicit verdict = likely PLAY
                        inferredVerdict = 'PLAY';
                    } else {
                        inferredVerdict = 'SKIP';
                    }

                    result = {
                        verdict: inferredVerdict,
                        confidence: extractedConf || candidate.confidencePercent,
                        reason: 'AI returned non-JSON response (inferred from context)'
                    };
                    log.warn(`[Gemini] Non-JSON response, inferred: ${result.verdict} (conf: ${result.confidence}%)`);
                }
            }

            // Validate LLM output to prevent prompt injection
            const ALLOWED_VERDICTS = ['PLAY', 'SKIP'];
            if (!ALLOWED_VERDICTS.includes(result.verdict)) {
                result.verdict = 'SKIP'; // Safe default
            }

            // Validate confidence range
            if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 100) {
                result.confidence = candidate.confidencePercent || 50;
            }

            // Sanitize reason to prevent XSS (remove HTML tags)
            if (result.reason && typeof result.reason === 'string') {
                result.reason = result.reason.replace(/<[^>]*>/g, '').trim();
            } else {
                result.reason = 'Analysis completed';
            }

            log.gemini(`${candidate.home} vs ${candidate.away}: ${result.verdict} (${result.confidence}%)`);
            return result;

        } catch (error) {
            const status = error.response?.status;
            const isOverloaded = status === 503 || error.message?.includes('overloaded');
            const isRateLimited = status === 429 || error.message?.includes('429') || error.message?.includes('quota');

            if ((isOverloaded || isRateLimited) && attempt < MAX_RETRIES) {
                // Longer delays for rate limit (5s, 10s, 15s)
                const delay = isRateLimited ? attempt * 5000 : attempt * 2000;
                const errType = isRateLimited ? '429 Rate Limit' : '503 Overloaded';
                log.warn(`[Gemini] ${errType} - Retrying in ${delay / 1000}s (${attempt}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            log.error(`Gemini API error: ${error.message}`);
            // On error, use local analysis with high confidence if candidate has good stats
            return {
                verdict: candidate.confidencePercent >= 65 ? 'PLAY' : 'SKIP',
                confidence: candidate.confidencePercent,
                reason: 'Gemini unavailable, using local analysis'
            };
        }
    }
    return { verdict: 'PLAY', confidence: candidate.confidencePercent, reason: 'Max retries exceeded' };
}

// ============================================
// 📡 Fetch Match Statistics
// ============================================
const API_DELAY = 4000; // 4 seconds between API calls (Safe for 30 RPM quota)

async function fetchMatchStats(matchId, retries = 3) {
    if (dailyRequestCount >= DAILY_LIMIT) return null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await new Promise(r => setTimeout(r, API_DELAY)); // Rate limit delay
            const response = await axios.get(
                `${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/stats/${matchId}`,
                { headers: FLASHSCORE_API.headers, timeout: 15000 }
            );
            dailyRequestCount++;
            return response.data;
        } catch (error) {
            const is429 = error.response?.status === 429 || error.message?.includes('429');
            if (is429 && attempt < retries) {
                const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
                log.warn(`[Stats] 429 Rate Limit - Retrying in ${delay / 1000}s (${attempt}/${retries})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            log.warn(`Stats fetch failed for ${matchId}: ${error.message}`);
            return null;
        }
    }
    return null;
}

// ============================================
// 💰 Fetch Match Odds (Pre-match or Live)
// ============================================
async function fetchMatchOdds(matchId) {
    if (dailyRequestCount >= DAILY_LIMIT) return null;

    try {
        const response = await axios.get(
            `${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/odds/${matchId}`,
            { headers: FLASHSCORE_API.headers, timeout: 10000 }
        );
        dailyRequestCount++;

        const data = response.data;
        const odds = { '1': 0, 'X': 0, '2': 0 };

        // Parse odds (Look for standard 1X2 market)
        // Structure varies, usually a list of markets. We look for "Match Winner" or "1X2"
        const markets = Array.isArray(data) ? data : (data.data || []);

        // Find 1X2 market
        const market = markets.find(m => m.name === 'Match Winner' || m.name === '1X2' || m.name === 'Full Time Result');

        if (market && market.choices) {
            market.choices.forEach(choice => {
                if (choice.name === '1' || choice.name === 'Home') odds['1'] = parseFloat(choice.fractional_value || choice.decimal_value || 0);
                if (choice.name === 'X' || choice.name === 'Draw') odds['X'] = parseFloat(choice.fractional_value || choice.decimal_value || 0);
                if (choice.name === '2' || choice.name === 'Away') odds['2'] = parseFloat(choice.fractional_value || choice.decimal_value || 0);
            });
            // Fallback if numeric names are used in a different structure
            if (market.choices.length === 3 && odds['1'] === 0) {
                odds['1'] = parseFloat(market.choices[0].fractional_value || market.choices[0].decimal_value || 0);
                odds['X'] = parseFloat(market.choices[1].fractional_value || market.choices[1].decimal_value || 0);
                odds['2'] = parseFloat(market.choices[2].fractional_value || market.choices[2].decimal_value || 0);
            }
        } else {
            // Fallback: Try to parse any available structure if logic above fails
            // (Some endpoints return raw object)
            if (data.home_odd) odds['1'] = parseFloat(data.home_odd);
            if (data.draw_odd) odds['X'] = parseFloat(data.draw_odd);
            if (data.away_odd) odds['2'] = parseFloat(data.away_odd);
        }

        return odds['1'] > 0 ? odds : null;

    } catch (error) {
        log.warn(`Odds fetch failed for ${matchId}: ${error.message}`);
        return null; // Return null to fallback to 2.0 safely
    }
}

// ============================================
// 🤝 Fetch Match H2H (Head-to-Head History)
// ============================================
async function fetchMatchH2H(matchId, retries = 3) {
    if (dailyRequestCount >= DAILY_LIMIT) return null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await new Promise(r => setTimeout(r, API_DELAY)); // Rate limit delay
            const response = await axios.get(
                `${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/h2h/${matchId}`,
                { headers: FLASHSCORE_API.headers, timeout: 10000 }
            );
            dailyRequestCount++;
            return response.data;
        } catch (error) {
            const is429 = error.response?.status === 429 || error.message?.includes('429');
            if (is429 && attempt < retries) {
                const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
                log.warn(`[H2H] 429 Rate Limit - Retrying in ${delay / 1000}s (${attempt}/${retries})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            log.warn(`H2H fetch failed for ${matchId}: ${error.message}`);
            return null;
        }
    }
    return null;
}

// ============================================
// 📋 Fetch Match Details (HT/FT Scores)
// ============================================
async function fetchMatchDetails(matchId, retries = 2) {
    if (dailyRequestCount >= DAILY_LIMIT) return null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await new Promise(r => setTimeout(r, API_DELAY)); // Rate limit delay
            const response = await axios.get(
                `${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/details/${matchId}`,
                { headers: FLASHSCORE_API.headers, timeout: 10000 }
            );
            dailyRequestCount++;
            return response.data;
        } catch (error) {
            const is429 = error.response?.status === 429 || error.message?.includes('429');
            if (is429 && attempt < retries) {
                const delay = Math.pow(2, attempt) * 2000; // 4s, 8s
                log.warn(`[Details] 429 Rate Limit - Retrying in ${delay / 1000}s (${attempt}/${retries})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            // Silent fail - details are optional enhancement
            return null;
        }
    }
    return null;
}

// Helper: Analyze Team Form (SIMPLIFIED - No Direct H2H)
async function analyzeH2HForGoals(h2hData, homeTeam, awayTeam, currentScore = '0-0', elapsed = 0) {
    if (!h2hData) return { valid: true, reason: 'No form data (defaulting to valid)' };

    const sections = Array.isArray(h2hData) ? h2hData : (h2hData.DATA || []);
    if (sections.length === 0) return { valid: true, reason: 'Empty form data' };

    // Filter: Only recent matches (< 2 years), no friendlies
    const TWO_YEARS_AGO = Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60);

    // ========== HOME TEAM HOME FORM (Only matches where they played at HOME) ==========
    const homeTeamHomeForm = sections.filter(m => {
        const isHomeTeamAtHome = m.home_team?.name === homeTeam;
        const isFriendly = m.tournament_name?.toLowerCase().includes('friendly');
        const isRecent = m.timestamp && m.timestamp > TWO_YEARS_AGO;
        return isHomeTeamAtHome && !isFriendly && isRecent;
    }).slice(0, 5);

    // ========== AWAY TEAM AWAY FORM (Only matches where they played AWAY) ==========
    const awayTeamAwayForm = sections.filter(m => {
        const isAwayTeamOnRoad = m.away_team?.name === awayTeam;
        const isFriendly = m.tournament_name?.toLowerCase().includes('friendly');
        const isRecent = m.timestamp && m.timestamp > TWO_YEARS_AGO;
        return isAwayTeamOnRoad && !isFriendly && isRecent;
    }).slice(0, 5);

    // Calculate HOME team HOME stats (goals scored at home, conceded at home)
    let homeGoals = 0, homeConceded = 0, homeGoalGames = 0;
    for (const m of homeTeamHomeForm) {
        const hs = parseInt(m.home_team?.score) || 0;
        const as = parseInt(m.away_team?.score) || 0;
        homeGoals += hs;
        homeConceded += as;
        if (hs > 0) homeGoalGames++;
    }

    // Calculate AWAY team AWAY stats (goals scored away, conceded away)
    let awayGoals = 0, awayConceded = 0, awayGoalGames = 0;
    for (const m of awayTeamAwayForm) {
        const hs = parseInt(m.home_team?.score) || 0;
        const as = parseInt(m.away_team?.score) || 0;
        awayGoals += as;  // Away team scores = away_team score
        awayConceded += hs;  // Away team concedes = home_team score
        if (as > 0) awayGoalGames++;
    }

    // ========== HT/FT DETAIL ANALYSIS ==========
    let htGoalGames = 0, shGoalGames = 0, detailsChecked = 0;
    const allFormMatches = [...homeTeamHomeForm.slice(0, 3), ...awayTeamAwayForm.slice(0, 3)];
    const uniqueMatchIds = [...new Set(allFormMatches.map(m => m.match_id).filter(Boolean))].slice(0, 4);

    for (const matchId of uniqueMatchIds) {
        const details = await fetchMatchDetails(matchId);
        if (details) {
            detailsChecked++;
            const htHome = details.home_team?.score_1st_half || 0;
            const htAway = details.away_team?.score_1st_half || 0;
            const ftHome = parseInt(details.home_team?.score) || 0;
            const ftAway = parseInt(details.away_team?.score) || 0;

            if (htHome + htAway >= 1) htGoalGames++;
            if ((ftHome - htHome) + (ftAway - htAway) >= 1) shGoalGames++;
        }
    }

    const htGoalRate = detailsChecked > 0 ? (htGoalGames / detailsChecked) * 100 : null;
    const shGoalRate = detailsChecked > 0 ? (shGoalGames / detailsChecked) * 100 : null;
    const isFirstHalf = elapsed <= 45;

    // Averages (HOME team at HOME, AWAY team on ROAD)
    const homeFormAvg = homeTeamHomeForm.length > 0 ? homeGoals / homeTeamHomeForm.length : 0;
    const awayFormAvg = awayTeamAwayForm.length > 0 ? awayGoals / awayTeamAwayForm.length : 0;
    const homeConcededAvg = homeTeamHomeForm.length > 0 ? homeConceded / homeTeamHomeForm.length : 0;
    const awayConcededAvg = awayTeamAwayForm.length > 0 ? awayConceded / awayTeamAwayForm.length : 0;

    // Goal scoring rate (% of games they scored)
    const homeGoalRate = homeTeamHomeForm.length > 0 ? (homeGoalGames / homeTeamHomeForm.length) * 100 : 0;
    const awayGoalRate = awayTeamAwayForm.length > 0 ? (awayGoalGames / awayTeamAwayForm.length) * 100 : 0;

    // Combined expected goals = what home scores + what away concedes (and vice versa)
    const expectedHomeGoals = (homeFormAvg + awayConcededAvg) / 2;
    const expectedAwayGoals = (awayFormAvg + homeConcededAvg) / 2;
    const expectedTotal = expectedHomeGoals + expectedAwayGoals;

    // Parse current score for context
    const [curHome, curAway] = currentScore.split('-').map(s => parseInt(s) || 0);
    const currentTotal = curHome + curAway;
    const isZeroZero = currentTotal === 0;

    // Dynamic thresholds
    const requiredAvg = isZeroZero ? 1.2 : 1.0;  // Need higher form if 0-0
    const requiredGoalRate = isZeroZero ? 70 : 60;  // Need higher goal rate if 0-0

    // Extra check: If first half and HT goal rate is low, reject
    let htCheckPassed = true;
    if (isFirstHalf && htGoalRate !== null && htGoalRate < 40) {
        htCheckPassed = false;
    }

    // Validation: At least one team should have decent form
    const homeFormOK = homeFormAvg >= requiredAvg || homeGoalRate >= requiredGoalRate;
    const awayFormOK = awayFormAvg >= requiredAvg || awayGoalRate >= requiredGoalRate;
    const isValid = (homeFormOK || awayFormOK) && htCheckPassed;

    // Build stats object
    const stats = {
        homeForm: `${homeFormAvg.toFixed(1)}scored/${homeConcededAvg.toFixed(1)}conceded@HOME`,
        awayForm: `${awayFormAvg.toFixed(1)}scored/${awayConcededAvg.toFixed(1)}conceded@AWAY`,
        homeGoalRate: homeGoalRate.toFixed(0),
        awayGoalRate: awayGoalRate.toFixed(0),
        htGoalRate: htGoalRate !== null ? htGoalRate.toFixed(0) : 'N/A',
        shGoalRate: shGoalRate !== null ? shGoalRate.toFixed(0) : 'N/A',
        expectedTotal: expectedTotal.toFixed(1),
        homeMatches: homeTeamHomeForm.length,
        awayMatches: awayTeamAwayForm.length,
        detailsChecked
    };

    // Build reason string
    let reason;
    if (isValid) {
        reason = `Form✓ ${homeTeam}@H:${homeFormAvg.toFixed(1)}gpg(${homeGoalRate.toFixed(0)}%) | ${awayTeam}@A:${awayFormAvg.toFixed(1)}gpg(${awayGoalRate.toFixed(0)}%)`;
        if (htGoalRate !== null) reason += ` | 1H:${htGoalRate.toFixed(0)}%`;
    } else if (!htCheckPassed) {
        reason = `Form✗ 1H Goal Rate too low (${htGoalRate?.toFixed(0) || 0}% < 40%)`;
    } else {
        reason = `Form✗ Weak: ${homeTeam}:${homeFormAvg.toFixed(1)}gpg | ${awayTeam}:${awayFormAvg.toFixed(1)}gpg (need ${requiredAvg}+ or ${requiredGoalRate}%+)`;
    }

    return { valid: isValid, ...stats, reason };
}

// ============================================
// 🎯 Strategy A: "First Half" (Time 12'-38', Score Diff <= 1)
// ============================================
function analyzeFirstHalfSniper(match, elapsed, stats, momentum = null) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const scoreDiff = Math.abs(homeScore - awayScore);

    // Updated time range: 12' - 38', score diff <= 1
    if (elapsed < 12 || elapsed > 38 || scoreDiff > 1) {
        return null;
    }

    // Require momentum trigger (Dynamic Lookback)
    if (!momentum || !momentum.detected) {
        return null;
    }

    const odds = match.odds || {};
    const homeOdds = odds['1'] || 2.0;
    const awayOdds = odds['2'] || 2.0;
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalSoT = (stats?.shotsOnTarget?.home || 0) + (stats?.shotsOnTarget?.away || 0);
    const totalCorners = (stats?.corners?.home || 0) + (stats?.corners?.away || 0);
    const totalxG = (stats?.xG?.home || 0) + (stats?.xG?.away || 0);

    // Build confidence from momentum and stats
    let confidencePercent = 60; // Increased from 55
    const reasons = [momentum.reason];

    // Bonus confidence for strong stats
    if (totalSoT >= 3) { confidencePercent += 8; reasons.push(`${totalSoT} SoT`); }
    if (totalShots >= 5) { confidencePercent += 5; reasons.push(`${totalShots} shots`); }
    if (totalCorners >= 3) { confidencePercent += 5; reasons.push(`${totalCorners} corners`); }

    // xG bonus - higher threshold for stronger signal
    if (totalxG > 0.8) {
        confidencePercent += 10;
        reasons.push(`🔥 xG: ${totalxG.toFixed(2)}`);
    } else if (totalxG > 0.5) {
        confidencePercent += 5;
        reasons.push(`xG: ${totalxG.toFixed(2)}`);
    }

    // � SHOT EFFICIENCY CHECK (Beceriksizlik Filtresi)
    // If lots of shots (>=8) but accuracy is low (<30%), penalize
    if (totalShots >= 8) {
        const accuracy = totalSoT / totalShots;
        if (accuracy < 0.30) {
            confidencePercent -= 5;
            reasons.push(`🔫 Low Accuracy (${Math.round(accuracy * 100)}%)`);
        }
    }

    // �🍀 UNLUCKY TEAM BONUS (xG Underperformance)
    // If a team has generated 1.2+ more xG than actual goals, they are "due" for a goal.
    // This is optional (only if xG exists).
    const homexG = stats?.xG?.home || 0;
    const awayxG = stats?.xG?.away || 0;
    const homeUnderperf = homexG - homeScore;
    const awayUnderperf = awayxG - awayScore;

    if (homeUnderperf >= 1.2 || awayUnderperf >= 1.2) {
        confidencePercent += 10;
        const unluckyTeam = homeUnderperf > awayUnderperf ? 'Home' : 'Away';
        reasons.push(`🍀 ${unluckyTeam} due for goal (xG diff)`);
    }

    // 🔥 DOMINANCE CHECK (One-sided match?)
    const shotDiff = (stats?.shots?.home || 0) - (stats?.shots?.away || 0);
    const sotDiff = (stats?.shotsOnTarget?.home || 0) - (stats?.shotsOnTarget?.away || 0);

    // If Home or Away is dominating by 4+ shots OR 2+ SoT
    if (Math.abs(shotDiff) >= 4 || Math.abs(sotDiff) >= 2) {
        confidencePercent += 10;
        let domTeam = 'Away';
        if (shotDiff >= 4 || sotDiff >= 2) domTeam = 'Home';

        reasons.push(`💪 ${domTeam} Dominating`);

        // 🦁 FAVORITE CONTEXT (Smart Money)
        // If the dominating team is also the favorite (Odds < 1.60), boost confidence
        const isHomeFav = homeOdds < 1.60;
        const isAwayFav = awayOdds < 1.60;

        if ((domTeam === 'Home' && isHomeFav) || (domTeam === 'Away' && isAwayFav)) {
            confidencePercent += 7;
            const favOdds = domTeam === 'Home' ? homeOdds : awayOdds;
            reasons.push(`🦁 Favorite Pushing (@${favOdds.toFixed(2)})`);
        }
    } else {
        // Balanced match penalty (if no dominance and few chances)
        if (totalSoT < 3) confidencePercent -= 5;
    }

    // Bonus for short timeframe momentum (more urgent)
    if (momentum.timeframe <= 3) { confidencePercent += 10; }
    else if (momentum.timeframe <= 6) { confidencePercent += 5; }

    if (confidencePercent > 95) confidencePercent = 95;

    return {
        id: match.match_id,
        home: match.home_team?.name || 'Home',
        away: match.away_team?.name || 'Away',
        homeLogo: match.home_team?.image_path || '',
        awayLogo: match.away_team?.image_path || '',
        score: `${homeScore}-${awayScore}`,
        elapsed,
        strategy: 'First Half Goal',
        strategyCode: 'FIRST_HALF',
        phase: 'First Half',
        confidence: 'PENDING',
        confidencePercent,
        verdict: 'PENDING',
        reason: reasons.join(' | '),
        momentumTrigger: momentum.trigger,
        momentumTimeframe: momentum.timeframe,
        stats: {
            shots: totalShots,
            shots_on_target: totalSoT,
            corners: totalCorners,
            xG: totalxG.toFixed(2),
            possession: `${stats?.possession?.home || 50}%-${stats?.possession?.away || 50}%`,
            homeOdds: homeOdds.toFixed(2),
            awayOdds: awayOdds.toFixed(2),
            deltas: momentum.deltas || {}
        },
        league: match.league_name || 'Unknown',
        leagueLogo: match.league_logo || '',
        country: match.country_name || ''
    };
}

// ============================================
// 🔥 Strategy B: "Late Game" (Time 55'-82', Score Diff <= 2)
// ============================================
function analyzeLateGameMomentum(match, elapsed, stats, momentum = null) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const goalDiff = Math.abs(homeScore - awayScore);

    // Time 46' - 82', score diff <= 2 (Extended coverage)
    if (elapsed < 46 || elapsed > 82 || goalDiff > 2) {
        return null;
    }

    // Require momentum trigger (Dynamic Lookback)
    if (!momentum || !momentum.detected) {
        return null;
    }

    const odds = match.odds || {};
    const homeOdds = odds['1'] || 2.0;
    const awayOdds = odds['2'] || 2.0;
    const drawOdds = odds['X'] || 3.0;
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalSoT = (stats?.shotsOnTarget?.home || 0) + (stats?.shotsOnTarget?.away || 0);
    const totalxG = (stats?.xG?.home || 0) + (stats?.xG?.away || 0);
    const totalCorners = (stats?.corners?.home || 0) + (stats?.corners?.away || 0);

    // Build confidence from momentum and stats
    let confidencePercent = 50;
    const reasons = [momentum.reason];

    // Bonus confidence for strong stats
    if (totalSoT >= 5) { confidencePercent += 10; reasons.push(`${totalSoT} SoT`); }
    if (totalShots >= 10) { confidencePercent += 8; reasons.push(`${totalShots} shots`); }
    if (totalCorners >= 5) { confidencePercent += 5; reasons.push(`${totalCorners} corners`); }
    if (totalxG > 1.0) { confidencePercent += 7; reasons.push(`xG: ${totalxG.toFixed(2)}`); }

    // 🎯 SHOT EFFICIENCY CHECK (Beceriksizlik Filtresi)
    // If lots of shots (>=10) but accuracy is low (<30%), penalize
    if (totalShots >= 10) {
        const accuracy = totalSoT / totalShots;
        if (accuracy < 0.30) {
            confidencePercent -= 5;
            reasons.push(`🔫 Low Accuracy (${Math.round(accuracy * 100)}%)`);
        }
    }

    // 🍀 UNLUCKY TEAM BONUS (xG Underperformance)
    const homexG = stats?.xG?.home || 0;
    const awayxG = stats?.xG?.away || 0;
    const homeUnderperf = homexG - homeScore;
    const awayUnderperf = awayxG - awayScore;

    if (homeUnderperf >= 1.2 || awayUnderperf >= 1.2) {
        confidencePercent += 10;
        const unluckyTeam = homeUnderperf > awayUnderperf ? 'Home' : 'Away';
        reasons.push(`🍀 ${unluckyTeam} due for goal (xG diff)`);
    }

    // 🔥 DOMINANCE CHECK (One-sided match?)
    const shotDiff = (stats?.shots?.home || 0) - (stats?.shots?.away || 0);
    const sotDiff = (stats?.shotsOnTarget?.home || 0) - (stats?.shotsOnTarget?.away || 0);

    // If Home or Away is dominating by 4+ shots OR 2+ SoT
    if (Math.abs(shotDiff) >= 4 || Math.abs(sotDiff) >= 2) {
        confidencePercent += 10;
        let domTeam = 'Away';
        if (shotDiff >= 4 || sotDiff >= 2) domTeam = 'Home';

        reasons.push(`💪 ${domTeam} Dominating`);

        // 🦁 FAVORITE CONTEXT (Smart Money)
        // If the dominating team is also the favorite (Odds < 1.60), boost confidence
        const isHomeFav = homeOdds < 1.60;
        const isAwayFav = awayOdds < 1.60;

        if ((domTeam === 'Home' && isHomeFav) || (domTeam === 'Away' && isAwayFav)) {
            confidencePercent += 7;
            const favOdds = domTeam === 'Home' ? homeOdds : awayOdds;
            reasons.push(`🦁 Favorite Pushing (@${favOdds.toFixed(2)})`);
        }
    } else {
        // Balanced match penalty (if no dominance and few chances)
        if (totalSoT < 4) confidencePercent -= 5;
    }

    // Bonus for close game (more likely to push for goal)
    if (goalDiff <= 1) { confidencePercent += 8; reasons.push(`Close: ${homeScore}-${awayScore}`); }

    // Bonus for peak timing (65-78 mins is prime scoring time)
    if (elapsed >= 65 && elapsed <= 78) { confidencePercent += 7; reasons.push(`Peak: ${elapsed}'`); }

    // Bonus for trailing team (losing team pushes harder for goals)
    if (goalDiff >= 1 && goalDiff <= 2) {
        confidencePercent += 6;
        const trailing = homeScore < awayScore ? 'Home' : 'Away';
        reasons.push(`⚡ ${trailing} chasing`);
    }

    // Bonus for short timeframe momentum
    if (momentum.timeframe <= 3) { confidencePercent += 10; }
    else if (momentum.timeframe <= 6) { confidencePercent += 5; }

    if (confidencePercent > 95) confidencePercent = 95;

    return {
        id: match.match_id,
        home: match.home_team?.name || 'Home',
        away: match.away_team?.name || 'Away',
        homeLogo: match.home_team?.image_path || '',
        awayLogo: match.away_team?.image_path || '',
        score: `${homeScore}-${awayScore}`,
        elapsed,
        strategy: 'Late Game Goal',
        strategyCode: 'LATE_GAME',
        phase: 'Late Game',
        confidence: 'PENDING',
        confidencePercent,
        verdict: 'PENDING',
        reason: reasons.join(' | '),
        momentumTrigger: momentum.trigger,
        momentumTimeframe: momentum.timeframe,
        stats: {
            shots: totalShots,
            shots_on_target: totalSoT,
            corners: totalCorners,
            xG: totalxG.toFixed(2),
            possession: `${stats?.possession?.home || 50}%-${stats?.possession?.away || 50}%`,
            homeOdds: homeOdds.toFixed(2),
            awayOdds: awayOdds.toFixed(2),
            drawOdds: drawOdds.toFixed(2),
            deltas: momentum.deltas || {}
        },
        league: match.league_name || 'Unknown',
        leagueLogo: match.league_logo || '',
        country: match.country_name || ''
    };
}

// ============================================
// 📡 Fetch Live Matches from Flashscore4
// ============================================
async function fetchLiveMatches() {
    if (dailyRequestCount >= DAILY_LIMIT) {
        log.warn('Daily API limit reached!');
        return { tournaments: [], quotaRemaining: 0 };
    }

    try {
        log.api('Fetching live football matches from Flashscore4...');

        const response = await axios.get(`${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/live/1`, {
            headers: FLASHSCORE_API.headers,
            timeout: 15000
        });

        dailyRequestCount++;
        const quotaRemaining = DAILY_LIMIT - dailyRequestCount;

        log.api(`Quota: ${quotaRemaining}/${DAILY_LIMIT} remaining`);

        const data = response.data;
        const tournaments = Array.isArray(data) ? data : [];

        log.info(`Received ${tournaments.length} tournaments`);

        return { tournaments, quotaRemaining, count: tournaments.length };

    } catch (error) {
        log.error(`Flashscore4 API Error: ${error.message}`);
        return { tournaments: [], quotaRemaining: DAILY_LIMIT - dailyRequestCount, error: true };
    }
}

// ============================================
// 🔄 Process All Tournaments & Matches
// ============================================
let isScanning = false;

async function processMatches() {
    if (isScanning) {
        log.warn('⚠️ Scan already in progress, skipping this cycle.');
        return;
    }
    isScanning = true;

    try {
        log.info('═══════════════════════════════════════════════════════');
        log.info('🔄 LIVE BOT SCAN STARTED');
        log.info('═══════════════════════════════════════════════════════');

        const { tournaments, quotaRemaining } = await fetchLiveMatches();
        const signals = [];

        log.info(`📊 API Quota: ${quotaRemaining}/${DAILY_LIMIT} remaining`);

        if (tournaments.length === 0) {
            log.warn('⚠️ No live matches found at this time');
            CACHED_DATA = { ...CACHED_DATA, signals: [], lastUpdated: new Date().toISOString(), quotaRemaining };
            return signals;
        }

        log.info(`🏆 Found ${tournaments.length} tournaments with live matches`);

        // Flatten all matches
        const allMatches = [];
        for (const tournament of tournaments) {
            const matchCount = tournament.matches?.length || 0;
            if (matchCount > 0) {
                log.info(`   └─ ${tournament.name}: ${matchCount} match(es)`);
            }
            for (const match of tournament.matches || []) {
                allMatches.push({
                    ...match,
                    league_name: tournament.name,
                    league_logo: tournament.image_path,
                    country_name: tournament.country_name
                });
            }
        }

        log.info(`───────────────────────────────────────────────────────`);
        log.info(`📋 Total Live Matches: ${allMatches.length}`);

        // Filter candidates by time ranges (12-38 for First Half, 55-82 for Late Game)
        const candidates = allMatches.filter(m => {
            // League Filter (Expanded List for Live Bot)
            const leagueName = m.league_name || '';
            const fullLeagueName = `${m.country_name}: ${leagueName}`;

            // Combine Allowlist + Extra List
            const LIVE_BOT_LEAGUES = [...ALLOWED_LEAGUES, ...EXTRA_LIVE_LEAGUES];

            // Check if league is in allowed list (or partial match if beneficial, but exact is safer)
            const isAllowedLeague = LIVE_BOT_LEAGUES.some(allowed =>
                fullLeagueName.toUpperCase().includes(allowed.toUpperCase()) ||
                leagueName.toUpperCase().includes(allowed.split(': ')[1]?.toUpperCase())
            );

            if (!isAllowedLeague) return false;

            const elapsed = parseElapsedTime(m.stage);
            const homeScore = m.home_team?.score || 0;
            const awayScore = m.away_team?.score || 0;
            const scoreDiff = Math.abs(homeScore - awayScore);
            const stageStr = (m.stage || '').toString().toUpperCase();

            // Skip finished matches
            const isFinished = stageStr.includes('FT') || stageStr.includes('AET') ||
                stageStr.includes('PEN') || stageStr.includes('FINISHED') ||
                elapsed >= 90;
            if (isFinished) return false;

            const isFirstHalfCandidate = elapsed >= 12 && elapsed <= 38 && scoreDiff <= 1;
            const isLateGameCandidate = elapsed >= 46 && elapsed <= 82 && scoreDiff <= 2;

            return isFirstHalfCandidate || isLateGameCandidate;
        });

        log.info(`🎯 Candidates Matching Time/Score: ${candidates.length}/${allMatches.length}`);

        if (candidates.length === 0) {
            log.info('ℹ️ No matches meet First Half (12-38\', diff≤1) or Late Game (55-82\', diff≤2) criteria');
            CACHED_DATA = { ...CACHED_DATA, signals: [], lastUpdated: new Date().toISOString(), quotaRemaining };
            return signals;
        }

        // Periodically clean old history entries
        cleanOldHistory();

        // Track signals sent per match per strategy (prevent duplicates)
        // Structure: { matchId_strategyCode: true }
        const sentSignals = new Set();

        log.info(`───────────────────────────────────────────────────────`);
        log.info(`🔍 ANALYZING CANDIDATES (Momentum-Based):`);

        for (const match of candidates) {
            const elapsed = parseElapsedTime(match.stage);
            const matchId = match.match_id;
            const homeName = match.home_team?.name || 'Unknown';
            const awayName = match.away_team?.name || 'Unknown';
            const score = `${match.home_team?.score || 0}-${match.away_team?.score || 0}`;

            log.info(`\n   🏟️ ${homeName} vs ${awayName} (${score}, ${elapsed}')`);

            // Fetch stats
            const statsData = await fetchMatchStats(matchId);
            const stats = statsData ? parseMatchStats(statsData) : null;

            if (stats) {
                const totalShots = stats.shots.home + stats.shots.away;
                const totalSoT = stats.shotsOnTarget.home + stats.shotsOnTarget.away;
                const totalCorners = stats.corners.home + stats.corners.away;
                log.info(`      📈 Stats: Shots ${totalShots} | SoT ${totalSoT} | Corners ${totalCorners}`);

                // 🔴 RED CARD FILTER (Safety First)
                if (stats.redCards && (stats.redCards.home > 0 || stats.redCards.away > 0)) {
                    log.info(`      🛑 RED CARD detected (Home: ${stats.redCards.home}, Away: ${stats.redCards.away}) - Skipping safety`);
                    continue;
                }
            } else {
                log.warn(`      ⚠️ Could not fetch stats for this match`);
                continue; // Skip if no stats
            }

            // 💰 FETCH ODDS (New Context)
            const odds = await fetchMatchOdds(matchId);
            if (odds) {
                match.odds = odds;
                log.info(`      💰 Odds: 1:${odds['1']} X:${odds['X']} 2:${odds['2']}`);
            } else {
                match.odds = { '1': 2.0, 'X': 3.5, '2': 2.0 }; // Default dummy
                log.info(`      ⚠️ No Odds found - using defaults`);
            }

            // STEP 1: Base Activity Check ("Is it Dead?" Filter)
            const baseCheck = checkBaseActivity(elapsed, stats);

            if (!baseCheck.isAlive) {
                log.info(`      💀 ${baseCheck.reason}`);
                continue; // Dead match, skip immediately
            }
            log.info(`      ✅ ${baseCheck.reason}`);

            // Record to history AFTER base activity check passes
            recordMatchStats(matchId, stats, score);

            // STEP 2: Detect Momentum (Dynamic Lookback)
            const momentum = detectMomentum(matchId, stats, score);

            if (momentum.detected) {
                log.info(`      🔥 MOMENTUM: ${momentum.reason}`);
            } else {
                log.info(`      ⏸️ No momentum trigger yet (waiting for delta)`);
                continue; // Skip if no momentum - this is the key filter!
            }

            // Run scout filters with momentum
            let candidate = analyzeFirstHalfSniper(match, elapsed, stats, momentum);
            if (!candidate) {
                candidate = analyzeLateGameMomentum(match, elapsed, stats, momentum);
            }

            if (!candidate) {
                log.info(`      ❌ Failed phase criteria (time/score mismatch)`);
                continue;
            }

            // Check daily signal limit (max 2 per match per strategy if score changed)
            if (!checkSignalLimit(matchId, candidate.strategyCode, candidate.score)) {
                log.warn(`      🔒 Signal limit reached for ${matchId}_${candidate.strategyCode}`);
                continue;
            }

            // Include base activity in reason
            candidate.reason = `${baseCheck.reason} + ${candidate.reason}`;

            log.info(`      ✓ ${candidate.phase}: ${candidate.strategyCode} (${candidate.confidencePercent}% base)`);

            // 🎯 CONVERSION CHECK (Reject low accuracy shooters)
            const totalShots = candidate.stats.shots || 0;
            const totalSoT = candidate.stats.shots_on_target || 0;
            if (totalShots >= 8) {
                const accuracy = totalSoT / totalShots;
                if (accuracy < 0.25) {
                    log.warn(`      ⛔ CONVERSION FAIL: ${Math.round(accuracy * 100)}% accuracy (need 25%+)`);
                    continue;
                }
            }

            // 🤝 H2H VALIDATION (Check historical goal patterns)
            log.info(`      🤝 Fetching H2H data...`);
            const h2hData = await fetchMatchH2H(matchId);
            const h2hAnalysis = await analyzeH2HForGoals(h2hData, candidate.home, candidate.away, candidate.score, elapsed);

            if (!h2hAnalysis.valid) {
                log.warn(`      ⛔ ${h2hAnalysis.reason}`);
                continue;
            }
            log.info(`      ✅ ${h2hAnalysis.reason}`);
            log.info(`      📊 Form Stats: Home[${h2hAnalysis.homeForm}] Away[${h2hAnalysis.awayForm}] | 1H:${h2hAnalysis.htGoalRate}% 2H:${h2hAnalysis.shGoalRate}% | Details:${h2hAnalysis.detailsChecked || 0}`);

            // Add H2H context to candidate
            candidate.h2h = h2hAnalysis;

            // 📊 HALF-SPECIFIC CONFIDENCE ADJUSTMENT (Soft Bonus/Penalty)
            const htRate = parseFloat(h2hAnalysis.htGoalRate) || 0;
            const shRate = parseFloat(h2hAnalysis.shGoalRate) || 0;

            if (candidate.strategyCode === 'FIRST_HALF' && h2hAnalysis.htGoalRate !== 'N/A') {
                if (htRate < 30) {
                    candidate.confidencePercent -= 10;
                    candidate.reason += ` | ⚠️ Low 1H rate (${htRate}%)`;
                } else if (htRate > 60) {
                    candidate.confidencePercent += 5;
                    candidate.reason += ` | 📈 High 1H rate (${htRate}%)`;
                }
            }

            if (candidate.strategyCode === 'LATE_GAME' && h2hAnalysis.shGoalRate !== 'N/A') {
                if (shRate < 30) {
                    candidate.confidencePercent -= 10;
                    candidate.reason += ` | ⚠️ Low 2H rate (${shRate}%)`;
                } else if (shRate > 60) {
                    candidate.confidencePercent += 5;
                    candidate.reason += ` | 📈 High 2H rate (${shRate}%)`;
                }
            }

            // Cap confidence
            if (candidate.confidencePercent > 95) candidate.confidencePercent = 95;
            if (candidate.confidencePercent < 30) candidate.confidencePercent = 30;

            // 🔒 SCORE SAFETY CHECK (Double-check before AI)
            // Prevent "Ghost Signals" if a goal happened during processing
            const latestDetails = await fetchMatchDetails(matchId, 1);
            if (latestDetails && latestDetails.home_team && latestDetails.away_team) {
                const latestHome = parseInt(latestDetails.home_team.score) || 0;
                const latestAway = parseInt(latestDetails.away_team.score) || 0;
                const currentHome = parseInt(match.home_team?.score) || 0;
                const currentAway = parseInt(match.away_team?.score) || 0;

                if (latestHome !== currentHome || latestAway !== currentAway) {
                    log.warn(`      🛑 ABORTING: Score changed during analysis! (Was ${currentHome}-${currentAway}, Now ${latestHome}-${latestAway})`);
                    continue;
                }
            }

            // Send to Gemini for AI validation
            log.gemini(`      🤖 Asking Gemini AI...`);
            const geminiResult = await askAIAnalyst(candidate);

            // Update candidate with Gemini results
            candidate.verdict = geminiResult.verdict || 'SKIP';
            candidate.confidencePercent = geminiResult.confidence || candidate.confidencePercent;
            candidate.confidence = geminiResult.confidence >= 75 ? 'HIGH' : geminiResult.confidence >= 50 ? 'MEDIUM' : 'LOW';
            candidate.geminiReason = geminiResult.reason || '';

            // Only add PLAY signals
            if (candidate.verdict === 'PLAY') {
                candidate.id = `${matchId}_${candidate.strategyCode}`;
                log.success(`      ✅ PLAY - ${candidate.confidencePercent}% - ${geminiResult.reason?.substring(0, 50)}...`);
                signals.push(candidate);

                // Record signal for daily limit tracking
                recordSignal(matchId, candidate.strategyCode, candidate.score);

                // Auto-approve live signals (no admin approval needed)
                APPROVED_IDS.add(candidate.id);

                // 📝 Record bet to history (for Dashboard tracking)
                const homeScore = match.home_team?.score || 0;
                const awayScore = match.away_team?.score || 0;
                const entryScore = `${homeScore}-${awayScore}`;

                await betTracker.recordBet({
                    match_id: matchId,
                    home_team: match.home_team?.name || 'Unknown',
                    away_team: match.away_team?.name || 'Unknown'
                }, candidate.market || 'Next Goal', candidate.strategyCode, candidate.confidencePercent, 'live', entryScore);

                // Send Telegram notification
                await sendTelegramNotification(candidate);
            } else {
                log.warn(`      ⏭️ SKIP - ${geminiResult.reason?.substring(0, 50) || 'No reason'}...`);
            }

            // Small delay between API calls
            await new Promise(r => setTimeout(r, 200));
        }

        // Update cache
        CACHED_DATA = {
            signals,
            lastUpdated: new Date().toISOString(),
            quotaRemaining: DAILY_LIMIT - dailyRequestCount,
            quotaLimit: DAILY_LIMIT,
            isLive: true
        };

        log.info(`───────────────────────────────────────────────────────`);
        log.success(`📊 SCAN COMPLETE: ${signals.length} signals found`);
        log.info(`═══════════════════════════════════════════════════════\n`);

        return signals;
    } catch (error) {
        log.error(`Scan failed: ${error.message}`);
    } finally {
        isScanning = false;
    }
}

// ============================================
// 🌐 API Endpoints
// ============================================

// Public Health Check (for UptimeRobot)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/signals', optionalAuth, (req, res) => {
    const userRole = req.user ? req.user.role : 'free';

    // FREE Users: Access Denied
    if (userRole === 'free') {
        return res.status(403).json({ success: false, error: 'Upgrade to PRO to view signals.' });
    }

    let signals = CACHED_DATA.signals.map(s => ({
        ...s,
        isApproved: APPROVED_IDS.has(s.id)
    }));

    // PRO Users: Filter for Approved
    if (userRole === 'pro') {
        signals = signals.filter(s => s.isApproved);
    }

    // Calculate counts based on VISIBLE signals
    const iySignals = signals.filter(s => s.strategyCode === 'IY_05').length;
    const msSignals = signals.filter(s => s.strategyCode === 'MS_GOL').length;

    res.json({
        success: true,
        data: signals,
        meta: {
            updatedAt: CACHED_DATA.lastUpdated,
            // Only show quota info to admins? Or generic info is fine.
            quotaRemaining: CACHED_DATA.quotaRemaining,
            quotaLimit: CACHED_DATA.quotaLimit,
            quotaPercent: Math.round((CACHED_DATA.quotaRemaining / CACHED_DATA.quotaLimit) * 100),
            isLive: CACHED_DATA.isLive,
            totalSignals: signals.length,
            iySignals,
            msSignals
        }
    });
});

app.post('/api/scan', async (req, res) => {
    try {
        log.info('Manual scan triggered');
        const start = Date.now();

        const signals = await processMatches();

        const duration = Date.now() - start;
        log.success(`Poll complete in ${duration}ms`);
        log.info(`Found ${signals.length} signals (IY: ${signals.filter(s => s.strategyCode === 'IY_05').length}, MS: ${signals.filter(s => s.strategyCode === 'MS_GOL').length})`);

        res.json({
            success: true,
            message: 'Scan completed',
            data: signals,
            meta: {
                lastUpdated: CACHED_DATA.lastUpdated,
                quotaRemaining: CACHED_DATA.quotaRemaining,
                quotaLimit: CACHED_DATA.quotaLimit,
                signalCount: signals.length
            }
        });
    } catch (error) {
        log.error(`Scan error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});



app.get('/api/performance', async (req, res) => {
    const stats = await betTracker.getPerformanceStats();
    res.json({ success: true, data: stats });
});

// ============================================
// 📊 Bet History Endpoints
// ============================================
app.get('/api/bet-history', optionalAuth, async (req, res) => {
    try {
        const bets = await betTracker.getAllBets();
        const stats = await betTracker.getPerformanceStats();
        res.json({
            success: true,
            data: bets,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/bet-history/:id/settle', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resultScore } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status required (WON/LOST/VOID)' });
        }

        const result = await betTracker.manualSettle(id, status, resultScore);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Return updated stats too
        const stats = await betTracker.getPerformanceStats();
        res.json({
            success: true,
            bet: result.bet,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clear Bet History (Admin only)
app.delete('/api/bet-history/clear', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    try {
        const { source } = req.query; // Optional: 'live' or 'daily'
        const result = await betTracker.clearAllBets(source || null);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete Single Bet (Admin)
app.delete('/api/bet-history/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    try {
        const { id } = req.params;
        const result = await betTracker.deleteBet(id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 📊 Raw Stats Collection Endpoint (No Market Filtering)
// ----------------------------------------------------------------------
// Returns all matches with H2H stats and comprehensive AI prompt
// Query params: leagueFilter=true|false (default: true)
// IMPORTANT: This route MUST be defined BEFORE /api/analysis/:market
app.get('/api/analysis/raw-stats', optionalAuth, async (req, res) => {
    const leagueFilter = req.query.leagueFilter !== 'false'; // Default true
    const limit = parseInt(req.query.limit) || 50;

    log.info(`🚀 API Request: Raw Stats Collection (LeagueFilter: ${leagueFilter}, Limit: ${limit})`);

    try {
        const results = await runRawStatsCollection(leagueFilter, log, limit);
        res.json({ success: true, data: results });
    } catch (error) {
        log.error('Raw Stats Collection Failed:', error);
        res.status(500).json({ success: false, error: 'Raw stats collection failed' });
    }
});

// ============================================
// 📈 Single Market Analysis Endpoint (New Modular API)
// ----------------------------------------------------------------------
// Supports: over25, btts, doubleChance, homeOver15, under35, under25, firstHalfOver05
// Query params: leagueFilter=true|false (default: true)
app.get('/api/analysis/:market', optionalAuth, async (req, res) => {
    const { market } = req.params;
    const leagueFilter = req.query.leagueFilter !== 'false'; // Default true
    const force = req.query.force === 'true'; // Force fresh analysis

    log.info(`🚀 API Request: Single Market Analysis - ${market} (LeagueFilter: ${leagueFilter}, Force: ${force})`);

    // Validate market
    if (!MARKET_MAP[market]) {
        return res.status(400).json({
            success: false,
            error: `Invalid market: ${market}. Valid options: ${Object.keys(MARKET_MAP).join(', ')}`
        });
    }

    const cacheKey = `goalsniper:analysis:${market}`;

    // Check Redis cache first (if not forcing)
    if (!force) {
        try {
            const cached = await betTracker.redisGet(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached);
                // Check if cache is from today
                const today = new Date().toISOString().split('T')[0];
                if (parsed.date === today && parsed.data) {
                    log.info(`📦 Returning cached analysis for ${market}`);
                    return res.json({ success: true, data: parsed.data, fromCache: true });
                }
            }
        } catch (e) {
            log.warn(`Cache read error: ${e.message}`);
        }
    }

    try {
        const results = await runSingleMarketAnalysis(market, leagueFilter, log);

        // Save to Redis cache
        const cacheData = {
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            data: results
        };
        await betTracker.redisSet(cacheKey, cacheData);
        log.info(`💾 Saved analysis to Redis: ${market}`);

        res.json({ success: true, data: results });
    } catch (error) {
        log.error(`Single Market Analysis Failed (${market}):`, error);
        res.status(500).json({ success: false, error: 'Analysis failed' });
    }
});

// Get Last Analysis (for page refresh persistence)
app.get('/api/analysis/last/:market', optionalAuth, async (req, res) => {
    const { market } = req.params;
    const cacheKey = `goalsniper:analysis:${market}`;

    try {
        const cached = await betTracker.redisGet(cacheKey);
        if (cached) {
            const parsed = JSON.parse(cached);
            return res.json({
                success: true,
                data: parsed.data,
                timestamp: parsed.timestamp,
                fromCache: true
            });
        }
        return res.json({ success: true, data: null, message: 'No cached analysis' });
    } catch (e) {
        log.error(`Cache read error: ${e.message}`);
        return res.json({ success: true, data: null });
    }
});

// Reset Market History (Admin Only)
app.delete('/api/bet-history/market/:market', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { market } = req.params;
    log.info(`🗑️ API Request: Reset History for Market - ${market}`);

    try {
        const result = await betTracker.clearMarketHistory(market);
        res.json(result);
    } catch (error) {
        log.error(`Clear Market History Failed (${market}):`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get History for Specific Market
app.get('/api/bet-history/market/:market', optionalAuth, async (req, res) => {
    const { market } = req.params;
    try {
        const allBets = await betTracker.getAllBets();
        const filtered = allBets.filter(b => b.market === market || b.strategyCode === market);
        res.json({ success: true, data: filtered });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record Single Bet (for saving analysis result to history)
app.post('/api/bet-history/record', requireAuth, async (req, res) => {
    try {
        const { match, market, source = 'daily' } = req.body;
        const result = await betTracker.recordBet(match, market, market, 80, source);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 📊 DAILY ANALYSIS ENDPOINT (Main)
// ============================================
let DAILY_ANALYSIS_CACHE = null;
let DAILY_ANALYSIS_TIMESTAMP = null;

app.get('/api/daily-analysis', optionalAuth, async (req, res) => {
    const userRole = req.user ? req.user.role : 'free';

    // FREE Users: Access Denied
    if (userRole === 'free') {
        return res.status(403).json({ success: false, error: 'Upgrade to PRO to access Daily Analyst.' });
    }

    const { force, limit, leagueFilter } = req.query;
    const forceUpdate = force === 'true';
    const customLimit = limit ? parseInt(limit) : 500;
    const useLeagueFilter = leagueFilter !== 'false'; // Default true

    // Helper to filter results based on role & approval
    const filterResults = (results) => {
        const categories = ['over15', 'over25', 'btts', 'doubleChance', 'homeOver15', 'under35', 'under25', 'firstHalfOver05', 'ms1AndOver15', 'awayOver05', 'handicap'];
        const filtered = {};

        categories.forEach(cat => {
            if (!results[cat]) return;
            // Ensure IDs exist and check approval/rejection
            const list = results[cat].map(m => {
                // Generate consistent ID if missing (e.g. from cache)
                const mid = m.id || `${m.event_key || m.match_id}_${cat}`;
                return { ...m, id: mid, isApproved: APPROVED_IDS.has(mid), isRejected: REJECTED_IDS.has(mid) };
            });

            // Filter out rejected items for EVERYONE
            const activeList = list.filter(m => !m.isRejected);

            if (userRole === 'pro') {
                filtered[cat] = activeList.filter(m => m.isApproved);
            } else {
                filtered[cat] = activeList; // Admin sees all non-rejected
            }
        });
        return filtered;
    };

    // Cache Check
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Return Cache if available
    if (!forceUpdate && DAILY_ANALYSIS_CACHE && DAILY_ANALYSIS_TIMESTAMP === today) {
        return res.json({ success: true, fromCache: true, data: filterResults(DAILY_ANALYSIS_CACHE) });
    }

    // 2. SAFETY: If not forcing and no cache, DO NOT RUN. (Prevents auto-scan on Admin load)
    if (!forceUpdate) {
        return res.json({ success: true, data: {}, message: 'No analysis generated for today. Click "Analiz Et" to start.' });
    }

    try {
        log.info(`Running Daily Pre-Match Analysis (League Filter: ${useLeagueFilter})...`);
        const results = await runDailyAnalysis(log, customLimit, useLeagueFilter);

        // Post-processing: Assign IDs immediately for consistency
        const processedResults = { ...results };
        ['over15', 'btts', 'doubleChance', 'homeOver15', 'under35', 'firstHalfOver05', 'ms1AndOver15', 'awayOver05', 'handicap'].forEach(cat => {
            if (processedResults[cat]) {
                processedResults[cat].forEach(m => {
                    m.id = `${m.event_key || m.match_id}_${cat}`;
                });
            }
        });

        DAILY_ANALYSIS_CACHE = processedResults;
        DAILY_ANALYSIS_TIMESTAMP = today;

        res.json({ success: true, data: filterResults(processedResults) });
    } catch (error) {
        log.error(`Daily Analyst Error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ✅ Approve Daily Candidate (Manual Approval)
// ============================================
app.post('/api/daily-analysis/approve/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { id } = req.params;
    const { matchData, market, category, confidence } = req.body;

    try {
        // Add to approved IDs
        APPROVED_IDS.add(id);
        saveApprovals();

        // Record bet if match data provided
        if (matchData) {
            betTracker.recordBet({
                match_id: matchData.matchId,
                home_team: matchData.home_team,
                away_team: matchData.away_team
            }, market, category, confidence || 85, 'daily');
        }

        log.success(`Daily candidate approved: ${id}`);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 🗑️ Reject Daily Candidate (Admin)
// ============================================
app.post('/api/daily-analysis/reject/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { id } = req.params;

    try {
        REJECTED_IDS.add(id);
        saveRejections();

        // Also remove from approved if it was there (toggle safety)
        if (APPROVED_IDS.has(id)) {
            APPROVED_IDS.delete(id);
            saveApprovals();
        }

        log.info(`Daily candidate rejected: ${id}`);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// ============================================
// 🤖 AI Automated Analysis Endpoint (Admin)
// ============================================
app.post('/api/daily-analysis/ai-auto', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { leagueFilter } = req.body;

    try {
        log.info(`[API] Starting AI Auto Analysis (League Filter: ${leagueFilter})`);

        // This takes time, so we send results immediately? No, frontend expects array.
        // We will await it (assuming < 60s timeout). 
        // If it takes longer, we should use streaming, but for 20 matches limit it should be fast (~30s).

        const results = await runAIAutomatedAnalysis(leagueFilter, log);

        // Results now contain { candidates, coupons }
        res.json({
            success: true,
            count: results.candidates?.length || 0,
            candidates: results.candidates || [],
            coupons: results.coupons || null
        });
    } catch (error) {
        log.error(`AI Analysis Failed: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// 🧠 AI Training Data Routes
// ============================================
const localBetTracker = require('./betTracker'); // For training data (not Redis)

// Get all training data
app.get('/api/training-data', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const data = localBetTracker.getTrainingData();
    res.json({ success: true, data });
});

// Record new training entry (with full stats)
app.post('/api/training-data/record', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const { matchId, match, homeTeam, awayTeam, league, startTime, market, prediction, odds, features } = req.body;

    const result = localBetTracker.recordTrainingBet({
        matchId, match, homeTeam, awayTeam, league, startTime, market, prediction, odds, features
    });

    res.json(result);
});

// Settle training bet (WON/LOST)
app.post('/api/training-data/settle/:id', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const { id } = req.params;
    const { result, actualScore } = req.body;

    const outcome = localBetTracker.settleTrainingBet(id, result, actualScore);
    res.json(outcome);
});

// Delete training entry
app.delete('/api/training-data/:id', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const { id } = req.params;
    const outcome = localBetTracker.deleteTrainingEntry(id);
    res.json(outcome);
});

// ============================================
// 💬 SENTIO Chat System Routes
// ============================================
const aiService = require('./services/aiService');
const SENTIO_MEMORY_FILE = path.join(__dirname, 'data', 'sentioMemory.json');

// Load SENTIO memory
function loadSentioMemory() {
    try {
        if (fs.existsSync(SENTIO_MEMORY_FILE)) {
            return JSON.parse(fs.readFileSync(SENTIO_MEMORY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[SENTIO] Memory load error:', e);
    }
    return { date: null, matches: [], populatedAt: null };
}

// Save SENTIO memory
function saveSentioMemory(data) {
    try {
        fs.writeFileSync(SENTIO_MEMORY_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[SENTIO] Memory save error:', e);
    }
}

// Admin: Populate SENTIO memory with daily matches
app.post('/api/sentio/populate', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { leagueFilter } = req.body;

    try {
        log.info(`[SENTIO] Populating memory (League Filter: ${leagueFilter})`);

        // Fetch matches with stats (reuse daily analysis logic)
        const analysisResults = await runDailyAnalysis(log, 100, leagueFilter !== false);

        // Collect all unique matches
        const allMatches = new Map();
        Object.values(analysisResults).forEach(list => {
            if (Array.isArray(list)) {
                list.forEach(m => {
                    if (!allMatches.has(m.event_key || m.match_id)) {
                        allMatches.set(m.event_key || m.match_id, m);
                    }
                });
            }
        });

        const matchArray = Array.from(allMatches.values());
        const formattedMatches = aiService.formatForSentioMemory(matchArray);

        const memory = {
            date: new Date().toISOString().split('T')[0],
            matches: formattedMatches,
            populatedAt: new Date().toISOString()
        };

        saveSentioMemory(memory);
        log.success(`[SENTIO] Memory populated with ${formattedMatches.length} matches`);

        res.json({ success: true, count: formattedMatches.length });
    } catch (error) {
        log.error('[SENTIO] Populate error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get SENTIO memory status (Admin only)
app.get('/api/sentio/memory', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    const memory = loadSentioMemory();
    res.json({
        success: true,
        date: memory.date,
        matchCount: memory.matches?.length || 0,
        matches: memory.matches || [],
        populatedAt: memory.populatedAt
    });
});

// Admin: Approve single match for SENTIO
app.post('/api/sentio/approve-match', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { matchId, homeTeam, awayTeam, league, stats, aiPrompt } = req.body;

    if (!matchId || !homeTeam || !awayTeam) {
        return res.status(400).json({ success: false, error: 'matchId, homeTeam, awayTeam required' });
    }

    try {
        const memory = loadSentioMemory();
        const today = new Date().toISOString().split('T')[0];

        // Reset if different day
        if (memory.date !== today) {
            memory.date = today;
            memory.matches = [];
        }

        // Check for duplicate
        const exists = memory.matches.some(m => m.matchId === matchId);
        if (exists) {
            return res.json({ success: true, message: 'Maç zaten SENTIO hafızasında', duplicate: true });
        }

        // Add match
        memory.matches.push({
            matchId,
            homeTeam,
            awayTeam,
            league,
            stats,
            aiPrompt,
            approvedAt: new Date().toISOString()
        });
        memory.populatedAt = new Date().toISOString();

        saveSentioMemory(memory);
        log.success(`[SENTIO] Match approved: ${homeTeam} vs ${awayTeam}`);

        res.json({ success: true, message: 'Maç SENTIO hafızasına eklendi', matchCount: memory.matches.length });
    } catch (error) {
        log.error('[SENTIO] Approve match error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Bulk approve matches for SENTIO
app.post('/api/sentio/approve-bulk', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { matches } = req.body;

    if (!matches || !Array.isArray(matches) || matches.length === 0) {
        return res.status(400).json({ success: false, error: 'matches array required' });
    }

    try {
        const memory = loadSentioMemory();
        const today = new Date().toISOString().split('T')[0];

        // Reset if different day
        if (memory.date !== today) {
            memory.date = today;
            memory.matches = [];
        }

        let added = 0;
        let skipped = 0;

        for (const match of matches) {
            const exists = memory.matches.some(m => m.matchId === match.matchId);
            if (exists) {
                skipped++;
                continue;
            }

            memory.matches.push({
                matchId: match.matchId,
                homeTeam: match.homeTeam || match.event_home_team,
                awayTeam: match.awayTeam || match.event_away_team,
                league: match.league || match.league_name,
                stats: match.stats,
                aiPrompt: match.aiPrompt,
                approvedAt: new Date().toISOString()
            });
            added++;
        }

        memory.populatedAt = new Date().toISOString();
        saveSentioMemory(memory);

        log.success(`[SENTIO] Bulk approve: ${added} added, ${skipped} skipped`);

        res.json({
            success: true,
            message: `${added} maç eklendi, ${skipped} maç zaten mevcuttu`,
            added,
            skipped,
            matchCount: memory.matches.length
        });
    } catch (error) {
        log.error('[SENTIO] Bulk approve error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin: Clear SENTIO memory
app.delete('/api/sentio/memory', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    try {
        const emptyMemory = {
            date: new Date().toISOString().split('T')[0],
            matches: [],
            populatedAt: null
        };
        saveSentioMemory(emptyMemory);
        log.info('[SENTIO] Memory cleared by admin');

        res.json({ success: true, message: 'SENTIO hafızası temizlendi' });
    } catch (error) {
        log.error('[SENTIO] Clear memory error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// All Users: Chat with SENTIO (Free, PRO, Admin)
app.post('/api/sentio/chat', requireAuth, async (req, res) => {
    const { message } = req.body;
    if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message required' });
    }

    try {
        const memory = loadSentioMemory();

        // Check if memory has matches
        if (!memory.matches || memory.matches.length === 0) {
            return res.json({
                success: true,
                response: '⚠️ Henüz analiz edilmiş maç bulunmuyor. Admin tarafından maçlar onaylandığında size yardımcı olabilirim!\n\nŞu anda günün maçlarını bekliyorum... 🕐'
            });
        }

        const response = await aiService.chatWithSentio(message, memory);
        res.json({ success: true, response });
    } catch (error) {
        log.error('[SENTIO] Chat error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// All Users: Streaming Chat with SENTIO (SSE) - Supports conversation history
app.post('/api/sentio/chat-stream', requireAuth, async (req, res) => {
    const { message, history } = req.body; // history: [{role, content}]

    if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
        const memory = loadSentioMemory();

        // Check if memory has matches
        if (!memory.matches || memory.matches.length === 0) {
            const noDataMsg = "⚠️ No matches have been analyzed yet. I'll be able to help once the admin approves today's matches! 🕐";
            res.write(`data: ${JSON.stringify({ chunk: noDataMsg })}\n\n`);
            res.write(`data: ${JSON.stringify({ done: true, fullText: noDataMsg })}\n\n`);
            res.end();
            return;
        }

        await aiService.streamChatWithSentio(
            message,
            memory,
            history || [],
            (chunk) => {
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            },
            (fullText) => {
                res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
                res.end();
            }
        );
    } catch (error) {
        log.error('[SENTIO] Stream chat error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});


// ============================================
// 📡 SSE Streaming Endpoint for Live Analysis
// ============================================
app.get('/api/daily-analysis/stream', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin' && req.user.role !== 'pro') {
        return res.status(403).json({ error: 'Access denied' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const limit = parseInt(req.query.limit) || 500;

    // Custom logger that streams to client
    const streamLog = {
        info: (msg) => {
            res.write(`data: ${JSON.stringify({ type: 'info', message: msg, time: new Date().toISOString() })}\n\n`);
        },
        warn: (msg) => {
            res.write(`data: ${JSON.stringify({ type: 'warn', message: msg, time: new Date().toISOString() })}\n\n`);
        },
        error: (msg) => {
            res.write(`data: ${JSON.stringify({ type: 'error', message: msg, time: new Date().toISOString() })}\n\n`);
        },
        success: (msg) => {
            res.write(`data: ${JSON.stringify({ type: 'success', message: msg, time: new Date().toISOString() })}\n\n`);
        },
        progress: (current, total, match) => {
            res.write(`data: ${JSON.stringify({ type: 'progress', current, total, match, percent: Math.round((current / total) * 100) })}\n\n`);
        }
    };

    try {
        streamLog.info(`🚀 Analiz başlıyor (Limit: ${limit} maç)...`);

        const results = await runDailyAnalysis(streamLog, limit);

        // Update cache
        const today = new Date().toISOString().split('T')[0];
        DAILY_ANALYSIS_CACHE = results;
        DAILY_ANALYSIS_TIMESTAMP = today;

        streamLog.success(`✅ Analiz tamamlandı! ${Object.values(results).flat().length} sinyal bulundu.`);
        res.write(`data: ${JSON.stringify({ type: 'done', results })}\n\n`);
    } catch (error) {
        streamLog.error(`❌ Hata: ${error.message}`);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    } finally {
        res.end();
    }
});

app.post('/api/admin/approve/:id', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Missing ID' });

    APPROVED_IDS.add(id);
    saveApprovals(); // Persist
    log.info(`[ADMIN] Approved signal: ${id}`);

    res.json({ success: true, message: 'Signal approved', id });
});

// ============================================
// 🔗 API Routes
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/picks', picksRoutes);

// ============================================
// 📄 Page Routes
// ============================================
// ============================================
// 📄 Page Routes (Legacy Removed - API Only)
// ============================================
app.get('/', (req, res) => {
    res.json({
        message: 'GoalGPT Pro API is running 🚀',
        info: 'Frontend is hosted separately.',
        documentation: '/api/docs'
    });
});


// ============================================
// ⏰ Auto-Poll System
// ============================================
// ============================================
// ⏰ Auto-Poll System (MANUAL CONTROL)
// ============================================
let botInterval = null;
let isBotRunning = false;

function startPollingInterval() {
    if (isBotRunning) return false;

    log.success('🤖 Bot started (every 3 minutes)');
    isBotRunning = true;

    // Run immediately once
    processMatches().catch(e => log.error(e));

    botInterval = setInterval(async () => {
        const now = new Date();
        const hour = now.getUTCHours();

        if (hour >= 13 || hour < 0) {
            log.info('Scheduled poll (Turkey: 16:00-03:00)...');
            await processMatches();
        } else {
            log.info(`Outside active hours (TR 16:00-03:00, current UTC: ${hour}:xx)`);
        }
    }, POLL_INTERVAL);

    return true;
}

function stopPollingInterval() {
    if (!isBotRunning) return false;

    if (botInterval) {
        clearInterval(botInterval);
        botInterval = null;
    }
    isBotRunning = false;
    log.warn('🛑 Bot stopped by admin');
    return true;
}

// Routes for Bot Control
app.get('/api/admin/bot/status', (req, res) => {
    res.json({ running: isBotRunning });
});

app.post('/api/admin/bot/start', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const started = startPollingInterval();
    res.json({ success: true, running: true, message: started ? 'Bot started' : 'Bot already running' });
});

app.post('/api/admin/bot/stop', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const stopped = stopPollingInterval();
    res.json({ success: true, running: false, message: stopped ? 'Bot stopped' : 'Bot already stopped' });
});

// ============================================
// 🤖 Auto-Settlement Job
// ============================================
async function runAutoSettlement() {
    log.info('🤖 Starting Auto-Settlement Check...');

    // 1. Get Pending Bets
    const pendingBets = await betTracker.getPendingBets();
    if (pendingBets.length === 0) {
        log.info('   ✨ No pending bets to settle.');
        return;
    }

    log.info(`   📋 Found ${pendingBets.length} pending bets. Checking results...`);

    // Group by match ID to save API calls
    const matchesToCheck = {};
    pendingBets.forEach(bet => {
        matchesToCheck[bet.api_fixture_id] = matchesToCheck[bet.api_fixture_id] || [];
        matchesToCheck[bet.api_fixture_id].push(bet);
    });

    for (const matchId of Object.keys(matchesToCheck)) {
        // Fetch LIVE details (or finished details)
        const details = await fetchMatchDetails(matchId);

        if (!details || !details.home_team || !details.away_team) {
            log.warn(`   ⚠️ Could not fetch details for match ${matchId} (skipping)`);
            continue;
        }

        const currentHome = parseInt(details.home_team.score) || 0;
        const currentAway = parseInt(details.away_team.score) || 0;
        const currentScore = `${currentHome}-${currentAway}`;
        const matchStatus = (details.status || '').toUpperCase(); // FINISHED, 1H, 2H, HT...
        const isFinished = matchStatus.includes('FINISHED') || matchStatus.includes('FT') || matchStatus.includes('AET');

        // Check each bet for this match
        for (const bet of matchesToCheck[matchId]) {
            const entryScoreStr = bet.entry_score || '0-0';
            const [entryHome, entryAway] = entryScoreStr.split('-').map(s => parseInt(s) || 0);

            // LOGIC:
            // WON IF: Current Total Goals > Entry Total Goals
            // LOST IF: Match Finished AND Current Total Goals == Entry Total Goals

            const entryTotal = entryHome + entryAway;
            const currentTotal = currentHome + currentAway;

            if (currentTotal > entryTotal) {
                // Goal scored! It's a WIN (Result: Over X.5 usually)
                await betTracker.updateBetStatus(bet.id, 'WON', currentScore);
                log.success(`   💰 WON: ${bet.match} (Entry: ${entryScoreStr} -> Now: ${currentScore})`);
            } else if (isFinished) {
                // Match over, no new goals -> LOSS
                await betTracker.updateBetStatus(bet.id, 'LOST', currentScore);
                log.warn(`   ❌ LOST: ${bet.match} (Finished at ${currentScore})`);
            }
        }
    }
}

// Start Auto-Settlement (Every 20 minutes)
setInterval(runAutoSettlement, 20 * 60 * 1000);

// ============================================
// 🚀 Server Startup
// ============================================

// ============================================
// 💰 Crypto Payment System
// ============================================

const PAYMENTS_FILE = path.join(__dirname, 'data', 'payments.json');

// Crypto wallet addresses (configure in .env)
const CRYPTO_WALLETS = {
    USDT_TRC20: process.env.WALLET_USDT_TRC20 || 'TYourUSDTWalletAddress',
    BTC: process.env.WALLET_BTC || 'bc1yourbccaddress',
    ETH: process.env.WALLET_ETH || '0xYourETHAddress'
};

// Payment prices in USD
const PAYMENT_PRICES = {
    monthly: { amount: 15, currency: 'USD', plan: 'pro', days: 30 },
    yearly: { amount: 120, currency: 'USD', plan: 'pro', days: 365 }
};

function loadPayments() {
    try {
        if (fs.existsSync(PAYMENTS_FILE)) {
            return JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf-8'));
        }
    } catch (e) { console.error('[Payments] Load error:', e); }
    return [];
}

function savePayments(payments) {
    try {
        fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2));
    } catch (e) { console.error('[Payments] Save error:', e); }
}

// Get wallet addresses
app.get('/api/payments/wallets', requireAuth, (req, res) => {
    res.json({
        success: true,
        wallets: CRYPTO_WALLETS,
        prices: PAYMENT_PRICES
    });
});

// Create payment request
app.post('/api/payments/create', requireAuth, (req, res) => {
    const { planType, cryptoType, txHash } = req.body; // planType: 'monthly' | 'yearly'

    if (!planType || !PAYMENT_PRICES[planType]) {
        return res.status(400).json({ success: false, error: 'Invalid plan type' });
    }

    const payments = loadPayments();
    const price = PAYMENT_PRICES[planType];

    const payment = {
        id: Date.now().toString(),
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        planType,
        amount: price.amount,
        currency: price.currency,
        cryptoType: cryptoType || 'USDT_TRC20',
        txHash: txHash || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        confirmedAt: null,
        confirmedBy: null
    };

    payments.push(payment);
    savePayments(payments);

    log.info(`[Payment] New payment request: ${req.user.email} - ${planType}`);

    res.json({ success: true, payment });
});

// Update transaction hash
app.post('/api/payments/update-tx/:id', requireAuth, (req, res) => {
    const { txHash } = req.body;
    const payments = loadPayments();
    const payment = payments.find(p => p.id === req.params.id && p.userId === req.user.id);

    if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    payment.txHash = txHash;
    savePayments(payments);

    res.json({ success: true, payment });
});

// Get user's payments
app.get('/api/payments/my', requireAuth, (req, res) => {
    const payments = loadPayments();
    const userPayments = payments.filter(p => p.userId === req.user.id);
    res.json({ success: true, payments: userPayments });
});

// Admin: Get pending payments
app.get('/api/payments/pending', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const payments = loadPayments();
    const pending = payments.filter(p => p.status === 'pending');
    res.json({ success: true, payments: pending });
});

// Admin: Get all payments
app.get('/api/payments/all', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const payments = loadPayments();
    res.json({ success: true, payments });
});

// Admin: Confirm payment
app.post('/api/payments/confirm/:id', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const payments = loadPayments();
    const payment = payments.find(p => p.id === req.params.id);

    if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Payment already processed' });
    }

    // Calculate expiry date
    const price = PAYMENT_PRICES[payment.planType];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + price.days);

    // Update user plan
    try {
        await database.updateUserPlan(payment.userId, price.plan, expiresAt.toISOString());

        payment.status = 'confirmed';
        payment.confirmedAt = new Date().toISOString();
        payment.confirmedBy = req.user.email;
        savePayments(payments);

        log.success(`[Payment] Confirmed: ${payment.userEmail} -> PRO until ${expiresAt.toLocaleDateString()}`);

        res.json({ success: true, payment, message: 'Ödeme onaylandı, kullanıcı PRO yapıldı' });
    } catch (e) {
        log.error('[Payment] Confirm error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Admin: Reject payment
app.post('/api/payments/reject/:id', requireAuth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    const { reason } = req.body;
    const payments = loadPayments();
    const payment = payments.find(p => p.id === req.params.id);

    if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    payment.status = 'rejected';
    payment.rejectedAt = new Date().toISOString();
    payment.rejectedBy = req.user.email;
    payment.rejectReason = reason || 'Ödeme doğrulanamadı';
    savePayments(payments);

    log.warn(`[Payment] Rejected: ${payment.userEmail} - ${reason}`);

    res.json({ success: true, payment });
});



// Manual trigger auto-settlement
app.post('/api/settlement/run', requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }

    await autoSettlement.manualRun();
    res.json({ success: true, message: 'Settlement run triggered' });
});

// ============================================
// 🎯 Approved Bets API
// ============================================

// Get all approved bets
app.get('/api/bets', async (req, res) => {
    try {
        const bets = await approvedBets.getAllBets();
        res.json({ success: true, bets });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get pending bets only
app.get('/api/bets/pending', async (req, res) => {
    try {
        const bets = await approvedBets.getPendingBets();
        res.json({ success: true, bets });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get bets stats
app.get('/api/bets/stats', async (req, res) => {
    try {
        const stats = await approvedBets.getStats();
        res.json({ success: true, ...stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Approve a new bet
app.post('/api/bets/approve', requireAuth, async (req, res) => {
    console.log('[API] /api/bets/approve called with:', JSON.stringify(req.body).substring(0, 200));
    try {
        const result = await approvedBets.approveBet(req.body);
        console.log('[API] approveBet result:', JSON.stringify(result).substring(0, 200));
        res.json(result);
    } catch (err) {
        console.error('[API] approveBet error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Settle a bet
app.post('/api/bets/:betId/settle', requireAuth, async (req, res) => {
    try {
        const { status, resultScore } = req.body;
        const result = await approvedBets.settleBet(req.params.betId, status, resultScore);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete a bet
app.delete('/api/bets/:betId', requireAuth, async (req, res) => {
    try {
        const result = await approvedBets.deleteBet(req.params.betId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Clear all bets
app.delete('/api/bets', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    try {
        const result = await approvedBets.clearAllBets();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// 🧠 Training Pool API
// ============================================

// Get all training pool entries
app.get('/api/training-pool', async (req, res) => {
    try {
        const entries = await trainingPool.getAllEntries();
        const stats = await trainingPool.getStats();
        res.json({ success: true, entries, stats });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, entries: [], stats: {} });
    }
});

// Delete training pool entry
app.delete('/api/training-pool/:id', requireAuth, async (req, res) => {
    try {
        const result = await trainingPool.deleteEntry(req.params.id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Clear training pool
app.delete('/api/training-pool', requireAuth, async (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin only' });
    }
    try {
        const result = await trainingPool.clearPool();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// 🏀 NBA Props API
// ============================================
const nbaService = require('./nba/nbaService');

// Initialize NBA Redis (separate instance)
if (process.env.NBA_REDIS_URL) {
    nbaService.initNBARedis(process.env.NBA_REDIS_URL);
}

// Get today's NBA games
app.get('/api/nba/games', async (req, res) => {
    try {
        const result = await nbaService.getTodaysGames();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all NBA teams
app.get('/api/nba/teams', async (req, res) => {
    try {
        const result = await nbaService.getTeams();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get team roster
app.get('/api/nba/roster/:teamId', async (req, res) => {
    try {
        const result = await nbaService.getTeamRoster(parseInt(req.params.teamId));
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get player game logs
app.get('/api/nba/player/:playerId/logs', async (req, res) => {
    try {
        const lastN = parseInt(req.query.lastN) || 20;
        const result = await nbaService.getPlayerGameLogs(parseInt(req.params.playerId), lastN);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get player hit rates with custom lines
app.post('/api/nba/player/:playerId/hit-rates', async (req, res) => {
    try {
        const lines = req.body.lines || {};
        const lastN = parseInt(req.body.lastN) || 20;

        // First get game logs
        const logsResult = await nbaService.getPlayerGameLogs(parseInt(req.params.playerId), lastN);

        if (!logsResult.success) {
            return res.json(logsResult);
        }

        const result = await nbaService.getHitRatesWithLines(parseInt(req.params.playerId), lines, lastN);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Find player by name
app.get('/api/nba/player/search/:name', async (req, res) => {
    try {
        const result = await nbaService.findPlayerId(req.params.name);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// 🚀 Server Startup
// ============================================
function startBanner() {
    console.log(`
\x1b[1m\x1b[32m+==========================================+\x1b[0m
\x1b[1m\x1b[32m|     GoalGPT Pro v3.0 - SaaS Platform    |\x1b[0m
\x1b[1m\x1b[32m|     Auth + Admin + Subscriptions        |\x1b[0m
\x1b[1m\x1b[32m+==========================================+\x1b[0m
`);
}

// ============================================
// 🌐 SPA Fallback / 404 Handler (MUST BE LAST)
// ============================================
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // For local dev convenience, if frontend build exists, serve it
    const frontendIndex = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
    if (fs.existsSync(frontendIndex)) {
        return res.sendFile(frontendIndex);
    }

    res.status(404).json({ error: 'Not Found. This is the API Backend.' });
});

app.listen(PORT, async () => {
    startBanner();
    await initDatabase();
    log.info(`Database: Turso/LibSQL initialized`);
    log.info(`Auth: JWT + Cookie sessions`);
    log.info(`API Provider: Flashscore4 (RapidAPI)`);
    log.info(`AI Provider: Google Gemini`);
    log.info(`Security: Helmet + Rate Limiting enabled`);
    log.success(`Server running on http://localhost:${PORT}`);

    // Start Services
    autoSettlement.startScheduler();
    log.info(`Auto-Settlement: Scheduler started (every 15 min)`);

    // Initialize Vector DB
    const vectorDB = require('./vectorDB');
    const connected = await vectorDB.initVectorDB();
    if (connected) {
        const stats = await vectorDB.getStats();
        log.info(`Vector DB: Connected (${stats.totalVectors} vectors)`);
    } else {
        log.warn(`Vector DB: Not configured (set PINECONE_API_KEY and PINECONE_HOST)`);
    }
});
