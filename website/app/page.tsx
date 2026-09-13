'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const MapDashboard = dynamic(() => import('../components/MapDashboard'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-theme-panel rounded-xl">Loading Map...</div>
});

export default function Home() {
  return (
    // position: fixed (pinned below the 64px/h-16 nav, down to the bottom of the
    // viewport) instead of a dvh calc + negative-margin trick: fixed elements are
    // sized against the visual viewport, so this stays exactly full-screen and
    // non-scrollable even as mobile browsers resize their address bar/toolbar.
    <div className="fixed inset-x-0 top-16 bottom-0 overflow-hidden w-full">
      <section className="relative w-full h-full shadow-2xl overflow-hidden bg-theme-panel/50">
        <MapDashboard />
      </section>
    </div>
  )
}
