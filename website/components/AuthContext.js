'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
const AuthContext = createContext(undefined);
const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
});
export const AuthProvider = ({ children }) => {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const savedToken = localStorage.getItem('safepath_token');
        if (savedToken) {
            setToken(savedToken);
            fetchUser(savedToken);
        }
        else {
            setLoading(false);
        }
    }, []);
    const fetchUser = async (t) => {
        try {
            const res = await apiClient.get('/auth/me', {
                headers: { Authorization: `Bearer ${t}` },
            });
            setUser(res.data.data);
        }
        catch (err) {
            console.error('Failed to fetch user:', err);
            logout();
        }
        finally {
            setLoading(false);
        }
    };
    const login = (t, u) => {
        setToken(t);
        setUser(u);
        localStorage.setItem('safepath_token', t);
    };
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('safepath_token');
        router.push('/');
    };
    return (<AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
