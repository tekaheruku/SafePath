'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../components/AuthContext';
import axios from 'axios';
import { useRouter } from 'next/navigation';

interface VerificationRequest {
  id: string;
  email: string;
  name: string;
  role: string;
  id_verification_status: string;
  id_front_url: string;
  id_back_url: string;
  updated_at: string;
}

export default function AdminIDVerificationsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'lgu_admin') {
      router.push('/');
      return;
    }
    fetchRequests();
  }, [user, token]);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/admin/id-verifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data.data);
    } catch (err: any) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, status: 'verified' | 'not_verified') => {
    if (user?.role !== 'lgu_admin') {
      setMessage({ type: 'error', text: 'Only LGU Admins can confirm or deny verification requests.' });
      return;
    }

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/admin/id-verifications/${userId}/handle`, {
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: `Request ${status === 'verified' ? 'approved' : 'denied'} successfully.` });
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to process request.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">ID Verification Requests</h1>
        <p className="text-theme-fg-muted mt-2">Review and verify user identities.</p>
      </div>

      {message && (
        <div className={`mb-8 p-4 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.text}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="glass-panel rounded-2xl p-20 text-center border border-theme-border">
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-xl font-bold text-theme-fg">No pending requests</h2>
          <p className="text-theme-fg-muted mt-2">All verification requests have been processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {requests.map(req => (
            <div key={req.id} className="glass-panel rounded-2xl border border-theme-border overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 border-b border-theme-border bg-theme-panel/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-theme-fg">{req.name}</h3>
                  <p className="text-sm text-theme-fg-muted">{req.email} • Requested {new Date(req.updated_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAction(req.id, 'not_verified')}
                    className="px-6 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-bold text-sm"
                  >
                    Deny
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'verified')}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 text-theme-fg hover:bg-emerald-500 transition-all font-bold text-sm shadow-lg shadow-emerald-600/20"
                  >
                    Confirm
                  </button>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-theme-fg-muted uppercase tracking-wider">Front ID Image</label>
                  <div className="aspect-[16/10] bg-black/40 rounded-xl overflow-hidden border border-theme-border group relative">
                    <img src={req.id_front_url} alt="ID Front" className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                    <a href={req.id_front_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold">View Full Size</a>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-theme-fg-muted uppercase tracking-wider">Back ID Image</label>
                  <div className="aspect-[16/10] bg-black/40 rounded-xl overflow-hidden border border-theme-border group relative">
                    <img src={req.id_back_url} alt="ID Back" className="w-full h-full object-contain transition-transform group-hover:scale-105" />
                    <a href={req.id_back_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-bold">View Full Size</a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
