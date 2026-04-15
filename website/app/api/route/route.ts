import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/route
 * Proxies requests to the OSRM public demo server.
 * Keeps the OSRM URL server-side and avoids CORS issues on the client.
 *
 * Query params:
 *   startLat, startLng  — origin
 *   endLat,   endLng    — destination
 *   profile             — 'foot' | 'bike' | 'car'  (default: 'foot')
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const startLat = sp.get('startLat');
  const startLng = sp.get('startLng');
  const endLat   = sp.get('endLat');
  const endLng   = sp.get('endLng');
  const profile  = sp.get('profile') || 'foot';

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json(
      { success: false, error: 'Missing required params: startLat, startLng, endLat, endLng' },
      { status: 400 }
    );
  }

  // Validate profile to avoid open redirect
  const allowedProfiles = ['foot', 'bike', 'car'];
  const safeProfile = allowedProfiles.includes(profile) ? profile : 'foot';

  const osrmBase = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

  // OSRM route endpoint: coordinates in lng,lat order
  const osrmUrl =
    `${osrmBase}/route/v1/${safeProfile}/${startLng},${startLat};${endLng},${endLat}` +
    `?alternatives=true&geometries=geojson&overview=full&steps=false`;

  try {
    const res = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'SafePath/1.0 (safepath-iba.local)' },
      // 10-second timeout
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[/api/route proxy] OSRM error:', res.status, text);
      return NextResponse.json(
        { success: false, error: `OSRM returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error('[/api/route proxy] fetch failed:', err.message);
    return NextResponse.json(
      { success: false, error: 'Routing service unavailable. Try again shortly.' },
      { status: 502 }
    );
  }
}
