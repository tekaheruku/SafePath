'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), {
  ssr: false,
  loading: () => <div className="h-[68vh] md:h-[72vh] min-h-[520px] w-full flex items-center justify-center bg-theme-panel rounded-xl">Loading Map...</div>
});

export default function Home() {
  return (
    <div className="h-[calc(100dvh-64px)] -my-6 overflow-hidden w-full">
      {/* Map fills the entire area below the nav, edge-to-edge */}
      <section className="relative w-full h-full shadow-2xl overflow-hidden bg-theme-panel/50">
        <MapDashboard />
      </section>
    </div>
  )
}
