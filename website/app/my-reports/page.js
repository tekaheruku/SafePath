'use client';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
export default function MyReportsPage() {
    const { user, token } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    useEffect(() => {
        const fetchReports = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports?limit=100`);
                // Filter by user ID since the backend doesn't have a direct /users/me/reports yet
                const myReports = (res.data.data.reports || []).filter((r) => r.user_id === user.id);
                setReports(myReports);
            }
            catch (err) {
                console.error('Failed to load my incidents:', err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [user]);
    const handleReportClick = (r) => {
        const lat = r.location.coordinates[1];
        const lng = r.location.coordinates[0];
        router.push(`/?lat=${lat}&lng=${lng}&zoom=17&reportId=${r.id}`);
    };
    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this report?'))
            return;
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/reports/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReports(prev => prev.filter(r => r.id !== id));
        }
        catch (err) {
            console.error('Failed to delete:', err.response?.data || err);
            alert('Failed to delete report.');
        }
    };
    if (!user && !loading) {
        return (<div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">My Reports</h1>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
          <p>Please log in to view your submitted reports.</p>
        </div>
      </div>);
    }
    return (<div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Reports</h1>
      
      {loading ? (<div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
          <p className="animate-pulse">Loading your report history...</p>
        </div>) : reports.length === 0 ? (<div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400">
          <p>You haven't submitted any incident reports yet.</p>
        </div>) : (<div className="grid gap-4 md:grid-cols-2">
          {reports.map((r) => (<div key={r.id} onClick={() => handleReportClick(r)} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition-all shadow-lg active:scale-[0.98]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-white">{r.type}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.severity_level === 'high' ? 'bg-red-500/20 text-red-400' :
                    r.severity_level === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'}`}>
                  {typeof r.severity_level === 'string' ? r.severity_level.toUpperCase() : r.severity_level}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{r.description}</p>
              <div className="text-xs text-slate-500 flex justify-between items-center">
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
                {user && (user.id === r.user_id || ['admin', 'superadmin', 'lgu_admin'].includes(user.role)) && (<button onClick={(e) => handleDelete(e, r.id)} className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg font-semibold transition-colors">
                    Delete
                  </button>)}
              </div>
            </div>))}
        </div>)}
    </div>);
}
