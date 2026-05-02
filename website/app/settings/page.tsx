'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore, ThemeType } from '../../store/useSettingsStore';
import { useAuth } from '../../components/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { theme, setTheme } = useSettingsStore();
  const { user, token, loading, updateUser } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security'>('profile');

  // Profile States
  const [name, setName] = useState(user?.name || '');
  const [address, setAddress] = useState(user?.address || '');
  const [birthday, setBirthday] = useState(user?.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '');
  const [phone, setPhone] = useState(user?.phone_number || '');

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

  // ID Verification States
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [isUploadingId, setIsUploadingId] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAddress(user.address || '');
      setBirthday(user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '');
      setPhone(user.phone_number || '');
    }

    // Handle hash routing
    const hash = window.location.hash.replace('#', '');
    if (hash === 'profile' || hash === 'appearance' || hash === 'security') {
      setActiveTab(hash as any);
    }
  }, [user]);

  // If not logged in, ensure we stay on appearance tab
  if (!loading && !user && activeTab !== 'appearance') {
    setActiveTab('appearance');
  }

  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await apiClient.patch('/auth/profile', {
        name,
        address,
        birthday,
        phone_number: phone
      });
      updateUser(res.data.data);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const uploadId = async (front: File, back: File) => {
    setIsUploadingId(true);
    setMessage(null);
    try {
      // 1. Upload front
      const formDataFront = new FormData();
      formDataFront.append('photo', front);
      const resFront = await apiClient.post('/upload', formDataFront);
      
      // 2. Upload back
      const formDataBack = new FormData();
      formDataBack.append('photo', back);
      const resBack = await apiClient.post('/upload', formDataBack);

      // 3. Submit verification
      await apiClient.post('/auth/verify-id', {
        frontUrl: resFront.data.url,
        backUrl: resBack.data.url
      });

      updateUser({ id_verification_status: 'pending' });
      setMessage({ type: 'success', text: 'ID verification submitted successfully' });
      setIdFront(null);
      setIdBack(null);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to upload ID' });
    } finally {
      setIsUploadingId(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'pending': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'not_verified': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'banned': 
      case 'suspended': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-theme-fg-muted bg-theme-panel border-theme-border';
    }
  };

  const getVerificationLabel = (status: string) => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'pending': return 'Verification Pending';
      case 'not_verified': return 'Not Verified';
      default: return status;
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'user') return 'Regular User';
    if (role === 'lgu_admin' || role === 'superadmin') return 'Admin';
    return role.replace('_', ' ');
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
          {user?.role === 'user' ? 'User Profile' : 'Admin Profile'}
        </h1>
        <p className="text-theme-fg-muted mt-2">Manage your personal information and account settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 space-y-2">
          {user && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === 'profile' 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                  : 'text-theme-fg-muted hover:bg-theme-border border border-transparent'
              }`}
            >
              <span className="text-xl">👤</span> Personal Info
            </button>
          )}
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === 'appearance' 
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                : 'text-theme-fg-muted hover:bg-theme-border border border-transparent'
            }`}
          >
            <span className="text-xl">🎨</span> Appearance
          </button>
          {user && (
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                activeTab === 'security' 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-theme-fg-muted hover:bg-theme-border border border-transparent'
              }`}
            >
              <span className="text-xl">🔒</span> Security & Login
            </button>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 glass-panel rounded-2xl p-6 sm:p-10 border border-theme-border shadow-2xl overflow-hidden">
          {message && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
              message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && user && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-theme-fg mb-2">Personal Information</h2>
                <p className="text-theme-fg-muted text-sm">Update your basic profile details.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-blue-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-theme-bg-start/50 border border-theme-border rounded-xl p-3 text-sm text-theme-fg-muted cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Address</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Birthday</label>
                      <input
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-blue-500/50 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-blue-500/50 outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-theme-fg font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>

                <div className="space-y-6">
                  <div className="bg-theme-glass-bg p-6 rounded-2xl border border-theme-border space-y-4">
                    <h3 className="font-bold text-theme-fg uppercase tracking-widest text-xs">Account Status</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-theme-fg-muted">Role</span>
                        <span className="text-sm font-bold text-blue-400 capitalize bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                          {getRoleLabel(user.role)}
                        </span>
                      </div>

                      {user.role !== 'superadmin' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-theme-fg-muted">ID Verification</span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(user.id_verification_status)}`}>
                            {getVerificationLabel(user.id_verification_status)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-theme-fg-muted">Account Status</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(user.account_status)}`}>
                          {user.account_status}
                        </span>
                      </div>
                    </div>

                    {user.role !== 'superadmin' && user.id_verification_status === 'not_verified' && (
                      <div className="pt-4 border-t border-theme-border mt-4">
                        <p className="text-xs text-theme-fg-muted mb-4">Upload your ID to unlock all features and increase trust.</p>
                        <div className="grid grid-cols-2 gap-3">
                          <label className={`cursor-pointer group relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all ${idFront ? 'border-blue-500 bg-blue-500/5' : 'border-theme-border hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
                            <input 
                              type="file" accept="image/*" capture="environment" hidden 
                              onChange={(e) => e.target.files?.[0] && setIdFront(e.target.files[0])} 
                            />
                            <span className="text-xl mb-1">{idFront ? '✅' : '📷'}</span>
                            <span className="text-[10px] font-bold text-center">{idFront ? 'Front Ready' : 'Capture Front'}</span>
                          </label>
                          <label className={`cursor-pointer group relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all ${idBack ? 'border-blue-500 bg-blue-500/5' : 'border-theme-border hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
                            <input 
                              type="file" accept="image/*" capture="environment" hidden 
                              onChange={(e) => e.target.files?.[0] && setIdBack(e.target.files[0])} 
                            />
                            <span className="text-xl mb-1">{idBack ? '✅' : '📷'}</span>
                            <span className="text-[10px] font-bold text-center">{idBack ? 'Back Ready' : 'Capture Back'}</span>
                          </label>
                        </div>
                        {idFront && idBack && (
                          <button
                            onClick={() => uploadId(idFront, idBack)}
                            disabled={isUploadingId}
                            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-theme-fg text-xs font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-600/20"
                          >
                            {isUploadingId ? 'Uploading...' : 'Submit for Verification'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-2xl font-bold text-theme-fg mb-6">Interface Theme</h2>
              <p className="text-theme-fg-muted text-sm mb-8">
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
                        : 'bg-theme-glass-bg border-theme-border hover:border-white/20 hover:bg-theme-border'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-full border-4 shadow-xl ${
                      t === 'dark' ? 'bg-[#000000] border-theme-border' :
                      t === 'dark-slate' ? 'bg-[#0f172a] border-slate-700' :
                      t === 'dark-blue' ? 'bg-[#1e1b4b] border-indigo-500/50' :
                      'bg-[#ffffff] border-slate-200'
                    }`} />
                    <span className={`text-sm font-bold capitalize ${theme === t ? 'text-indigo-400' : 'text-theme-fg-muted'}`}>
                      {t.replace('-', ' ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-10">
              <section className="bg-theme-glass-bg rounded-2xl border border-theme-border overflow-hidden">
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-theme-fg flex items-center gap-2">
                      Two-Factor Authentication 
                      {is2faEnabled ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-emerald-500/30">Active</span>
                      ) : (
                        <span className="bg-slate-500/20 text-theme-fg-muted text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border border-slate-500/30">Disabled</span>
                      )}
                    </h3>
                    <p className="text-theme-fg-muted text-sm mt-1 max-w-lg">
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

              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-theme-fg">Change Password</h3>
                  <p className="text-theme-fg-muted text-sm">Update your account password. {is2faEnabled ? 'Two-Factor Authentication will require an email code.' : ''}</p>
                </div>

                <form onSubmit={initiatePasswordChange} className="max-w-md space-y-4">
                  {!is2faEnabled && !otpMode && (
                    <div className="space-y-2">
                      <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Current Password</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  {otpMode && (
                    <div className="space-y-2">
                      <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">6-Digit Verification Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpToken}
                        onChange={(e) => setOtpToken(e.target.value)}
                        className="w-full bg-indigo-500/10 border border-indigo-500/50 rounded-xl p-3 text-sm text-center tracking-[0.5em] font-mono font-bold text-theme-fg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="XXXXXX"
                      />
                      <p className="text-[10px] text-indigo-400">Sent to {user?.email}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-theme-fg-muted uppercase tracking-wider font-bold">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-theme-bg-start border border-theme-border rounded-xl p-3 text-sm text-theme-fg focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-theme-fg font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Processing...' : (otpMode ? 'Verify & Change Password' : 'Change Password')}
                    </button>
                    {otpMode && (
                      <button
                        type="button"
                        onClick={() => { setOtpMode(false); setOtpToken(''); setMessage(null); }}
                        className="w-full mt-3 text-theme-fg-muted hover:text-theme-fg text-sm py-2"
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
