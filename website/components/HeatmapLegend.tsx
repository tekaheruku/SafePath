'use client';

import React from 'react';

interface HeatmapLegendProps {
  // Static legend, no props needed for toggling
}

const HeatmapLegend: React.FC<HeatmapLegendProps> = () => {
  return (
    <div className="glass-panel p-3 rounded-xl text-white shadow-2xl flex flex-col gap-3 pointer-events-none select-none w-[180px]">
      <h3 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Heatmap Scale</h3>
      
      <div className="space-y-3">
        {/* Incidents Row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-orange-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.6)]" />
              Incidents
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 opacity-80" />
          <div className="flex justify-between text-[7px] text-slate-500 uppercase tracking-tighter font-mono">
            <span>Low</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Ratings Row */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-violet-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_5px_rgba(139,92,246,0.6)]" />
              Safety
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-gradient-to-r from-emerald-500 via-violet-500 to-purple-800 opacity-80" />
          <div className="flex justify-between text-[7px] text-slate-500 uppercase tracking-tighter font-mono">
            <span>Safe</span>
            <span>Unsafe</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <p className="text-[8px] text-slate-400 italic leading-tight">
          Reflects data from last 30 days.
        </p>
      </div>
    </div>
  );
};

export default HeatmapLegend;
