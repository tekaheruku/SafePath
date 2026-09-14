import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/route
 * Proxies requests to the OSRM public demo server.
 * Keeps the OSRM URL server-side and avoids CORS issues on the client.
 *
 * OSRM's `alternatives` option returns at most one or two near-identical paths
 * for short urban trips, which left the safety scorer with nothing meaningful to
 * choose between. On top of the base call we therefore route through two
 * perpendicular via-points to force genuinely different corridors, then drop any
 * candidate that overlaps one we already kept.
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

/* ── OSRM fetching ──────────────────────────────────────────────────────── */

const osrmBase = () => process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

/**
 * The public OSRM demo rate-limits aggressively and the panel re-requests on
 * every profile toggle, so identical lookups are served from memory for a few
 * minutes. Per-process and in-memory by design — it is a courtesy to the demo
 * server, not a correctness mechanism.
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

async function fetchOsrm(
  coords: LngLat[],
  profile: string,
  timeoutMs: number,
  alternatives: boolean
): Promise<any> {
  const path = coords.map(c => `${c[0]},${c[1]}`).join(';');
  const key = `${profile}|${coords.map(c => `${c[0].toFixed(5)},${c[1].toFixed(5)}`).join(';')}|${alternatives}`;

  const cached = cacheGet(key);
  if (cached) return cached;

  const url =
    `${osrmBase()}/route/v1/${profile}/${path}` +
    `?${alternatives ? 'alternatives=3&' : ''}geometries=geojson&overview=full&steps=false`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'SafePath/1.0 (safepath-iba.local)' },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err: any = new Error(`OSRM returned ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
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

  const attempts: Promise<any>[] = [fetchOsrm([start, end], safeProfile, 8000, true)];

  if (wantViaCandidates) {
    const mid: LngLat = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const theta = bearing(start, end);
    // Proportional to trip length, but never so small that the via-point snaps
    // back onto the same street, nor so large that it becomes an absurd dogleg.
    const offset = Math.min(600, Math.max(150, directDistance * 0.25));
    const viaLeft  = destinationPoint(mid, theta - Math.PI / 2, offset);
    const viaRight = destinationPoint(mid, theta + Math.PI / 2, offset);

    attempts.push(
      fetchOsrm([start, viaLeft, end], safeProfile, 5000, false),
      fetchOsrm([start, viaRight, end], safeProfile, 5000, false)
    );
  }

  // allSettled, so an optional via-candidate that times out or gets rate-limited
  // can never break routing — it just leaves fewer candidates to choose from.
  const settled = await Promise.allSettled(attempts);
  const base = settled[0];

  if (base.status === 'rejected') {
    const reason: any = base.reason;
    if (reason?.name === 'TimeoutError' || reason?.name === 'AbortError') {
      console.error('[/api/route proxy] OSRM timed out');
    } else {
      console.error('[/api/route proxy] OSRM error:', reason?.status ?? '', reason?.message ?? reason);
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
      ...baseData,
      routes: routes.length > 0 ? routes : baseData.routes,
    },
    { status: 200 }
  );
}
