'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserReportListProps {
  reports: any[];
  onDelete: (id: string) => void;
  onView: (id: string, lat: number, lng: number) => void;
}

const UserReportList: React.FC<UserReportListProps> = ({ reports, onDelete, onView }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <AnimatePresence>
        {reports.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: i * 0.05 }}
            layout
            onClick={() => onView(r.id, r.location.coordinates[1], r.location.coordinates[0])}
            className="group glass-panel bg-theme-panel/40 p-5 rounded-2xl cursor-pointer hover:bg-theme-panel/60 hover:border-white/20 transition-all border border-theme-border active:scale-[0.98]"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{r.type}</span>
                <span className="text-xs text-theme-fg-muted">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                r.severity_level === 'high' ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                r.severity_level === 'medium' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
              }`}>
                {r.severity_level.toUpperCase()}
              </span>
            </div>
            
            <p className="text-sm text-theme-fg-muted mb-4 line-clamp-2 leading-relaxed">
              {r.description}
            </p>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-theme-border">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] font-bold text-theme-fg-muted">
                  <span>🔼</span> {r.upvotes_count || 0}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-theme-fg-muted">
                  <span>🔽</span> {r.downvotes_count || 0}
                </div>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(r.id);
                }}
                className="text-[10px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                Remove
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default UserReportList;
