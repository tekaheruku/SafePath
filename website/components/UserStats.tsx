'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ByType {
  incident_type_name: string | null;
  count: string | number;
}

interface UserStatsProps {
  stats: {
    total_reports: number;
    total_upvotes: number;
    total_downvotes: number;
    by_type: ByType[];
  };
}

const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  const cards = [
    { label: 'Total Reports',   value: stats.total_reports,   color: 'from-blue-500 to-indigo-600',   icon: '📝' },
    { label: 'Total Upvotes',   value: stats.total_upvotes,   color: 'from-orange-500 to-red-600',    icon: '🔥' },
    { label: 'Total Downvotes', value: stats.total_downvotes, color: 'from-slate-500 to-slate-700',   icon: '📉' },
    { label: 'Incident Types',  value: stats.by_type.length,  color: 'from-violet-500 to-purple-600', icon: '⚡' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden rounded-2xl p-4 bg-theme-panel border border-theme-border shadow-lg group hover:border-slate-700 transition-colors"
          >
            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${card.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex flex-col gap-1">
              <span className="text-2xl mb-1">{card.icon}</span>
              <span className="text-2xl font-black text-theme-fg">{card.value}</span>
              <span className="text-[10px] font-bold text-theme-fg-muted uppercase tracking-widest">{card.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {stats.by_type.length > 0 && (
        <div className="bg-theme-panel border border-theme-border rounded-2xl p-5">
          <h3 className="text-xs font-black text-theme-fg-muted uppercase tracking-widest mb-4">Reports by Incident Type</h3>
          <div className="flex flex-wrap gap-3">
            {stats.by_type.map((row) => (
              <div
                key={row.incident_type_name ?? 'unknown'}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20"
              >
                <span className="text-indigo-400 font-bold text-xs">{row.incident_type_name ?? 'Unknown'}</span>
                <span className="text-theme-fg font-black text-xs">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserStats;
