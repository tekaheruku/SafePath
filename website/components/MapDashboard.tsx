'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@safepath/shared';
import { useAuth } from './AuthContext';
import { useSearchParams } from 'next/navigation';
import ReportForm from './ReportForm';
import StreetRatingForm from './StreetRatingForm';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: (icon as any).src || icon,
  shadowUrl: (iconShadow as any).src || iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
});

const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

// ── Iba, Zambales boundary polygon ───────────────────────────────────────────
// Real boundary from geoBoundaries (PSA ADM3), simplified to ~200 points
// Converted from GeoJSON [lng,lat] → Leaflet [lat,lng]
const IBA_POLYGON: [number, number][] = [[15.363195, 120.16533], [15.400907, 120.026686], [15.399707, 120.02698], [15.400948, 119.977113], [15.399692, 119.975568], [15.398845, 119.97301], [15.399327, 119.968351], [15.397798, 119.965706], [15.395086, 119.964256], [15.394973, 119.961917], [15.393446, 119.955584], [15.394647, 119.949487], [15.389436, 119.946064], [15.394012, 119.942333], [15.387994, 119.929913], [15.386142, 119.928768], [15.385777, 119.92904], [15.385536, 119.929195], [15.38541, 119.929286], [15.385281, 119.929411], [15.38514, 119.929573], [15.384663, 119.930198], [15.384501, 119.930408], [15.384301, 119.930654], [15.3842, 119.930871], [15.384036, 119.931108], [15.383586, 119.931849], [15.383488, 119.931991], [15.38338, 119.932166], [15.383305, 119.932315], [15.383207, 119.932549], [15.382498, 119.933658], [15.382186, 119.934192], [15.381258, 119.935653], [15.381093, 119.935853], [15.380961, 119.93599], [15.379818, 119.937329], [15.379321, 119.9378], [15.379225, 119.937865], [15.378868, 119.938102], [15.378663, 119.938214], [15.378459, 119.938343], [15.378311, 119.938458], [15.378047, 119.938779], [15.377738, 119.939048], [15.377298, 119.939285], [15.377029, 119.939321], [15.37676, 119.939336], [15.376479, 119.939381], [15.376249, 119.939404], [15.376044, 119.939567], [15.375956, 119.939813], [15.375971, 119.939962], [15.376101, 119.940043], [15.376276, 119.939962], [15.376435, 119.939862], [15.376568, 119.939833], [15.37644, 119.940097], [15.376253, 119.940196], [15.376019, 119.940193], [15.37582, 119.940189], [15.375581, 119.940197], [15.3752, 119.940216], [15.374823, 119.940227], [15.374581, 119.940182], [15.374703, 119.940065], [15.374961, 119.939983], [15.375125, 119.939926], [15.375287, 119.940023], [15.375465, 119.940066], [15.375666, 119.940051], [15.375712, 119.939946], [15.375584, 119.939733], [15.375596, 119.939698], [15.375759, 119.939664], [15.375677, 119.939492], [15.375509, 119.93943], [15.375346, 119.939406], [15.37503, 119.93949], [15.374622, 119.939702], [15.374444, 119.939822], [15.374184, 119.939978], [15.373968, 119.940085], [15.373761, 119.940231], [15.373537, 119.940442], [15.373289, 119.940635], [15.37301, 119.940914], [15.372114, 119.942065], [15.37193, 119.942218], [15.371719, 119.942406], [15.371434, 119.942682], [15.371111, 119.943169], [15.371038, 119.943396], [15.370956, 119.943646], [15.370857, 119.943892], [15.370719, 119.944053], [15.370597, 119.944295], [15.370464, 119.944469], [15.369906, 119.944769], [15.369852, 119.944977], [15.369632, 119.945078], [15.369382, 119.945199], [15.368287, 119.945999], [15.368156, 119.946162], [15.368066, 119.946344], [15.368009, 119.946624], [15.368012, 119.946842], [15.368013, 119.947011], [15.368102, 119.947106], [15.367995, 119.9473], [15.367834, 119.947498], [15.36775, 119.947776], [15.367592, 119.948267], [15.367504, 119.948625], [15.367441, 119.948998], [15.367387, 119.94926], [15.367297, 119.949488], [15.367126, 119.949807], [15.367019, 119.949956], [15.366872, 119.950126], [15.364711, 119.951448], [15.363881, 119.951589], [15.363223, 119.951742], [15.362876, 119.951796], [15.362581, 119.951873], [15.362323, 119.951884], [15.362045, 119.951819], [15.361759, 119.951658], [15.361576, 119.951534], [15.361381, 119.951403], [15.361132, 119.951273], [15.360986, 119.951198], [15.360829, 119.951132], [15.360439, 119.951058], [15.360206, 119.951011], [15.359915, 119.951015], [15.357557, 119.951508], [15.357309, 119.951494], [15.357007, 119.951579], [15.35681, 119.951814], [15.356672, 119.951952], [15.356467, 119.952105], [15.356261, 119.952213], [15.35601, 119.9523], [15.355694, 119.952432], [15.355531, 119.952573], [15.355437, 119.953037], [15.354989, 119.955701], [15.354905, 119.955912], [15.35403, 119.957613], [15.353013, 119.960737], [15.351343, 119.962726], [15.350006, 119.964076], [15.347704, 119.96581], [15.346381, 119.966585], [15.343509, 119.967384], [15.341419, 119.966575], [15.340007, 119.966042], [15.339501, 119.965594], [15.339192, 119.965542], [15.33813, 119.96517], [15.337817, 119.964979], [15.335391, 119.964097], [15.334132, 119.963884], [15.33392, 119.963874], [15.333723, 119.963908], [15.333439, 119.963901], [15.333202, 119.963893], [15.332941, 119.963942], [15.330832, 119.963957], [15.328523, 119.963953], [15.32595, 119.965033], [15.325363, 119.965669], [15.325282, 119.965921], [15.324148, 119.967945], [15.321977, 119.969707], [15.319647, 119.971431], [15.317022, 119.973055], [15.314718, 119.974961], [15.312898, 119.976862], [15.311191, 119.978407], [15.309723, 119.979872], [15.307682, 119.981485], [15.305659, 119.983235], [15.303719, 119.984897], [15.301796, 119.986549], [15.301985, 119.987796], [15.316842, 120.005062], [15.319621, 120.008465], [15.319579, 120.011603], [15.322054, 120.014937], [15.325803, 120.01716], [15.326144, 120.017997], [15.325409, 120.019138], [15.326492, 120.020088], [15.329549, 120.021242], [15.330868, 120.022578], [15.330775, 120.024827], [15.32953, 120.025917], [15.329913, 120.027132], [15.329698, 120.029857], [15.329419, 120.030992], [15.328763, 120.031915], [15.326524, 120.033349], [15.32716, 120.035166], [15.327053, 120.037757], [15.327977, 120.042261], [15.355932, 120.057997], [15.363174, 120.079285], [15.363195, 120.16533]];

// ── Stable Fog-of-War Layer ────────────────────────────────────────────────
function createFogLayer(map: L.Map): () => void {
  // Create an SVG element with filters for the glow
  const svg = L.SVG.create('svg');
  svg.innerHTML = `
    <defs>
      <filter id="fog-inner-glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="15" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="out" />
      </filter>
    </defs>
  `;
  map.getPane('overlayPane')?.appendChild(svg);

  // Define World Bounds for the inverted polygon
  const WORLD_BOUNDS: [number, number][] = [
    [90, -180], [90, 180], [-90, 180], [-90, -180]
  ];

  // The Fog Layer is a polygon with a hole (the Iba boundary)
  const fogLayer = L.polygon([WORLD_BOUNDS, IBA_POLYGON], {
    fillColor: '#080c1c',
    fillOpacity: 0.88,
    weight: 1,
    color: 'rgba(100, 160, 255, 0.8)', // Glowing edge color
    className: 'fog-of-war-polygon',
    interactive: false,
    pane: 'overlayPane'
  }).addTo(map);

  // Add a dedicated glowing edge layer on top
  const glowLayer = L.polygon(IBA_POLYGON, {
    fill: false,
    weight: 4,
    color: '#64a0ff',
    className: 'fog-glow-edge',
    interactive: false,
    pane: 'overlayPane'
  }).addTo(map);

  // Apply the SVG filter and backdrop-filter via CSS
  const style = document.createElement('style');
  style.innerHTML = `
    .fog-of-war-polygon {
      backdrop-filter: grayscale(1) brightness(0.35);
      pointer-events: none !important;
    }
    .fog-glow-edge {
      filter: url(#fog-inner-glow);
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);

  return () => {
    map.removeLayer(fogLayer);
    map.removeLayer(glowLayer);
    if (svg.parentNode) svg.parentNode.removeChild(svg);
    if (style.parentNode) style.parentNode.removeChild(style);
  };
}

// ── Main Component ───────────────────────────────────────────────────────────
const MapDashboard: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const incidentsHeatLayerRef = useRef<any>(null);
  const ratingsHeatLayerRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ reports: 0, heatmapPoints: 0 });
  const [showIncidentsHeat, setShowIncidentsHeat] = useState(true);
  const [showRatingsHeat, setShowRatingsHeat] = useState(true);
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  // Keep refs in sync so closures inside fetchMapData always read current visibility
  const showIncidentsHeatRef = useRef(true);
  const showRatingsHeatRef = useRef(true);

  const fetchMapData = async (bounds: L.LatLngBounds) => {
    setLoading(true);
    setError(null);
    try {
      const b = {
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      };

      // Use allSettled so one failing call doesn't kill the entire map load
      const [reportsResult, incidentHeatResult, ratingHeatResult] = await Promise.allSettled([
        apiClient.get('/reports', { params: { ...b, page: 1, limit: 100 } }),
        apiClient.get('/heatmap/data', { params: { ...b, type: 'incidents' } }),
        apiClient.get('/heatmap/data', { params: { ...b, type: 'ratings' } }),
      ]);

      let reports: any[] = [];
      let incidentPoints: any[] = [];
      let ratingPoints: any[] = [];

      if (reportsResult.status === 'fulfilled') {
        reports = reportsResult.value.data.data.reports || [];
      } else {
        console.warn('Reports fetch failed:', reportsResult.reason);
      }
      if (incidentHeatResult.status === 'fulfilled') {
        incidentPoints = incidentHeatResult.value.data.data.data || [];
      } else {
        console.warn('Incident heatmap fetch failed:', incidentHeatResult.reason);
      }
      if (ratingHeatResult.status === 'fulfilled') {
        ratingPoints = ratingHeatResult.value.data.data.data || [];
      } else {
        console.warn('Rating heatmap fetch failed:', ratingHeatResult.reason);
      }

      setStats({ reports: reports.length, heatmapPoints: incidentPoints.length + ratingPoints.length });
      updateMarkers(reports);
      updateIncidentsHeatmap(incidentPoints);
      updateRatingsHeatmap(ratingPoints);
    } catch (err: any) {
      console.error('Data fetch failed:', err);
      setError('Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const updateMarkers = (reports: any[]) => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    reports.forEach(r => {
      const canDelete = user && (user.id === r.user_id || ['admin', 'superadmin', 'lgu_admin'].includes(user.role));
      const deleteHtml = canDelete 
        ? `<br/><button onclick="window.deleteReport('${r.id}')" class="mt-2 text-xs text-red-500 hover:text-red-400 font-semibold transition-colors">Delete Report</button>` 
        : '';

      const marker = L.marker([r.location.coordinates[1], r.location.coordinates[0]])
        .bindPopup(`
          <strong>${r.type}</strong><br/>
          ${r.description}<br/>
          <small>Severity: ${r.severity_level}</small>
          ${deleteHtml}
        `)
        .addTo(mapRef.current!);
      markersRef.current.push(marker);
    });
  };

  const updateIncidentsHeatmap = (points: any[]) => {
    if (!mapRef.current) return;
    if (incidentsHeatLayerRef.current) incidentsHeatLayerRef.current.remove();
    if (!showIncidentsHeatRef.current || points.length === 0) return;
    incidentsHeatLayerRef.current = (L as any).heatLayer(
      points.map((p: any) => [p.latitude, p.longitude, p.intensity]),
      { radius: 28, blur: 18, maxZoom: 17, gradient: { 0.3: '#f97316', 0.6: '#ef4444', 1.0: '#dc2626' } }
    ).addTo(mapRef.current);
  };

  const updateRatingsHeatmap = (points: any[]) => {
    if (!mapRef.current) return;
    if (ratingsHeatLayerRef.current) ratingsHeatLayerRef.current.remove();
    if (!showRatingsHeatRef.current || points.length === 0) return;
    ratingsHeatLayerRef.current = (L as any).heatLayer(
      points.map((p: any) => [p.latitude, p.longitude, p.intensity]),
      { radius: 28, blur: 18, maxZoom: 17, gradient: { 0.3: '#34d399', 0.6: '#a78bfa', 1.0: '#7c3aed' } }
    ).addTo(mapRef.current);
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const IBA_BOUNDS = L.latLngBounds(
      [15.30, 119.92],  // SW
      [15.41, 120.18]   // NE — covers Santa Barbara far east
    );

    const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat') as string) : 15.390;
    const initialLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng') as string) : 120.060;
    const initialZoom = searchParams.get('zoom') ? parseInt(searchParams.get('zoom') as string) : 12;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: IBA_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Attach fog-of-war canvas layer
    const cleanupFog = createFogLayer(map);

    map.on('moveend', () => fetchMapData(map.getBounds()));
    mapRef.current = map;
    fetchMapData(map.getBounds());

    socket.on(SOCKET_EVENTS.REPORT_NEW, () => fetchMapData(map.getBounds()));
    socket.on(SOCKET_EVENTS.HEATMAP_UPDATED, () => fetchMapData(map.getBounds()));

    return () => {
      cleanupFog();
      socket.off(SOCKET_EVENTS.REPORT_NEW);
      socket.off(SOCKET_EVENTS.HEATMAP_UPDATED);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    (window as any).deleteReport = async (id: string) => {
      if (!confirm('Are you sure you want to delete this report?')) return;
      try {
        await apiClient.delete(`/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err: any) {
        console.error('Delete failed:', err.response?.data || err);
        alert('Failed to delete report.');
      }
    };
    return () => {
      delete (window as any).deleteReport;
    };
  }, [token]);

  const [showReportForm, setShowReportForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<L.LatLng | null>(null);
  const [selectionMode, setSelectionMode] = useState<'report' | 'rating' | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      setSelectedLocation(e.latlng);
      if (selectionMode === 'report') {
        setShowReportForm(true);
        setSelectionMode(null);
      } else if (selectionMode === 'rating') {
        setShowRatingForm(true);
        setSelectionMode(null);
      }
    };

    mapRef.current.on('click', onMapClick);
    return () => {
      mapRef.current?.off('click', onMapClick);
    };
  }, [selectionMode]);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900">
      <div ref={mapContainerRef} className="w-full h-full" />

      {selectionMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/90 text-white px-6 py-2 rounded-full font-bold animate-bounce shadow-2xl">
          📍 Click on the map to select location
        </div>
      )}

      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-4">
        <div className="bg-slate-900/90 p-4 rounded-lg text-white border border-slate-700 backdrop-blur-sm shadow-xl">
          <h3 className="font-bold mb-2 text-indigo-400">Live Safety Map</h3>
          {loading && <div className="animate-pulse text-xs text-slate-400">Updating data...</div>}
          {error && <div className="text-xs text-red-400 font-medium">{error}</div>}
          <div className="mt-3 space-y-1 text-xs border-t border-slate-700 pt-2">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Incidents:</span>
              <span className="font-mono text-indigo-300 font-bold">{stats.reports}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Heatmap pts:</span>
              <span className="font-mono text-orange-300 font-bold">{stats.heatmapPoints}</span>
            </div>
          </div>

          {/* Heatmap Layer Toggles */}
          <div className="mt-3 pt-2 border-t border-slate-700 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Heatmap Layers</p>
            <button
              onClick={() => {
                const next = !showIncidentsHeat;
                setShowIncidentsHeat(next);
                showIncidentsHeatRef.current = next;
                if (!next && incidentsHeatLayerRef.current) { incidentsHeatLayerRef.current.remove(); incidentsHeatLayerRef.current = null; }
                else if (next && mapRef.current) fetchMapData(mapRef.current.getBounds());
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                showIncidentsHeat
                  ? 'bg-orange-500/20 border border-orange-500/60 text-orange-300'
                  : 'bg-slate-800 border border-slate-600 text-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showIncidentsHeat ? 'bg-orange-400' : 'bg-slate-600'}`} />
              🔥 Incidents Heat
            </button>
            <button
              onClick={() => {
                const next = !showRatingsHeat;
                setShowRatingsHeat(next);
                showRatingsHeatRef.current = next;
                if (!next && ratingsHeatLayerRef.current) { ratingsHeatLayerRef.current.remove(); ratingsHeatLayerRef.current = null; }
                else if (next && mapRef.current) fetchMapData(mapRef.current.getBounds());
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                showRatingsHeat
                  ? 'bg-violet-500/20 border border-violet-500/60 text-violet-300'
                  : 'bg-slate-800 border border-slate-600 text-slate-500'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showRatingsHeat ? 'bg-violet-400' : 'bg-slate-600'}`} />
              🛡️ Street Ratings Heat
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setSelectionMode('report')}
            className={`w-full ${selectionMode === 'report' ? 'bg-orange-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2`}
          >
            <span>⚠️</span> {selectionMode === 'report' ? 'Cancel Selection' : 'Report Incident'}
          </button>
          <button
            onClick={() => setSelectionMode('rating')}
            className={`w-full ${selectionMode === 'rating' ? 'bg-orange-500' : 'bg-slate-800 hover:bg-slate-700'} text-white px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 border border-slate-700 flex items-center justify-center gap-2`}
          >
            <span>⭐</span> {selectionMode === 'rating' ? 'Cancel Selection' : 'Rate Street Safety'}
          </button>
        </div>
      </div>

      {showReportForm && selectedLocation && (
        <div className="absolute inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <ReportForm
              location={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              onSuccess={() => {
                setShowReportForm(false);
                setSelectedLocation(null);
                fetchMapData(mapRef.current!.getBounds());
              }}
              onCancel={() => {
                setShowReportForm(false);
                setSelectedLocation(null);
              }}
            />
          </div>
        </div>
      )}
      {showRatingForm && selectedLocation && (
        <div className="absolute inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <StreetRatingForm
              location={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              onSuccess={() => {
                setShowRatingForm(false);
                setSelectedLocation(null);
                fetchMapData(mapRef.current!.getBounds());
              }}
              onCancel={() => {
                setShowRatingForm(false);
                setSelectedLocation(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDashboard;