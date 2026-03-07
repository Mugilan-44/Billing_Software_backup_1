import axios from 'axios';

/**
 * Pre-configured axios instance for all API requests.
 * Uses Vite proxy so that all `/api/*` requests are forwarded
 * to the backend (no hardcoded host/port needed).
 *
 * Token is attached globally via AuthContext via:
 *   axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
 * so every instance (including this one) automatically carries the token.
 */
const api = axios.create({
    baseURL: '/',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
