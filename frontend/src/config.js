// API Configuration
// If VITE_API_URL is set (in .env), use it.
// Otherwise, default to relative path (for local dev / same-domain deployment)
export const API_URL = import.meta.env.VITE_API_URL || '';
export const BASE_URL = API_URL;  // Alias for backward compatibility

export default API_URL;

