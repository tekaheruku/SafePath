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
  const [bannedUntil, setBannedUntil] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const router = useRouter();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === 'superadmin' || user.role === 'lgu_admin') {
        router.push('/admin/accounts');
      } else {
        router.push('/');
      }
    }
  }, [user, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBannedUntil(null);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/auth/login`, {
        email,
        password,
      });
      const { token, user } = res.data.data;
      login(token, user);
      
      if (user.role === 'superadmin' || user.role === 'lgu_admin') {
        router.push('/admin/accounts');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      if (errorData?.bannedUntil) {
        setBannedUntil(errorData.bannedUntil);
        setError(errorData.message);
      } else {
        setError(errorData?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg-start p-4">
      <div className="max-w-md w-full bg-theme-panel rounded-2xl p-8 border border-theme-border shadow-2xl">
        <h1 className="text-3xl font-bold text-theme-fg mb-2">Welcome Back</h1>
        <p className="text-theme-fg-muted mb-8">Sign in to report and track incidents</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Access Denied
            </div>
            <p className="font-medium text-theme-fg">{error}</p>
            {bannedUntil && (
              <div className="mt-2 pt-2 border-t border-red-500/20">
                <p className="text-theme-fg-muted text-[10px] uppercase font-bold tracking-widest mb-1">Time Remaining</p>
                <p className="text-2xl font-black text-theme-fg italic tabular-nums ">{timeLeft}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-theme-fg-muted mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-theme-panel/50 border border-theme-border rounded-lg px-4 py-3 text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-fg-muted mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full bg-theme-panel/50 border border-theme-border rounded-lg px-4 py-3 text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-theme-fg-muted text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-theme-accent hover:opacity-80 font-bold transition-all underline underline-offset-4 decoration-theme-accent/30">Create an account</a>
        </p>
      </div>
    </div>
  );
}
