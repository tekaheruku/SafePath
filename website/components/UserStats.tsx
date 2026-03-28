'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface UserStatsProps {
  stats: {
    total_reports: number;
    total_upvotes: number;
    points_voted: number;
  };
}

const UserStats: React.FC<UserStatsProps> = ({ stats }) => {
  const cards = [
    { label: 'Total Reports', value: stats.total_reports, color: 'from-blue-500 to-indigo-600', icon: '📝' },
    { label: 'Total Upvotes', value: stats.total_upvotes, color: 'from-orange-500 to-red-600', icon: '🔥' },
    { label: 'Community Points', value: stats.total_upvotes * 10 + stats.points_voted * 2, color: 'from-emerald-500 to-teal-600', icon: '🏆' },
    { label: 'Votes Cast', value: stats.points_voted, color: 'from-violet-500 to-purple-600', icon: '⚡' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden rounded-2xl p-4 bg-slate-900 border border-slate-800 shadow-lg group hover:border-slate-700 transition-colors"
        >
          <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${card.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
          <div className="flex flex-col gap-1">
            <span className="text-2xl mb-1">{card.icon}</span>
            <span className="text-2xl font-black text-white">{card.value}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default UserStats;
