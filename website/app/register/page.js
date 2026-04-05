'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import axios from 'axios';
export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login, user } = useAuth();
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const trimmedName = name.trim();
        if (!trimmedName || trimmedName.length < 3) {
            setError('Please enter your full name (at least 3 characters).');
            setLoading(false);
            return;
        }
        if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
            setError('Name can only contain letters and spaces.');
            setLoading(false);
            return;
        }
        // Basic email validation match with backend
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address (e.g., user@example.com)');
            setLoading(false);
            return;
        }
        // Client-side profanity check (Basic)
        const basicVulgarWords = ['fuck', 'shit', 'gago', 'tanga', 'nigger', 'nigga', 'puta', 'bitch'];
        const nameCheck = trimmedName.toLowerCase().replace(/[^a-z]/g, '');
        if (basicVulgarWords.some(word => nameCheck.includes(word))) {
            setError('Please use a professional name. Offensive language is not allowed.');
            setLoading(false);
            return;
        }
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/register`, {
                email,
                password,
                name: trimmedName,
            });
            // Redirect to check-email page (Option B: hard gate — must verify before login)
            router.push(`/check-email?email=${encodeURIComponent(email)}`);
        }
        catch (err) {
            setError(err.response?.data?.error?.message || 'Registration failed');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Join SafePath</h1>
        <p className="text-slate-400 mb-8">Create an account to start contributing</p>

        {error && (<div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>)}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input type="email" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}/>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)}/>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-slate-500 text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in instead</a>
        </p>
      </div>
    </div>);
}
