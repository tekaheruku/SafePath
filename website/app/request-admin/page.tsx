'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

export default function RequestAdminPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    requestedRole: 'lgu_admin',
    reason: ''
  });
  const [document, setDocument] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!document) {
      setError('Please upload an authorization document or ID.');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('email', formData.email);
      submitData.append('requestedRole', formData.requestedRole);
      submitData.append('reason', formData.reason);
      submitData.append('document', document);

      await axios.post(`${apiUrl}/admin-requests`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-theme-bg-start flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-theme-panel border border-theme-border rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            ✓
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Request Submitted</h1>
          <p className="text-theme-fg-muted mb-8">
            Your request for admin access has been successfully submitted. Our team will review your application and send you an email once an action is taken.
          </p>
          <Link href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-transform hover:scale-105 inline-block font-semibold">
            Return to Map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg-start flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-theme-panel border border-theme-border rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            Request Access
          </h1>
          <p className="text-theme-fg-muted mt-2">
            Apply for Local Government or System Administrator Privileges
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Juan De La Cruz"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-theme-bg-start/50 border border-theme-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 focus:bg-theme-panel"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Work Email</label>
            <input
              type="email"
              required
              placeholder="you@gov.ph"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-theme-bg-start/50 border border-theme-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 focus:bg-theme-panel"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Requested Role</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, requestedRole: 'lgu_admin' })}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-sm font-semibold transition-all ${formData.requestedRole === 'lgu_admin'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]'
                    : 'bg-theme-bg-start/50 border-theme-border text-slate-400 hover:bg-theme-panel'
                  }`}
              >
                <span>LGU Admin</span>
                <span className="text-[10px] font-normal mt-1 opacity-70">Municipality Access</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, requestedRole: 'superadmin' })}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-sm font-semibold transition-all ${formData.requestedRole === 'superadmin'
                    ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_15px_-3px_rgba(168,85,247,0.5)]'
                    : 'bg-theme-bg-start/50 border-theme-border text-slate-400 hover:bg-theme-panel'
                  }`}
              >
                <span>Super Admin</span>
                <span className="text-[10px] font-normal mt-1 opacity-70">Full System Access</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Statement of Purpose</label>
            <textarea
              required
              rows={4}
              placeholder="Please briefly explain why you need these elevated privileges..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-theme-bg-start/50 border border-theme-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 focus:bg-theme-panel resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Verification Document <span className="text-red-400">*</span></label>
            <p className="text-xs text-theme-fg-muted mb-2">Upload a scanned ID, official memo, or authorization letter (PDF or Image, max 15MB).</p>
            <input
              type="file"
              required
              accept="image/*,application/pdf"
              onChange={(e) => setDocument(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 file:transition-colors bg-theme-bg-start/50 border border-theme-border rounded-xl cursor-pointer focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Output'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/login" className="text-sm text-theme-fg-muted hover:text-white transition-colors">
            Already have an account? <span className="font-semibold text-indigo-400">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
