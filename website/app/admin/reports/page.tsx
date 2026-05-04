'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthContext';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import * as XLSX from 'xlsx';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, parseISO } from 'date-fns';
import { Calendar, Download, Filter, BarChart3, TrendingUp, ChevronLeft, Table as TableIcon } from 'lucide-react';
import Link from 'next/link';

interface SummaryData {
  period: string;
  car_crash: number;
  traffic_congestion: number;
  road_hazard: number;
  road_blockage: number;
  road_safety: number;
  total: number;
}

const PRESETS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'Last 6 Months', value: '6m' },
  { label: 'Last Year', value: '1y' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

export default function ReportSummaryPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<SummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [preset, setPreset] = useState('30d');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

  // Access Control
  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'superadmin' && user.role !== 'lgu_admin')) {
      router.push('/');
      return;
    }
  }, [user, router, authLoading]);

  // Handle Preset Changes
  useEffect(() => {
    const to = new Date();
    let from = new Date();

    switch (preset) {
      case '7d': from = subDays(to, 7); break;
      case '30d': from = subDays(to, 30); break;
      case '3m': from = subMonths(to, 3); break;
      case '6m': from = subMonths(to, 6); break;
      case '1y': from = subYears(to, 1); break;
      case 'all': from = new Date(2024, 0, 1); break; // Project start or similar
      case 'custom': return; // Don't auto-update if custom
    }

    if (preset !== 'custom') {
      setDateRange({
        from: format(from, 'yyyy-MM-dd'),
        to: format(to, 'yyyy-MM-dd')
      });
    }
  }, [preset]);

  // Fetch Data
  const fetchData = async () => {
    if (!token || !dateRange.from || !dateRange.to) return;
    
    setLoading(true);
    try {
      const res = await axios.get(`${apiUrl}/admin/reports/summary`, {
        params: {
          from: dateRange.from,
          to: dateRange.to,
          verified: verificationFilter
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to fetch report summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, verificationFilter, token]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(row => ({
      'Date / Period': format(parseISO(row.period), 'MMM d, yyyy'),
      'Car Crash': row.car_crash,
      'Traffic Congestion': row.traffic_congestion,
      'Road Hazard': row.road_hazard,
      'Road Blockage': row.road_blockage,
      'Road Safety': row.road_safety,
      'Total': row.total
    })));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports Summary");
    
    const rangeStr = `${dateRange.from}_to_${dateRange.to}`;
    XLSX.writeFile(wb, `safepath-report-${rangeStr}.xlsx`);
  };

  const totals = useMemo(() => {
    return data.reduce((acc, curr) => ({
      car_crash: acc.car_crash + curr.car_crash,
      traffic_congestion: acc.traffic_congestion + curr.traffic_congestion,
      road_hazard: acc.road_hazard + curr.road_hazard,
      road_blockage: acc.road_blockage + curr.road_blockage,
      road_safety: acc.road_safety + curr.road_safety,
      total: acc.total + curr.total
    }), { car_crash: 0, traffic_congestion: 0, road_hazard: 0, road_blockage: 0, road_safety: 0, total: 0 });
  }, [data]);

  if (authLoading || !user || (user.role !== 'superadmin' && user.role !== 'lgu_admin')) return null;

  return (
    <div className="min-h-screen bg-theme-bg-start text-theme-fg p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Link href="/admin/accounts" className="text-theme-fg-muted hover:text-theme-fg transition-colors">
                 <ChevronLeft className="w-5 h-5" />
               </Link>
               <span className="text-xs font-bold text-theme-fg-muted uppercase tracking-widest">Admin Dashboard</span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Incident Report Summary
            </h1>
            <p className="text-xs md:text-sm text-theme-fg-muted mt-1">Statistical overview of community-reported safety data</p>
          </div>

          <button 
            onClick={exportToExcel}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20"
          >
            <Download className="w-4 h-4" />
            Export as Excel
          </button>
        </div>

        {/* Filters Panel */}
        <div className="bg-theme-panel border border-theme-border rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Date Presets */}
            <div className="space-y-3">
              <label className="text-xs font-black text-theme-fg-muted uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Date Range
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPreset(p.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      preset === p.value 
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-900/30' 
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              
              {preset === 'custom' && (
                <div className="flex items-center gap-2 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-slate-600">→</span>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs font-mono outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Verification Status */}
            <div className="space-y-3">
              <label className="text-xs font-black text-theme-fg-muted uppercase tracking-widest flex items-center gap-2">
                <Filter className="w-3.5 h-3.5" /> User Verification
              </label>
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700">
                {(['all', 'verified', 'unverified'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVerificationFilter(v)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                      verificationFilter === v 
                        ? 'bg-slate-700 text-indigo-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart Type */}
            <div className="space-y-3">
              <label className="text-xs font-black text-theme-fg-muted uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Visualization
              </label>
              <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700 w-full">
                <button
                  onClick={() => setChartType('bar')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    chartType === 'bar' ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Bar
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    chartType === 'line' ? 'bg-slate-700 text-indigo-400 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Line
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-theme-panel border border-theme-border rounded-2xl p-6 mb-8 shadow-xl overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-theme-fg-muted uppercase tracking-widest">
              Incident Reports — {PRESETS.find(p => p.value === preset)?.label} ({verificationFilter === 'all' ? 'All Users' : verificationFilter + ' only'})
            </h3>
          </div>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                  />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    labelFormatter={(val) => format(parseISO(val as string), 'PPPP')}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="car_crash" name="Car Crash" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="traffic_congestion" name="Traffic" stackId="a" fill="#eab308" />
                  <Bar dataKey="road_hazard" name="Hazard" stackId="a" fill="#f97316" />
                  <Bar dataKey="road_blockage" name="Blockage" stackId="a" fill="#ef4444" />
                  <Bar dataKey="road_safety" name="Road Safety" stackId="a" fill="#8b5cf6" />
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis 
                    dataKey="period" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                  />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    labelFormatter={(val) => format(parseISO(val as string), 'PPPP')}
                  />
                  <Legend iconType="circle" />
                  <Line type="monotone" dataKey="car_crash" name="Car Crash" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="traffic_congestion" name="Traffic" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="road_hazard" name="Hazard" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="road_blockage" name="Blockage" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="road_safety" name="Road Safety" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-theme-panel border border-theme-border rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-theme-border flex items-center gap-2">
            <TableIcon className="w-5 h-5 text-theme-fg-muted" />
            <h3 className="text-sm font-black text-theme-fg-muted uppercase tracking-widest">Tabular Data</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/50 text-theme-fg-muted text-[10px] uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold border-r border-slate-800">Date / Period</th>
                  <th className="px-6 py-4 font-bold text-center">Car Crash</th>
                  <th className="px-6 py-4 font-bold text-center">Traffic</th>
                  <th className="px-6 py-4 font-bold text-center">Hazard</th>
                  <th className="px-6 py-4 font-bold text-center">Blockage</th>
                  <th className="px-6 py-4 font-bold text-center">Safety</th>
                  <th className="px-6 py-4 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-6 h-12 bg-slate-900/20"></td>
                    </tr>
                  ))
                ) : data.length > 0 ? (
                  data.map((row) => (
                    <tr key={row.period} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono font-bold border-r border-slate-800">
                        {format(parseISO(row.period), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 text-center text-xs">{row.car_crash}</td>
                      <td className="px-6 py-4 text-center text-xs">{row.traffic_congestion}</td>
                      <td className="px-6 py-4 text-center text-xs">{row.road_hazard}</td>
                      <td className="px-6 py-4 text-center text-xs">{row.road_blockage}</td>
                      <td className="px-6 py-4 text-center text-xs">{row.road_safety}</td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-indigo-400 bg-indigo-500/5">
                        {row.total}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-theme-fg-muted">
                      No data found for the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-900 font-bold border-t-2 border-slate-700">
                <tr>
                  <td className="px-6 py-4 text-xs uppercase tracking-wider border-r border-slate-800">Grand Total</td>
                  <td className="px-6 py-4 text-center text-sm">{totals.car_crash}</td>
                  <td className="px-6 py-4 text-center text-sm">{totals.traffic_congestion}</td>
                  <td className="px-6 py-4 text-center text-sm">{totals.road_hazard}</td>
                  <td className="px-6 py-4 text-center text-sm">{totals.road_blockage}</td>
                  <td className="px-6 py-4 text-center text-sm">{totals.road_safety}</td>
                  <td className="px-6 py-4 text-right text-sm text-indigo-400 bg-indigo-500/10">
                    {totals.total}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
