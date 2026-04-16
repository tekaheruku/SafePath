'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  banned_until: string | null;
  ban_reason: string | null;
  reports_count: string;
  ratings_count: string;
}

interface UserDetailModalProps {
  user: User; // This is the target user
  onClose: () => void;
  onUpdate: () => void;
}

export default function UserDetailModal({ user: targetUser, onClose, onUpdate }: UserDetailModalProps) {
  const { user: currentUser, token } = useAuth();
  const [banDuration, setBanDuration] = useState('24'); // hours
  const [banReason, setBanReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBanForm, setShowBanForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

  const isBanned = targetUser.banned_until && new Date(targetUser.banned_until) > new Date();

  const handleBan = async () => {
    if (!banReason) {
      setError('Please provide a reason for the ban');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${apiUrl}/admin/users/${targetUser.id}/ban`, {
        duration: parseInt(banDuration),
        reason: banReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to ban user');
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    setLoading(true);
    try {
      await axios.post(`${apiUrl}/admin/users/${targetUser.id}/unban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to unban user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteReason) {
      setError('Please provide a reason for deletion');
      return;
    }
    setLoading(true);
    try {
      await axios.delete(`${apiUrl}/admin/users/${targetUser.id}`, {
        data: { reason: deleteReason },
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="w-full max-w-lg border border-theme-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: 'rgb(var(--theme-panel-bg))' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center">
          <h2 className="text-xl font-bold text-theme-fg">Account Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-theme-panel rounded-lg transition-colors text-theme-fg-muted hover:text-theme-fg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-3xl font-bold text-indigo-400 border border-indigo-500/20">
              {targetUser.name[0]}
            </div>
            <div>
              <h3 className="text-xl font-bold text-theme-fg">{targetUser.name}</h3>
              <p className="text-theme-fg-muted">{targetUser.email}</p>
              <span className="text-xs text-theme-fg-muted uppercase tracking-widest font-bold">UID: {targetUser.id.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-theme-panel/50 p-4 rounded-xl border border-theme-border">
              <p className="text-theme-fg-muted text-xs font-bold uppercase mb-1">Role</p>
              <p className="text-theme-fg font-semibold">{targetUser.role}</p>
            </div>
            <div className="bg-theme-panel/50 p-4 rounded-xl border border-theme-border">
              <p className="text-theme-fg-muted text-xs font-bold uppercase mb-1">Joined</p>
              <p className="text-theme-fg font-semibold">{new Date(targetUser.created_at).toLocaleDateString()}</p>
            </div>
            <div className="bg-theme-panel/50 p-4 rounded-xl border border-theme-border">
              <p className="text-theme-fg-muted text-xs font-bold uppercase mb-1">Reports</p>
              <p className="text-theme-fg font-bold text-lg">{targetUser.reports_count}</p>
            </div>
            <div className="bg-theme-panel/50 p-4 rounded-xl border border-theme-border">
              <p className="text-theme-fg-muted text-xs font-bold uppercase mb-1">Ratings</p>
              <p className="text-theme-fg font-bold text-lg">{targetUser.ratings_count}</p>
            </div>
          </div>

          {isBanned && (
            <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-6">
              <h4 className="text-red-400 font-bold text-sm mb-1 uppercase tracking-wider">Account Active Ban</h4>
              <p className="text-theme-fg text-sm mb-2">{targetUser.ban_reason}</p>
              <p className="text-xs text-red-300">Expires: {new Date(targetUser.banned_until!).toLocaleString()}</p>
            </div>
          )}

          {/* Role restriction message */}
          {currentUser?.role === 'lgu_admin' && targetUser.role !== 'user' && (
            <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl mb-6 flex items-start space-x-3">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-amber-200 text-xs">As an LGU Admin, you do not have permission to manage other administrators or superadmins.</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm mb-4 bg-red-400/10 p-2 rounded border border-red-400/20">{error}</p>}

          <div className="flex flex-col space-y-3">
            {!showBanForm && !showDeleteConfirm && (
              <div className="grid grid-cols-2 gap-3">
                {isBanned ? (
                  <button 
                    onClick={handleUnban}
                    disabled={loading || (currentUser?.role === 'lgu_admin' && targetUser.role !== 'user')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-theme-fg font-bold py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Lift Ban
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowBanForm(true)}
                    disabled={currentUser?.role === 'lgu_admin' && targetUser.role !== 'user'}
                    className="bg-orange-600 hover:bg-orange-500 text-theme-fg font-bold py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Ban User
                  </button>
                )}
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={currentUser?.role === 'lgu_admin' && targetUser.role !== 'user'}
                  className="bg-red-600 hover:bg-red-500 text-theme-fg font-bold py-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Delete Account
                </button>
              </div>
            )}

            {showBanForm && (
              <div className="space-y-4 p-4 bg-theme-panel/50 rounded-xl border border-slate-700 animate-in slide-in-from-bottom-2 duration-200">
                <h4 className="text-orange-400 font-bold text-sm uppercase">Ban Configuration</h4>
                <div>
                  <label className="block text-xs text-theme-fg-muted mb-1">Duration (Hours, 0 for Permanent)</label>
                  <input 
                    type="number" 
                    value={banDuration}
                    onChange={(e) => setBanDuration(e.target.value)}
                    className="w-full bg-theme-panel border border-slate-700 rounded-lg px-3 py-2 text-sm text-theme-fg focus:ring-1 focus:ring-orange-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-theme-fg-muted mb-1">Reason for Ban</label>
                  <textarea 
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="e.g. Repeated false reporting"
                    className="w-full bg-theme-panel border border-slate-700 rounded-lg px-3 py-2 text-sm text-theme-fg focus:ring-1 focus:ring-orange-500 outline-none h-20 resize-none"
                  />
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleBan}
                    disabled={loading}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-theme-fg font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Confirm Ban'}
                  </button>
                  <button 
                    onClick={() => setShowBanForm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-theme-fg font-bold py-2 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showDeleteConfirm && (
              <div className="space-y-4 p-4 bg-theme-panel/50 rounded-xl border border-red-900/50 animate-in slide-in-from-bottom-2 duration-200">
                <h4 className="text-red-400 font-bold text-sm uppercase">Permanent Deletion</h4>
                <p className="text-xs text-theme-fg-muted italic">This action cannot be undone. All user data, reports, and ratings will be removed.</p>
                <div>
                  <label className="block text-xs text-theme-fg-muted mb-1">Reason for Deletion</label>
                  <textarea 
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="e.g. Requested by user / Severe violation"
                    className="w-full bg-theme-panel border border-slate-700 rounded-lg px-3 py-2 text-sm text-theme-fg focus:ring-1 focus:ring-red-500 outline-none h-20 resize-none"
                  />
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-theme-fg font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Confirm Wipe'}
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-theme-fg font-bold py-2 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
