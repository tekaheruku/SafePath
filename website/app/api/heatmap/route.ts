import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';

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

  const rawFrom = sp.get('from')      || sp.get('startDate') || null;
  const rawTo   = sp.get('to')        || sp.get('endDate')   || null;
  const type    = sp.get('type')      || 'all';
  const minLat  = sp.get('minLat')    || '15.30';
  const maxLat  = sp.get('maxLat')    || '15.41';
  const minLng  = sp.get('minLng')    || '119.92';
  const maxLng  = sp.get('maxLng')    || '120.18';

  const startDate = rawFrom ? toStartOfDayPHT(rawFrom) : null;
  const endDate   = rawTo   ? toEndOfDayPHT(rawTo)     : null;

  const params = new URLSearchParams({ type, minLat, maxLat, minLng, maxLng });
  if (startDate) params.set('startDate', startDate);
  if (endDate)   params.set('endDate',   endDate);

  try {
    const res = await fetch(`${BACKEND}/api/v1/heatmap/data?${params}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[/api/heatmap proxy] fetch failed:', err);
    return NextResponse.json({ success: false, error: { message: 'Gateway error' } }, { status: 502 });
  }
}
