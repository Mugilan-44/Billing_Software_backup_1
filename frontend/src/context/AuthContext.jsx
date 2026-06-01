import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import axios from '../utils/api';

export const AuthContext = createContext();

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);

// Returns the home dashboard path
export const getRedirectPath = (role) => {
    if (role === 'SUPER_ADMIN') {
        return '/admin';
    }
    return '/dashboard';
};

// Returns the login path
export const getLoginPath = () => {
    return '/login';
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            response => response,
            async error => {
                const originalRequest = error.config;
                // Avoid infinite refresh loops by checking if the request has already been retried
                if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/api/auth/login' && originalRequest.url !== '/api/auth/refresh-token') {
                    originalRequest._retry = true;
                    try {
                        const storedRefreshToken = localStorage.getItem('refreshToken');
                        if (storedRefreshToken) {
                            const res = await api.post('/api/auth/refresh-token', { refreshToken: storedRefreshToken });
                            if (res.data.success) {
                                const { accessToken } = res.data;
                                setToken(accessToken);
                                localStorage.setItem('token', accessToken);
                                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                                axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                                return api(originalRequest);
                            }
                        }
                    } catch (refreshError) {
                        console.error('Silent token refresh failed:', refreshError);
                        logout();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            api.interceptors.response.eject(interceptor);
        };
    }, []);

    useEffect(() => {
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
            fetchUser();
        } else {
            delete api.defaults.headers.common['Authorization'];
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const res = await api.get('/api/auth/profile');
            const { user: userData, company, subscription } = res.data.data;
            const fullUser = {
                ...userData,
                companyId: company ? { 
                    ...company, 
                    subscriptionEndDate: subscription?.expiryDate, 
                    subscriptionStatus: subscription?.status 
                } : null
            };
            setUser(fullUser);
        } catch (error) {
            console.warn('Access token expired, attempting silent refresh...', error.message);
            await tryRefreshToken();
        } finally {
            setLoading(false);
        }
    };

    const tryRefreshToken = async () => {
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
            logout();
            return;
        }

        try {
            const res = await api.post('/api/auth/refresh-token', { refreshToken: storedRefreshToken });
            if (res.data.success) {
                const { accessToken } = res.data;
                setToken(accessToken);
                localStorage.setItem('token', accessToken);
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                
                // Re-fetch profile
                const profileRes = await api.get('/api/auth/profile');
                const { user: userData, company, subscription } = profileRes.data.data;
                const fullUser = {
                    ...userData,
                    companyId: company ? { 
                        ...company, 
                        subscriptionEndDate: subscription?.expiryDate, 
                        subscriptionStatus: subscription?.status 
                    } : null
                };
                setUser(fullUser);
            } else {
                logout();
            }
        } catch (err) {
            console.error('Refresh token expired or invalid:', err.message);
            logout();
        }
    };

    // Unified login endpoint
    const loginUser = async (email, password) => {
        delete api.defaults.headers.common['Authorization'];
        delete axios.defaults.headers.common['Authorization'];
        const res = await api.post('/api/auth/login', { email, password });
        if (res.data.success) {
            _setSession(res.data.data);
            return res.data;
        }
        throw new Error(res.data.message || 'Login failed');
    };

    const _setSession = (data) => {
        const { accessToken, refreshToken: newRefreshToken, user: userData, company, subscription } = data;
        
        setToken(accessToken);
        localStorage.setItem('token', accessToken);
        if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
        }
        
        const fullUser = {
            ...userData,
            companyId: company ? { 
                ...company, 
                subscriptionEndDate: subscription?.expiryDate, 
                subscriptionStatus: subscription?.status 
            } : null
        };
        
        setUser(fullUser);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            loginUser, logout,
            getRedirectPath, getLoginPath
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
