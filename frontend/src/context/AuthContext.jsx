import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// Custom hook for easy access
export const useAuth = () => useContext(AuthContext);

// Returns the home dashboard path
export const getRedirectPath = (role) => {
    return '/dashboard';
};

// Returns the login path
export const getLoginPath = (role) => {
    return '/login';
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('token', token);
            fetchUser();
        } else {
            delete axios.defaults.headers.common['Authorization'];
            localStorage.removeItem('token');
            setUser(null);
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const res = await axios.get('/api/auth/profile');
            setUser(res.data.data);
        } catch (error) {
            console.error('Session expired or invalid token:', error.message);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Unified login endpoint
    const loginUser = async (email, password) => {
        delete axios.defaults.headers.common['Authorization'];
        const res = await axios.post('/api/auth/login', { email, password });
        if (res.data.success) {
            _setSession(res.data.data);
            return res.data;
        }
        throw new Error(res.data.message || 'Login failed');
    };

    const _setSession = (data) => {
        const { token: newToken, ...userData } = data;
        setToken(newToken);
        setUser(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    // Registration (for seeding SUPER_ADMIN from UI or creating admins)
    const register = async (name, email, password, role = 'ADMIN') => {
        delete axios.defaults.headers.common['Authorization'];
        const res = await axios.post('/api/auth/register', { name, email, password, role });
        if (res.data.success) {
            _setSession(res.data.data);
            return res.data;
        }
        throw new Error(res.data.message || 'Registration failed');
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user, token, loading,
            loginUser, register, logout,
            getRedirectPath, getLoginPath
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
