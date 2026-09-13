'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import { DateFilterModal } from '../../components/DateFilterModal';
import { Calendar, FilterX, CheckCircle, XCircle, Trash2, Clock, Check } from 'lucide-react';
import { ADMIN_ROLES, REPORT_STATUS, REPORT_REVIEW_ACTIONS, ReportStatus } from '@safepath/shared';

export default function IncidentsPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role as any));

  // Admin tab filter: 'confirmed' or 'pending' (public users never see or change this)
  const [activeTab, setActiveTab] = useState<ReportStatus>(REPORT_STATUS.CONFIRMED);

  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  useEffect(() => {
    axios.get(`${apiUrl}/incident-types`)
      .then(res => setIncidentTypes(res.data))
      .catch(console.error);
  }, [apiUrl]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const fromParam = dateRange.from ? `&startDate=${dateRange.from}` : '';
      const toParam = dateRange.to ? `&endDate=${dateRange.to}` : '';
      const typeParam = selectedType ? `&type=${selectedType}` : '';
      
      // For admins, query by the active tab status; for public users, always query confirmed
      const statusParam = isAdmin ? `&status=${activeTab}` : `&status=${REPORT_STATUS.CONFIRMED}`;
      
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await axios.get(`${apiUrl}/reports?limit=100${fromParam}${toParam}${typeParam}${statusParam}`, {
        headers,
      });
      setReports(res.data.data?.reports || []);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange, selectedType, activeTab, isAdmin, token]);

  const handleReportClick = (r: any) => {
    if (!r.location?.coordinates) return;
    const lat = r.location.coordinates[1];
    const lng = r.location.coordinates[0];
    router.push(`/?lat=${lat}&lng=${lng}&zoom=17&reportId=${r.id}`);
  };

  const handleConfirm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token || !isAdmin) return;

    setActionLoading(id);
    setFeedbackMessage(null);
    try {
      await axios.post(`${apiUrl}/reports/${id}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(prev => prev.filter(r => r.id !== id));
      setFeedbackMessage({
        type: 'success',
        text: 'Report verified and published to the public map and feed.',
      });
    } catch (err: any) {
      console.error('Failed to confirm report:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to confirm report.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleFalsify = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token || !isAdmin) return;

    setActionLoading(id);
    setFeedbackMessage(null);
    try {
      await axios.post(`${apiUrl}/reports/${id}/falsify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(prev => prev.filter(r => r.id !== id));
      setFeedbackMessage({
        type: 'success',
        text: 'Report marked as falsified and moved to the Archive.',
      });
    } catch (err: any) {
      console.error('Failed to falsify report:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to falsify report.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await axios.delete(`${apiUrl}/reports/${id}`, {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {isAdmin && activeTab === REPORT_STATUS.PENDING ? 'Pending Report Review' : 'All Recent Incidents'}
          </h1>
          <p className="text-sm text-theme-fg-muted mt-1">
            {isAdmin && activeTab === REPORT_STATUS.PENDING
              ? 'Review incoming community reports before publishing them to the public map.'
              : 'Community-verified reports and safety alerts in Iba, Zambales.'}
          </p>
        </div>

        {/* Admin Review Mode Tabs - strictly hidden from public users */}
        {isAdmin && (
          <div className="flex bg-theme-panel border border-theme-border p-1 rounded-xl shadow-sm self-start md:self-auto">
            <button
              onClick={() => setActiveTab(REPORT_STATUS.CONFIRMED)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === REPORT_STATUS.CONFIRMED
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-theme-fg-muted hover:text-theme-fg'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirmed Live</span>
            </button>
            <button
              onClick={() => setActiveTab(REPORT_STATUS.PENDING)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === REPORT_STATUS.PENDING
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-theme-fg-muted hover:text-theme-fg'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Review</span>
            </button>
          </div>
        )}
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

      {/* Filters */}
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
          <p className="animate-pulse text-sm">Loading incident data...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-12 text-center text-theme-fg-muted">
          <p className="text-base font-semibold text-theme-fg mb-1">
            {isAdmin && activeTab === REPORT_STATUS.PENDING
              ? 'No pending reports awaiting review'
              : 'No incidents reported yet'}
          </p>
          <p className="text-xs">
            {isAdmin && activeTab === REPORT_STATUS.PENDING
              ? 'New incident submissions will appear here for confirmation.'
              : 'All clear in the supported area.'}
          </p>
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
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* Status Badge for Admin/LGU */}
                    {isAdmin && r.status === REPORT_STATUS.PENDING && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                        Pending
                      </span>
                    )}
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
                      alt="Incident Photo" 
                      className="w-full h-32 object-cover rounded-lg border border-theme-border" 
                    />
                  </div>
                )}

                <p className="text-sm text-theme-fg-muted mb-4 line-clamp-3">{r.description}</p>
              </div>

              <div className="pt-3 border-t border-theme-border flex flex-col gap-3">
                <div className="text-xs text-theme-fg-muted flex justify-between items-center">
                  <div>
                    <span className="block text-[11px] font-semibold text-theme-fg">By: {r.author_name || 'Anonymous'}</span>
                    <span className="text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Delete button (owner or admin) */}
                  {user && (user.id === r.user_id || isAdmin) && (
                    <button 
                      onClick={(e) => handleDelete(e, r.id)}
                      className="px-2.5 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="Delete Report"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                {/* Verification Actions (admin/LGU only when status is pending) */}
                {isAdmin && r.status === REPORT_STATUS.PENDING && (
                  <div className="flex items-center gap-2 pt-2 border-t border-theme-border/50">
                    <button
                      onClick={(e) => handleConfirm(e, r.id)}
                      disabled={actionLoading === r.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{REPORT_REVIEW_ACTIONS.CONFIRM}</span>
                    </button>
                    <button
                      onClick={(e) => handleFalsify(e, r.id)}
                      disabled={actionLoading === r.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-bold text-xs active:scale-95 transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{REPORT_REVIEW_ACTIONS.FALSIFY}</span>
                    </button>
                  </div>
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
