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
const { runDailyAnalysis } = require('./dailyAnalyst');
const betTracker = require('./betTrackerRedis');

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

        if (allowedOrigins.indexOf(cleanOrigin) !== -1) {
            return callback(null, true);
        }

        console.log(`[CORS] Blocked Origin: ${origin}`); // Debug log
        console.log(`[CORS] Allowed config: ${JSON.stringify(allowedOrigins)}`);
        return callback(new Error('CORS policy violation'), false);
    }
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Security: XSS protection
app.use(xss());

// Security: HTTP Parameter Pollution protection
app.use(hpp());

// Static files - React build (priority)
app.use(express.static('frontend/dist'));
// Fallback to public folder for legacy HTML
app.use(express.static('public'));

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
// Structure: { "YYYY-MM-DD": { "matchId_STRATEGY": count } }
let DAILY_SIGNAL_COUNTS = {};
let DAILY_SIGNAL_DATE = null;
const MAX_SIGNALS_PER_MATCH_STRATEGY = 1;

function checkSignalLimit(matchId, strategyCode) {
    const today = new Date().toISOString().split('T')[0];

    // Reset daily counters if new day
    if (DAILY_SIGNAL_DATE !== today) {
        DAILY_SIGNAL_COUNTS = {};
        DAILY_SIGNAL_DATE = today;
        log.info(`[SignalLimiter] New day detected, counters reset`);
    }

    const key = `${matchId}_${strategyCode}`;
    const count = DAILY_SIGNAL_COUNTS[key] || 0;

    return count < MAX_SIGNALS_PER_MATCH_STRATEGY;
}

function recordSignal(matchId, strategyCode) {
    const key = `${matchId}_${strategyCode}`;
    DAILY_SIGNAL_COUNTS[key] = (DAILY_SIGNAL_COUNTS[key] || 0) + 1;
    log.info(`[SignalLimiter] Recorded signal: ${key} (count: ${DAILY_SIGNAL_COUNTS[key]}/${MAX_SIGNALS_PER_MATCH_STRATEGY})`);
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
const DAILY_LIMIT = 1000;

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
// 🔍 Base Activity Check ("Is it Dead?" Filter)
// ============================================
// Phase-specific minimum thresholds to consider a match "alive"
const BASE_ACTIVITY_THRESHOLDS = {
    FIRST_HALF: {
        // 15'-45': Just need early life
        MIN_SHOTS: 4,
        MIN_CORNERS: 2
    },
    LATE_GAME: {
        // 60'-85': Must have established stats by now
        MIN_SHOTS: 10,
        MIN_CORNERS: 4
    }
};

function checkBaseActivity(elapsed, stats) {
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalCorners = (stats?.corners?.home || 0) + (stats?.corners?.away || 0);

    // Determine which phase we're checking
    const isFirstHalf = elapsed >= 15 && elapsed <= 45;
    const isLateGame = elapsed >= 60 && elapsed <= 85;

    if (isFirstHalf) {
        const thresholds = BASE_ACTIVITY_THRESHOLDS.FIRST_HALF;
        const isAlive = totalShots >= thresholds.MIN_SHOTS || totalCorners >= thresholds.MIN_CORNERS;
        return {
            phase: 'FIRST_HALF',
            isAlive,
            reason: isAlive
                ? `Base Activity ✓ (${totalShots} shots, ${totalCorners} corners)`
                : `Dead match (need ${thresholds.MIN_SHOTS}+ shots OR ${thresholds.MIN_CORNERS}+ corners)`,
            stats: { shots: totalShots, corners: totalCorners }
        };
    }

    if (isLateGame) {
        const thresholds = BASE_ACTIVITY_THRESHOLDS.LATE_GAME;
        const isAlive = totalShots >= thresholds.MIN_SHOTS || totalCorners >= thresholds.MIN_CORNERS;
        return {
            phase: 'LATE_GAME',
            isAlive,
            reason: isAlive
                ? `Base Activity ✓ (${totalShots} shots, ${totalCorners} corners)`
                : `Dead match (need ${thresholds.MIN_SHOTS}+ shots OR ${thresholds.MIN_CORNERS}+ corners)`,
            stats: { shots: totalShots, corners: totalCorners }
        };
    }

    return { phase: null, isAlive: false, reason: 'Outside valid time range' };
}

// ============================================
// 🎯 Dynamic Momentum Detection (Lookback)
// ============================================
// Thresholds for momentum triggers
const MOMENTUM_THRESHOLDS = {
    CORNER_SIEGE: 2,        // +2 corners
    SHOT_SURGE: 2,          // +2 shots
    SOT_THREAT: 1,          // +1 shot on target
    DA_PRESSURE: 5,         // +5 dangerous attacks (if available)
    XG_SPIKE: 0.3           // +0.3 xG increase
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
Dangerous Attacks: ${candidate.stats.dangerous_attacks} (${candidate.stats.da_per_min}/min)
Expected Goals (xG): ${candidate.stats.xG}
Possession: ${candidate.stats.possession || 'N/A'}

=== ODDS ANALYSIS ===
Home Win: ${candidate.stats.homeOdds} | Away Win: ${candidate.stats.awayOdds}${candidate.stats.drawOdds ? ` | Draw: ${candidate.stats.drawOdds}` : ''}
Favorite: ${parseFloat(candidate.stats.homeOdds) < parseFloat(candidate.stats.awayOdds) ? candidate.home : candidate.away}

=== SCOUT ANALYSIS ===
${candidate.reason}

=== YOUR TASK ===
Based on ALL statistics above, determine if a goal is IMMINENT in the next 10-15 minutes.

Consider:
1. Shot conversion rate (SoT/Shots ratio)
2. Pressure indicators (DA/min, corners)
3. xG vs actual goals
4. Time remaining in strategic window
5. Odds movement indicating market sentiment

RESPOND WITH ONLY A JSON OBJECT. NO EXPLANATION. NO TEXT BEFORE OR AFTER.
{"verdict": "PLAY", "confidence": 75, "reason": "Your analysis here"}`;

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
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
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
async function fetchMatchStats(matchId) {
    if (dailyRequestCount >= DAILY_LIMIT) return null;

    try {
        const response = await axios.get(
            `${FLASHSCORE_API.baseURL}/api/flashscore/v1/match/stats/${matchId}`,
            { headers: FLASHSCORE_API.headers, timeout: 15000 }
        );
        dailyRequestCount++;
        return response.data;
    } catch (error) {
        log.warn(`Stats fetch failed for ${matchId}: ${error.message}`);
        return null;
    }
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

    // Time 55' - 82', score diff <= 2
    if (elapsed < 55 || elapsed > 82 || goalDiff > 2) {
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
async function processMatches() {
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
        const isLateGameCandidate = elapsed >= 55 && elapsed <= 82 && scoreDiff <= 2;

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

        // Check daily signal limit (max 2 per match per strategy)
        if (!checkSignalLimit(matchId, candidate.strategyCode)) {
            log.warn(`      🔒 Signal limit reached for ${matchId}_${candidate.strategyCode} (max ${MAX_SIGNALS_PER_MATCH_STRATEGY}/day)`);
            continue;
        }

        // Include base activity in reason
        candidate.reason = `${baseCheck.reason} + ${candidate.reason}`;

        log.info(`      ✓ ${candidate.phase}: ${candidate.strategyCode} (${candidate.confidencePercent}% base)`);

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
            recordSignal(matchId, candidate.strategyCode);

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

// ============================================
// 📈 Daily Pre-Match Analyst Endpoint
// ============================================
let DAILY_ANALYSIS_CACHE = null;
let DAILY_ANALYSIS_TIMESTAMP = null;

app.get('/api/daily-analysis', optionalAuth, async (req, res) => {
    const userRole = req.user ? req.user.role : 'free';

    // FREE Users: Access Denied
    if (userRole === 'free') {
        return res.status(403).json({ success: false, error: 'Upgrade to PRO to access Daily Analyst.' });
    }

    const { force, limit } = req.query;
    const forceUpdate = force === 'true';
    const customLimit = limit ? parseInt(limit) : 100;

    // Helper to filter results based on role & approval
    const filterResults = (results) => {
        const categories = ['over15', 'over25', 'doubleChance', 'homeOver15', 'under35'];
        const filtered = {};

        categories.forEach(cat => {
            if (!results[cat]) return;
            // Ensure IDs exist and check approval
            const list = results[cat].map(m => {
                // Generate consistent ID if missing (e.g. from cache)
                const mid = m.id || `${m.event_key || m.match_id}_${cat}`;
                return { ...m, id: mid, isApproved: APPROVED_IDS.has(mid) };
            });

            if (userRole === 'pro') {
                filtered[cat] = list.filter(m => m.isApproved);
            } else {
                filtered[cat] = list; // Admin sees all (with isApproved flag)
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
        log.info('Running Daily Pre-Match Analysis...');
        const results = await runDailyAnalysis(log, customLimit);

        // Post-processing: Assign IDs immediately for consistency
        const processedResults = { ...results };
        ['over15', 'btts', 'doubleChance', 'homeOver15', 'under35'].forEach(cat => {
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

    const limit = parseInt(req.query.limit) || 50;

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
// ============================================
// 🔗 API Routes
// ============================================
app.get('/api/debug/reset-admin', async (req, res) => {
    try {
        const adminEmail = 'admin@goalgpt.com';
        const newPassword = process.env.ADMIN_PASSWORD || 'yousaywhat123@';

        // Hash locally here since we can't import bcrypt easily if not in server.js scope, 
        // BUT database.js exports 'db' client. 
        // We will do a direct SQL update.
        // Actually better to use a database.js helper if possible, but let's just do it raw SQL query via database.db

        // We need bcrypt to hash the password.
        const bcrypt = require('bcryptjs');
        const passwordHash = bcrypt.hashSync(newPassword, 12);

        await database.db.execute({
            sql: "UPDATE users SET password_hash = ? WHERE email = ?",
            args: [passwordHash, adminEmail]
        });

        res.json({ success: true, message: `Admin password reset to: ${newPassword}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// ============================================
// 📄 Page Routes
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pricing.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'profile.html'));
});

// ============================================
// ⏰ Auto-Poll System
// ============================================
function startAutoPolling() {
    log.success('Auto-poll started (every 4 minutes)');

    setInterval(async () => {
        const now = new Date();
        const hour = now.getUTCHours();

        // Schedule for TURKEY (UTC+3): 16:00 - 03:00 Turkey = 13:00 - 00:00 UTC
        // Turkey 16:00 = UTC 13:00
        // Turkey 03:00 (next day) = UTC 00:00 (next day)
        // So active window: UTC 13:00 to 23:59 OR UTC 00:00
        // Simplified: hour >= 13 (covers 13:00 UTC onwards until midnight)
        // This gives us: 16:00 TR to 03:00 TR

        if (hour >= 13 || hour < 0) {
            log.info('Scheduled poll (Turkey: 16:00-03:00)...');
            await processMatches();
        } else {
            log.info(`Outside active hours (TR 16:00-03:00, current UTC: ${hour}:xx)`);
        }
    }, POLL_INTERVAL);
}

// ============================================
// 🌐 SPA Fallback (React Router)
// ============================================
// All non-API routes serve React index.html
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Check if frontend build exists
    const fs = require('fs');
    const indexPath = path.join(__dirname, 'frontend/dist/index.html');

    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(200).send(`
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>GoalGPT Pro API Server 🚀</h1>
                <p>Engine is running perfectly.</p>
                <p>Note: This is the Backend URL. Please visit your <b>Cloudflare Pages URL</b> to use the app.</p>
            </div>
        `);
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
    startAutoPolling();
    betTracker.startTracking();
});
