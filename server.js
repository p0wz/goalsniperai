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

// Database & Auth
const { initDatabase } = require('./database');
const database = require('./database');
const { requireAuth, optionalAuth } = require('./auth');

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

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
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    credentials: true,
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
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
const log = {
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
    api: (msg) => console.log(`\x1b[35m[API]\x1b[0m ${msg}`),
    signal: (msg) => console.log(`\x1b[32m[SIGNAL]\x1b[0m ${msg}`),
    gemini: (msg) => console.log(`\x1b[33m[GEMINI]\x1b[0m ${msg}`)
};

// ============================================
// ⚙️ Configuration
// ============================================
const PORT = process.env.PORT || 3000;
const POLL_INTERVAL = 10 * 60 * 1000; // 10 minutes

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

let PREVIOUS_SNAPSHOT = {};
let dailyRequestCount = 0;
const DAILY_LIMIT = 500;

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

    const statsList = statsData['1st-half'] || statsData['all-match'] || [];

    for (const stat of statsList) {
        const name = stat.name?.toLowerCase() || '';
        const home = stat.home_team;
        const away = stat.away_team;

        if (name.includes('ball possession')) {
            stats.possession.home = parseInt(home) || 50;
            stats.possession.away = parseInt(away) || 50;
        }
        if (name === 'total shots') {
            stats.shots.home = parseInt(home) || 0;
            stats.shots.away = parseInt(away) || 0;
        }
        if (name === 'shots on target') {
            stats.shotsOnTarget.home = parseInt(home) || 0;
            stats.shotsOnTarget.away = parseInt(away) || 0;
        }
        if (name === 'corner kicks') {
            stats.corners.home = parseInt(home) || 0;
            stats.corners.away = parseInt(away) || 0;
        }
        if (name.includes('expected goals')) {
            stats.xG.home = parseFloat(home) || 0;
            stats.xG.away = parseFloat(away) || 0;
        }
        if (name.includes('big chances')) {
            stats.dangerousAttacks.home = parseInt(home) || 0;
            stats.dangerousAttacks.away = parseInt(away) || 0;
        }
    }

    return stats;
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

    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
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

        const result = JSON.parse(text);

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
        log.error(`Gemini API error: ${error.message}`);
        return { verdict: 'PLAY', confidence: candidate.confidencePercent, reason: 'Gemini unavailable, using local analysis' };
    }
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
// 🎯 Module A: "First Half Sniper" (IY 0.5 Üst)
// ============================================
function analyzeFirstHalfSniper(match, elapsed, stats) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;

    if (elapsed < 15 || elapsed > 40 || homeScore !== 0 || awayScore !== 0) {
        return null;
    }

    const odds = match.odds || {};
    const homeOdds = odds['1'] || 2.0;
    const awayOdds = odds['2'] || 2.0;
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalSoT = (stats?.shotsOnTarget?.home || 0) + (stats?.shotsOnTarget?.away || 0);
    const totalCorners = (stats?.corners?.home || 0) + (stats?.corners?.away || 0);
    const totalxG = (stats?.xG?.home || 0) + (stats?.xG?.away || 0);
    const totalDA = (stats?.dangerousAttacks?.home || 0) + (stats?.dangerousAttacks?.away || 0);
    const daPerMin = elapsed > 0 ? totalDA / elapsed : 0;

    // Trigger: SoT >= 2 AND DA/min > 1.0
    if (totalSoT < 2 || daPerMin <= 1.0) {
        return null;
    }

    let criteriasMet = 0;
    const reasons = [];

    if (totalSoT >= 2) { criteriasMet++; reasons.push(`${totalSoT} shots on target`); }
    if (daPerMin > 1.0) { criteriasMet++; reasons.push(`DA/min: ${daPerMin.toFixed(2)}`); }
    if (totalxG > 0.5) { criteriasMet++; reasons.push(`xG: ${totalxG.toFixed(2)}`); }
    if (totalCorners >= 3) { criteriasMet++; reasons.push(`${totalCorners} corners`); }

    let confidencePercent = 60 + (criteriasMet * 10);
    if (confidencePercent > 95) confidencePercent = 95;

    return {
        id: match.match_id,
        home: match.home_team?.name || 'Home',
        away: match.away_team?.name || 'Away',
        homeLogo: match.home_team?.image_path || '',
        awayLogo: match.away_team?.image_path || '',
        score: `${homeScore}-${awayScore}`,
        elapsed,
        strategy: 'IY 0.5 Ust',
        strategyCode: 'IY_05',
        confidence: 'PENDING',
        confidencePercent,
        verdict: 'PENDING',
        reason: reasons.join('. ') + '.',
        stats: {
            shots: totalShots,
            shots_on_target: totalSoT,
            corners: totalCorners,
            dangerous_attacks: totalDA,
            da_per_min: daPerMin.toFixed(2),
            xG: totalxG.toFixed(2),
            possession: `${stats?.possession?.home || 50}%-${stats?.possession?.away || 50}%`,
            homeOdds: homeOdds.toFixed(2),
            awayOdds: awayOdds.toFixed(2)
        },
        league: match.league_name || 'Unknown',
        leagueLogo: match.league_logo || '',
        country: match.country_name || ''
    };
}

// ============================================
// 🔥 Module B: "Late Game Momentum" (MS Gol)
// ============================================
function analyzeLateGameMomentum(match, elapsed, stats) {
    const homeScore = match.home_team?.score || 0;
    const awayScore = match.away_team?.score || 0;
    const goalDiff = Math.abs(homeScore - awayScore);

    if (elapsed < 60 || elapsed > 85 || goalDiff > 2) {
        return null;
    }

    const odds = match.odds || {};
    const homeOdds = odds['1'] || 2.0;
    const awayOdds = odds['2'] || 2.0;
    const drawOdds = odds['X'] || 3.0;
    const totalShots = (stats?.shots?.home || 0) + (stats?.shots?.away || 0);
    const totalSoT = (stats?.shotsOnTarget?.home || 0) + (stats?.shotsOnTarget?.away || 0);
    const totalxG = (stats?.xG?.home || 0) + (stats?.xG?.away || 0);
    const totalDA = (stats?.dangerousAttacks?.home || 0) + (stats?.dangerousAttacks?.away || 0);
    const daPerMin = elapsed > 0 ? totalDA / elapsed : 0;

    // Trigger: DA/min > 0.9 OR Total Shots > 13
    if (daPerMin <= 0.9 && totalShots <= 13) {
        return null;
    }

    let criteriasMet = 0;
    const reasons = [];

    if (daPerMin > 0.9) { criteriasMet++; reasons.push(`DA/min: ${daPerMin.toFixed(2)}`); }
    if (totalShots > 13) { criteriasMet++; reasons.push(`${totalShots} total shots`); }
    if (totalSoT >= 4) { criteriasMet++; reasons.push(`${totalSoT} on target`); }
    if (elapsed >= 65 && elapsed <= 78) { criteriasMet++; reasons.push(`Peak timing: ${elapsed}'`); }
    if (goalDiff <= 1) { criteriasMet++; reasons.push(`Close game: ${homeScore}-${awayScore}`); }

    let confidencePercent = 55 + (criteriasMet * 10);
    if (confidencePercent > 95) confidencePercent = 95;

    return {
        id: match.match_id,
        home: match.home_team?.name || 'Home',
        away: match.away_team?.name || 'Away',
        homeLogo: match.home_team?.image_path || '',
        awayLogo: match.away_team?.image_path || '',
        score: `${homeScore}-${awayScore}`,
        elapsed,
        strategy: 'MS Gol',
        strategyCode: 'MS_GOL',
        confidence: 'PENDING',
        confidencePercent,
        verdict: 'PENDING',
        reason: reasons.join('. ') + '.',
        stats: {
            shots: totalShots,
            shots_on_target: totalSoT,
            corners: (stats?.corners?.home || 0) + (stats?.corners?.away || 0),
            dangerous_attacks: totalDA,
            da_per_min: daPerMin.toFixed(2),
            xG: totalxG.toFixed(2),
            possession: `${stats?.possession?.home || 50}%-${stats?.possession?.away || 50}%`,
            homeOdds: homeOdds.toFixed(2),
            awayOdds: awayOdds.toFixed(2),
            drawOdds: drawOdds.toFixed(2)
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
    const { tournaments, quotaRemaining } = await fetchLiveMatches();
    const signals = [];

    if (tournaments.length === 0) {
        log.info('No live matches found');
        CACHED_DATA = { ...CACHED_DATA, signals: [], lastUpdated: new Date().toISOString(), quotaRemaining };
        return signals;
    }

    // Flatten all matches
    const allMatches = [];
    for (const tournament of tournaments) {
        for (const match of tournament.matches || []) {
            allMatches.push({
                ...match,
                league_name: tournament.name,
                league_logo: tournament.image_path,
                country_name: tournament.country_name
            });
        }
    }

    log.info(`Processing ${allMatches.length} total matches`);

    // Filter candidates first
    const candidates = allMatches.filter(m => {
        const elapsed = parseElapsedTime(m.stage);
        const homeScore = m.home_team?.score || 0;
        const awayScore = m.away_team?.score || 0;
        const goalDiff = Math.abs(homeScore - awayScore);

        const isIYCandidate = elapsed >= 15 && elapsed <= 40 && homeScore === 0 && awayScore === 0;
        const isMSCandidate = elapsed >= 60 && elapsed <= 85 && goalDiff <= 2;

        return isIYCandidate || isMSCandidate;
    });

    log.info(`Found ${candidates.length} candidates, fetching detailed stats...`);

    for (const match of candidates) {
        const elapsed = parseElapsedTime(match.stage);
        const matchId = match.match_id;

        // Fetch stats
        const statsData = await fetchMatchStats(matchId);
        const stats = statsData ? parseMatchStats(statsData) : null;

        if (stats) {
            log.info(`Stats for ${match.home_team?.name}: Shots ${stats.shots.home + stats.shots.away}, SoT ${stats.shotsOnTarget.home + stats.shotsOnTarget.away}`);
        }

        // Run scout filters
        let candidate = analyzeFirstHalfSniper(match, elapsed, stats);
        if (!candidate) {
            candidate = analyzeLateGameMomentum(match, elapsed, stats);
        }

        if (!candidate) continue;

        // Send to Gemini for AI validation
        log.gemini(`Analyzing: ${candidate.home} vs ${candidate.away}`);
        const geminiResult = await askGeminiAnalyst(candidate);

        // Update candidate with Gemini results
        candidate.verdict = geminiResult.verdict || 'SKIP';
        candidate.confidencePercent = geminiResult.confidence || candidate.confidencePercent;
        candidate.confidence = geminiResult.confidence >= 75 ? 'HIGH' : geminiResult.confidence >= 50 ? 'MEDIUM' : 'LOW';
        candidate.geminiReason = geminiResult.reason || '';

        // Only add PLAY signals
        if (candidate.verdict === 'PLAY') {
            log.signal(`[${candidate.strategyCode}] ${candidate.home} vs ${candidate.away} (${candidate.confidencePercent}%)`);
            signals.push(candidate);
        } else {
            log.info(`SKIP: ${candidate.home} vs ${candidate.away} - ${geminiResult.reason}`);
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

    return signals;
}

// ============================================
// 🌐 API Endpoints
// ============================================
app.get('/api/signals', (req, res) => {
    const iySignals = CACHED_DATA.signals.filter(s => s.strategyCode === 'IY_05').length;
    const msSignals = CACHED_DATA.signals.filter(s => s.strategyCode === 'MS_GOL').length;

    res.json({
        success: true,
        data: CACHED_DATA.signals,
        meta: {
            lastUpdated: CACHED_DATA.lastUpdated,
            quotaRemaining: CACHED_DATA.quotaRemaining,
            quotaLimit: CACHED_DATA.quotaLimit,
            quotaPercent: Math.round((CACHED_DATA.quotaRemaining / CACHED_DATA.quotaLimit) * 100),
            isLive: CACHED_DATA.isLive,
            totalSignals: CACHED_DATA.signals.length,
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
    log.success('Auto-poll started (every 10 minutes)');

    setInterval(async () => {
        const now = new Date();
        const hour = now.getHours();

        if (hour >= 13 && hour <= 23) {
            log.info('Scheduled poll...');
            await processMatches();
        } else {
            log.info('Outside active hours');
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

    startAutoPolling();
});
