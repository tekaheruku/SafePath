import { NextResponse } from 'next/server';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:3001';
function toStartOfDayPHT(date) {
    if (date.includes('T'))
        return date;
    return `${date}T00:00:00.000+08:00`;
}
function toEndOfDayPHT(date) {
    if (date.includes('T'))
        return date;
    return `${date}T23:59:59.999+08:00`;
}
export async function GET(request) {
    const sp = request.nextUrl.searchParams;
    const rawFrom = sp.get('from') || sp.get('startDate') || null;
    const rawTo = sp.get('to') || sp.get('endDate') || null;
    const page = sp.get('page') || '1';
    const limit = sp.get('limit') || '100';
    const minLat = sp.get('minLat') || '15.30';
    const maxLat = sp.get('maxLat') || '15.41';
    const minLng = sp.get('minLng') || '119.92';
    const maxLng = sp.get('maxLng') || '120.18';
    const startDate = rawFrom ? toStartOfDayPHT(rawFrom) : null;
    const endDate = rawTo ? toEndOfDayPHT(rawTo) : null;
    const params = new URLSearchParams({ page, limit, minLat, maxLat, minLng, maxLng });
    if (startDate)
        params.set('startDate', startDate);
    if (endDate)
        params.set('endDate', endDate);
    try {
        const headers = {};
        const auth = request.headers.get('authorization');
        if (auth)
            headers['Authorization'] = auth;
        const res = await fetch(`${BACKEND}/api/v1/streets/ratings?${params}`, { headers });
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    }
    catch (err) {
        console.error('[/api/ratings proxy] fetch failed:', err);
        return NextResponse.json({ success: false, error: { message: 'Gateway error' } }, { status: 502 });
    }
}
