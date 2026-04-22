'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  onLoginSuccess?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  message = "Please sign in to submit a rating.",
  onLoginSuccess 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/auth/login`, {
        email,
        password,
      });
      const { token, user } = res.data.data;
      login(token, user);
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-theme-bg-start/60 backdrop-blur-[6px] transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-theme-panel border border-theme-border rounded-2xl shadow-2xl overflow-hidden relative transform transition-all animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-theme-fg-muted hover:text-theme-fg p-1 rounded-full hover:bg-theme-panel transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-theme-fg mb-2 leading-tight">Sign In Required</h2>
            <p className="text-theme-fg-muted text-sm font-medium">{message}</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-theme-fg-muted uppercase tracking-widest pl-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full bg-theme-panel/50 border border-theme-border rounded-xl px-4 py-3 text-theme-fg placeholder-theme-fg-muted/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-theme-fg-muted uppercase tracking-widest pl-1">Password</label>
                <a
                  href="/forgot-password"
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  onClick={onClose}
                >
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                className="w-full bg-theme-panel/50 border border-theme-border rounded-xl px-4 py-3 text-theme-fg placeholder-theme-fg-muted/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-theme-fg-muted text-sm font-medium">
            Don&apos;t have an account?{' '}
            <a 
              href="/register"
              onClick={onClose}
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors underline underline-offset-4 decoration-blue-400/30 hover:decoration-blue-300"
            >
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
