'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import axios from 'axios';

type VerificationMethod = 'link' | 'otp';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('link');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login, user } = useAuth();
  
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
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
        verificationMethod,
      });
      // Redirect to check-email page; pass both email and method so the page knows what to show
      router.push(`/check-email?email=${encodeURIComponent(email)}&method=${verificationMethod}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg-start p-4">
      <div className="max-w-md w-full bg-theme-panel rounded-2xl p-8 border border-theme-border shadow-2xl">
        <h1 className="text-3xl font-bold text-theme-fg mb-2">Join SafePath</h1>
        <p className="text-theme-fg-muted mb-8">Create an account to start contributing</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-theme-fg-muted mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full bg-theme-panel border border-slate-700 rounded-lg px-4 py-3 text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-fg-muted mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-theme-panel border border-slate-700 rounded-lg px-4 py-3 text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
              className="w-full bg-theme-panel border border-slate-700 rounded-lg px-4 py-3 text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Verification Method Selector */}
          <div>
            <label className="block text-sm font-medium text-theme-fg-muted mb-3">
              Email Verification Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Magic Link */}
              <button
                type="button"
                id="verify-method-link"
                onClick={() => setVerificationMethod('link')}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left
                  ${verificationMethod === 'link'
                    ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                    : 'border-slate-700 bg-theme-panel hover:border-slate-600'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  verificationMethod === 'link' ? 'bg-indigo-500/20' : 'bg-slate-700/50'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke={verificationMethod === 'link' ? '#818cf8' : '#64748b'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${verificationMethod === 'link' ? 'text-indigo-300' : 'text-theme-fg'}`}>
                    Magic Link
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Click a link in your email
                  </p>
                </div>
                {verificationMethod === 'link' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>

              {/* OTP Code */}
              <button
                type="button"
                id="verify-method-otp"
                onClick={() => setVerificationMethod('otp')}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer text-left
                  ${verificationMethod === 'otp'
                    ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                    : 'border-slate-700 bg-theme-panel hover:border-slate-600'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  verificationMethod === 'otp' ? 'bg-violet-500/20' : 'bg-slate-700/50'
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke={verificationMethod === 'otp' ? '#a78bfa' : '#64748b'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${verificationMethod === 'otp' ? 'text-violet-300' : 'text-theme-fg'}`}>
                    OTP Code
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Enter a 6-digit code
                  </p>
                </div>
                {verificationMethod === 'otp' && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {verificationMethod === 'link'
                ? 'You\'ll receive a secure link valid for 24 hours.'
                : 'You\'ll receive a 6-digit code valid for 15 minutes.'}
            </p>
          </div>

          <button
            type="submit"
            id="register-submit-btn"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-theme-fg-muted text-sm">
          Already have an account?{' '}
          <a href="/login" className="text-theme-accent hover:opacity-80 font-bold transition-all underline underline-offset-4 decoration-theme-accent/30">Sign in instead</a>
        </p>
      </div>
    </div>
  );
}
