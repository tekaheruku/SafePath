'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
});

const SEVERITY_MAP: Record<string | number, { label: string; cls: string }> = {
  low:    { label: 'Low',    cls: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  medium: { label: 'Medium', cls: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  high:   { label: 'High',   cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
  1:      { label: 'Low',    cls: 'bg-green-500/20 text-green-300 border border-green-500/30' },
  2:      { label: 'Medium', cls: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' },
  3:      { label: 'High',   cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
};

export default function ReportPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiClient.get('/reports', { params: { page: 1, limit: 50 } })
      .then(res => setReports(res.data.data.reports || []))
      .catch(err => {
        console.error('Reports fetch error:', err?.response?.data ?? err.message);
        setError('Could not load reports right now.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-fg">Incident Reports</h1>
        <p className="text-theme-fg-muted mt-1">All reported incidents in Iba, Zambales</p>
      </div>

      {loading && (
        <div className="text-theme-fg-muted text-center py-16 animate-pulse text-sm">Loading reports…</div>
      )}

      {!loading && error && (
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-12 text-center space-y-4">
          <p className="text-theme-fg-muted text-base">No reports to display yet.</p>
          <p className="text-theme-fg-muted text-sm">{error}</p>
          <button
            onClick={load}
            className="mt-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-theme-fg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="bg-theme-panel rounded-2xl border border-theme-border p-12 text-center">
          <p className="text-theme-fg-muted text-base">No reports have been filed yet.</p>
          <p className="text-theme-fg-muted text-sm mt-1">Be the first to report an incident on the map.</p>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => {
          const sev = SEVERITY_MAP[r.severity_level] ?? SEVERITY_MAP['low'];
          return (
            <div key={r.id} className="bg-theme-panel rounded-xl border border-theme-border p-5 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1.5">
                    <h3 className="text-theme-fg font-semibold text-base">{r.type}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${sev.cls}`}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-theme-fg-muted text-sm leading-relaxed">{r.description}</p>
                  {r.author_name && (
                    <p className="text-xs text-theme-fg-muted mt-2">by {r.author_name}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-theme-fg-muted">
                    {new Date(r.created_at).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                  {r.location?.coordinates && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      {r.location.coordinates[1].toFixed(4)}, {r.location.coordinates[0].toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
