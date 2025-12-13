import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Check auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) setUser(data.user);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                navigate('/dashboard');
                return { success: true };
            }
            setError(data.error);
            return { success: false, error: data.error };
        } catch (err) {
            setError('Bağlantı hatası');
            return { success: false, error: 'Bağlantı hatası' };
        }
    };

    const register = async (email, password, name) => {
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, name })
            });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
                navigate('/dashboard');
                return { success: true };
            }
            setError(data.error);
            return { success: false, error: data.error };
        } catch (err) {
            setError('Bağlantı hatası');
            return { success: false, error: 'Bağlantı hatası' };
        }
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
        } catch (err) {
            console.error('Logout error:', err);
        }
        setUser(null);
        navigate('/');
    };

    const value = {
        user,
        loading,
        error,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
