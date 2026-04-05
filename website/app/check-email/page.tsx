'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || resending || cooldown > 0) return;
    setResending(true);
    setResendStatus('idle');
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/resend-verification`, { email });
      setResendStatus('success');
      setCooldown(60);
    } catch {
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center">

        {/* Icon */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <polyline points="2 6.5 12 13.5 22 6.5" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-white mb-3">Check your inbox</h1>
        <p className="text-slate-400 text-base leading-relaxed mb-2">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-blue-400 font-semibold text-base mb-6 break-all">{email}</p>
        )}
        <p className="text-slate-500 text-sm leading-relaxed mb-10">
          Click the link in the email to activate your account.<br />
          The link expires in <span className="text-slate-300 font-medium">24 hours</span>.
        </p>

        {/* Resend button */}
        <div className="space-y-3">
          {resendStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              New verification email sent!
            </div>
          )}
          {resendStatus === 'error' && (
            <div className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Failed to resend. Please try again.
            </div>
          )}

          <button
            id="resend-verification-btn"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-300 rounded-full animate-spin" />
                Sending...
              </span>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              'Resend verification email'
            )}
          </button>

          <a
            href="/login"
            className="block text-center text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors py-2"
          >
            Back to sign in
          </a>
        </div>

        {/* Tips */}
        <div className="mt-10 p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Didn&apos;t receive it?</p>
          <div className="flex items-start gap-2 text-slate-500 text-xs">
            <span className="text-slate-600 mt-0.5">•</span>
            Check your <span className="text-slate-400 mx-1">Spam</span> or <span className="text-slate-400 mx-1">Junk</span> folder
          </div>
          <div className="flex items-start gap-2 text-slate-500 text-xs">
            <span className="text-slate-600 mt-0.5">•</span>
            Make sure the email address above is correct
          </div>
          <div className="flex items-start gap-2 text-slate-500 text-xs">
            <span className="text-slate-600 mt-0.5">•</span>
            Wait a few minutes — it can take up to 5 minutes
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  );
}
