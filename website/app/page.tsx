'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../components/AuthContext';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), {
  ssr: false,
  loading: () => <div className="h-[68vh] md:h-[72vh] min-h-[520px] w-full flex items-center justify-center bg-theme-panel rounded-xl">Loading Map...</div>
});


import { useRouter } from 'next/navigation';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="space-y-4 pb-4">
      <header className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          SafePath Interactive Map
        </h1>
        {!user && (
          <p className="text-theme-fg-muted text-sm md:text-base max-w-2xl leading-tight">
            Visualizing community safety through real-time incident reports and detailed street ratings. 
          </p>
        )}
      </header>

      <section className="bg-theme-panel/50 rounded-2xl border border-theme-border p-0.5 shadow-2xl backdrop-blur-sm">
        <MapDashboard />
      </section>

      {!user && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="p-6 rounded-2xl bg-theme-panel/30 border border-theme-border space-y-4">
            <h2 className="text-2xl font-bold">Community Reports</h2>
            <p className="text-theme-fg-muted text-sm">
              Submit incident reports to alert others about potential hazards or safety concerns in your area.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-theme-panel/30 border border-theme-border space-y-4">
            <h2 className="text-2xl font-bold">Street Ratings</h2>
            <p className="text-theme-fg-muted text-sm">
              Rate the safety and accessibility of streets based on lighting, pedestrian facilities, and overall security.
            </p>
          </div>
        </section>
      )}

    </div>
  )
}
