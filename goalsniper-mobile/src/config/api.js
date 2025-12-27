// GoalSniper Mobile - API Configuration

// Production API (Render)
const API_BASE_URL = 'https://goalsniper-pro.onrender.com';

export const API_CONFIG = {
    BASE_URL: API_BASE_URL,
    baseUrl: API_BASE_URL,

    endpoints: {
        // Auth
        login: '/api/auth/login',
        register: '/api/auth/register',
        me: '/api/auth/me',

        // Signals
        liveSignals: '/api/signals',

        // Daily Analysis
        dailyAnalysis: '/api/daily-analysis',

        // Bets
        approvedBets: '/api/bets',
        settleBet: '/api/bets/settle',

        // Picks
        dailyPicks: '/api/picks/today',

        // Admin
        botStatus: '/api/admin/bot-status',
        toggleBot: '/api/admin/toggle-bot',
        syncPinecone: '/api/training-pool/sync-pinecone',

        // Stats
        stats: '/api/bets/stats',
    },

    timeout: 10000, // 10 seconds
};

export default API_CONFIG;
