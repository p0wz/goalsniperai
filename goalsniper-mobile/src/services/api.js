// GoalSniper Mobile - API Service

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import API_CONFIG from '../config/api';

const api = axios.create({
    baseURL: API_CONFIG.baseUrl,
    timeout: API_CONFIG.timeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - add auth token
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired - clear storage
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('userId');
        }
        return Promise.reject(error);
    }
);

// Auth Service
export const authService = {
    login: async (email, password) => {
        const response = await api.post(API_CONFIG.endpoints.login, { email, password });
        if (response.data.token) {
            await SecureStore.setItemAsync('authToken', response.data.token);
            await SecureStore.setItemAsync('userId', response.data.user.id);
        }
        return response.data;
    },

    register: async (email, password, name) => {
        const response = await api.post(API_CONFIG.endpoints.register, { email, password, name });
        return response.data;
    },

    getMe: async () => {
        const response = await api.get(API_CONFIG.endpoints.me);
        return response.data;
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userId');
    },

    isLoggedIn: async () => {
        const token = await SecureStore.getItemAsync('authToken');
        return !!token;
    },
};

// Signals Service
export const signalService = {
    getLiveSignals: async () => {
        const response = await api.get(API_CONFIG.endpoints.liveSignals);
        return response.data;
    },

    getDailyAnalysis: async (force = false, leagueFilter = true) => {
        const response = await api.get(`${API_CONFIG.endpoints.dailyAnalysis}?force=${force}&leagueFilter=${leagueFilter}`);
        return response.data;
    },
};

// Bets Service
export const betsService = {
    getApprovedBets: async () => {
        const response = await api.get(API_CONFIG.endpoints.approvedBets);
        return response.data;
    },

    approve: async (betData) => {
        const response = await api.post(API_CONFIG.endpoints.approvedBets, betData);
        return response.data;
    },

    settle: async (betId, status, resultScore) => {
        const response = await api.post(`${API_CONFIG.endpoints.approvedBets}/${betId}/settle`, { status, resultScore });
        return response.data;
    },

    getStats: async () => {
        const response = await api.get(API_CONFIG.endpoints.stats);
        return response.data;
    },
};

// Picks Service
export const picksService = {
    getTodayPicks: async () => {
        const response = await api.get(API_CONFIG.endpoints.dailyPicks);
        return response.data;
    },
};

// Admin Service
export const adminService = {
    getBotStatus: async () => {
        const response = await api.get(API_CONFIG.endpoints.botStatus);
        return response.data;
    },

    toggleBot: async () => {
        const response = await api.post(API_CONFIG.endpoints.toggleBot);
        return response.data;
    },

    syncPinecone: async () => {
        const response = await api.post(API_CONFIG.endpoints.syncPinecone);
        return response.data;
    },
};

export default api;
