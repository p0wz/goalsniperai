// API Base URL - auto-detect environment
export const API_URL = import.meta.env.VITE_API_URL ||
    (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://goalsniperai.onrender.com');

// App Config
export const APP_NAME = 'GoalSniper Pro';
export const APP_VERSION = '3.0';

// Plan limits
export const PLAN_LIMITS = {
    free: { signalsPerDay: 3, features: ['live_signals'] },
    pro: { signalsPerDay: 25, features: ['live_signals', 'history', 'coupon'] },
    premium: { signalsPerDay: -1, features: ['live_signals', 'history', 'coupon', 'api', 'priority'] }
};
