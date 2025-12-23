/**
 * NBA Service - Pure Node.js (no Python required)
 * Uses direct HTTP requests to NBA Stats API
 */

const axios = require('axios');

// Redis client for NBA-specific caching (separate instance)
let redisClient = null;

// Cache TTL in seconds
const CACHE_TTL = {
    GAMES: 300,        // 5 minutes for today's games
    PLAYER_STATS: 3600, // 1 hour for player stats
    HIT_RATES: 1800,   // 30 minutes for hit rates
    ROSTER: 86400,     // 24 hours for rosters
    TEAMS: 604800      // 7 days for teams list
};

// NBA Stats API client
const nbaApi = axios.create({
    baseURL: 'https://stats.nba.com/stats',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.nba.com/',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.nba.com',
        'Host': 'stats.nba.com',
        'Connection': 'keep-alive'
    },
    timeout: 30000
});

// Static NBA teams list (doesn't change often)
const NBA_TEAMS = [
    { id: 1610612737, abbreviation: 'ATL', full_name: 'Atlanta Hawks' },
    { id: 1610612738, abbreviation: 'BOS', full_name: 'Boston Celtics' },
    { id: 1610612751, abbreviation: 'BKN', full_name: 'Brooklyn Nets' },
    { id: 1610612766, abbreviation: 'CHA', full_name: 'Charlotte Hornets' },
    { id: 1610612741, abbreviation: 'CHI', full_name: 'Chicago Bulls' },
    { id: 1610612739, abbreviation: 'CLE', full_name: 'Cleveland Cavaliers' },
    { id: 1610612742, abbreviation: 'DAL', full_name: 'Dallas Mavericks' },
    { id: 1610612743, abbreviation: 'DEN', full_name: 'Denver Nuggets' },
    { id: 1610612765, abbreviation: 'DET', full_name: 'Detroit Pistons' },
    { id: 1610612744, abbreviation: 'GSW', full_name: 'Golden State Warriors' },
    { id: 1610612745, abbreviation: 'HOU', full_name: 'Houston Rockets' },
    { id: 1610612754, abbreviation: 'IND', full_name: 'Indiana Pacers' },
    { id: 1610612746, abbreviation: 'LAC', full_name: 'LA Clippers' },
    { id: 1610612747, abbreviation: 'LAL', full_name: 'Los Angeles Lakers' },
    { id: 1610612763, abbreviation: 'MEM', full_name: 'Memphis Grizzlies' },
    { id: 1610612748, abbreviation: 'MIA', full_name: 'Miami Heat' },
    { id: 1610612749, abbreviation: 'MIL', full_name: 'Milwaukee Bucks' },
    { id: 1610612750, abbreviation: 'MIN', full_name: 'Minnesota Timberwolves' },
    { id: 1610612740, abbreviation: 'NOP', full_name: 'New Orleans Pelicans' },
    { id: 1610612752, abbreviation: 'NYK', full_name: 'New York Knicks' },
    { id: 1610612760, abbreviation: 'OKC', full_name: 'Oklahoma City Thunder' },
    { id: 1610612753, abbreviation: 'ORL', full_name: 'Orlando Magic' },
    { id: 1610612755, abbreviation: 'PHI', full_name: 'Philadelphia 76ers' },
    { id: 1610612756, abbreviation: 'PHX', full_name: 'Phoenix Suns' },
    { id: 1610612757, abbreviation: 'POR', full_name: 'Portland Trail Blazers' },
    { id: 1610612758, abbreviation: 'SAC', full_name: 'Sacramento Kings' },
    { id: 1610612759, abbreviation: 'SAS', full_name: 'San Antonio Spurs' },
    { id: 1610612761, abbreviation: 'TOR', full_name: 'Toronto Raptors' },
    { id: 1610612762, abbreviation: 'UTA', full_name: 'Utah Jazz' },
    { id: 1610612764, abbreviation: 'WAS', full_name: 'Washington Wizards' }
];

/**
 * Initialize NBA Redis connection
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
 * Get all NBA teams
 */
async function getTeams() {
    return { success: true, teams: NBA_TEAMS };
}

/**
 * Get team roster
 */
async function getTeamRoster(teamId) {
    const cacheKey = `nba:roster:${teamId}`;

    const cached = await getCache(cacheKey);
    if (cached) {
        console.log(`[NBA] Cache hit: roster ${teamId}`);
        return cached;
    }

    try {
        console.log(`[NBA] Fetching roster for team ${teamId}...`);

        const response = await nbaApi.get('/commonteamroster', {
            params: {
                TeamID: teamId,
                Season: '2024-25'
            }
        });

        const data = response.data;
        const headers = data.resultSets[0].headers;
        const rows = data.resultSets[0].rowSet;

        const players = rows.map(row => {
            const player = {};
            headers.forEach((h, i) => player[h] = row[i]);
            return {
                id: player.PLAYER_ID,
                name: player.PLAYER,
                number: player.NUM,
                position: player.POSITION,
                age: player.AGE
            };
        });

        const result = { success: true, players };
        await setCache(cacheKey, result, CACHE_TTL.ROSTER);
        return result;
    } catch (err) {
        console.error(`[NBA] Roster error:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Get player game logs
 */
async function getPlayerGameLogs(playerId, lastN = 20) {
    const cacheKey = `nba:player:${playerId}:logs:${lastN}`;

    const cached = await getCache(cacheKey);
    if (cached) {
        console.log(`[NBA] Cache hit: player ${playerId} logs`);
        return cached;
    }

    try {
        console.log(`[NBA] Fetching game logs for player ${playerId}...`);

        const response = await nbaApi.get('/playergamelog', {
            params: {
                PlayerID: playerId,
                Season: '2024-25',
                SeasonType: 'Regular Season'
            }
        });

        const data = response.data;
        const headers = data.resultSets[0].headers;
        const rows = data.resultSets[0].rowSet;

        const games = rows.slice(0, lastN).map(row => {
            const game = {};
            headers.forEach((h, i) => game[h] = row[i]);
            return {
                game_id: game.Game_ID,
                date: game.GAME_DATE,
                matchup: game.MATCHUP,
                wl: game.WL,
                min: game.MIN,
                pts: game.PTS || 0,
                reb: game.REB || 0,
                ast: game.AST || 0,
                stl: game.STL || 0,
                blk: game.BLK || 0,
                tov: game.TOV || 0,
                fg3m: game.FG3M || 0,
                pra: (game.PTS || 0) + (game.REB || 0) + (game.AST || 0),
                home: !game.MATCHUP?.includes('@')
            };
        });

        const result = { success: true, games, player_id: playerId };
        await setCache(cacheKey, result, CACHE_TTL.PLAYER_STATS);
        return result;
    } catch (err) {
        console.error(`[NBA] Player logs error:`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Calculate hit rate for a specific market
 */
function calculateHitRate(games, market, line) {
    const total = games.length;
    if (total === 0) return { hit_rate: 0, hits: 0, total: 0, line };

    let hits = 0;
    for (const game of games) {
        const value = game[market] || 0;
        if (value > line) hits++;
    }

    return {
        hit_rate: Math.round((hits / total) * 100 * 10) / 10,
        hits,
        total,
        line
    };
}

/**
 * Get hit rates with custom lines
 */
async function getHitRatesWithLines(playerId, lines = {}, lastN = 20) {
    // First get game logs
    const logsResult = await getPlayerGameLogs(playerId, lastN);

    if (!logsResult.success) {
        return logsResult;
    }

    const games = logsResult.games;
    const homeGames = games.filter(g => g.home);
    const awayGames = games.filter(g => !g.home);

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

    const result = {
        player_id: playerId,
        games_analyzed: games.length,
        markets: {}
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

/**
 * Get today's games (from NBA CDN)
 */
async function getTodaysGames() {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const cacheKey = `nba:games:${today}`;

    const cached = await getCache(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(`https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const games = response.data.scoreboard.games.map(g => ({
            game_id: g.gameId,
            status: g.gameStatusText,
            home_team_id: g.homeTeam.teamId,
            away_team_id: g.awayTeam.teamId,
            home_team: g.homeTeam.teamName,
            away_team: g.awayTeam.teamName
        }));

        const result = { success: true, games };
        await setCache(cacheKey, result, CACHE_TTL.GAMES);
        return result;
    } catch (err) {
        return { success: true, games: [] }; // Return empty if no games today
    }
}

/**
 * Find player by name (search in roster)
 */
async function findPlayerId(playerName) {
    // This would need to search through rosters
    // For now, return not implemented
    return { error: 'Use team roster to find players' };
}

module.exports = {
    initNBARedis,
    getTodaysGames,
    getTeams,
    getTeamRoster,
    getPlayerGameLogs,
    getHitRatesWithLines,
    findPlayerId,
    calculateHitRate
};
