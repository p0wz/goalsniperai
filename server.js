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
// 🧠 LIVE GOAL PROBABILITY ENGINE (v2.0)
// ============================================
// Replaces simple "Momentum" triggers with a sophisticated
// Pressure Index system that calculates goal probability.

const PRESSURE_WEIGHTS = {
    SHOT_ON_TARGET: 15,
    SHOT_OFF_TARGET: 5,
    CORNER: 8,
    DANGEROUS_ATTACK: 1,
    POSSESSION_BONUS: 10, // If possession > 65%
    XG_MULTIPLIER: 20     // xG * this value
};

const PROBABILITY_MAP = [
    { maxScore: 30, minProb: 10, maxProb: 20, stars: 1 },
    { maxScore: 60, minProb: 40, maxProb: 55, stars: 2 },
    { maxScore: 100, minProb: 60, maxProb: 75, stars: 3 },
    { maxScore: 150, minProb: 75, maxProb: 85, stars: 4 },
    { maxScore: Infinity, minProb: 85, maxProb: 95, stars: 5 }
];

function calculateGoalProbability(match, liveStats, elapsed, matchId = null) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const odds = match.odds || { '1': 2.0, '2': 2.0, 'X': 3.0 };
    const homeOdds = parseFloat(odds['1']) || 2.0;
    const awayOdds = parseFloat(odds['2']) || 2.0;

    // === 1. CALCULATE PRESSURE SCORES (Per Team) ===
    const homeSoT = liveStats?.shotsOnTarget?.home || 0;
    const awaySoT = liveStats?.shotsOnTarget?.away || 0;
    const homeShots = liveStats?.shots?.home || 0;
    const awayShots = liveStats?.shots?.away || 0;
    const homeCorners = liveStats?.corners?.home || 0;
    const awayCorners = liveStats?.corners?.away || 0;
    const homeDA = liveStats?.dangerousAttacks?.home || 0;
    const awayDA = liveStats?.dangerousAttacks?.away || 0;
    const homePoss = liveStats?.possession?.home || 50;
    const awayPoss = liveStats?.possession?.away || 50;
    const homexG = liveStats?.xG?.home || 0;
    const awayxG = liveStats?.xG?.away || 0;
    const homeRed = liveStats?.redCards?.home || 0;
    const awayRed = liveStats?.redCards?.away || 0;

    // Helper to calculate pressure from stats object
    const calcPressure = (stats) => {
        const sot = (stats?.shotsOnTarget?.home || 0) + (stats?.shotsOnTarget?.away || 0);
        const shots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
        const corners = (stats?.corners?.home || 0) + (stats?.corners?.away || 0);
        const da = (stats?.dangerousAttacks?.home || 0) + (stats?.dangerousAttacks?.away || 0);
        const xg = (stats?.xG?.home || 0) + (stats?.xG?.away || 0);
        return (sot * 15) + ((shots - sot) * 5) + (corners * 8) + (da * 1) + (xg * 20);
    };

    // Base Pressure = Weighted sum of stats
    let homePressure = (homeSoT * PRESSURE_WEIGHTS.SHOT_ON_TARGET) +
        ((homeShots - homeSoT) * PRESSURE_WEIGHTS.SHOT_OFF_TARGET) +
        (homeCorners * PRESSURE_WEIGHTS.CORNER) +
        (homeDA * PRESSURE_WEIGHTS.DANGEROUS_ATTACK) +
        (homexG * PRESSURE_WEIGHTS.XG_MULTIPLIER);

    let awayPressure = (awaySoT * PRESSURE_WEIGHTS.SHOT_ON_TARGET) +
        ((awayShots - awaySoT) * PRESSURE_WEIGHTS.SHOT_OFF_TARGET) +
        (awayCorners * PRESSURE_WEIGHTS.CORNER) +
        (awayDA * PRESSURE_WEIGHTS.DANGEROUS_ATTACK) +
        (awayxG * PRESSURE_WEIGHTS.XG_MULTIPLIER);

    // Possession Bonus (if dominant)
    if (homePoss >= 65) homePressure += PRESSURE_WEIGHTS.POSSESSION_BONUS;
    if (awayPoss >= 65) awayPressure += PRESSURE_WEIGHTS.POSSESSION_BONUS;

    // === 2. CONTEXT MULTIPLIERS ===
    const contextFactors = [];

    // 2a. Favorite Losing (Desperation Mode)
    const isHomeFavorite = homeOdds < 1.50;
    const isAwayFavorite = awayOdds < 1.50;
    const isHomeLosing = homeScore < awayScore;
    const isAwayLosing = awayScore < homeScore;

    if (isHomeFavorite && isHomeLosing) {
        homePressure *= 1.5;
        contextFactors.push('🔥 Home FAV chasing');
    }
    if (isAwayFavorite && isAwayLosing) {
        awayPressure *= 1.5;
        contextFactors.push('🔥 Away FAV chasing');
    }

    // 2b. Red Card Advantage
    if (awayRed > 0 && homeRed === 0) {
        homePressure *= 1.3;
        contextFactors.push('🟥 Away Red Card');
    }
    if (homeRed > 0 && awayRed === 0) {
        awayPressure *= 1.3;
        contextFactors.push('🟥 Home Red Card');
    }

    // 2c. "Kill Zone" Time Bonus (70-85 mins)
    let timeBonus = 0;
    if (elapsed >= 70 && elapsed <= 85) {
        timeBonus = 10;
        contextFactors.push('⏱️ Kill Zone (70-85)');
    }

    // === 2d. MOMENTUM DELTA (Rising Pressure Detection) ===
    let momentumBonus = 0;
    let pressureDelta = 0;
    const currentScore = `${homeScore}-${awayScore}`;

    if (matchId) {
        const history = getMatchHistory(matchId);
        if (history.length >= 2) {
            // Get oldest snapshot in history (typically ~6-12 mins ago)
            const oldSnapshot = history[0];

            // ⚽ GOAL RESET CHECK: If score changed, pressure was "consumed" by a goal
            if (oldSnapshot.score !== currentScore) {
                // Score changed - don't give momentum bonus, the pressure already converted
                contextFactors.push('⚽ Goal Reset (Score Changed)');
                // Reset momentum bonus to 0
            } else {
                // Score same - calculate pressure delta normally
                const oldPressure = calcPressure(oldSnapshot.stats);
                const currentPressure = calcPressure(liveStats);
                pressureDelta = currentPressure - oldPressure;

                // If pressure increased by 30+ points in last ~10 mins = "Rising Pressure"
                if (pressureDelta >= 30) {
                    momentumBonus = 15;
                    contextFactors.push(`📈 Rising Pressure (+${Math.round(pressureDelta)})`);
                } else if (pressureDelta >= 15) {
                    momentumBonus = 8;
                    contextFactors.push(`📈 Momentum (+${Math.round(pressureDelta)})`);
                }
            }
        }
    }

    // === 3. DETERMINE DOMINANT TEAM ===
    const totalPressure = homePressure + awayPressure;
    let dominantTeam = 'Balanced';
    let dominantPressure = Math.max(homePressure, awayPressure);

    if (homePressure > awayPressure * 1.5) {
        dominantTeam = 'Home';
    } else if (awayPressure > homePressure * 1.5) {
        dominantTeam = 'Away';
    }

    // === 4. MAP PRESSURE TO PROBABILITY ===
    let probabilityPercent = 10;
    let confidenceStars = 1;

    for (const bracket of PROBABILITY_MAP) {
        if (dominantPressure <= bracket.maxScore) {
            // Linear interpolation within bracket
            const rangeSize = bracket.maxScore === Infinity ? 50 : bracket.maxScore - (PROBABILITY_MAP[PROBABILITY_MAP.indexOf(bracket) - 1]?.maxScore || 0);
            const positionInRange = dominantPressure - (PROBABILITY_MAP[PROBABILITY_MAP.indexOf(bracket) - 1]?.maxScore || 0);
            const ratio = Math.min(positionInRange / rangeSize, 1);
            probabilityPercent = Math.round(bracket.minProb + (bracket.maxProb - bracket.minProb) * ratio);
            confidenceStars = bracket.stars;
            break;
        }
    }

    // Add time bonus and momentum bonus
    probabilityPercent = Math.min(probabilityPercent + timeBonus + momentumBonus, 95);

    // === 5. BUILD REASON STRING ===
    const statsBreakdown = [];
    if (dominantTeam === 'Home') {
        if (homeSoT > 0) statsBreakdown.push(`${homeSoT} SoT`);
        if (homeCorners > 0) statsBreakdown.push(`${homeCorners} Corners`);
        if (homexG > 0) statsBreakdown.push(`${homexG.toFixed(2)} xG`);
    } else if (dominantTeam === 'Away') {
        if (awaySoT > 0) statsBreakdown.push(`${awaySoT} SoT`);
        if (awayCorners > 0) statsBreakdown.push(`${awayCorners} Corners`);
        if (awayxG > 0) statsBreakdown.push(`${awayxG.toFixed(2)} xG`);
    } else {
        statsBreakdown.push(`Balanced (H:${Math.round(homePressure)} / A:${Math.round(awayPressure)})`);
    }

    const reason = [
        `Pressure Index: ${Math.round(dominantPressure)}`,
        statsBreakdown.join(', '),
        ...contextFactors
    ].filter(Boolean).join(' | ');

    // === 6. RECOMMENDED MARKET ===
    let recommendedMarket = 'Next Goal Any';
    if (dominantTeam === 'Home' && homePressure > 60) {
        recommendedMarket = 'Next Goal Home';
    } else if (dominantTeam === 'Away' && awayPressure > 60) {
        recommendedMarket = 'Next Goal Away';
    } else if (totalPressure > 80) {
        recommendedMarket = 'Over 0.5 in Next 15 Mins';
    }

    return {
        probabilityPercent,
        confidenceStars,
        dominantTeam,
        homePressure: Math.round(homePressure),
        awayPressure: Math.round(awayPressure),
        reason,
        recommendedMarket,
        contextFactors,
        stats: {
            homeSoT, awaySoT, homeCorners, awayCorners, homexG, awayxG
        }
    };
}

// ============================================
// 🧬 HYBRID ANALYSIS ENGINE v1.0
// ============================================
// Combines Live Pressure (60%) + Historical Context (40%)
// for higher accuracy signal generation.

// Historical Trend Bonus Points
const HISTORICAL_BONUSES = {
    SECOND_HALF_TEAM: 15,      // Team scores >60% of goals in 2nd half
    HOME_STRONG: 10,           // Home team >70% W/D at home
    HIGH_SCORING_H2H: 10,      // H2H avg > 2.5 goals
    H2H_DOMINANCE: 10,         // Won 3/5 last meetings
    LATE_CONCEDING: 15,        // Defender concedes late often
    FORM_MOMENTUM: 10          // Won last 3 games
};

// Weights for final calculation
const LAYER_WEIGHTS = {
    LIVE: 0.60,    // 60% weight for live pressure
    HISTORY: 0.40  // 40% weight for historical data
};

// Fetch H2H / Team Stats for a match (Lazy Loading)
async function fetchH2HData(matchId) {
    try {
        const response = await axios.get(`https://flashscore4.p.rapidapi.com/api/flashscore/v1/match/h2h/${matchId}`, {
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
            },
            timeout: 5000
        });
        dailyRequestCount++;
        return response.data;
    } catch (error) {
        log.warn(`[H2H] Failed to fetch H2H for ${matchId}: ${error.message}`);
        return null;
    }
}

// Calculate historical score based on trends
function calculateHistoricalScore(h2hData, dominantTeam, elapsed, homeTeam, awayTeam) {
    let score = 0;
    const tags = [];

    if (!h2hData) {
        return { score: 0, tags: ['NO_H2H_DATA'] };
    }

    try {
        const meetings = h2hData.matches || [];
        const homeStats = h2hData.homeTeamStats || {};
        const awayStats = h2hData.awayTeamStats || {};

        // 1. SECOND HALF TEAM CHECK (if >45 mins)
        if (elapsed > 45) {
            const secondHalfGoalRate = dominantTeam === 'Home'
                ? (homeStats.secondHalfGoalRate || 0)
                : (awayStats.secondHalfGoalRate || 0);

            if (secondHalfGoalRate > 60) {
                score += HISTORICAL_BONUSES.SECOND_HALF_TEAM;
                tags.push('2ND_HALF_TEAM');
            }
        }

        // 2. HOME STRONG CHECK
        if (dominantTeam === 'Home') {
            const homeWinDrawRate = homeStats.homeWinDrawRate || 0;
            if (homeWinDrawRate > 70) {
                score += HISTORICAL_BONUSES.HOME_STRONG;
                tags.push('HOME_FORTRESS');
            }
        }

        // 3. HIGH SCORING H2H CHECK
        if (meetings.length > 0) {
            const totalGoals = meetings.reduce((sum, m) => sum + (m.homeScore || 0) + (m.awayScore || 0), 0);
            const avgGoals = totalGoals / meetings.length;
            if (avgGoals > 2.5) {
                score += HISTORICAL_BONUSES.HIGH_SCORING_H2H;
                tags.push('HIGH_SCORING_H2H');
            }
        }

        // 4. H2H DOMINANCE CHECK (won 3/5 last meetings)
        if (meetings.length >= 5) {
            const last5 = meetings.slice(0, 5);
            const wins = last5.filter(m => {
                if (dominantTeam === 'Home') {
                    return (m.homeScore || 0) > (m.awayScore || 0);
                } else {
                    return (m.awayScore || 0) > (m.homeScore || 0);
                }
            }).length;
            if (wins >= 3) {
                score += HISTORICAL_BONUSES.H2H_DOMINANCE;
                tags.push('H2H_DOMINANCE');
            }
        }

        // 5. LATE CONCEDING TREND (Defender concedes after 75')
        if (elapsed >= 65) {
            const defender = dominantTeam === 'Home' ? awayStats : homeStats;
            const lateConcedingRate = defender.lateConcedingRate || 0;
            if (lateConcedingRate > 50) {
                score += HISTORICAL_BONUSES.LATE_CONCEDING;
                tags.push('LATE_CONCEDING_DEF');
            }
        }

        // 6. FORM MOMENTUM (Attacker won last 3)
        const attacker = dominantTeam === 'Home' ? homeStats : awayStats;
        if (attacker.lastResults && attacker.lastResults.slice(0, 3).every(r => r === 'W')) {
            score += HISTORICAL_BONUSES.FORM_MOMENTUM;
            tags.push('HOT_STREAK');
        }

    } catch (error) {
        log.warn(`[Historical] Calculation error: ${error.message}`);
        tags.push('CALC_ERROR');
    }

    return { score, tags };
}

// Generate AI Prompt with Narrative
function generateAIPrompt(matchInfo, liveAnalysis, historicalAnalysis, elapsed) {
    const { home, away, score, dominantTeam, homePressure, awayPressure } = matchInfo;
    const { contextFactors, reason } = liveAnalysis;
    const { tags } = historicalAnalysis;

    // Build narrative
    let narrative = '';
    const pressureTeam = dominantTeam === 'Home' ? home : away;
    const defenseTeam = dominantTeam === 'Home' ? away : home;
    const pressureIndex = dominantTeam === 'Home' ? homePressure : awayPressure;

    // Situation description
    if (contextFactors.includes('🔥 Home FAV chasing') || contextFactors.includes('🔥 Away FAV chasing')) {
        narrative = `${pressureTeam} (Pre-Match Favorite) is losing but generating EXTREME pressure (Index: ${pressureIndex}).`;
    } else if (contextFactors.includes('⏱️ Kill Zone (70-85)')) {
        narrative = `Match is in the "Kill Zone" (${elapsed}'). ${pressureTeam} is pushing hard with pressure index of ${pressureIndex}.`;
    } else {
        narrative = `${pressureTeam} is dominating with a pressure index of ${pressureIndex} against ${defenseTeam}.`;
    }

    // Historical context
    let historyContext = '';
    if (tags.includes('2ND_HALF_TEAM')) {
        historyContext += `Historically, ${pressureTeam} scores 60%+ of their goals in the 2nd half. `;
    }
    if (tags.includes('H2H_DOMINANCE')) {
        historyContext += `${pressureTeam} has won 3 of last 5 H2H meetings. `;
    }
    if (tags.includes('LATE_CONCEDING_DEF')) {
        historyContext += `${defenseTeam} tends to concede late in matches. `;
    }
    if (tags.includes('HOME_FORTRESS')) {
        historyContext += `${home} has >70% Win/Draw rate at home. `;
    }

    if (!historyContext) {
        historyContext = 'Limited historical data available for this fixture.';
    }

    // Final prompt
    return `You are an elite sports betting analyst. Analyze this live match situation:

**MATCH:** ${home} vs ${away}
**SCORE:** ${score}  |  **TIME:** ${elapsed}'
**LIVE PRESSURE:** ${reason}

**NARRATIVE:** ${narrative}

**HISTORICAL CONTEXT:** ${historyContext}

**QUESTION:** Based on the current live pressure AND historical trends, is a goal by ${pressureTeam} highly likely in the next 15 minutes?

**RESPOND WITH JSON ONLY:**
{
  "verdict": "PLAY" or "SKIP",
  "confidence": 60-95,
  "reason": "One sentence explanation"
}`;
}

// 🧬 MAIN HYBRID ANALYSIS FUNCTION
async function performDeepAnalysis(liveMatch, liveStats) {
    const matchId = liveMatch.match_id;
    const elapsed = parseElapsedTime(liveMatch.stage);
    const home = liveMatch.home_team?.name || 'Home';
    const away = liveMatch.away_team?.name || 'Away';
    const homeScore = liveMatch.home_team?.score || 0;
    const awayScore = liveMatch.away_team?.score || 0;
    const score = `${homeScore}-${awayScore}`;

    log.info(`[DeepAnalysis] Starting for ${home} vs ${away} (${score}, ${elapsed}')`);

    // ========================================
    // LAYER A: LIVE PRESSURE (60% Weight)
    // ========================================
    const livePressure = calculateGoalProbability(liveMatch, liveStats, elapsed, matchId);
    const livePressureScore = livePressure.probabilityPercent;
    const dominantTeam = livePressure.dominantTeam;
    const homePressure = livePressure.homePressure;
    const awayPressure = livePressure.awayPressure;

    log.info(`[DeepAnalysis] Live Pressure: ${livePressureScore}% (${dominantTeam})`);

    // If live pressure is too low, skip deep analysis
    if (livePressureScore < 50 || dominantTeam === 'Balanced') {
        log.info(`[DeepAnalysis] Skipped - Low pressure or balanced match`);
        return null;
    }

    // ========================================
    // LAYER B: HISTORICAL VALIDATION (DISABLED - No H2H endpoint)
    // ========================================
    // NOTE: Flashscore4 API doesn't have /match/h2h/ endpoint
    // H2H fetch is disabled until we find a valid API source
    // Currently using 100% Live Pressure + AI Validation
    log.info(`[DeepAnalysis] H2H disabled - using Live Pressure only`);

    const historical = { score: 0, tags: ['H2H_DISABLED'] };
    const historicalScoreNormalized = 0;

    // ========================================
    // SYNTHESIS: FINAL CONFIDENCE SCORE
    // ========================================
    // Since H2H is disabled, use 100% Live Pressure
    let totalConfidence = Math.round(livePressureScore);

    // Cap at 95%
    totalConfidence = Math.min(totalConfidence, 95);

    log.success(`[DeepAnalysis] Total Confidence: ${totalConfidence}% (Live Pressure Only)`);

    // ========================================
    // AI PROMPT GENERATION
    // ========================================
    const matchInfo = {
        home, away, score,
        dominantTeam,
        homePressure,
        awayPressure
    };
    const aiPrompt = generateAIPrompt(matchInfo, livePressure, historical, elapsed);

    // ========================================
    // BUILD OUTPUT OBJECT
    // ========================================
    const strategyCode = dominantTeam === 'Home' ? 'NEXT_GOAL_HOME' : 'NEXT_GOAL_AWAY';
    const marketRecommendation = dominantTeam === 'Home' ? 'Next Goal Home' : 'Next Goal Away';

    // Collect all tags
    const allTags = [...livePressure.contextFactors, ...historical.tags].filter(t =>
        typeof t === 'string' && !t.includes('Pressure Index')
    ).map(t => t.replace(/[^\w\s]/g, '').trim().toUpperCase().replace(/\s+/g, '_'));

    return {
        signal_id: `${matchId}_${strategyCode}`,
        match_info: {
            home,
            away,
            score,
            time: `${elapsed}'`,
            league: liveMatch.league_name || 'Unknown',
            country: liveMatch.country_name || ''
        },
        analysis: {
            live_pressure_score: livePressureScore,
            historical_score: Math.round(historicalScoreNormalized),
            total_confidence: totalConfidence,
            dominant_team: dominantTeam,
            home_pressure: homePressure,
            away_pressure: awayPressure,
            tags: allTags.slice(0, 6) // Max 6 tags
        },
        ai_prompt: aiPrompt,
        verdict: 'PENDING_AI',
        market_recommendation: marketRecommendation,
        strategy_code: strategyCode,
        live_stats: livePressure.stats,
        h2h_available: !!h2hData
    };
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

            // 🔴 RED CARD NOW HANDLED BY PROBABILITY ENGINE (advantage context)
            // No longer skip - the engine gives +30% to the team with advantage

            // 💰 FETCH ODDS (Required for Context Multipliers)
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

            // Record stats to history for delta tracking
            recordMatchStats(matchId, stats, score);

            // STEP 2: INITIAL PRESSURE SCREENING (Quick Check)
            const probability = calculateGoalProbability(match, stats, elapsed, matchId);
            log.info(`      🧠 Initial Pressure: ${probability.probabilityPercent}% (${probability.confidenceStars}⭐) - ${probability.dominantTeam}`);

            // Skip if initial pressure is too low (The Radar threshold: 50%)
            if (probability.probabilityPercent < 50 || probability.dominantTeam === 'Balanced') {
                log.info(`      ⏸️ Below radar threshold (Need 50%+ for Deep Analysis)`);
                continue;
            }

            // =================================================
            // 🧬 HYBRID ANALYSIS ENGINE - DEEP DIVE
            // =================================================
            log.info(`      🧬 TRIGGERING DEEP ANALYSIS...`);

            const deepAnalysis = await performDeepAnalysis(match, stats);

            if (!deepAnalysis) {
                log.info(`      ⏸️ Deep Analysis returned null - skipping`);
                continue;
            }

            log.info(`      📊 Hybrid Result: ${deepAnalysis.analysis.total_confidence}% (Live: ${deepAnalysis.analysis.live_pressure_score}% | History: ${deepAnalysis.analysis.historical_score}%)`);
            log.info(`      🏷️ Tags: ${deepAnalysis.analysis.tags.join(', ')}`);

            // STEP 3: FINAL FILTER - Only high confidence signals (65%+ hybrid confidence)
            if (deepAnalysis.analysis.total_confidence < 65) {
                log.info(`      ⏸️ Hybrid confidence too low (Need 65%+ after H2H validation)`);
                continue;
            }

            // =================================================
            // STEP 4: AI VALIDATION (Final Gate)
            // =================================================
            log.info(`      🤖 Sending to AI for final validation...`);

            let aiVerdict = { verdict: 'PLAY', confidence: deepAnalysis.analysis.total_confidence, reason: 'AI bypassed - using hybrid score' };

            try {
                const aiResponse = await askAIAnalyst(deepAnalysis.ai_prompt, 'live');

                if (aiResponse && aiResponse.verdict) {
                    aiVerdict = aiResponse;
                    log.info(`      🤖 AI Response: ${aiResponse.verdict} (${aiResponse.confidence}%) - ${aiResponse.reason}`);

                    // AI must say PLAY with 70%+ confidence
                    if (aiResponse.verdict !== 'PLAY' || aiResponse.confidence < 70) {
                        log.info(`      ⏸️ AI rejected signal (Need PLAY with 70%+)`);
                        continue;
                    }
                } else {
                    log.warn(`      ⚠️ AI returned invalid response - using hybrid verdict`);
                }
            } catch (aiError) {
                log.warn(`      ⚠️ AI validation failed: ${aiError.message} - using hybrid verdict`);
            }

            // Check daily signal limit
            const strategyCode = deepAnalysis.strategy_code;

            if (!checkSignalLimit(matchId, strategyCode)) {
                log.warn(`      🔒 Signal limit reached for ${matchId}_${strategyCode}`);
                continue;
            }

            // Build candidate signal (enhanced with hybrid data + AI verdict)
            const candidate = {
                id: deepAnalysis.signal_id,
                home: deepAnalysis.match_info.home,
                away: deepAnalysis.match_info.away,
                homeLogo: match.home_team?.image_path || '',
                awayLogo: match.away_team?.image_path || '',
                score: deepAnalysis.match_info.score,
                elapsed,
                strategy: deepAnalysis.market_recommendation,
                strategyCode,
                phase: elapsed <= 45 ? 'First Half' : 'Second Half',
                confidence: aiVerdict.confidence >= 85 ? 'HIGH' :
                    aiVerdict.confidence >= 70 ? 'MEDIUM' : 'LOW',
                confidencePercent: aiVerdict.confidence,
                verdict: 'PLAY', // Passed all 3 gates: Momentum + H2H + AI
                reason: `Live: ${deepAnalysis.analysis.live_pressure_score}% → H2H: ${deepAnalysis.analysis.historical_score}% → AI: ${aiVerdict.confidence}% | ${aiVerdict.reason || ''}`,
                dominantTeam: deepAnalysis.analysis.dominant_team,
                homePressure: deepAnalysis.analysis.home_pressure,
                awayPressure: deepAnalysis.analysis.away_pressure,
                // Deep Analysis extras
                analysis: deepAnalysis.analysis,
                aiAnalysis: aiVerdict, // AI response
                ai_prompt: deepAnalysis.ai_prompt, // For admin review
                h2h_available: deepAnalysis.h2h_available,
                stats: {
                    shots: stats.shots.home + stats.shots.away,
                    shots_on_target: stats.shotsOnTarget.home + stats.shotsOnTarget.away,
                    corners: stats.corners.home + stats.corners.away,
                    xG: ((stats.xG?.home || 0) + (stats.xG?.away || 0)).toFixed(2),
                    possession: `${stats.possession?.home || 50}%-${stats.possession?.away || 50}%`,
                    homeOdds: (match.odds['1'] || 2.0).toFixed(2),
                    awayOdds: (match.odds['2'] || 2.0).toFixed(2)
                },
                league: deepAnalysis.match_info.league,
                leagueLogo: match.league_logo || '',
                country: deepAnalysis.match_info.country
            };

            log.success(`      ✅ FINAL SIGNAL: Live ${deepAnalysis.analysis.live_pressure_score}% → H2H ${deepAnalysis.analysis.historical_score}% → AI ${aiVerdict.confidence}%`);
            signals.push(candidate);

            // Record signal for daily limit tracking
            recordSignal(matchId, strategyCode);

            // Auto-approve live signals
            APPROVED_IDS.add(candidate.id);

            // 📝 Record bet to history
            await betTracker.recordBet({
                match_id: matchId,
                home_team: deepAnalysis.match_info.home,
                away_team: deepAnalysis.match_info.away
            }, deepAnalysis.market_recommendation, strategyCode, deepAnalysis.analysis.total_confidence, 'live_hybrid', candidate.score);

            // Send Telegram notification
            await sendTelegramNotification(candidate);

            // Small delay between API calls
            await new Promise(r => setTimeout(r, 200));
        } else {
            log.warn(`      ⚠️ Could not fetch stats for this match`);
            continue; // Skip if no stats
        }
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
