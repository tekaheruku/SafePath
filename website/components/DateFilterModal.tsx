'use client';

import React, { useState } from 'react';
import { X, Calendar, RotateCcw } from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  addDays, 
  startOfDay, 
  endOfDay 
} from 'date-fns';

interface DateFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (from: string | null, to: string | null, label?: string | null) => void;
  initialFrom?: string | null;
  initialTo?: string | null;
}

type FilterMode = 'structured' | 'custom';

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialFrom,
  initialTo,
}) => {
  const [mode, setMode] = useState<FilterMode>('structured');
  
  // Mode 1: Structured
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isCustomYear, setIsCustomYear] = useState<boolean>(false);

  // Mode 2: Custom
  const [customFrom, setCustomFrom] = useState<string>(initialFrom || '');
  const [customTo, setCustomTo] = useState<string>(initialTo || '');

  if (!isOpen) return null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
  ];

  // Given a week number (1-5) and a day-of-week index (0=Sun … 6=Sat),
  // return the actual Date that falls in that slot for the selected month/year.
  // Returns null if the day falls outside the selected month.
  const resolveDate = (week: number, dayIndex: number): Date | null => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const weekStart = addDays(monthStart, (week - 1) * 7);
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      if (d.getDay() === dayIndex) {
        // Only return if the date is still within the selected month
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) {
          return d;
        }
        return null;
      }
    }
    return null;
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const handleApply = () => {
    if (mode === 'custom') {
      // Build a readable label for custom range
      let label: string | null = null;
      if (customFrom || customTo) {
        const fmt = (s: string) => {
          const d = new Date(s + 'T00:00:00');
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };
        if (customFrom && customTo && customFrom !== customTo) {
          label = `${fmt(customFrom)} – ${fmt(customTo)}`;
        } else if (customFrom) {
          label = fmt(customFrom);
        } else if (customTo) {
          label = fmt(customTo);
        }
      }
      onApply(customFrom || null, customTo || null, label);
    } else {
      // Calculate date range for structured mode using date-fns
      const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
      
      let fromDate: Date;
      let toDate: Date;
      let label: string;

      if (selectedWeek !== null) {
        // Week calculation: Start from (selectedWeek - 1) * 7 days after month start
        const weekStart = addDays(monthStart, (selectedWeek - 1) * 7);
        
        if (selectedDay !== null) {
          // Specific day within that 7-day window
          let targetDay = weekStart;
          for (let i = 0; i < 7; i++) {
            const d = addDays(weekStart, i);
            if (d.getDay() === selectedDay) {
              targetDay = d;
              break;
            }
          }
          fromDate = startOfDay(targetDay);
          toDate = endOfDay(targetDay);
          // Label: "May 3, 2026"
          label = fromDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } else {
          // Whole 7-day "week"
          fromDate = startOfDay(weekStart);
          toDate = endOfDay(addDays(weekStart, 6));
          // Label: "May Week 2, 2026"
          label = `${months[selectedMonth]} Week ${selectedWeek}, ${selectedYear}`;
        }
      } else {
        // Entire month
        fromDate = monthStart;
        toDate = endOfDay(endOfMonth(monthStart));
        // Label: "May 2026"
        label = `${months[selectedMonth]} ${selectedYear}`;
      }

      onApply(fromDate.toISOString(), toDate.toISOString(), label);
    }
    onClose();
  };

  const handleReset = () => {
    onApply(null, null, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all duration-300">
      <div 
        className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden glass-panel active-glow animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-semibold text-white">Filter by Date</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex p-1 m-4 bg-slate-800/50 rounded-xl border border-slate-700/30">
          <button
            onClick={() => setMode('structured')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'structured' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            Structured
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              mode === 'custom' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
          {mode === 'structured' ? (
            <div className="space-y-4">
              {/* Year Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Year</label>
                <div className="flex items-center gap-2">
                  <select
                    value={isCustomYear || !yearOptions.includes(selectedYear) ? 'custom' : selectedYear}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomYear(true);
                      } else {
                        setIsCustomYear(false);
                        setSelectedYear(parseInt(e.target.value));
                        setSelectedWeek(null);
                        setSelectedDay(null);
                      }
                    }}
                    className="flex-1 bg-slate-800/50 border border-slate-700 text-slate-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-all cursor-pointer"
                  >
                    {yearOptions.map(yr => (
                      <option className="bg-slate-800 text-slate-200" key={yr} value={yr}>{yr}</option>
                    ))}
                    <option className="bg-slate-800 text-slate-200" value="custom">Custom...</option>
                  </select>
                  {(isCustomYear || !yearOptions.includes(selectedYear)) && (
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setSelectedYear(val);
                          setSelectedWeek(null); // Optional: reset week/day on custom year typing
                          setSelectedDay(null);
                        }
                      }}
                      className="w-24 bg-slate-800/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none p-2.5 transition-all text-center"
                      placeholder="Year"
                    />
                  )}
                </div>
              </div>

              {/* Month Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Month</label>
                <div className="grid grid-cols-3 gap-2">
                  {months.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => {
                        setSelectedMonth(index);
                        setSelectedWeek(null);
                        setSelectedDay(null);
                      }}
                      className={`py-2 text-xs rounded-lg border transition-all ${
                        selectedMonth === index
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {month}
                    </button>
                  ))}
                </div>
              </div>

              {/* Week Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Week</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((week) => (
                    <button
                      key={week}
                      onClick={() => {
                        setSelectedWeek(selectedWeek === week ? null : week);
                        setSelectedDay(null);
                      }}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                        selectedWeek === week
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                          : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      Week {week}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Picker */}
              {selectedWeek && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Specific Day (Optional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {daysOfWeek.map((day, index) => {
                      const resolved = resolveDate(selectedWeek, index);
                      const dateStr = resolved
                        ? resolved.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : null;
                      return (
                        <button
                          key={day}
                          onClick={() => resolved ? setSelectedDay(selectedDay === index ? null : index) : undefined}
                          disabled={!resolved}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${
                            !resolved
                              ? 'opacity-30 cursor-not-allowed bg-slate-800/10 border-slate-800 text-slate-600'
                              : selectedDay === index
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                              : 'bg-slate-800/30 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-[11px] font-semibold">{day.slice(0, 3)}</span>
                          {dateStr && (
                            <span className={`text-[10px] font-mono ${
                              selectedDay === index ? 'text-indigo-400' : 'text-slate-500'
                            }`}>{dateStr}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 flex gap-3 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold shadow-lg shadow-indigo-900/40 transition-all active:scale-[0.98]"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};
