'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import axios from 'axios';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [bannedUntil, setBannedUntil] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const router = useRouter();
    const { login, user } = useAuth();
    useEffect(() => {
        if (user) {
            if (user.role === 'superadmin' || user.role === 'lgu_admin') {
                router.push('/admin/accounts');
            }
            else {
                router.push('/');
            }
        }
    }, [user, router]);
    useEffect(() => {
        let timer;
        if (bannedUntil) {
            const updateTimer = () => {
                const now = new Date();
                const end = new Date(bannedUntil);
                const diff = end.getTime() - now.getTime();
                if (diff <= 0) {
                    setBannedUntil(null);
                    setError('');
                    return;
                }
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}hrs ${minutes}m ${seconds}s`);
            };
            updateTimer();
            timer = setInterval(updateTimer, 1000);
        }
        return () => clearInterval(timer);
    }, [bannedUntil]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setBannedUntil(null);
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/login`, {
                email,
                password,
            });
            const { token, user } = res.data.data;
            login(token, user);
            if (user.role === 'superadmin' || user.role === 'lgu_admin') {
                router.push('/admin/accounts');
            }
            else {
                router.push('/');
            }
        }
        catch (err) {
            const errorData = err.response?.data?.error;
            if (errorData?.bannedUntil) {
                setBannedUntil(errorData.bannedUntil);
                setError(errorData.message);
            }
            else {
                setError(errorData?.message || 'Login failed');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-slate-400 mb-8">Sign in to report and track incidents</p>

        {error && (<div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
              Access Denied
            </div>
            <p className="font-medium text-slate-200">{error}</p>
            {bannedUntil && (<div className="mt-2 pt-2 border-t border-red-500/20">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Time Remaining</p>
                <p className="text-2xl font-black text-white italic tabular-nums ">{timeLeft}</p>
              </div>)}
          </div>)}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input type="email" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Create an account</a>
        </p>
      </div>
    </div>);
}
