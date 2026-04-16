'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@safepath/shared';
import { useAuth } from './AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMapStore } from '../store/useMapStore';
import { useDirectionsStore, ScoredRoute } from '../store/useDirectionsStore';
import ReportForm from './ReportForm';
import StreetRatingForm from './StreetRatingForm';
import HeatmapLegend from './HeatmapLegend';
import { DateFilterModal } from './DateFilterModal';
import SearchBar from './SearchBar';
import DirectionsPanel from './DirectionsPanel';
import { Calendar, FilterX, AlertCircle, Search, X, MapPin, Navigation } from 'lucide-react';
import { format } from 'date-fns';


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

  // Use a dedicated SVG renderer with high padding to reduce repositioning frequency/lag
  const fogRenderer = L.svg({ padding: 1.0 });

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
    pane: 'overlayPane',
    renderer: fogRenderer
  }).addTo(map);

  // Add a dedicated glowing edge layer on top
  const glowLayer = L.polygon(IBA_POLYGON, {
    fill: false,
    weight: 4,
    color: '#64a0ff',
    className: 'fog-glow-edge',
    interactive: false,
    pane: 'overlayPane',
    renderer: fogRenderer
  }).addTo(map);

  // Apply the SVG filter and backdrop-filter via CSS
  const style = document.createElement('style');
  style.innerHTML = `
    .fog-of-war-polygon {
      backdrop-filter: grayscale(1) brightness(0.35);
      -webkit-backdrop-filter: grayscale(1) brightness(0.35);
      pointer-events: none !important;
      will-change: transform, opacity;
      transform: translateZ(0);
    }
    .fog-glow-edge {
      filter: url(#fog-inner-glow);
      pointer-events: none !important;
      will-change: transform;
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
// ── Safety color thresholds for route polylines ────────────────────────────
function routePolylineColor(safetyScore: number): string {
  if (safetyScore >= 4.0) return '#22c55e';
  if (safetyScore >= 2.5) return '#f59e0b';
  return '#ef4444';
}

const MapDashboard: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const incidentsHeatLayerRef = useRef<any>(null);
  const ratingsHeatLayerRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const ratingMarkersRef = useRef<L.Marker[]>([]);
  // Route polylines
  const routePolylinesRef = useRef<L.Polyline[]>([]);
  const routeMarkersRef = useRef<L.Marker[]>([]); // start/end pins

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ reports: 0, heatmapPoints: 0 });
  
  const { 
    lat: storeLat, lng: storeLng, zoom: storeZoom, setView,
    showIncidentsHeat, showRatingsHeat, setIncidentsHeat, setRatingsHeat
  } = useMapStore();

  // Directions store
  const {
    isOpen: directionsOpen,
    setOpen: setDirectionsOpen,
    selectionTarget: directionsSelectionTarget,
    setSelectionTarget: setDirectionsSelectionTarget,
    setStartPoint: setDirectionsStart,
    setEndPoint: setDirectionsEnd,
    routes: directionRoutes,
    selectedRouteIndex,
  } = useDirectionsStore();

  const showIncidentsHeatRef = useRef(showIncidentsHeat);
  const showRatingsHeatRef = useRef(showRatingsHeat);

  // Sync refs with store values for use in callbacks
  useEffect(() => {
    showIncidentsHeatRef.current = showIncidentsHeat;
  }, [showIncidentsHeat]);

  useEffect(() => {
    showRatingsHeatRef.current = showRatingsHeat;
  }, [showRatingsHeat]);
  const [isSearching, setIsSearching] = useState(false);

  const [reports, setReports] = useState<any[]>([]);
  const [ratings, setRatings] = useState<any[]>([]);
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(searchParams.get('reportId'));
  const [selectedRatingId, setSelectedRatingId] = useState<string | null>(searchParams.get('ratingId'));

  const [incidentHeatPoints, setIncidentHeatPoints] = useState<any[]>([]);
  const [ratingHeatPoints, setRatingHeatPoints] = useState<any[]>([]);

  const [showReportForm, setShowReportForm] = useState(false);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<L.LatLng | null>(null);
  const [selectionMode, setSelectionMode] = useState<'report' | 'rating' | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  // Ref that always holds the latest dateRange so stale closures (socket handlers,
  // window.deleteReport, etc.) always read the current filter value.
  const dateRangeRef = useRef<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  // Directions selection mode ref (for use inside map click handler)
  const directionsSelectionTargetRef = useRef<'start' | 'end' | null>(null);
  useEffect(() => {
    directionsSelectionTargetRef.current = directionsSelectionTarget;
  }, [directionsSelectionTarget]);

  // Keep dateRangeRef in sync so that stale closures always read the current filter
  useEffect(() => {
    dateRangeRef.current = dateRange;
  }, [dateRange]);

  useEffect(() => {
    const rid = searchParams.get('reportId');
    if (rid) setSelectedReportId(rid);
    const ratid = searchParams.get('ratingId');
    if (ratid) setSelectedRatingId(ratid);
  }, [searchParams]);

  // Consume and clear URL parameters to support "reset on refresh"
  useEffect(() => {
    if (searchParams.get('lat') || searchParams.get('lng') || searchParams.get('reportId') || searchParams.get('ratingId')) {
      const timeout = setTimeout(() => {
        router.replace('/');
      }, 1500); // Give a bit more time for the flyTo animation
      return () => clearTimeout(timeout);
    }
  }, [searchParams, router]);

  // Consolidated Rendering Effect: The single source of truth for map visual state
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Clear and redraw everything in sync
    updateMarkers(reports);
    updateRatingMarkers(ratings);
    updateIncidentsHeatmap(incidentHeatPoints);
    updateRatingsHeatmap(ratingHeatPoints);
  }, [
    reports, 
    ratings, 
    incidentHeatPoints, 
    ratingHeatPoints, 
    selectedReportId, 
    selectedRatingId, 
    showIncidentsHeat, 
    showRatingsHeat, 
    dateRange
  ]);

  useEffect(() => {
    if (selectionMode) {
      setSelectedReportId(null);
      setSelectedRatingId(null);
    }
  }, [selectionMode]);



  // Custom Pin Icons
  const IncidentIcon = L.divIcon({
    className: 'custom-pin-incident',
    html: `
      <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.25C12.1005 20.25 9.75 17.8995 9.75 15C9.75 12.1005 12.1005 9.75 15 9.75C17.8995 9.75 20.25 12.1005 20.25 15C20.25 17.8995 17.8995 20.25 15 20.25Z" fill="#f97316"/>
        <circle cx="15" cy="15" r="5" fill="white"/>
      </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
  });

  const RatingIcon = L.divIcon({
    className: 'custom-pin-rating',
    html: `
      <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
        <path d="M15 0C6.71573 0 0 6.71573 0 15C0 26.25 15 42 15 42C15 42 30 26.25 30 15C30 6.71573 23.2843 0 15 0ZM15 20.25C12.1005 20.25 9.75 17.8995 9.75 15C9.75 12.1005 12.1005 9.75 15 9.75C17.8995 9.75 20.25 12.1005 20.25 15C20.25 17.8995 17.8995 20.25 15 20.25Z" fill="#3b82f6"/>
        <circle cx="15" cy="15" r="5" fill="white"/>
      </svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
  });

  const fetchMapData = async () => {
    // Always read from the ref so stale closures (socket handlers, delete/vote
    // handlers) use the current date filter rather than the value at the time
    // the closure was created.
    const currentDateRange = dateRangeRef.current;

    setLoading(true);
    setError(null);
    
    // Clear old data immediately to provide visual feedback that filtering is active
    setReports([]);
    setRatings([]);
    setIncidentHeatPoints([]);
    setRatingHeatPoints([]);

    try {
      const b = {
        minLat: 15.30,
        maxLat: 15.41,
        minLng: 119.92,
        maxLng: 120.18,
      };


      // Use allSettled so one failing call doesn't kill the entire map load.
      // All calls go through Next.js proxy routes (/api/*) which:
      //  1. Accept ?from/&to (bare date) OR ?startDate/&endDate (full ISO)
      //  2. Correct bare dates to start/end of day in PHT (UTC+8) before
      //     forwarding to the Express backend, so that "2026-03-01" covers
      //     the full Philippine day instead of truncating at UTC midnight.
      const fromParam = currentDateRange.from  ? { from: currentDateRange.from }  : {};
      const toParam   = currentDateRange.to    ? { to:   currentDateRange.to   }  : {};
      const dateParams = { ...fromParam, ...toParam };

      const [reportsResult, incidentHeatResult, ratingHeatResult, ratingsResult] = await Promise.allSettled([
        axios.get('/api/reports',  { params: { ...b, page: 1, limit: 100, ...dateParams } }),
        axios.get('/api/heatmap',  { params: { ...b, type: 'incidents', ...dateParams } }),
        axios.get('/api/heatmap',  { params: { ...b, type: 'ratings',   ...dateParams } }),
        axios.get('/api/ratings',  { params: { ...b, page: 1, limit: 100, ...dateParams } }),
      ]);

      let reports: any[] = [];
      let incidentPoints: any[] = [];
      let ratingPoints: any[] = [];
      let ratings: any[] = [];

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
      if (ratingsResult.status === 'fulfilled') {
        ratings = ratingsResult.value.data.data.ratings || [];
      } else {
        console.warn('Ratings fetch failed:', ratingsResult.reason);
      }

      setStats({ reports: reports.length, heatmapPoints: incidentPoints.length + ratingPoints.length });
      setReports(reports);
      setRatings(ratings);
      setIncidentHeatPoints(incidentPoints);
      setRatingHeatPoints(ratingPoints);
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

    // Hide pins if heatmap is toggled on (Convert to Heatmap feature)
    // EXCEPTION: Always show the selected report even if heatmap is on
    if (showIncidentsHeatRef.current && !selectedReportId) return;

    reports.forEach(r => {
      // If heatmap is on, only show the selected report
      if (showIncidentsHeatRef.current && r.id !== selectedReportId) return;

      const canDelete = user && (user.id === r.user_id || ['admin', 'superadmin', 'lgu_admin'].includes(user.role));
      const deleteHtml = canDelete 
        ? `<br/><button onclick="window.deleteReport('${r.id}')" class="mt-2 text-[10px] text-red-500 hover:text-red-400 font-semibold transition-colors">Delete Report</button>` 
        : '';

      const userVote = r.user_vote;
      const upvoteClass = userVote === 'up' ? 'text-indigo-400 font-bold' : 'text-theme-fg-muted hover:text-indigo-400';
      const downvoteClass = userVote === 'down' ? 'text-orange-400 font-bold' : 'text-theme-fg-muted hover:text-orange-400';

      const voteHtml = `
        <div class="mt-3 pt-2 border-t border-theme-border flex items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <button onclick="window.voteReport('${r.id}', 'up')" class="flex items-center gap-1 transition-all hover:scale-110 active:scale-95 ${upvoteClass}" title="Upvote">
              <span class="text-sm">🔼</span>
              <span class="text-[11px] font-mono">${r.upvotes_count || 0}</span>
            </button>
            <button onclick="window.voteReport('${r.id}', 'down')" class="flex items-center gap-1 transition-all hover:scale-110 active:scale-95 ${downvoteClass}" title="Downvote">
              <span class="text-sm">🔽</span>
              <span class="text-[11px] font-mono">${r.downvotes_count || 0}</span>
            </button>
          </div>
          ${deleteHtml}
        </div>
      `;

      const marker = L.marker([r.location.coordinates[1], r.location.coordinates[0]], { icon: IncidentIcon })
        .bindPopup(`
          <div class="min-w-[150px]">
            <div class="flex items-center justify-between gap-2 mb-1">
              <strong class="text-indigo-400 font-bold capitalize text-sm">${r.type}</strong>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-theme-panel border border-theme-border ${
                r.severity_level === 'high' ? 'text-red-400 border-red-900/50' : 
                r.severity_level === 'medium' ? 'text-orange-400 border-orange-900/50' : 'text-emerald-400 border-emerald-900/50'
              }">${r.severity_level}</span>
            </div>
            <div class="text-[10px] text-theme-fg-muted mb-2 font-bold uppercase tracking-tight">${format(new Date(r.created_at), 'MMM d, yyyy · p')}</div>
            ${r.photo_url ? `<img src="${r.photo_url}" alt="Incident Photo" class="w-full h-32 object-cover rounded-md mb-2 shadow-sm border border-slate-700/50" />` : ''}
            <p class="text-[13px] text-theme-fg leading-relaxed font-medium mb-2">${r.description || 'No description provided.'}</p>
            ${voteHtml}
          </div>
        `, { className: 'custom-popup-glass' })
        .addTo(mapRef.current!);
      
      if (r.id === selectedReportId) {
        setTimeout(() => marker.openPopup(), 500);
      }

      markersRef.current.push(marker);
    });

  };

  const updateIncidentsHeatmap = (points: any[]) => {
    if (!mapRef.current || !incidentsHeatLayerRef.current) return;

    const layer = incidentsHeatLayerRef.current;
    const map   = mapRef.current;
    const shouldShow = showIncidentsHeatRef.current && points.length > 0 && !selectedReportId;

    if (shouldShow) {
      // Update the internal lat/lng data array.
      layer._latlngs = points.map((p: any) => [p.latitude, p.longitude, p.intensity]);

      // Re-add to map if it was previously removed (safe if already present).
      if (!map.hasLayer(layer)) {
        layer.addTo(map);
      } else {
        // Already on map — just force a synchronous redraw with new data.
        if (typeof layer._reset === 'function') layer._reset();
      }
    } else {
      // Clear the data so any stale rAF that fires draws nothing.
      layer._latlngs = [];

      // Physically remove the canvas from the DOM and unregister moveend.
      // This is the only 100%-reliable way to make the heat disappear —
      // display:none can be undone by leaflet internals on map events.
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  };

  const updateRatingMarkers = (ratings: any[]) => {
    if (!mapRef.current) return;
    ratingMarkersRef.current.forEach(m => m.remove());
    ratingMarkersRef.current = [];

    // Hide pins if heatmap is toggled on (Convert to Heatmap feature)
    if (showRatingsHeatRef.current && !selectedRatingId) return;

    ratings.forEach(r => {
      if (showRatingsHeatRef.current && r.id !== selectedRatingId) return;

      const canDelete = user && (user.id === r.user_id || ['admin', 'superadmin', 'lgu_admin'].includes(user.role));
      const deleteHtml = canDelete 
        ? `<br/><button onclick="window.deleteRating('${r.id}')" class="mt-2 text-xs text-red-500 hover:text-red-400 font-semibold transition-colors">Delete Rating</button>` 
        : '';

      const marker = L.marker([r.location.coordinates[1], r.location.coordinates[0]], { icon: RatingIcon })
        .bindPopup(`
          <div class="min-w-[150px]">
            <div class="flex items-center justify-between gap-2 mb-1">
              <strong class="text-indigo-400 font-bold text-sm">Street Safety Rating</strong>
            </div>
            <div class="text-[10px] text-theme-fg-muted mb-2 font-bold uppercase tracking-tight">${format(new Date(r.created_at), 'MMM d, yyyy · p')}</div>
            <div class="mb-2 text-theme-fg font-medium">Score: <span class="text-violet-400 font-bold">${r.overall_safety_score}/5</span></div>
            ${r.photo_url ? `<img src="${r.photo_url}" alt="Street Photo" class="w-full h-32 object-cover rounded-md mb-2 shadow-sm border border-slate-700/50" />` : ''}
            ${r.comment ? `<p class="italic text-[13px] mt-1 text-theme-fg leading-relaxed font-medium mb-2">"${r.comment}"</p>` : ''}
          <div class="mt-2 text-[10px] space-y-0.5 text-theme-fg-muted font-medium bg-theme-panel/40 p-2 rounded-lg border border-theme-border">
            <div>Lighting: ${r.lighting_score}/5</div>
            <div>Pedestrian: ${r.pedestrian_safety_score}/5</div>
            <div>Driver: ${r.driver_safety_score}/5</div>
          </div>
          ${deleteHtml}
          </div>
        `, { className: 'custom-popup-glass' })
        .addTo(mapRef.current!);

      if (r.id === selectedRatingId) {
        setTimeout(() => marker.openPopup(), 500);
      }

      ratingMarkersRef.current.push(marker);
    });
  };

  const updateRatingsHeatmap = (points: any[]) => {
    if (!mapRef.current || !ratingsHeatLayerRef.current) return;

    const layer = ratingsHeatLayerRef.current;
    const map   = mapRef.current;
    const shouldShow = showRatingsHeatRef.current && points.length > 0 && !selectedRatingId;

    if (shouldShow) {
      layer._latlngs = points.map((p: any) => [p.latitude, p.longitude, p.intensity]);

      if (!map.hasLayer(layer)) {
        layer.addTo(map);
      } else {
        if (typeof layer._reset === 'function') layer._reset();
      }
    } else {
      layer._latlngs = [];

      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const IBA_BOUNDS = L.latLngBounds(
      [15.30, 119.92],  // SW
      [15.41, 120.18]   // NE — covers Santa Barbara far east
    );

    const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat') as string) : storeLat;
    const initialLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng') as string) : storeLng;
    const initialZoom = searchParams.get('zoom') ? parseInt(searchParams.get('zoom') as string) : storeZoom;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: initialZoom,
      minZoom: 13,
      maxZoom: 18,
      maxBounds: IBA_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      updateWhenIdle: false,
    }).addTo(map);


    // Attach fog-of-war canvas layer
    const cleanupFog = createFogLayer(map);

    // Create heat layer objects but do NOT add them to the map yet.
    // updateIncidentsHeatmap / updateRatingsHeatmap will call .addTo(map)
    // when data arrives and .removeLayer when data is empty or hidden.
    // This guarantees the canvas never exists in the DOM while heat is off.
    const incidentHeat = (L as any).heatLayer([], {
      radius: 28, blur: 18, maxZoom: 17,
      gradient: { 0.2: '#fde68a', 0.5: '#fbbf24', 0.8: '#f97316', 1.0: '#ef4444' }
    });
    incidentsHeatLayerRef.current = incidentHeat;

    const ratingHeat = (L as any).heatLayer([], {
      radius: 28, blur: 18, maxZoom: 17,
      gradient: { 0.3: '#34d399', 0.6: '#a78bfa', 1.0: '#7c3aed' }
    });
    ratingsHeatLayerRef.current = ratingHeat;

    // Initial fetch for the entire Iba area
    mapRef.current = map;
    fetchMapData();

    // Persist map state in memory (Zustand)
    map.on('moveend', () => {
      const center = map.getCenter();
      setView(center.lat, center.lng, map.getZoom());
    });

    map.on('zoomend', () => {
      const center = map.getCenter();
      setView(center.lat, center.lng, map.getZoom());
    });


    socket.on(SOCKET_EVENTS.REPORT_NEW, () => fetchMapData());
    socket.on(SOCKET_EVENTS.HEATMAP_UPDATED, () => {
      fetchMapData();
      // If directions panel is open and routes are displayed, re-score silently
      const storeState = useDirectionsStore.getState();
      if (storeState.isOpen && storeState.routes.length > 0 && storeState.startPoint && storeState.endPoint) {
        // Trigger re-fetch by slightly nudging — store will auto-detect both points set
        // We call the scoring endpoint directly with existing geometries
        const routesToRescore = storeState.routes.map(r => ({
          index: r.index,
          geometry: r.geometry,
          distance: r.distance,
          duration: r.duration,
        }));
        apiClient.post('/routes/safety', { routes: routesToRescore })
          .then(res => {
            const { routes: newRoutes, safestRecommendedIndex, balancedRecommendedIndex } = res.data.data;
            storeState.setRoutes(newRoutes, safestRecommendedIndex ?? 0, balancedRecommendedIndex ?? 0);
            // Redraw polylines with updated colors
            drawRoutesOnMap(newRoutes, storeState.selectedRouteIndex);
          })
          .catch(() => {}); // silent — don't interrupt UI
      }
    });

    // Force size recalculation to ensure the map fills the container.
    // We fire three times: immediately, mid-paint, and after CSS fully settles.
    // HMR-safe: all timers + the ResizeObserver are cancelled in cleanup.
    const t1 = setTimeout(() => { if (mapRef.current) map.invalidateSize(); }, 100);
    const t2 = setTimeout(() => { if (mapRef.current) map.invalidateSize(); }, 400);
    const t3 = setTimeout(() => { if (mapRef.current) map.invalidateSize({ pan: false }); }, 800);

    // ResizeObserver: catch any container-size changes (flex/grid settling, etc.)
    // Guard: only call invalidateSize when the container has non-zero dimensions.
    // A zero-width container causes the heatmap canvas to throw IndexSizeError
    // when it tries to call getImageData({ width: 0 }).
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0 && mapRef.current) {
            map.invalidateSize({ pan: false });
          }
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver?.disconnect();
      cleanupFog();
      socket.off(SOCKET_EVENTS.REPORT_NEW);
      socket.off(SOCKET_EVENTS.HEATMAP_UPDATED);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      fetchMapData();
    }
  }, [dateRange]);

  useEffect(() => {
    (window as any).deleteReport = async (id: string) => {
      if (!confirm('Are you sure you want to delete this report?')) return;
      try {
        await apiClient.delete(`/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMapData();
      } catch (err: any) {
        console.error('Delete failed:', err.response?.data || err);
        alert('Failed to delete report.');
      }
    };
    (window as any).voteReport = async (id: string, type: string) => {
      if (!token) {
        alert('Please login to vote.');
        return;
      }
      try {
        await apiClient.post(`/reports/${id}/vote`, { type }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMapData();
      } catch (err: any) {
        console.error('Vote failed:', err.response?.data || err);
      }
    };

    (window as any).deleteRating = async (id: string) => {
      if (!confirm('Are you sure you want to delete this rating?')) return;
      try {
        await apiClient.delete(`/streets/ratings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchMapData();
      } catch (err: any) {
        console.error('Delete failed:', err.response?.data || err);
        alert('Failed to delete rating.');
      }
    };
    return () => {
      delete (window as any).deleteReport;
      delete (window as any).deleteRating;
      delete (window as any).voteReport;
    };

  }, [token]);
  
  const handleSuggestionSelect = (suggestion: any) => {
    const { lat, lon } = suggestion;

    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 17, {
        duration: 1.5,
        easeLinearity: 0.25
      });

      const highlight = L.circle([lat, lon], {
        radius: 40,
        color: '#4f46e5',
        fillColor: '#818cf8',
        fillOpacity: 0.4,
        weight: 2
      }).addTo(mapRef.current);
      
      setTimeout(() => highlight.remove(), 4000);
    }
  };
  
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
  
    setIsSearching(true);
    try {
      // Step 1: Use Photon with strict bbox for full-submission search
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lat=15.35&lon=119.98&bbox=119.92,15.30,120.18,15.41`);
      const data = await response.json();
  
      if (data && data.features && data.features.length > 0) {
        const bestMatch = data.features[0];
        const [lon, lat] = bestMatch.geometry.coordinates;
  
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lon], 17, {
            duration: 1.5,
            easeLinearity: 0.25
          });
  
          const highlight = L.circle([lat, lon], {
            radius: 40,
            color: '#4f46e5',
            fillColor: '#818cf8',
            fillOpacity: 0.4,
            weight: 2
          }).addTo(mapRef.current);
          
          setTimeout(() => highlight.remove(), 4000);
        }
      } else {
        alert(`Location "${query}" not found within Iba boundaries. Please try a more specific name or street.`);
      }
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search service currently unavailable. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };


  // ── Route drawing helpers ────────────────────────────────────────────────
  const drawRoutesOnMap = useCallback((routes: ScoredRoute[], selectedIdx: number) => {
    if (!mapRef.current) return;

    // Clear old polylines
    routePolylinesRef.current.forEach(p => p.remove());
    routePolylinesRef.current = [];
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];

    if (routes.length === 0) return;

    routes.forEach((route, i) => {
      const isSelected = i === selectedIdx;
      const color = routePolylineColor(route.safetyScore);
      // Geometry is in [lng, lat] order; Leaflet needs [lat, lng]
      const latlngs: [number, number][] = route.geometry.map(([lng, lat]) => [lat, lng]);

      // Unselected routes: thinner, semi-transparent
      const polyline = L.polyline(latlngs, {
        color,
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 0.92 : 0.38,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isSelected ? undefined : '8, 6',
        // Bring selected route to front via pane z-index
        pane: isSelected ? 'markerPane' : 'overlayPane',
      }).addTo(mapRef.current!);

      routePolylinesRef.current.push(polyline);
    });

    // Start and end markers for the selected route
    const selected = routes[selectedIdx];
    if (selected && selected.geometry.length >= 2) {
      const [startLng, startLat] = selected.geometry[0];
      const [endLng, endLat] = selected.geometry[selected.geometry.length - 1];

      const startIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const endIcon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const sm = L.marker([startLat, startLng], { icon: startIcon, zIndexOffset: 900 }).addTo(mapRef.current!);
      const em = L.marker([endLat, endLng],     { icon: endIcon,   zIndexOffset: 900 }).addTo(mapRef.current!);
      routeMarkersRef.current.push(sm, em);

      // Fit map to selected route — build bounds from the geometry directly
      const allLatLngs: L.LatLngExpression[] = selected.geometry.map(([lng, lat]) => [lat, lng] as [number, number]);
      const bounds = L.latLngBounds(allLatLngs);
      mapRef.current!.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
    }
  }, []);

  const clearRoutesFromMap = useCallback(() => {
    routePolylinesRef.current.forEach(p => p.remove());
    routePolylinesRef.current = [];
    routeMarkersRef.current.forEach(m => m.remove());
    routeMarkersRef.current = [];
  }, []);

  // Re-draw whenever selected route index changes
  useEffect(() => {
    if (directionsOpen && directionRoutes.length > 0) {
      drawRoutesOnMap(directionRoutes, selectedRouteIndex);
    }
  }, [selectedRouteIndex, directionRoutes, directionsOpen]);

  // Clear routes when panel closes
  useEffect(() => {
    if (!directionsOpen) {
      clearRoutesFromMap();
    }
  }, [directionsOpen]);

  useEffect(() => {
    if (!mapRef.current) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
      // Directions panel click-to-select takes priority
      const dirTarget = directionsSelectionTargetRef.current;
      if (dirTarget) {
        const { lat, lng } = e.latlng;
        const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (dirTarget === 'start') {
          setDirectionsStart({ lat, lng, label });
        } else {
          setDirectionsEnd({ lat, lng, label });
        }
        setDirectionsSelectionTarget(null);
        return;
      }

      setSelectedLocation(e.latlng);
      setSelectedReportId(null);
      setSelectedRatingId(null);
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
    <div className="relative w-full h-[68vh] md:h-[72vh] min-h-[520px] rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-theme-panel">

      <div ref={mapContainerRef} className="w-full h-full" />



      {/* Top Center: Search Bar & Selection Banner */}
      <SearchBar 
        onSuggestionSelect={handleSuggestionSelect} 
        onSearch={handleSearch} 
        isSearching={isSearching}
        selectionMode={selectionMode}
        boundaryPolygon={IBA_POLYGON}
      />


      {/* Top Left: Title & Stats (Glassmorphic) */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="glass-panel p-4 rounded-xl text-theme-fg shadow-xl min-w-[180px]">
          <h3 className="font-extrabold text-base mb-1 bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent text-outline">SafePath Iba</h3>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-outline">Reports</span>
                <span className="font-mono text-indigo-100 font-extrabold text-outline">{stats.reports}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-outline">Heat Points</span>
                <span className="font-mono text-orange-100 font-extrabold text-outline">{stats.heatmapPoints}</span>
              </div>
             {loading && <div className="animate-pulse text-[9px] text-blue-400 mt-1">Fetching live data...</div>}
             {error && <div className="text-[9px] text-red-400 mt-1">{error}</div>}
             {!loading && stats.reports === 0 && dateRange.from && (
               <div className="flex items-center gap-1 text-[9px] text-orange-400 mt-1 font-bold animate-pulse">
                 <AlertCircle className="w-3 h-3" />
                 No data found for this range
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Bottom Left: Heatmap Legend (Static Scale) */}
      <div className="absolute bottom-6 left-6 z-[1000] hidden md:block">
        <HeatmapLegend />
      </div>

      {/* Directions map-click mode banner */}
      {directionsSelectionTarget && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1600] pointer-events-none">
          <div className="px-5 py-2 rounded-full text-xs font-bold text-white shadow-2xl border border-indigo-400/40 animate-pulse"
               style={{ background: 'rgba(79,70,229,0.85)', backdropFilter: 'blur(12px)' }}>
            📍 Click map to set {directionsSelectionTarget === 'start' ? 'starting point' : 'destination'}
          </div>
        </div>
      )}

      {/* Top Right: Layer Toggles & Action Buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-4 w-[220px]">
        {/* Heatmap Layer Toggles (Glassmorphic) */}
        <div className="glass-panel p-4 rounded-xl text-theme-fg shadow-xl flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider text-outline">Heatmap Layers</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                const next = !showIncidentsHeat;
                // Update store + ref synchronously so the consolidated rendering
                // effect (which fires after this render) reads the correct value.
                setIncidentsHeat(next);
                showIncidentsHeatRef.current = next;
                setSelectedReportId(null);
                setSelectedRatingId(null);
                // When enabling, fetch fresh data for the current date filter.
                // When disabling, the consolidated effect will call
                // updateIncidentsHeatmap which clears the canvas and shows pins.
                if (next && mapRef.current) {
                  fetchMapData();
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                showIncidentsHeat 
                  ? 'bg-orange-500/20 border-orange-500/50' 
                  : 'bg-theme-panel/50 border-theme-border text-theme-fg-muted'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showIncidentsHeat ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-slate-700'}`} />
              <span className="text-outline">Incident Heat</span>
            </button>
            <button
              onClick={() => {
                const next = !showRatingsHeat;
                setRatingsHeat(next);
                showRatingsHeatRef.current = next;
                setSelectedReportId(null);
                setSelectedRatingId(null);
                if (next && mapRef.current) {
                  fetchMapData();
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                showRatingsHeat 
                  ? 'bg-violet-500/20 border-violet-500/50' 
                  : 'bg-theme-panel/50 border-theme-border text-theme-fg-muted'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showRatingsHeat ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-slate-700'}`} />
              <span className="text-outline">Safety Heat</span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-theme-border space-y-2">
            <button
              onClick={() => setIsDateModalOpen(true)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                dateRange.from 
                  ? 'bg-indigo-500/20 border-indigo-500/50' 
                  : 'bg-theme-panel/50 border-theme-border text-theme-fg-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 text-white dark:text-indigo-400" />
                <span className="text-outline">{dateRange.from ? 'Filtered Dates' : 'Filter by Date'}</span>
              </div>
              {dateRange.from && <span className="text-[8px] opacity-70 text-outline">Active</span>}
            </button>
            {dateRange.from && dateLabel && (
              <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-[9px] font-semibold text-center leading-tight text-outline">{dateLabel}</p>
              </div>
            )}
            
            <button
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const todayStr = `${yyyy}-${mm}-${dd}`;
                setDateRange({ from: todayStr, to: todayStr });
                setDateLabel(today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all border bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
            >
              <Calendar className="w-3 h-3" />
              Present day
            </button>

            {dateRange.from && (
              <button
                onClick={() => {
                  setDateRange({ from: null, to: null });
                  setDateLabel(null);
                }}
                className="w-full flex items-center justify-center gap-1 py-1 text-[9px] text-theme-fg-muted hover:text-red-400 transition-colors uppercase tracking-widest font-bold"
              >
                <FilterX className="w-3 h-3" />
                Reset Time Range
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {/* Directions button */}
          <button
            onClick={() => {
              setDirectionsOpen(!directionsOpen);
              if (directionsOpen) clearRoutesFromMap();
              // Close report/rating selection if open
              setSelectionMode(null);
            }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg backdrop-blur-md border ${
              directionsOpen
                ? 'bg-indigo-500/30 border-indigo-400/50 text-indigo-200'
                : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-300/50'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            {directionsOpen ? 'Close Directions' : 'Directions'}
          </button>

          <button
            onClick={() => setSelectionMode(selectionMode === 'report' ? null : 'report')}
            disabled={directionsOpen}
            title={directionsOpen ? 'Close Directions panel first' : undefined}
            className={`w-full ${selectionMode === 'report' ? 'bg-orange-200 shadow-orange-300/40 text-orange-800 border-orange-300/50' : 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-300/50'} px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg backdrop-blur-md flex items-center justify-center gap-2 border disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100`}
          >
            {selectionMode === 'report' ? 'Cancel Selection' : 'Report Incident'}
          </button>
          <button
            onClick={() => setSelectionMode(selectionMode === 'rating' ? null : 'rating')}
            disabled={directionsOpen}
            title={directionsOpen ? 'Close Directions panel first' : undefined}
            className={`w-full ${selectionMode === 'rating' ? 'bg-blue-200 shadow-blue-300/40 text-blue-900 border-blue-300/50' : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300/50'} px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg backdrop-blur-md flex items-center justify-center gap-2 border disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100`}
          >
            {selectionMode === 'rating' ? 'Cancel Selection' : 'Rate Safety'}
          </button>
        </div>
      </div>



      {/* Directions Panel */}
      {directionsOpen && (
        <DirectionsPanel
          onMapSelectStart={(target) => {
            setDirectionsSelectionTarget(target);
          }}
          onCancelMapSelect={() => {
            setDirectionsSelectionTarget(null);
          }}
          onRoutesFetched={(routes, selectedIdx) => {
            drawRoutesOnMap(routes, selectedIdx);
          }}
          onRouteSelected={(idx) => {
            drawRoutesOnMap(directionRoutes, idx);
          }}
          onClose={() => {
            setDirectionsOpen(false);
            clearRoutesFromMap();
          }}
        />
      )}

      {showReportForm && selectedLocation && (
        <div className="absolute inset-0 z-[2000] bg-theme-bg-start backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

          <div className="max-w-md w-full">
            <ReportForm
              location={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              onSuccess={() => {
                setShowReportForm(false);
                setSelectedLocation(null);
                fetchMapData();
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
        <div className="absolute inset-0 z-[2000] bg-theme-bg-start backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

          <div className="max-w-md w-full">
            <StreetRatingForm
              location={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
              onSuccess={() => {
                setShowRatingForm(false);
                setSelectedLocation(null);
                fetchMapData();
              }}
              onCancel={() => {
                setShowRatingForm(false);
                setSelectedLocation(null);
              }}
            />
          </div>
        </div>
      )}
      
      <DateFilterModal 
        isOpen={isDateModalOpen}
        onClose={() => setIsDateModalOpen(false)}
        onApply={(from, to, label) => {
          setDateRange({ from, to });
          setDateLabel(label ?? null);
        }}
        initialFrom={dateRange.from}
        initialTo={dateRange.to}
      />
    </div>
  );
};

export default MapDashboard;