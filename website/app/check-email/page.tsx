'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth } from '../../components/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const emailFromUrl = searchParams.get('email') || '';
  const methodFromUrl = searchParams.get('method') === 'otp' ? 'otp' : 'link';

  const [emailInput, setEmailInput] = useState('');
  const effectiveEmail = emailFromUrl || emailInput;

  // OTP input state — 6 individual digit slots
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyError, setVerifyError] = useState('');

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [resendErrorMsg, setResendErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const otp = otpDigits.join('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- OTP digit input handlers ---
  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
    // Reset verify status when editing
    setVerifyStatus('idle');
    setVerifyError('');
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    digitRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // --- Verify OTP ---
  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !effectiveEmail) return;
    setVerifying(true);
    setVerifyStatus('idle');
    setVerifyError('');

    try {
      const res = await axios.post(`${API}/auth/verify-email-otp`, {
        email: effectiveEmail,
        otp,
      });
      const { user, token: jwtToken } = res.data.data;
      login(jwtToken, user);
      setVerifyStatus('success');
      // Redirect after short delay
      setTimeout(() => router.push('/'), 1800);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Invalid code. Please try again.';
      setVerifyError(msg);
      setVerifyStatus('error');
    } finally {
      setVerifying(false);
    }
  };

  // --- Resend ---
  const handleResend = async () => {
    if (!effectiveEmail || resending || cooldown > 0) return;
    setResending(true);
    setResendStatus('idle');
    setResendErrorMsg('');
    try {
      await axios.post(`${API}/auth/resend-verification`, {
        email: effectiveEmail,
        verificationMethod: methodFromUrl,
      });
      setResendStatus('success');
      setCooldown(60);
      // Reset OTP digits on resend
      if (methodFromUrl === 'otp') {
        setOtpDigits(['', '', '', '', '', '']);
        setVerifyStatus('idle');
        setVerifyError('');
        digitRefs.current[0]?.focus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to resend. Please try again.';
      setResendErrorMsg(msg);
      setResendStatus('error');
    } finally {
      setResending(false);
    }
  };

  // --- Success view ---
  if (verifyStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-start p-4">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-theme-fg mb-3">Email Verified!</h1>
          <p className="text-theme-fg-muted text-base mb-4">Your account is now active. Welcome to SafePath!</p>
          <p className="text-slate-500 text-sm">Redirecting you now...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg-start p-4">
      <div className="max-w-md w-full text-center">

        {/* Icon */}
        <div className="relative mx-auto mb-8 w-24 h-24">
          <div className={`absolute inset-0 rounded-full animate-ping ${methodFromUrl === 'otp' ? 'bg-violet-500/20' : 'bg-blue-500/20'}`} />
          <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center shadow-2xl ${
            methodFromUrl === 'otp'
              ? 'from-violet-500 to-purple-600 shadow-violet-500/30'
              : 'from-blue-500 to-indigo-600 shadow-blue-500/30'
          }`}>
            {methodFromUrl === 'otp' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <polyline points="2 6.5 12 13.5 22 6.5" />
              </svg>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-theme-fg mb-3">
          {methodFromUrl === 'otp' ? 'Enter your code' : 'Check your inbox'}
        </h1>
        <p className="text-theme-fg-muted text-base leading-relaxed mb-2">
          {methodFromUrl === 'otp'
            ? 'We sent a 6-digit verification code to'
            : 'We sent a verification link to'}
        </p>

        {emailFromUrl ? (
          <p className={`font-semibold text-base mb-6 break-all ${methodFromUrl === 'otp' ? 'text-violet-400' : 'text-blue-400'}`}>
            {emailFromUrl}
          </p>
        ) : (
          <div className="mb-6 text-left">
            <p className="text-orange-400 text-sm font-medium mb-3">
              We couldn&apos;t detect your email address. Enter it below to continue.
            </p>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-theme-panel border border-slate-700 rounded-xl px-4 py-3 text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            />
          </div>
        )}

        {/* OTP Mode: digit input + verify button */}
        {methodFromUrl === 'otp' && (
          <div className="mb-8">
            <p className="text-theme-fg-muted text-sm mb-5">
              The code expires in <span className="text-theme-fg font-medium">15 minutes</span>.
            </p>

            {/* Digit inputs */}
            <div className="flex items-center justify-center gap-3 mb-5" onPaste={handleDigitPaste}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-digit-${i}`}
                  ref={(el) => { digitRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-theme-panel text-theme-fg outline-none transition-all duration-200
                    ${verifyStatus === 'error' ? 'border-red-500/70 bg-red-500/5' : digit ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 focus:border-violet-400'}`}
                />
              ))}
            </div>

            {/* Error */}
            {verifyStatus === 'error' && (
              <div className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm font-medium mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {verifyError}
              </div>
            )}

            {/* Verify button */}
            <button
              id="verify-otp-btn"
              onClick={handleVerifyOtp}
              disabled={otp.length !== 6 || verifying || !effectiveEmail}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Account'
              )}
            </button>
          </div>
        )}

        {/* Link Mode: instructions */}
        {methodFromUrl === 'link' && (
          <p className="text-theme-fg-muted text-sm leading-relaxed mb-10">
            Click the link in the email to activate your account.<br />
            The link expires in <span className="text-theme-fg-muted font-medium">24 hours</span>.
          </p>
        )}

        {/* Resend section */}
        <div className="space-y-3">
          {resendStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {methodFromUrl === 'otp' ? 'New code sent!' : 'New verification email sent!'}
            </div>
          )}
          {resendStatus === 'error' && (
            <div className="flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {resendErrorMsg}
            </div>
          )}

          <button
            id="resend-verification-btn"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || (!emailFromUrl && !emailInput)}
            className="w-full bg-theme-panel hover:bg-theme-border-hover text-theme-fg font-semibold py-3.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-300 rounded-full animate-spin" />
                Sending...
              </span>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              methodFromUrl === 'otp' ? 'Resend code' : 'Resend verification email'
            )}
          </button>

          <a
            href="/login"
            className="block text-center text-theme-fg-muted hover:text-theme-fg-muted text-sm font-medium transition-colors py-2"
          >
            Back to sign in
          </a>
        </div>

        {/* Tips */}
        <div className="mt-10 p-4 bg-theme-panel border border-theme-border rounded-xl text-left space-y-2">
          <p className="text-xs font-semibold text-theme-fg-muted uppercase tracking-widest mb-3">Didn&apos;t receive it?</p>
          <div className="flex items-start gap-2 text-theme-fg-muted text-xs">
            <span className="text-slate-600 mt-0.5">•</span>
            Check your <span className="text-theme-fg-muted mx-1">Spam</span> or <span className="text-theme-fg-muted mx-1">Junk</span> folder
          </div>
          <div className="flex items-start gap-2 text-theme-fg-muted text-xs">
            <span className="text-slate-600 mt-0.5">•</span>
            Make sure the email address above is correct
          </div>
          <div className="flex items-start gap-2 text-theme-fg-muted text-xs">
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
      <div className="min-h-screen flex items-center justify-center bg-theme-bg-start">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  );
}
