'use client';

import React, { useState } from 'react';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/request-password-reset`,
        { email }
      );
    } catch {
      // Silently ignore errors to prevent email enumeration
    } finally {
      setLoading(false);
      setSubmitted(true); // Always show success UI
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full">

        {!submitted ? (
          <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl">
            {/* Header */}
            <div className="mb-8">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Forgot your password?</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                No worries! Enter the email address linked to your account and we&apos;ll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="block text-xs font-bold text-slate-300 uppercase tracking-widest pl-1">
                  Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                id="reset-request-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : 'Send reset link'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/login" className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors">
                ← Back to sign in
              </a>
            </div>
          </div>

        ) : (
          /* Success state */
          <div className="text-center">
            <div className="relative mx-auto mb-8 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="2 6.5 12 13.5 22 6.5" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Check your inbox</h1>
            <p className="text-slate-400 text-base leading-relaxed mb-2">
              If an account exists for
            </p>
            <p className="text-amber-400 font-semibold text-base mb-6 break-all">{email}</p>
            <p className="text-slate-500 text-sm leading-relaxed mb-10">
              you&apos;ll receive a password reset link shortly.<br />
              The link expires in <span className="text-slate-300 font-medium">1 hour</span>.
            </p>
            <a
              href="/login"
              className="inline-block bg-slate-800 hover:bg-slate-700 text-white font-semibold px-8 py-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200"
            >
              Back to sign in
            </a>
          </div>
        )}

      </div>
    </div>
  );
}
