'use client';
import React from 'react';
const HeatmapLegend = () => {
    return (<div className="glass-panel p-4 rounded-xl text-white shadow-2xl flex flex-col gap-4 pointer-events-none select-none w-[200px] border border-white/10">
      <h3 className="text-[11px] font-extrabold text-white uppercase tracking-widest mb-1 border-b border-white/10 pb-2">Heatmap Scale</h3>
      
      <div className="space-y-4">
        {/* Incidents Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-orange-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"/>
              Incidents
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#fde68a] via-[#f97316] to-[#ef4444] shadow-inner"/>
          <div className="flex justify-between text-[9px] text-slate-300 font-bold uppercase tracking-tight">
            <span>Low</span>
            <span>Critical</span>
          </div>
        </div>

        {/* Ratings Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-violet-300 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]"/>
              Safety
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-violet-500 to-purple-800 shadow-inner"/>
          <div className="flex justify-between text-[9px] text-slate-300 font-bold uppercase tracking-tight">
            <span>Safe</span>
            <span>Unsafe</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <p className="text-[9px] text-slate-400 font-medium italic leading-tight">
          Reflects data from last 30 days.
        </p>
      </div>
    </div>);
};
export default HeatmapLegend;
