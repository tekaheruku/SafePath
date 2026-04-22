import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin.replace(/:\d+$/, ':3001') : 'http://localhost:3001');

/**
 * Convert a bare date string (YYYY-MM-DD) to a full ISO timestamp.
 * Using UTC+8 (Philippine Standard Time) so that a day like "2026-03-01"
 * means 2026-03-01 00:00:00 PHT → 2025-02-28T16:00:00Z  (start of day PHT).
 *
 * If the value already contains a 'T' it is returned as-is.
 */
function toStartOfDayPHT(date: string): string {
  if (date.includes('T')) return date;
  return `${date}T00:00:00.000+08:00`;
}

function toEndOfDayPHT(date: string): string {
  if (date.includes('T')) return date;
  return `${date}T23:59:59.999+08:00`;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // Accept both ?from/to (short form) and ?startDate/endDate (legacy)
  const rawFrom  = sp.get('from')       || sp.get('startDate') || null;
  const rawTo    = sp.get('to')         || sp.get('endDate')   || null;
  const page     = sp.get('page')       || '1';
  const limit    = sp.get('limit')      || '100';
  const minLat   = sp.get('minLat')     || '15.30';
  const maxLat   = sp.get('maxLat')     || '15.41';
  const minLng   = sp.get('minLng')     || '119.92';
  const maxLng   = sp.get('maxLng')     || '120.18';
  const severity = sp.get('severity');

  const startDate = rawFrom ? toStartOfDayPHT(rawFrom) : null;
  const endDate   = rawTo   ? toEndOfDayPHT(rawTo)     : null;

  const params = new URLSearchParams({ page, limit, minLat, maxLat, minLng, maxLng });
  if (startDate) params.set('startDate', startDate);
  if (endDate)   params.set('endDate',   endDate);
  if (severity)  params.set('severity',  severity);

  try {
    // Forward the Authorization header if present (for vote/delete on the map)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const auth = request.headers.get('authorization');
    if (auth) headers['Authorization'] = auth;

    const res = await fetch(`${BACKEND}/api/v1/reports?${params}`, { headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[/api/reports proxy] fetch failed:', err);
    return NextResponse.json({ success: false, error: { message: 'Gateway error' } }, { status: 502 });
  }
}
