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
    <div className="flex flex-col h-[calc(100dvh-64px-48px)] overflow-hidden w-full">
      <header className="flex-none space-y-1 mb-3 px-6 md:px-12">
        <h1 className="text-2xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          SafePath Interactive Map
        </h1>
        {!user && (
          <p className="text-theme-fg-muted text-sm md:text-lg max-w-4xl leading-tight">
            Visualizing community safety through real-time incident reports and detailed street ratings. 
          </p>
        )}
      </header>

      {/* Map container - fills remaining space and is truly edge-to-edge */}
      <section className="flex-grow relative w-full -mb-6 shadow-2xl overflow-hidden bg-theme-panel/50 border-t border-theme-border/20">
        <MapDashboard />
      </section>
    </div>
  )
}
