'use client';

import React, { useState } from 'react';
import { useSettingsStore, ThemeType } from '../../store/useSettingsStore';
import { useAuth } from '../../components/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { theme, setTheme } = useSettingsStore();
  const { user, token, loading, updateUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'appearance' | 'security'>('appearance');

  // Password / 2FA States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2FA state from user object
  const is2faEnabled = user?.two_factor_enabled || false;

  // OTP flow for changing password when 2FA is enabled
  const [otpMode, setOtpMode] = useState(false);
  const [otpToken, setOtpToken] = useState('');

  // Protect the route
  if (!loading && !user) {
    router.replace('/login');
    return null;
  }

  // Define API Client correctly
  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleToggle2FA = async () => {
    try {
      setIsSubmitting(true);
      setMessage(null);
      await apiClient.post('/auth/toggle-2fa', { enable: !is2faEnabled });
      updateUser({ two_factor_enabled: !is2faEnabled });
      setIsSubmitting(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to toggle 2FA' });
      setIsSubmitting(false);
    }
  };

  const initiatePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    if (is2faEnabled && !otpMode) {
      // Step 1: Send OTP to their email, switch to OTP mode.
      setIsSubmitting(true);
      setMessage(null);
      try {
        await apiClient.post('/auth/request-password-reset', { email: user?.email });
        setOtpMode(true);
        setMessage({ type: 'success', text: 'OTP sent to your email. Please enter it below.' });
      } catch (err: any) {
        setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to send OTP code.' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Standard change (or Step 2 of 2FA if otpMode is true)
    submitFinalPasswordChange();
  };

  const submitFinalPasswordChange = async () => {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const payload: any = { newPassword };
      if (is2faEnabled) {
        payload.otpToken = otpToken;
      } else {
        payload.oldPassword = oldPassword;
      }

      const response = await apiClient.post('/auth/change-password', payload);
      setMessage({ type: 'success', text: response.data.data.message || 'Password changed successfully' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpToken('');
      setOtpMode(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to update password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Settings</h1>
        <p className="text-slate-400 mt-2">Manage your preferences and security.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === 'appearance' 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                : 'text-slate-400 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="text-xl">🎨</span> Appearance
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === 'security' 
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                : 'text-slate-400 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="text-xl">🔒</span> Security & Login
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 glass-panel rounded-2xl p-6 sm:p-10 border border-white/5 shadow-2xl">
          {activeTab === 'appearance' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Interface Theme</h2>
              <p className="text-slate-400 text-sm mb-8">
                Customize the look and feel of your SafePath application.
              </p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(['white', 'dark-blue', 'dark-slate', 'dark'] as ThemeType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`flex flex-col items-center gap-4 p-6 rounded-2xl border transition-all ${
                      theme === t 
                        ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)] scale-105' 
                        : 'bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full border-4 shadow-xl ${
                      t === 'dark' ? 'bg-[#000000] border-slate-800' :
                      t === 'dark-slate' ? 'bg-[#0f172a] border-slate-700' :
                      t === 'dark-blue' ? 'bg-[#1e1b4b] border-indigo-500/50' :
                      'bg-[#ffffff] border-slate-200'
                    }`} />
                    <span className={`text-sm font-bold capitalize ${theme === t ? 'text-indigo-400' : 'text-slate-300'}`}>
                      {t.replace('-', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-10">
              
              {/* Two-Factor Auth Box */}
              <section className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Two-Factor Authentication 
                      {is2faEnabled ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-emerald-500/30">Active</span>
                      ) : (
                        <span className="bg-slate-500/20 text-slate-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-slate-500/30">Disabled</span>
                      )}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-lg">
                      Require an email verification code when changing your password. Adds an extra layer of security.
                    </p>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={isSubmitting}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                       is2faEnabled ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      is2faEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </section>

              {/* Password Box */}
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Change Password</h3>
                  <p className="text-slate-400 text-sm">Update your account password. {is2faEnabled ? 'Two-Factor Authentication will require an email code.' : ''}</p>
                </div>

                <form onSubmit={initiatePasswordChange} className="max-w-md space-y-4">
                  
                  {!is2faEnabled && !otpMode && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Current Password</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  {otpMode && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">6-Digit Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpToken}
                        onChange={(e) => setOtpToken(e.target.value)}
                        className="w-full bg-indigo-500/10 border border-indigo-500/50 rounded-xl p-3 text-sm text-center tracking-[0.5em] font-mono font-bold text-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="XXXXXX"
                      />
                      <p className="text-[10px] text-indigo-400">Sent to {user?.email}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="••••••••"
                    />
                  </div>

                  {message && (
                    <div className={`p-4 rounded-xl text-sm font-bold ${
                      message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Processing...' : (otpMode ? 'Verify & Change Password' : 'Change Password')}
                    </button>
                    {otpMode && (
                      <button
                        type="button"
                        onClick={() => { setOtpMode(false); setOtpToken(''); setMessage(null); }}
                        className="w-full mt-3 text-slate-400 hover:text-white text-sm py-2"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </form>
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
