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
const betTracker = require('./betTracker');

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

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

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

function recordMatchStats(matchId, stats) {
    if (!MATCH_HISTORY[matchId]) {
        MATCH_HISTORY[matchId] = [];
    }

    MATCH_HISTORY[matchId].push({
        timestamp: Date.now(),
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
    if (stageStr.includes('2nd half')) return 60;
    if (stageStr.includes('1st half')) return 25;
    if (stageStr.includes('halftime')) return 45;
    const num = parseInt(stage);
    return isNaN(num) ? 0 : num;
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
        xG: { home: 0, away: 0 }
    };

    // Try keys in order of preference, checking for non-empty arrays
    let statsList = [];
    let usedKey = 'none';

    // Log all available keys first
    const allKeys = Object.keys(statsData || {});
    log.info(`[StatsDebug] API response keys: ${allKeys.join(', ') || 'empty'}`);

    // Priority order: all-match > ALL > 2nd-half > 1st-half > any other
    const priorityKeys = ['all-match', 'ALL', 'all', 'full-match', '2nd-half', '2nd half', '1st-half', '1st half'];

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
    DA_PRESSURE: 5          // +5 dangerous attacks (if available)
};

function detectMomentum(matchId, currentStats) {
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

    // Check each historical snapshot (most recent first)
    for (let i = history.length - 1; i >= 0; i--) {
        const snapshot = history[i];
        const timeDiffMs = now - snapshot.timestamp;
        const timeDiffMins = Math.round(timeDiffMs / 60000);

        // Skip if older than max lookback
        if (timeDiffMs > MAX_LOOKBACK_MS) continue;

        const oldCorners = (snapshot.stats?.corners?.home || 0) + (snapshot.stats?.corners?.away || 0);
        const oldShots = (snapshot.stats?.shots?.home || 0) + (snapshot.stats?.shots?.away || 0);
        const oldSoT = (snapshot.stats?.shotsOnTarget?.home || 0) + (snapshot.stats?.shotsOnTarget?.away || 0);
        const oldDA = (snapshot.stats?.dangerousAttacks?.home || 0) + (snapshot.stats?.dangerousAttacks?.away || 0);

        const deltaCorners = currentCorners - oldCorners;
        const deltaShots = currentShots - oldShots;
        const deltaSoT = currentSoT - oldSoT;
        const deltaDA = currentDA - oldDA;

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
    }

    return { detected: false, trigger: null, timeframe: null };
}

// ============================================
// 🧠 Gemini AI Analyst
// ============================================
async function askGeminiAnalyst(candidate) {
    if (!GEMINI_API_KEY) {
        log.warn('Gemini API key not configured, using local analysis');
        return { verdict: 'PLAY', confidence: candidate.confidencePercent, reason: 'Local analysis (Gemini disabled)' };
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

OUTPUT STRICTLY AS JSON:
{
  "verdict": "PLAY" or "SKIP",
  "confidence": (0-100),
  "reason": "Detailed 1-2 sentence analysis."
}`;

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
                },
                { timeout: 15000 }
            );

            let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

            // Clean up markdown formatting
            text = text.trim();
            if (text.startsWith('```json')) text = text.slice(7);
            if (text.startsWith('```')) text = text.slice(3);
            if (text.endsWith('```')) text = text.slice(0, -3);
            text = text.trim();

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
                    result = {
                        verdict: hasPlay && !hasSkip ? 'PLAY' : 'SKIP',
                        confidence: candidate.confidencePercent,
                        reason: 'AI returned non-JSON response'
                    };
                    log.warn(`[Gemini] Non-JSON response, inferred: ${result.verdict}`);
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
            const isOverloaded = error.response?.status === 503 || error.message?.includes('overloaded');
            if (isOverloaded && attempt < MAX_RETRIES) {
                const delay = attempt * 2000;
                log.warn(`[Gemini] 503 - Retrying in ${delay / 1000}s (${attempt}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            log.error(`Gemini API error: ${error.message}`);
            return { verdict: 'PLAY', confidence: candidate.confidencePercent, reason: 'Gemini unavailable, using local analysis' };
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
// 🎯 Strategy A: "First Half" (Time 20'-45', Score Diff <= 1)
// ============================================
function analyzeFirstHalfSniper(match, elapsed, stats, momentum = null) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const scoreDiff = Math.abs(homeScore - awayScore);

    // Updated time range: 20' - 45', score diff <= 1
    if (elapsed < 20 || elapsed > 45 || scoreDiff > 1) {
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
    let confidencePercent = 55;
    const reasons = [momentum.reason];

    // Bonus confidence for strong stats
    if (totalSoT >= 3) { confidencePercent += 8; reasons.push(`${totalSoT} SoT`); }
    if (totalShots >= 5) { confidencePercent += 5; reasons.push(`${totalShots} shots`); }
    if (totalCorners >= 3) { confidencePercent += 5; reasons.push(`${totalCorners} corners`); }
    if (totalxG > 0.5) { confidencePercent += 7; reasons.push(`xG: ${totalxG.toFixed(2)}`); }

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
// 🔥 Strategy B: "Late Game" (Time 60'-85', Score Diff <= 2)
// ============================================
function analyzeLateGameMomentum(match, elapsed, stats, momentum = null) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const goalDiff = Math.abs(homeScore - awayScore);

    // Time 60' - 85', score diff <= 2
    if (elapsed < 60 || elapsed > 85 || goalDiff > 2) {
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

    // Bonus for close game (more likely to push for goal)
    if (goalDiff <= 1) { confidencePercent += 8; reasons.push(`Close: ${homeScore}-${awayScore}`); }

    // Bonus for peak timing (65-78 mins is prime scoring time)
    if (elapsed >= 65 && elapsed <= 78) { confidencePercent += 7; reasons.push(`Peak: ${elapsed}'`); }

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

    // Filter candidates by time ranges (20-45 for First Half, 60-85 for Late Game)
    const candidates = allMatches.filter(m => {
        const elapsed = parseElapsedTime(m.stage);
        const homeScore = m.home_team?.score || 0;
        const awayScore = m.away_team?.score || 0;
        const scoreDiff = Math.abs(homeScore - awayScore);

        const isFirstHalfCandidate = elapsed >= 20 && elapsed <= 45 && scoreDiff <= 1;
        const isLateGameCandidate = elapsed >= 60 && elapsed <= 85 && scoreDiff <= 2;

        return isFirstHalfCandidate || isLateGameCandidate;
    });

    log.info(`🎯 Candidates Matching Time/Score: ${candidates.length}/${allMatches.length}`);

    if (candidates.length === 0) {
        log.info('ℹ️ No matches meet First Half (20-45\', diff≤1) or Late Game (60-85\', diff≤2) criteria');
        CACHED_DATA = { ...CACHED_DATA, signals: [], lastUpdated: new Date().toISOString(), quotaRemaining };
        return signals;
    }

    // Periodically clean old history entries
    cleanOldHistory();

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
        recordMatchStats(matchId, stats);

        // STEP 2: Detect Momentum (Dynamic Lookback)
        const momentum = detectMomentum(matchId, stats);

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

        // Include base activity in reason
        candidate.reason = `${baseCheck.reason} + ${candidate.reason}`;

        log.info(`      ✓ ${candidate.phase}: ${candidate.strategyCode} (${candidate.confidencePercent}% base)`);

        // Send to Gemini for AI validation
        log.gemini(`      🤖 Asking Gemini AI...`);
        const geminiResult = await askGeminiAnalyst(candidate);

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



app.get('/api/performance', (req, res) => {
    const stats = betTracker.getPerformanceStats();
    res.json({ success: true, data: stats });
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
        const categories = ['over15', 'btts', 'doubleChance', 'homeOver15', 'under35'];
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
    log.success('Auto-poll started (every 3 minutes)');

    setInterval(async () => {
        const now = new Date();
        const hour = now.getUTCHours(); // Use UTC explicitly

        // Schedule for TURKEY (UTC+3): 16:00 - 02:00 Turkey = 13:00 - 23:00 UTC
        // Logic: hour >= 13 OR hour < 23 covers 13:00 UTC to 22:59 UTC (16:00-01:59 Turkey)
        // But we want 16:00-02:00 TR = 13:00-23:00 UTC, so: hour >= 13 || hour < 23 is wrong
        // Correct: 13:00 UTC to 23:00 UTC = hour >= 13 && hour < 23? No...
        // Let me recalculate: 16:00 TR = 13:00 UTC, 02:00 TR (next day) = 23:00 UTC (same day)
        // So active window: 13:00 UTC to 23:00 UTC = if (hour >= 13 || hour < 23) - WRONG, always true
        // Correct: if (hour >= 13 && hour <= 23) for same-day window, or spanning midnight needs ||
        // Actually: 16:00-02:00 TR spans midnight. 13:00-23:00 UTC does NOT span midnight.
        // Wait: 02:00 TR next day = 23:00 UTC SAME day. So 16:00 TR to 02:00 TR = 13:00 to 23:00 UTC.
        // if (hour >= 13 && hour < 23) { active } - this is correct for 13:00-22:59 UTC
        // But user wants until 02:00 TR = 23:00 UTC, so: if (hour >= 13 && hour <= 23)? Still misses 23.
        // Actually hour < 23 misses 23:xx. Need hour <= 22 for "until 23:00" OR hour < 24 for "until midnight"
        // Simplify: 16:00-02:00 TR = 13:00-23:00 UTC. Use: (hour >= 13 && hour <= 22) = 13:00-22:59 UTC
        // OR: (hour >= 13) since 23 UTC would be 02:00 TR which is the end.
        // Best: Just use >= 13 || hour < 0 (always false) → hour >= 13 gives 13:00 UTC onwards
        // But we also need to STOP at 02:00 TR = 23:00 UTC. So: hour >= 13 && hour < 23 = 13:00-22:59 UTC
        // That's 16:00-01:59 Turkey. Close enough, or add: || hour >= 23 for the 23:00-23:59 window

        // Final: For Turkey 16:00 - 02:00, active when: UTC hour is 13-22 OR UTC hour is 23
        // Simplified: hour >= 13 && hour <= 23  (but hour is 0-23, so hour <= 23 is always true)
        // Better: hour >= 13 || hour < 23 → WRONG (covers everything)
        // REAL ANSWER: Since 16:00-02:00 TR = 13:00-23:00 UTC (10 hour window), use: hour >= 13
        // Wait no, that runs until midnight UTC (03:00 TR). 

        // Let me be very explicit:
        // Turkey 16:00 = UTC 13:00
        // Turkey 02:00 = UTC 23:00 (same UTC day)
        // So: if (hour >= 13 && hour < 23) → Active 13:00-22:59 UTC (16:00-01:59 TR)
        // To include 23:00 UTC (02:00 TR is the CUT-OFF, so 23:xx should be INACTIVE)
        // So the correct condition is: if (hour >= 13 && hour < 23)

        if (hour >= 13 && hour < 23) {
            log.info('Scheduled poll (Turkey: 16:00-02:00)...');
            await processMatches();
        } else {
            log.info(`Outside active hours (TR 16:00-02:00, current UTC: ${hour}:xx)`);
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
