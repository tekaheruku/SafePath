'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';
import { DateFilterModal } from '../../components/DateFilterModal';
import { Calendar, FilterX, CheckCircle, XCircle, Trash2, Clock, Check, AlertTriangle, ShieldAlert, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ADMIN_ROLES, REPORT_REVIEW_ROLES, REPORT_STATUS, REPORT_REVIEW_ACTIONS, ReportStatus, VOTE_PLAUSIBILITY_RATIOS, SOCKET_EVENTS } from '@safepath/shared';
import { resolvePhotoUrl } from '../../lib/photoUrl';
import CommentThread from '../../components/CommentThread';

type PlausibilityTier = 'likely_false' | 'uncertain' | 'plausible';

const TIER_RANK: Record<PlausibilityTier, number> = { likely_false: 0, uncertain: 1, plausible: 2 };

// Derives a plausibility tier from community votes alone, so old reports (and
// reports the AI hasn't scored yet) still get a useful signal.
function getVoteTier(upvotes: number, downvotes: number): PlausibilityTier | null {
  if (!upvotes && !downvotes) return null;
  if (!downvotes) return 'plausible';
  const ratio = upvotes > 0 ? downvotes / upvotes : Infinity;
  if (ratio >= VOTE_PLAUSIBILITY_RATIOS.LIKELY_FALSE) return 'likely_false';
  if (ratio >= VOTE_PLAUSIBILITY_RATIOS.UNCERTAIN) return 'uncertain';
  return 'plausible';
}

function scoreToTier(score: number): PlausibilityTier {
  if (score < 0.4) return 'likely_false';
  if (score < 0.7) return 'uncertain';
  return 'plausible';
}

function getAiTier(score: number | null | undefined): PlausibilityTier | null {
  return typeof score === 'number' ? scoreToTier(score) : null;
}

// Corroborating comments (and their votes) count toward a report's credibility the
// same way report-level upvotes do, so a well-supported report reads as more
// plausible without needing more duplicate report rows.
function getTotalVotes(r: any): { upvotes: number; downvotes: number } {
  return {
    upvotes: (r.upvotes_count || 0) + (r.comment_upvotes_total || 0),
    downvotes: (r.downvotes_count || 0) + (r.comment_downvotes_total || 0),
  };
}

// Votes nudge, at most, a good chunk of a point off the AI score — they can never
// drag a plausible report all the way to "Likely False" on their own once the AI
// has scored it. When there's no AI score at all, votes are the only signal we have.
const VOTE_TIER_PENALTY: Record<PlausibilityTier, number> = {
  likely_false: 0.15,
  uncertain: 0.05,
  plausible: 0,
};

interface Credibility {
  tier: PlausibilityTier | null;
  score: number | null;
  driver: string | null;
}

// AI analysis is the primary signal; community votes (report + comment) only ever
// adjust it, they don't independently override it. Falls back to votes alone when
// the AI hasn't scored the report yet.
function getCredibility(r: any): Credibility {
  const totals = getTotalVotes(r);
  const voteTier = getVoteTier(totals.upvotes, totals.downvotes);
  const aiScore = typeof r.ai_plausibility_score === 'number' ? r.ai_plausibility_score : null;

  if (aiScore === null) {
    return { tier: voteTier, score: null, driver: voteTier ? 'Community votes (no AI score yet)' : null };
  }

  const penalty = voteTier ? VOTE_TIER_PENALTY[voteTier] : 0;
  const adjustedScore = Math.max(0, Math.min(1, aiScore - penalty));
  const tier = scoreToTier(adjustedScore);
  const driver = penalty > 0 ? 'AI analysis (adjusted by community votes)' : 'AI analysis';

  return { tier, score: adjustedScore, driver };
}

const TIER_LABELS: Record<PlausibilityTier, string> = {
  likely_false: 'Likely False',
  uncertain: 'Uncertain',
  plausible: 'Plausible',
};

const TIER_STYLES: Record<PlausibilityTier, string> = {
  likely_false: 'bg-red-500/20 text-red-400 border-red-500/30',
  uncertain: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  plausible: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

export default function IncidentsPage() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role as any));
  // Confirming/falsifying reports is an LGU admin responsibility only — superadmin
  // accounts can still see the pending queue but cannot act on it.
  const canReviewReports = Boolean(user && REPORT_REVIEW_ROLES.includes(user.role as any));

  // Admin tab filter: 'confirmed' or 'pending' (public users never see or change this)
  const [activeTab, setActiveTab] = useState<ReportStatus>(REPORT_STATUS.CONFIRMED);

  const [incidentTypes, setIncidentTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedCommentsReportId, setSelectedCommentsReportId] = useState<string | null>(null);
  const [expandedBreakdownId, setExpandedBreakdownId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

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

  // Background AI plausibility scoring (and confirm/falsify/vote/comment changes) land
  // asynchronously after the initial fetch — without this, a report's badge stays frozen
  // at whatever it was when the page loaded until a manual refresh.
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':3001') : 'http://localhost:3001'));

    socket.on(SOCKET_EVENTS.REPORT_NEW, () => fetchReports());
    socket.on(SOCKET_EVENTS.REPORT_UPDATED, (updated: any) => {
      setReports(prev => prev.map(r => (r.id === updated.id ? { ...r, ...updated } : r)));
    });
    socket.on(SOCKET_EVENTS.REPORT_DELETED, ({ id }: any) => {
      setReports(prev => prev.filter(r => r.id !== id));
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // For the pending-review queue, surface the most likely-false reports first so
  // admins triage them ahead of straightforward, plausible ones (assist-only —
  // it only affects display order, never the status itself).
  const displayedReports = isAdmin && activeTab === REPORT_STATUS.PENDING
    ? [...reports].sort((a, b) => {
        const riskScore = (r: any) => {
          let risk = 0;
          const { tier } = getCredibility(r);
          if (tier) risk += (2 - TIER_RANK[tier]); // likely_false=2, uncertain=1, plausible=0
          if (r.is_vote_flagged) risk += 1;
          if (typeof r.trust_score === 'number') risk += (1 - r.trust_score) * 0.5;
          return risk;
        };
        return riskScore(b) - riskScore(a);
      })
    : reports;

  const handleReportClick = (r: any) => {
    if (!r.location?.coordinates) return;
    const lat = r.location.coordinates[1];
    const lng = r.location.coordinates[0];
    router.push(`/?lat=${lat}&lng=${lng}&zoom=17&reportId=${r.id}`);
  };

  const handleConfirm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token || !canReviewReports) return;

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
    if (!token || !canReviewReports) return;

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

  const handleAnalyze = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token || !canReviewReports) return;

    setAnalyzingId(id);
    setFeedbackMessage(null);
    try {
      const res = await axios.post(`${apiUrl}/reports/${id}/analyze`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = res.data.data;
      if (updated) {
        setReports(prev => prev.map(r => (r.id === id ? { ...r, ...updated } : r)));
      }
      setExpandedBreakdownId(id);
      setFeedbackMessage({ type: 'success', text: 'AI analysis complete.' });
    } catch (err: any) {
      console.error('Failed to analyze report:', err);
      setFeedbackMessage({
        type: 'error',
        text: err.response?.data?.error?.message || 'Failed to run AI analysis.',
      });
    } finally {
      setAnalyzingId(null);
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
          {displayedReports.map((r: any) => (
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
                    {/* Plausibility badge (admin only, assist signal — never changes status automatically).
                        AI analysis is the primary signal; community votes only nudge it (see getCredibility),
                        so old reports with only votes (no AI score) still get a rating from votes alone. */}
                    {isAdmin && (() => {
                      const { tier, driver } = getCredibility(r);
                      if (!tier) return null;
                      const tooltip = [r.ai_flag_reason, driver].filter(Boolean).join(' — ') || undefined;
                      const isExpanded = expandedBreakdownId === r.id;
                      return (
                        <button
                          type="button"
                          title={tooltip}
                          onClick={(e) => { e.stopPropagation(); setExpandedBreakdownId(isExpanded ? null : r.id); }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 transition-colors ${TIER_STYLES[tier]}`}
                        >
                          <ShieldAlert className="w-3 h-3" />
                          {TIER_LABELS[tier]}
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      );
                    })()}
                    {isAdmin && r.status === REPORT_STATUS.PENDING && r.ai_plausibility_score === null && !getTotalVotes(r).upvotes && !getTotalVotes(r).downvotes && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-500/20 text-theme-fg-muted border border-slate-500/30 uppercase tracking-wider">
                        Scoring…
                      </span>
                    )}
                    {/* Vote-based flag (admin only, assist signal) */}
                    {isAdmin && r.is_vote_flagged && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Community Flagged
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

                {isAdmin && expandedBreakdownId === r.id && (() => {
                  const breakdown = r.ai_score_breakdown;
                  const { tier, score, driver } = getCredibility(r);
                  return (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mb-3 p-3 rounded-lg bg-theme-bg-start/40 border border-theme-border text-[11px] space-y-2"
                    >
                      <p className="font-bold text-theme-fg-muted uppercase tracking-wider text-[10px]">Credibility Breakdown</p>

                      <div className="flex justify-between items-start gap-2">
                        <span className="text-theme-fg-muted">AI · Text</span>
                        <span className="text-right text-theme-fg">
                          {breakdown?.text?.plausibility != null
                            ? `${Math.round(breakdown.text.plausibility * 100)}%${breakdown.text.reason ? ` — ${breakdown.text.reason}` : ''}`
                            : 'Not scored'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-theme-fg-muted">AI · Photo</span>
                        <span className="text-right text-theme-fg">
                          {breakdown?.photo?.plausibility != null
                            ? `${Math.round(breakdown.photo.plausibility * 100)}%${breakdown.photo.reason ? ` — ${breakdown.photo.reason}` : ''}`
                            : r.photo_url ? 'Not scored' : 'No photo'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-theme-fg-muted">Report votes</span>
                        <span className="text-theme-fg">{r.upvotes_count || 0} up / {r.downvotes_count || 0} down</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-theme-fg-muted">Comment votes</span>
                        <span className="text-theme-fg">{r.comment_upvotes_total || 0} up / {r.comment_downvotes_total || 0} down</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-theme-fg-muted">Reporter trust</span>
                        <span className="text-theme-fg">
                          {typeof r.trust_score === 'number' ? `${Math.round(r.trust_score * 100)}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-theme-border/50 flex justify-between items-center gap-2">
                        <span className="text-theme-fg-muted font-semibold">Final rating</span>
                        <span className="text-theme-fg font-bold">
                          {tier ? TIER_LABELS[tier] : 'Not enough data'}
                          {score != null ? ` (${Math.round(score * 100)}%)` : ''}
                          {driver ? ` — ${driver}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {r.photo_url && (
                  <div className="mb-3">
                    <img
                      src={resolvePhotoUrl(r.photo_url) ?? undefined}
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
                    {isAdmin && typeof r.trust_score === 'number' && (
                      <span className="block text-[10px] text-theme-fg-muted">
                        Trust: {Math.round(r.trust_score * 100)}% ({r.confirmed_reports_count || 0} confirmed / {r.falsified_reports_count || 0} false)
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {/* Comments — supporting evidence/discussion instead of a duplicate report */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedCommentsReportId(r.id); }}
                      className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                      title="View comments"
                    >
                      <MessageCircle className="w-3 h-3" />
                      <span>{r.comment_count || 0}</span>
                    </button>

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
                </div>

                {/* Manual AI (re-)analysis — assist-only, runs synchronously so admins
                    get an immediate result instead of waiting on background scoring. */}
                {canReviewReports && (
                  <button
                    onClick={(e) => handleAnalyze(e, r.id)}
                    disabled={analyzingId === r.id}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold text-xs active:scale-95 transition-all disabled:opacity-50"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{analyzingId === r.id ? 'Analyzing…' : 'Analyze with AI'}</span>
                  </button>
                )}

                {/* Verification Actions (LGU admin only). Pending reports can be
                    confirmed or falsified; confirmed reports can still be falsified
                    later if they turn out to be a mistake. */}
                {canReviewReports && (r.status === REPORT_STATUS.PENDING || r.status === REPORT_STATUS.CONFIRMED) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-theme-border/50">
                    {r.status === REPORT_STATUS.PENDING && (
                      <button
                        onClick={(e) => handleConfirm(e, r.id)}
                        disabled={actionLoading === r.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{REPORT_REVIEW_ACTIONS.CONFIRM}</span>
                      </button>
                    )}
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

      {selectedCommentsReportId && (
        <CommentThread reportId={selectedCommentsReportId} onClose={() => setSelectedCommentsReportId(null)} />
      )}
    </div>
  );
}
