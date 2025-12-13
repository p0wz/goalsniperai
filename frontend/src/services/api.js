import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api', // Use env var in prod, proxy in dev
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
    }
};

export const adminService = {
    // Add admin methods here
};

export default api;
