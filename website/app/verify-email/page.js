'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext';
function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { login } = useAuth();
    const token = searchParams.get('token') || '';
    const [status, setStatus] = useState('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(5);
    const verify = useCallback(async () => {
        if (!token) {
            setStatus('error');
            setErrorMessage('No verification token found. Please check the link in your email.');
            return;
        }
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/verify-email?token=${token}`);
            const { user, token: jwtToken } = res.data.data;
            login(jwtToken, user);
            setStatus('success');
        }
        catch (err) {
            const msg = err.response?.data?.error?.message || 'Verification failed. The link may be invalid or expired.';
            setErrorMessage(msg);
            setStatus('error');
        }
    }, [token, login]);
    useEffect(() => {
        verify();
    }, [verify]);
    // Countdown redirect after success
    useEffect(() => {
        if (status !== 'success')
            return;
        if (countdown <= 0) {
            router.push('/');
            return;
        }
        const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(t);
    }, [status, countdown, router]);
    return (<div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center">

        {/* Verifying */}
        {status === 'verifying' && (<div>
            <div className="mx-auto mb-8 w-24 h-24 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <div className="w-10 h-10 border-[3px] border-slate-600 border-t-blue-500 rounded-full animate-spin"/>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Verifying your email...</h1>
            <p className="text-slate-500 text-sm">Please wait a moment.</p>
          </div>)}

        {/* Success */}
        {status === 'success' && (<div>
            <div className="relative mx-auto mb-8 w-24 h-24">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }}/>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Email Verified!</h1>
            <p className="text-slate-400 text-base leading-relaxed mb-8">
              Your account is now active. Welcome to SafePath!
            </p>
            <div className="space-y-3">
              <button id="goto-home-btn" onClick={() => router.push('/')} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25">
                Go to SafePath
              </button>
              <p className="text-slate-600 text-xs">
                Redirecting automatically in {countdown}s...
              </p>
            </div>
          </div>)}

        {/* Error */}
        {status === 'error' && (<div>
            <div className="mx-auto mb-8 w-24 h-24 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Verification Failed</h1>
            <p className="text-slate-400 text-base leading-relaxed mb-8">{errorMessage}</p>
            <div className="space-y-3">
              <a href="/register" className="block w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200 text-center">
                Create a new account
              </a>
              <a href="/check-email" className="block text-center text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors py-2">
                Resend verification email
              </a>
            </div>
          </div>)}

      </div>
    </div>);
}
export default function VerifyEmailPage() {
    return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"/>
      </div>}>
      <VerifyEmailContent />
    </Suspense>);
}
