'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthContext';
import { DateFilterModal } from '../../../components/DateFilterModal';
import { Calendar, FilterX, RotateCcw, Archive, AlertTriangle, ExternalLink } from 'lucide-react';
import { ADMIN_ROLES, REPORT_STATUS, REPORT_REVIEW_ACTIONS, APP_ROUTES } from '@safepath/shared';

export default function AdminArchivePage() {
  const { user, token, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  // Access Control: Only admin and LGU accounts
  useEffect(() => {
    if (authLoading) return;
    if (!user || !ADMIN_ROLES.includes(user.role as any)) {
      router.push(APP_ROUTES.HOME);
    }
  }, [user, authLoading, router]);

  // Load Incident Types
  useEffect(() => {
    axios.get(`${apiUrl}/incident-types`)
      .then(res => setIncidentTypes(res.data))
      .catch(console.error);
  }, [apiUrl]);

  // Fetch Falsified / Archived Reports
  const fetchArchivedReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const fromParam = dateRange.from ? `&startDate=${dateRange.from}` : '';
      const toParam = dateRange.to ? `&endDate=${dateRange.to}` : '';
      const typeParam = selectedType ? `&type=${selectedType}` : '';
      
      const res = await axios.get(`${apiUrl}/reports/archive?limit=100${fromParam}${toParam}${typeParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.data?.reports || []);
    } catch (err: any) {
      console.error('Failed to load archived reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(user.role as any) && token) {
      fetchArchivedReports();
    }
  }, [user, token, dateRange, selectedType]);

  const handleRestore = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!token) return;

    setActionLoading(reportId);
    setFeedbackMessage(null);

    try {
      await axios.post(
        `${apiUrl}/reports/${reportId}/restore`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(prev => prev.filter(r => r.id !== reportId));
      setFeedbackMessage({
        type: 'success',
        text: 'Report successfully restored to the pending review queue.',
      });
    } catch (err: any) {
      console.error('Failed to restore report:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to restore report.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReportClick = (r: any) => {
    if (!r.location?.coordinates) return;
    const lat = r.location.coordinates[1];
    const lng = r.location.coordinates[0];
    router.push(`/?lat=${lat}&lng=${lng}&zoom=17&reportId=${r.id}`);
  };

  if (authLoading || !user || !ADMIN_ROLES.includes(user.role as any)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-theme-fg">Report Archive</h1>
            <p className="text-sm text-theme-fg-muted mt-1">
              Falsified incident reports removed from the public feed. Restoring a report returns it to the pending review queue.
            </p>
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-semibold border flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs uppercase tracking-wider font-bold opacity-70 hover:opacity-100 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Panel */}
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
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-12 text-center text-theme-fg-muted">
          <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="animate-pulse text-sm">Loading archived reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-12 text-center text-theme-fg-muted">
          <span className="text-4xl mb-3 block">📂</span>
          <h3 className="font-bold text-lg text-theme-fg mb-1">Archive is Empty</h3>
          <p className="text-sm">No falsified reports found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((r: any) => (
            <div
              key={r.id}
              onClick={() => handleReportClick(r)}
              className="bg-theme-panel border border-theme-border p-5 rounded-2xl cursor-pointer hover:border-slate-600 transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-bold text-lg text-theme-fg">{r.incident_type_name ?? r.type ?? 'Incident'}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
                      Falsified
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      (r.severity_level_name ?? r.severity_level) === 'Critical' ? 'bg-red-500/20 text-red-400' :
                      (r.severity_level_name ?? r.severity_level) === 'Serious'  ? 'bg-orange-500/20 text-orange-400' :
                      (r.severity_level_name ?? r.severity_level) === 'Moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {(r.severity_level_name ?? r.severity_level ?? 'Minor').toUpperCase()}
                    </span>
                  </div>
                </div>

                {r.photo_url && (
                  <div className="mb-3">
                    <img
                      src={r.photo_url}
                      alt="Archived Report"
                      className="w-full h-32 object-cover rounded-lg border border-theme-border opacity-75"
                    />
                  </div>
                )}

                <p className="text-sm text-theme-fg-muted mb-4 line-clamp-3">{r.description}</p>
              </div>

              <div className="pt-3 border-t border-theme-border flex items-center justify-between gap-3 text-xs text-theme-fg-muted">
                <div>
                  <span className="block text-[11px] font-semibold text-theme-fg">By: {r.author_name || 'Anonymous'}</span>
                  <span className="text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>

                <button
                  onClick={(e) => handleRestore(e, r.id)}
                  disabled={actionLoading === r.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
                  title="Restore to Pending Review"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === r.id ? 'animate-spin' : ''}`} />
                  <span>{REPORT_REVIEW_ACTIONS.RESTORE}</span>
                </button>
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
