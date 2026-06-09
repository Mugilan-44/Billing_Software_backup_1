import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '';

// Configure global axios instance so direct axios imports also use this base URL
axios.defaults.baseURL = API_URL;

console.log('=== Billing System Startup Diagnostics ===');
console.log('Current Mode:', import.meta.env.MODE);
console.log('Current API Base URL:', API_URL || '(relative / local proxy)');
console.log('Is Production:', import.meta.env.PROD);
console.log('==========================================');

/**
 * Pre-configured axios instance for all API requests.
 */
const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
