import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/route
 * Proxies routing requests to the public FOSSGIS Valhalla demo server.
 * Keeps the routing URL server-side and avoids CORS issues on the client.
 *
 * This used to proxy OSRM's public demo, but that demo only ever loads a
 * car-routing graph: requesting /route/v1/foot/... or /route/v1/bike/...
 * silently returned car-speed routes relabelled as walking/cycling (a 2.8km
 * walk timed at 3 minutes -- about 57 km/h). Valhalla's pedestrian / bicycle /
 * auto costing models are genuinely distinct, so Walk and Cycle now report
 * real walking/cycling speeds and can legitimately prefer different streets
 * than Drive does.
 *
 * Valhalla's own `alternates` option returns at most one or two near-identical
 * paths for short urban trips, which left the safety scorer with nothing
 * meaningful to choose between. On top of the base call we therefore route
 * through two perpendicular via-points to force genuinely different corridors,
 * then drop any candidate that overlaps one we already kept.
 *
 * Query params:
 *   startLat, startLng  — origin
 *   endLat,   endLng    — destination
 *   profile             — 'foot' | 'bike' | 'car'  (default: 'foot')
 */

type LngLat = [number, number];

const EARTH_RADIUS_M = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

function bearing(a: LngLat, b: LngLat): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

/** Point `distance` metres from `origin` along `bearingRad`. */
function destinationPoint(origin: LngLat, bearingRad: number, distance: number): LngLat {
  const d = distance / EARTH_RADIUS_M;
  const lat1 = toRad(origin[1]);
  const lng1 = toRad(origin[0]);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearingRad)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );
  return [toDeg(lng2), toDeg(lat2)];
}

/* ── Candidate de-duplication ───────────────────────────────────────────── */

/** ~0.0005° ≈ 55 m at Iba's latitude. */
const GRID = 0.0005;
const SIMILARITY_LIMIT = 0.8;
const MAX_CANDIDATES = 4;

/**
 * Snap a geometry to a coarse grid and return the set of occupied cells. Jaccard
 * overlap of two such sets is a cheap, symmetric stand-in for a real curve
 * distance, and is unaffected by the two routes having different vertex counts.
 */
function cellSet(geometry: LngLat[]): Set<string> {
  const cells = new Set<string>();
  for (let i = 0; i < geometry.length; i++) {
    const [lng, lat] = geometry[i];
    cells.add(`${Math.round(lat / GRID)}|${Math.round(lng / GRID)}`);

    // Interpolate across long gaps so a sparse straight doesn't look distinct
    // from a dense one covering the same ground.
    if (i > 0) {
      const prev = geometry[i - 1];
      const gap = haversineMeters(prev, geometry[i]);
      if (gap > 30) {
        const steps = Math.min(40, Math.floor(gap / 30));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          cells.add(
            `${Math.round((prev[1] + (lat - prev[1]) * t) / GRID)}|` +
            `${Math.round((prev[0] + (lng - prev[0]) * t) / GRID)}`
          );
        }
      }
    }
  }
  return cells;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  a.forEach(cell => { if (b.has(cell)) shared++; });
  return shared / (a.size + b.size - shared);
}

function dedupeRoutes(candidates: any[]): any[] {
  const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
  const kept: { route: any; cells: Set<string> }[] = [];

  for (const route of sorted) {
    const coords = route?.geometry?.coordinates as LngLat[] | undefined;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const cells = cellSet(coords);
    const tooSimilar = kept.some(k => jaccard(cells, k.cells) >= SIMILARITY_LIMIT);
    if (tooSimilar) continue;

    kept.push({ route, cells });
    if (kept.length >= MAX_CANDIDATES) break;
  }

  return kept.map(k => k.route);
}

/* ── Polyline decoding ──────────────────────────────────────────────────── */

/**
 * Decode a Valhalla-encoded polyline (Google's algorithm, precision 6 instead
 * of Google Maps' usual precision 5) into [lng, lat] pairs, matching the
 * GeoJSON coordinate order the rest of the app already expects from the old
 * OSRM `geometry.coordinates` field.
 */
function decodePolyline6(encoded: string): LngLat[] {
  const factor = 1e6;
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LngLat[] = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);

    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

/* ── Valhalla fetching ──────────────────────────────────────────────────── */

const PROFILE_TO_COSTING: Record<string, string> = {
  foot: 'pedestrian',
  bike: 'bicycle',
  car: 'auto',
};

const valhallaBase = () => process.env.VALHALLA_BASE_URL || 'https://valhalla1.openstreetmap.de';

/**
 * The public Valhalla demo (like the OSRM one before it) rate-limits and asks
 * callers to self-identify, and the panel re-requests on every profile
 * toggle, so identical lookups are served from memory for a few minutes.
 * Per-process and in-memory by design — a courtesy to the demo server, not a
 * correctness mechanism.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; data: any }>();

function cacheGet(key: string): any | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: any): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), data });
}

/**
 * Fetch a route from Valhalla and adapt its {trip, alternates} response into
 * the OSRM-shaped {routes: [{geometry:{coordinates}, distance, duration}]}
 * contract the rest of the app (safety scoring, map drawing, de-dup) is
 * already written against — so nothing downstream of this file needed to
 * change for this swap.
 */
async function fetchValhalla(
  coords: LngLat[],
  profile: string,
  timeoutMs: number,
  alternates: number
): Promise<{ routes: any[] }> {
  const costing = PROFILE_TO_COSTING[profile] || 'pedestrian';
  const key = `${costing}|${coords.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(';')}|${alternates}`;

  const cached = cacheGet(key);
  if (cached) return cached;

  const body = {
    locations: coords.map(c => ({ lat: c[1], lon: c[0] })),
    costing,
    units: 'kilometers',
    ...(alternates > 0 ? { alternates } : {}),
  };

  const res = await fetch(`${valhallaBase()}/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SafePath/1.0 (safepath-iba.local)',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: any = new Error(`Valhalla returned ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const raw = await res.json();

  if (raw.error) {
    // e.g. no route found between the points — not a transport-level failure,
    // so surface it as an empty result rather than throwing.
    const data = { routes: [] };
    cacheSet(key, data);
    return data;
  }

  const trips = [raw.trip, ...((raw.alternates || []).map((a: any) => a.trip))].filter(
    (t: any) => t && t.status === 0
  );

  const routes = trips.map((trip: any) => {
    const coordinates: LngLat[] = [];
    for (const leg of trip.legs || []) {
      const legCoords = decodePolyline6(leg.shape);
      // Consecutive legs repeat the shared via-point; drop the duplicate so
      // the merged line doesn't kink back on itself.
      if (coordinates.length > 0 && legCoords.length > 0) legCoords.shift();
      coordinates.push(...legCoords);
    }
    return {
      geometry: { type: 'LineString', coordinates },
      distance: (trip.summary?.length || 0) * 1000, // km -> m
      duration: trip.summary?.time || 0,             // already seconds
    };
  });

  const data = { routes };
  cacheSet(key, data);
  return data;
}

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

  const start: LngLat = [parseFloat(startLng), parseFloat(startLat)];
  const end: LngLat   = [parseFloat(endLng),   parseFloat(endLat)];

  if (![start[0], start[1], end[0], end[1]].every(Number.isFinite)) {
    return NextResponse.json(
      { success: false, error: 'Coordinates must be valid numbers' },
      { status: 400 }
    );
  }

  const directDistance = haversineMeters(start, end);

  // Below ~300 m there is only one sensible path, so the extra calls buy nothing.
  const wantViaCandidates = directDistance >= 300;

  const attempts: Promise<{ routes: any[] }>[] = [fetchValhalla([start, end], safeProfile, 8000, 2)];

  if (wantViaCandidates) {
    const mid: LngLat = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const theta = bearing(start, end);
    // Proportional to trip length, but never so small that the via-point snaps
    // back onto the same street, nor so large that it becomes an absurd dogleg.
    const offset = Math.min(600, Math.max(150, directDistance * 0.25));
    const viaLeft  = destinationPoint(mid, theta - Math.PI / 2, offset);
    const viaRight = destinationPoint(mid, theta + Math.PI / 2, offset);

    attempts.push(
      fetchValhalla([start, viaLeft, end], safeProfile, 5000, 0),
      fetchValhalla([start, viaRight, end], safeProfile, 5000, 0)
    );
  }

  // allSettled, so an optional via-candidate that times out or gets rate-limited
  // can never break routing — it just leaves fewer candidates to choose from.
  const settled = await Promise.allSettled(attempts);
  const base = settled[0];

  if (base.status === 'rejected') {
    const reason: any = base.reason;
    if (reason?.name === 'TimeoutError' || reason?.name === 'AbortError') {
      console.error('[/api/route proxy] Valhalla timed out');
    } else {
      console.error('[/api/route proxy] Valhalla error:', reason?.status ?? '', reason?.message ?? reason);
    }
    return NextResponse.json(
      { success: false, error: 'Routing service unavailable. Try again shortly.' },
      { status: 502 }
    );
  }

  const baseData = base.value;
  if (!baseData?.routes || baseData.routes.length === 0) {
    return NextResponse.json(baseData, { status: 200 });
  }

  const collected: any[] = [...baseData.routes];
  for (let i = 1; i < settled.length; i++) {
    const s = settled[i];
    if (s.status === 'fulfilled' && Array.isArray(s.value?.routes)) {
      collected.push(...s.value.routes);
    } else if (s.status === 'rejected') {
      console.warn('[/api/route proxy] via-candidate skipped:', s.reason?.message ?? s.reason);
    }
  }

  const routes = dedupeRoutes(collected);

  return NextResponse.json(
    {
      routes: routes.length > 0 ? routes : baseData.routes,
    },
    { status: 200 }
  );
}
