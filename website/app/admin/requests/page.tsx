'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthContext';
import axios from 'axios';

interface AdminRequest {
  id: string;
  email: string;
  name: string;
  requested_role: string;
  reason: string | null;
  status: string;
  document_url: string | null;
  created_at: string;
}

export default function AdminRequestsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'superadmin') {
      router.push('/');
      return;
    }
    fetchRequests();
  }, [user, router, authLoading]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/admin/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to approve ${name}'s request? They will be granted immediate access.`)) return;
    try {
      await axios.post(`${apiUrl}/admin/requests/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Approved! An email has been sent to them to set their password.');
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await axios.post(`${apiUrl}/admin/requests/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  };

  if (authLoading || !user || user.role !== 'superadmin') return null;

  return (
    <div className="min-h-screen bg-theme-bg-start text-theme-fg p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Admin Access Requests
          </h1>
          <p className="text-theme-fg-muted mt-1">Review and approve applications for elevated privileges.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6">
            <span>{error}</span>
          </div>
        )}

        <div className="bg-theme-panel border border-theme-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-theme-panel/50 text-theme-fg-muted text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Applicant</th>
                  <th className="px-6 py-4 font-semibold">Requested Role</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                  <th className="px-6 py-4 font-semibold">Requested At</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-6 h-16 bg-theme-panel/50"></td>
                    </tr>
                  ))
                ) : requests.length > 0 ? (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-theme-panel/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{r.name}</div>
                        <div className="text-xs text-theme-fg-muted">{r.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight ${
                          r.requested_role === 'superadmin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {r.requested_role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-theme-fg-muted max-w-xs break-words">
                        {r.reason || <span className="italic opacity-50">No reason provided</span>}
                        {r.document_url && (
                          <div className="mt-2">
                            <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                              <span>View Document</span>
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-theme-fg-muted">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                          r.status === 'approved' ? 'text-emerald-400 bg-emerald-500/10' :
                          r.status === 'rejected' ? 'text-red-400 bg-red-500/10' :
                          'text-yellow-400 bg-yellow-500/10'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === 'pending' && (
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => handleApprove(r.id, r.name)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-transform hover:scale-105"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleReject(r.id)}
                              className="px-3 py-1.5 text-xs font-semibold bg-red-900/50 hover:bg-red-800/60 text-red-100 rounded-lg transition-transform hover:scale-105"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-theme-fg-muted">
                      No admin requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
