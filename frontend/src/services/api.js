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
        return response.data;
    },
};

export const signalService = {
    getLiveSignals: async () => {
        const response = await api.get('/signals');
        return response.data;
    },
    getDailyAnalysis: async (force = false) => {
        const response = await api.get(`/daily-analysis?force=${force}`);
        return response.data;
    },
    approveSignal: async (id, data) => {
        const response = await api.post(`/daily-analysis/approve/${id}`, data);
        return response.data;
    },
    rejectSignal: async (id) => {
        const response = await api.post(`/daily-analysis/reject/${id}`);
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
    }
};

export default api;
