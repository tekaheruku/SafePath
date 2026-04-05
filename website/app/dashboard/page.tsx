'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import UserStats from '../../components/UserStats';
import UserReportList from '../../components/UserReportList';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [reportsRes, statsRes] = await Promise.all([
          apiClient.get(`/reports?userId=${user.id}&limit=100`),
          apiClient.get(`/reports/stats/${user.id}`)
        ]);
        setReports(reportsRes.data.data.reports || []);
        setStats(statsRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, token]);

  const handleReportView = (id: string, lat: number, lng: number) => {
    router.push(`/?lat=${lat}&lng=${lng}&zoom=17&reportId=${id}`);
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await apiClient.delete(`/reports/${id}`);
      setReports(prev => prev.filter(r => r.id !== id));
      // Refresh stats after deletion
      const statsRes = await apiClient.get(`/reports/stats/${user?.id}`);
      setStats(statsRes.data.data);
    } catch (err: any) {
      console.error('Failed to delete:', err.response?.data || err);
      alert('Failed to delete report.');
    }
  };

  if (!user && !loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl h-[80vh] flex flex-col items-center justify-center">
        <h1 className="text-4xl font-black mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">Join the Movement</h1>
        <p className="text-theme-fg-muted mb-8 max-w-md text-center">Log in to track your safety reports, earn community impact points, and help make Iba safer for everyone.</p>
        <button 
          onClick={() => router.push('/login')}
          className="px-8 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95 text-sm uppercase tracking-widest"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
       <header className="mb-12">
         <motion.h1 
           initial={{ x: -20, opacity: 0 }}
           animate={{ x: 0, opacity: 1 }}
           className="text-4xl font-black mb-2 text-theme-fg italic tracking-tight"
         >
           DASHBOARD
         </motion.h1>
         <motion.p 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-theme-fg-muted text-sm font-bold uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-4"
          >
           Your Safety Impact in Iba, Zambales
         </motion.p>
       </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-theme-fg-muted font-bold animate-pulse text-xs tracking-widest uppercase">Syncing Data...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {stats && <UserStats stats={stats} />}
          
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-theme-fg italic uppercase tracking-wider">Report History</h2>
              <button 
                onClick={() => router.push('/report')}
                className="text-xs font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest"
              >
                + New Report
              </button>
            </div>
            
            {reports.length === 0 ? (
              <div className="bg-theme-panel/40 rounded-3xl border border-theme-border/60 p-12 text-center">
                <p className="text-theme-fg-muted font-bold italic mb-6">You haven't submitted any reports yet. Be the eyes of your community.</p>
                <button 
                  onClick={() => router.push('/report')}
                  className="px-6 py-2.5 rounded-full bg-theme-panel hover:bg-theme-border-hover text-theme-fg font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Create Your First Report
                </button>
              </div>
            ) : (
              <UserReportList 
                reports={reports} 
                onDelete={handleDeleteReport} 
                onView={handleReportView} 
              />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
