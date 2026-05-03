'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import { DateFilterModal } from '../../components/DateFilterModal';
import { Calendar, FilterX } from 'lucide-react';

export default function IncidentsPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/incident-types`)
      .then(res => setIncidentTypes(res.data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const fromParam = dateRange.from ? `&startDate=${dateRange.from}` : '';
        const toParam = dateRange.to ? `&endDate=${dateRange.to}` : '';
        const typeParam = selectedType ? `&type=${selectedType}` : '';
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/reports?limit=100${fromParam}${toParam}${typeParam}`);
        setReports(res.data.data.reports || []);
      } catch (err) {
        console.error('Failed to load incidents:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [dateRange, selectedType]);

  const handleReportClick = (r: any) => {
    const lat = r.location.coordinates[1];
    const lng = r.location.coordinates[0];
    router.push(`/?lat=${lat}&lng=${lng}&zoom=17&reportId=${r.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      console.error('Failed to delete:', err.response?.data || err);
      alert('Failed to delete report.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">All Recent Incidents</h1>

      <div className="bg-theme-panel rounded-2xl border border-theme-border p-4 mb-8 flex flex-col md:flex-row gap-4 items-end shadow-md">
        <div className="flex flex-col gap-1.5 w-full md:w-1/2">
          <label className="text-xs font-bold text-theme-fg-muted uppercase tracking-wider">Report Type</label>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-900 border border-theme-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-white">All Types</option>
            {incidentTypes.map(type => (
              <option key={type.id} value={type.id} className="bg-slate-900 text-white">{type.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 w-full md:w-1/2">
          <label className="text-xs font-bold text-theme-fg-muted uppercase tracking-wider">Date Range</label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsDateModalOpen(true)}
              className={`flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                dateRange.from 
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-100' 
                  : 'bg-theme-bg-start border-theme-border text-theme-fg-muted hover:text-theme-fg'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="truncate">{dateLabel || 'Filter by Date'}</span>
              </div>
            </button>
            {dateRange.from && (
              <button
                onClick={() => {
                  setDateRange({ from: null, to: null });
                  setDateLabel(null);
                }}
                className="px-3 py-2.5 bg-theme-bg-start border border-theme-border hover:border-red-500/50 hover:bg-red-500/10 text-theme-fg-muted hover:text-red-400 rounded-lg transition-colors"
                title="Clear Date Filter"
              >
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-8 text-center text-theme-fg-muted">
          <p className="animate-pulse">Loading historical incident data...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-8 text-center text-theme-fg-muted">
          <p>No incidents reported yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r: any) => (
            <div 
              key={r.id} 
              onClick={() => handleReportClick(r)}
              className="bg-theme-panel border border-theme-border p-5 rounded-2xl cursor-pointer hover:bg-theme-panel hover:border-slate-600 transition-all shadow-lg active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-theme-fg">{r.incident_type_name ?? r.type ?? 'Incident'}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  (r.severity_level_name ?? r.severity_level) === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  (r.severity_level_name ?? r.severity_level) === 'Serious'  ? 'bg-orange-500/20 text-orange-400' :
                  (r.severity_level_name ?? r.severity_level) === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                  (r.severity_level_name ?? r.severity_level) === 'high'     ? 'bg-red-500/20 text-red-400' :
                  (r.severity_level_name ?? r.severity_level) === 'medium'   ? 'bg-orange-500/20 text-orange-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {(r.severity_level_name ?? r.severity_level ?? 'Minor').toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-theme-fg-muted mb-4 line-clamp-2">{r.description}</p>
              <div className="text-xs text-theme-fg-muted flex justify-between items-center">
                <div>
                  <span className="block mb-1">By: {r.author_name || 'Anonymous'}</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {user && (user.id === r.user_id || ['admin', 'superadmin', 'lgu_admin'].includes(user.role)) && (
                  <button 
                    onClick={(e) => handleDelete(e, r.id)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-lg font-semibold transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <DateFilterModal 
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onApply={(from, to, label) => {
          setDateRange({ from, to });
          setDateLabel(label ?? null);
        }}
        initialFrom={dateRange.from}
        initialTo={dateRange.to}
      />
    </div>
  );
}
