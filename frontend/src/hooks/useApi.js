import { API_URL } from '../config';

export const useApi = () => {
    const fetchApi = async (endpoint, options = {}) => {
        const config = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API Error');
            }

            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const get = (endpoint) => fetchApi(endpoint, { method: 'GET' });
    const post = (endpoint, body) => fetchApi(endpoint, { method: 'POST', body });
    const put = (endpoint, body) => fetchApi(endpoint, { method: 'PUT', body });
    const del = (endpoint) => fetchApi(endpoint, { method: 'DELETE' });

    return { get, post, put, del, fetchApi };
};

export default useApi;
