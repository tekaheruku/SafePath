'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../components/AuthContext';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), {
  ssr: false,
  loading: () => <div className="h-[750px] w-full flex items-center justify-center bg-slate-900 rounded-xl">Loading Map...</div>
});


export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          SafePath Interactive Map
        </h1>
        {!user && (
          <p className="text-slate-400 text-lg max-w-2xl">
            Visualizing community safety through real-time incident reports and detailed street ratings. 
            Use the heatmap to identify areas with high concern.
          </p>
        )}
      </header>

      <section className="bg-slate-900/50 rounded-2xl border border-slate-800 p-1 shadow-2xl backdrop-blur-sm">
        <MapDashboard />
      </section>

      {!user && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-4">
            <h2 className="text-2xl font-bold">Community Reports</h2>
            <p className="text-slate-400 text-sm">
              Submit incident reports to alert others about potential hazards or safety concerns in your area.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800 space-y-4">
            <h2 className="text-2xl font-bold">Street Ratings</h2>
            <p className="text-slate-400 text-sm">
              Rate the safety and accessibility of streets based on lighting, pedestrian facilities, and overall security.
            </p>
          </div>
        </section>
      )}

    </div>
  )
}
