import axios from 'axios';

// Create axios instance with default config
// Construct Base URL:
// 1. Production: VITE_API_URL should be the domain (e.g. https://server.com) -> result https://server.com/api
// 2. Development: VITE_API_URL is empty -> result /api (which proxies to localhost:3000/api)
const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || '';
    if (url && url.endsWith('/')) {
        url = url.slice(0, -1); // Remove trailing slash if present
    }
    // If VITE_API_URL provides full path with /api, use it, otherwise append.
    // Simplifying assumption: User provides DOMAIN only.
    return url ? `${url}/api` : '/api';
};

const baseUrl = getBaseUrl();
console.log('🔌 API Configuration:', {
    envVar: import.meta.env.VITE_API_URL,
    resolvedBaseUrl: baseUrl,
    mode: import.meta.env.MODE
});

const api = axios.create({
    baseURL: baseUrl,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for handling errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || error.message || 'An unknown error occurred';

        // Handle 401 Unauthorized (optional: redirect to login)
        if (error.response?.status === 401) {
            // event bus or global state could handle this
            console.warn('Unauthorized access', message);
            // window.location.href = '/login'; // Simple redirect if needed
        }

        return Promise.reject(new Error(message));
    }
);

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },
    register: async (name, email, password) => {
        const response = await api.post('/auth/register', { name, email, password });
        return response.data;
    },
    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    },
    getProfile: async () => {
        const response = await api.get('/auth/me');
        // Return the user object directly if successful
        if (response.data.success) {
            return response.data.user;
        }
        return null;
    },
};

export const signalService = {
    getLiveSignals: async () => {
        const response = await api.get('/signals');
        return response.data;
    },
    getDailyAnalysis: async (force = false, leagueFilter = true, limit = null) => {
        let url = `/daily-analysis?force=${force}&leagueFilter=${leagueFilter}`;
        if (limit) url += `&limit=${limit}`;

        // Use raw fetch for SSE handling capability
        const response = await fetch(api.defaults.baseURL + url, {
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization if needed (axios does this auto, fetch needs manual or cookie)
            },
            // Credentials needed for cookies
            credentials: 'include'
        });

        // 1. Check content type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // It's a standard JSON response (from Cache)
            return await response.json();
        }

        // 2. Handle SSE Stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let finalResults = null;
        let finalSuccess = false;
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process buffer for complete messages (doubly newline separated)
                const parts = buffer.split('\n\n');

                // Keep the last part in buffer (it might be incomplete)
                buffer = parts.pop();

                for (const part of parts) {
                    if (part.trim().startsWith('data: ')) {
                        try {
                            const line = part.trim();
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'done') {
                                finalResults = data.results;
                                finalSuccess = true;
                            } else if (data.type === 'error') {
                                throw new Error(data.message);
                            } else {
                                // Info/Progress logs
                                console.log('[Analysis]', data.message || data);
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE message:', e);
                        }
                    }
                }
            }

            // Process any remaining buffer content after stream ends
            if (buffer.trim()) {
                const parts = buffer.split('\n\n');
                for (const part of parts) {
                    if (part.trim().startsWith('data: ')) {
                        try {
                            const line = part.trim();
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'done') {
                                finalResults = data.results;
                                finalSuccess = true;
                            }
                        } catch (e) { /* ignore */ }
                    }
                }
            }

        } catch (error) {
            console.error('Stream processing error:', error);
            throw error;
        }

        if (finalSuccess) {
            return { success: true, data: finalResults };
        } else {
            throw new Error('Analysis stream ended without final results');
        }
    },
    // New: Single-Market Analysis
    analyzeMarket: async (market, leagueFilter = true) => {
        const response = await api.get(`/analysis/${market}?leagueFilter=${leagueFilter}`);
        return response.data;
    },
    // New: Get Market-Specific History
    getMarketHistory: async (market) => {
        const response = await api.get(`/bet-history/market/${market}`);
        return response.data;
    },
    // New: Reset Market History
    resetMarketHistory: async (market) => {
        const response = await api.delete(`/bet-history/market/${market}`);
        return response.data;
    },
    // New: Record Bet
    recordBet: async (match, market) => {
        const response = await api.post('/bet-history/record', { match, market });
        return response.data;
    },
    approveSignal: async (id, data) => {
        const response = await api.post(`/daily-analysis/approve/${id}`, data);
        return response.data;
    },
    rejectSignal: async (id) => {
        const response = await api.post(`/daily-analysis/reject/${id}`);
        return response.data;
    },
    // New: Raw Stats Collection (No Market Filtering)
    getRawStats: async (leagueFilter = true, limit = 50) => {
        const response = await api.get(`/analysis/raw-stats?leagueFilter=${leagueFilter}&limit=${limit}`);
        return response.data;
    },
    // New: Get Last Cached Analysis (for page refresh persistence)
    getLastAnalysis: async (market) => {
        const response = await api.get(`/analysis/last/${market}`);
        return response.data;
    },
    // New: Get Last Daily Analysis (for Analiz Merkezi page reload persistence)
    getLastDailyAnalysis: async () => {
        const response = await api.get('/daily-analysis?force=false');
        return response.data;
    }
};

export const betService = {
    getHistory: async () => {
        const response = await api.get('/bet-history');
        return response.data;
    },
    settleBet: async (id, status, resultScore) => {
        const response = await api.post(`/bet-history/${id}/settle`, { status, resultScore });
        return response.data;
    },
    clearHistory: async (source) => {
        const response = await api.delete('/admin/history', { data: { source } });
        return response.data;
    },
    deleteBet: async (id) => {
        const response = await api.delete(`/bet-history/${id}`);
        return response.data;
    }
};

export const adminService = {
    getBotStatus: async () => {
        const response = await api.get('/admin/bot/status');
        return response.data;
    },
    startBot: async () => {
        const response = await api.post('/admin/bot/start');
        return response.data;
    },
    stopBot: async () => {
        const response = await api.post('/admin/bot/stop');
        return response.data;
    },
    getAIAnalysis: async (leagueFilter) => {
        const response = await api.post('/daily-analysis/ai-auto', { leagueFilter }); // Corrected path
        return response.data;
    },
    // Picks
    createPick: async (data) => {
        const response = await api.post('/admin/picks', data);
        return response.data;
    },
    deletePick: async (id) => {
        const response = await api.delete(`/admin/picks/${id}`);
        return response.data;
    },
    optimizeStrategy: async () => {
        const response = await api.post('/admin/optimize-strategy');
        return response.data;
    },
    // Mobile Management
    toggleMobile: async (betId, isMobile) => {
        const response = await api.post('/admin/mobile/toggle', { betId, isMobile });
        return response.data;
    },
    clearMobileList: async () => {
        const response = await api.delete('/admin/mobile/clear-list');
        return response.data;
    }
};

export const picksService = {
    getDailyPicks: async () => {
        const response = await api.get('/picks/daily');
        return response.data;
    }
};

// AI Training Dataset Service
export const trainingService = {
    getAll: async () => {
        const response = await api.get('/training-data');
        return response.data;
    },
    record: async (data) => {
        const response = await api.post('/training-data/record', data);
        return response.data;
    },
    settle: async (id, result, actualScore = null) => {
        const response = await api.post(`/training-data/settle/${id}`, { result, actualScore });
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/training-data/${id}`);
        return response.data;
    }
};

// SENTIO Chat Service
export const sentioService = {
    getMemoryStatus: async () => {
        const response = await api.get('/sentio/memory');
        return response.data;
    },
    populate: async (leagueFilter = true) => {
        const response = await api.post('/sentio/populate', { leagueFilter });
        return response.data;
    },
    chat: async (message) => {
        const response = await api.post('/sentio/chat', { message });
        return response.data;
    },
    // Admin: Approve single match
    approveMatch: async (matchData) => {
        const response = await api.post('/sentio/approve-match', matchData);
        return response.data;
    },
    // Admin: Approve multiple matches
    approveBulk: async (matches) => {
        const response = await api.post('/sentio/approve-bulk', { matches });
        return response.data;
    },
    // Admin: Clear memory
    clearMemory: async () => {
        const response = await api.delete('/sentio/memory');
        return response.data;
    }
};

// Payment Service
export const paymentService = {
    getWallets: async () => {
        const response = await api.get('/payments/wallets');
        return response.data;
    },
    create: async (planType, cryptoType) => {
        const response = await api.post('/payments/create', { planType, cryptoType });
        return response.data;
    },
    updateTxHash: async (paymentId, txHash) => {
        const response = await api.post(`/payments/update-tx/${paymentId}`, { txHash });
        return response.data;
    },
    getMyPayments: async () => {
        const response = await api.get('/payments/my');
        return response.data;
    },
    // Admin
    getPending: async () => {
        const response = await api.get('/payments/pending');
        return response.data;
    },
    getAll: async () => {
        const response = await api.get('/payments/all');
        return response.data;
    },
    confirm: async (paymentId) => {
        const response = await api.post(`/payments/confirm/${paymentId}`);
        return response.data;
    },
    reject: async (paymentId, reason) => {
        const response = await api.post(`/payments/reject/${paymentId}`, { reason });
        return response.data;
    }
};

// Approved Bets Service (Daily Analysis)
export const betsService = {
    // Approve a bet from Daily Analysis
    approve: async (betData) => {
        const response = await api.post('/bets/approve', betData);
        return response.data;
    },
    // Get all approved bets
    getAll: async () => {
        const response = await api.get('/bets');
        return response.data;
    },
    // Get pending bets only
    getPending: async () => {
        const response = await api.get('/bets/pending');
        return response.data;
    },
    // Get stats only
    getStats: async () => {
        const response = await api.get('/bets/stats');
        return response.data;
    },
    // Settle a bet (WON/LOST)
    settle: async (betId, status, resultScore = null) => {
        const response = await api.post(`/bets/${betId}/settle`, { status, resultScore });
        return response.data;
    },
    // Delete a bet
    delete: async (betId) => {
        const response = await api.delete(`/bets/${betId}`);
        return response.data;
    },
    // Clear all bets
    clearAll: async () => {
        const response = await api.delete('/bets');
        return response.data;
    },
    // Get bets by market
    getByMarket: async (market) => {
        const response = await api.get(`/bets?market=${encodeURIComponent(market)}`);
        return response.data;
    }
};

// NBA Props Service
export const nbaService = {
    // Get today's games
    getGames: async () => {
        const response = await api.get('/nba/games');
        return response.data;
    },
    // Get all teams
    getTeams: async () => {
        const response = await api.get('/nba/teams');
        return response.data;
    },
    // Get team roster
    getRoster: async (teamId) => {
        const response = await api.get(`/nba/roster/${teamId}`);
        return response.data;
    },
    // Get player game logs
    getPlayerLogs: async (playerId, lastN = 20) => {
        const response = await api.get(`/nba/player/${playerId}/logs?lastN=${lastN}`);
        return response.data;
    },
    // Get player hit rates
    getHitRates: async (playerId, lines = {}, lastN = 20) => {
        const response = await api.post(`/nba/player/${playerId}/hit-rates`, { lines, lastN });
        return response.data;
    },
    // Search player by name
    searchPlayer: async (name) => {
        const response = await api.get(`/nba/player/search/${encodeURIComponent(name)}`);
        return response.data;
    }
};

export default api;

