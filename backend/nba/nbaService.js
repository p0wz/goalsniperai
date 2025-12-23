/**
 * NBA Service - Node.js wrapper for Python nba_api
 * Handles caching with separate Upstash Redis instance
 */

const { spawn } = require('child_process');
const path = require('path');

// Redis client for NBA-specific caching (separate instance)
let redisClient = null;

// Cache TTL in seconds
const CACHE_TTL = {
    GAMES: 300,        // 5 minutes for today's games
    PLAYER_STATS: 3600, // 1 hour for player stats
    HIT_RATES: 1800,   // 30 minutes for hit rates
    ROSTER: 86400      // 24 hours for rosters
};

/**
 * Initialize NBA Redis connection
 * @param {string} redisUrl - Upstash Redis URL for NBA
 */
async function initNBARedis(redisUrl) {
    if (!redisUrl) {
        console.log('[NBA] ⚠️ No Redis URL provided, using memory cache');
        return false;
    }

    try {
        const { createClient } = require('redis');
        redisClient = createClient({ url: redisUrl });

        redisClient.on('error', (err) => {
            console.error('[NBA] Redis error:', err.message);
        });

        await redisClient.connect();
        console.log('[NBA] ✅ Redis connected');
        return true;
    } catch (err) {
        console.error('[NBA] ❌ Redis connection failed:', err.message);
        return false;
    }
}

// Memory cache fallback
const memoryCache = new Map();

/**
 * Get from cache (Redis or memory)
 */
async function getCache(key) {
    if (redisClient?.isOpen) {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
    return memoryCache.get(key) || null;
}

/**
 * Set cache (Redis or memory)
 */
async function setCache(key, value, ttl) {
    if (redisClient?.isOpen) {
        await redisClient.set(key, JSON.stringify(value), { EX: ttl });
    } else {
        memoryCache.set(key, value);
        setTimeout(() => memoryCache.delete(key), ttl * 1000);
    }
}

/**
 * Execute Python fetcher script
 */
function runPythonFetcher(command, args = []) {
    return new Promise((resolve, reject) => {
        const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        const scriptPath = path.join(__dirname, 'nbaFetcher.py');

        const proc = spawn(pythonPath, [scriptPath, command, ...args]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `Python process exited with code ${code}`));
                return;
            }

            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                reject(new Error(`Failed to parse Python output: ${stdout}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to start Python: ${err.message}`));
        });
    });
}

/**
 * Get today's NBA games
 */
async function getTodaysGames() {
    const cacheKey = `nba:games:${new Date().toISOString().split('T')[0]}`;

    // Check cache
    const cached = await getCache(cacheKey);
    if (cached) {
        console.log('[NBA] Cache hit: games');
        return cached;
    }

    // Fetch from API
    console.log('[NBA] Fetching today\'s games...');
    const result = await runPythonFetcher('games');

    if (result.success) {
        await setCache(cacheKey, result, CACHE_TTL.GAMES);
    }

    return result;
}

/**
 * Get all NBA teams
 */
async function getTeams() {
    const cacheKey = 'nba:teams';

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const result = await runPythonFetcher('teams');
    await setCache(cacheKey, result, CACHE_TTL.ROSTER);

    return result;
}

/**
 * Get team roster
 */
async function getTeamRoster(teamId) {
    const cacheKey = `nba:roster:${teamId}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    console.log(`[NBA] Fetching roster for team ${teamId}...`);
    const result = await runPythonFetcher('roster', [teamId.toString()]);

    if (result.success) {
        await setCache(cacheKey, result, CACHE_TTL.ROSTER);
    }

    return result;
}

/**
 * Get player game logs
 */
async function getPlayerGameLogs(playerId, lastN = 20) {
    const cacheKey = `nba:player:${playerId}:logs:${lastN}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    console.log(`[NBA] Fetching game logs for player ${playerId}...`);
    const result = await runPythonFetcher('player_logs', [playerId.toString(), lastN.toString()]);

    if (result.success) {
        await setCache(cacheKey, result, CACHE_TTL.PLAYER_STATS);
    }

    return result;
}

/**
 * Get player hit rates for all markets
 */
async function getPlayerHitRates(playerId, lines = {}) {
    const lineKey = JSON.stringify(lines);
    const cacheKey = `nba:player:${playerId}:hitrates:${lineKey}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    console.log(`[NBA] Calculating hit rates for player ${playerId}...`);
    const result = await runPythonFetcher('hit_rates', [playerId.toString()]);

    if (result.success) {
        await setCache(cacheKey, result, CACHE_TTL.HIT_RATES);
    }

    return result;
}

/**
 * Find player ID by name
 */
async function findPlayerId(playerName) {
    const cacheKey = `nba:player:name:${playerName.toLowerCase()}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const result = await runPythonFetcher('player_id', playerName.split(' '));

    if (result.player_id) {
        await setCache(cacheKey, result, CACHE_TTL.ROSTER);
    }

    return result;
}

/**
 * Calculate hit rate for custom line
 */
function calculateHitRate(games, market, line) {
    const marketMap = {
        'pts': 'pts',
        'points': 'pts',
        'reb': 'reb',
        'rebounds': 'reb',
        'ast': 'ast',
        'assists': 'ast',
        'pra': 'pra',
        'fg3m': 'fg3m',
        '3pm': 'fg3m',
        'stl': 'stl',
        'steals': 'stl',
        'blk': 'blk',
        'blocks': 'blk',
        'tov': 'tov',
        'turnovers': 'tov'
    };

    const key = marketMap[market.toLowerCase()] || market;
    let hits = 0;

    for (const game of games) {
        if ((game[key] || 0) > line) {
            hits++;
        }
    }

    return {
        hit_rate: games.length > 0 ? Math.round((hits / games.length) * 100 * 10) / 10 : 0,
        hits,
        total: games.length,
        line,
        market: key
    };
}

/**
 * Get hit rates with custom lines
 */
async function getHitRatesWithLines(playerId, lines, lastN = 20) {
    // First get game logs
    const logsResult = await getPlayerGameLogs(playerId, lastN);

    if (!logsResult.success) {
        return logsResult;
    }

    const games = logsResult.games;
    const homeGames = games.filter(g => g.home);
    const awayGames = games.filter(g => !g.home);

    const result = {
        player_id: playerId,
        games_analyzed: games.length,
        markets: {}
    };

    // Calculate for each market
    const defaultLines = {
        pts: 25.5,
        reb: 8.5,
        ast: 6.5,
        pra: 38.5,
        fg3m: 2.5,
        stl: 1.5,
        blk: 1.5,
        tov: 3.5
    };

    const marketLabels = {
        pts: 'Points',
        reb: 'Rebounds',
        ast: 'Assists',
        pra: 'Pts+Reb+Ast',
        fg3m: '3-Pointers',
        stl: 'Steals',
        blk: 'Blocks',
        tov: 'Turnovers'
    };

    for (const [market, defaultLine] of Object.entries(defaultLines)) {
        const line = lines[market] || defaultLine;
        result.markets[market] = {
            ...calculateHitRate(games, market, line),
            label: marketLabels[market],
            splits: {
                last5: calculateHitRate(games.slice(0, 5), market, line),
                last10: calculateHitRate(games.slice(0, 10), market, line),
                home: calculateHitRate(homeGames, market, line),
                away: calculateHitRate(awayGames, market, line)
            }
        };
    }

    return { success: true, data: result };
}

module.exports = {
    initNBARedis,
    getTodaysGames,
    getTeams,
    getTeamRoster,
    getPlayerGameLogs,
    getPlayerHitRates,
    findPlayerId,
    getHitRatesWithLines,
    calculateHitRate
};
