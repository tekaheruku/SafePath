'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '@safepath/shared';
import { useAuth } from './AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMapStore } from '../store/useMapStore';
import ReportForm from './ReportForm';
import StreetRatingForm from './StreetRatingForm';
import HeatmapLegend from './HeatmapLegend';


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
const MapDashboard: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const incidentsHeatLayerRef = useRef<any>(null);
  const ratingsHeatLayerRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const ratingMarkersRef = useRef<L.Marker[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ reports: 0, heatmapPoints: 0 });
  
  const { 
    lat: storeLat, lng: storeLng, zoom: storeZoom, setView,
    showIncidentsHeat, showRatingsHeat, setIncidentsHeat, setRatingsHeat
  } = useMapStore();

  const showIncidentsHeatRef = useRef(showIncidentsHeat);
  const showRatingsHeatRef = useRef(showRatingsHeat);

  // Sync refs with store values for use in callbacks
  useEffect(() => {
    showIncidentsHeatRef.current = showIncidentsHeat;
  }, [showIncidentsHeat]);

  useEffect(() => {
    showRatingsHeatRef.current = showRatingsHeat;
  }, [showRatingsHeat]);
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    const rid = searchParams.get('reportId');
    if (rid) setSelectedReportId(rid);
    const ratid = searchParams.get('ratingId');
    if (ratid) setSelectedRatingId(ratid);
  }, [searchParams]);

  // Consume and clear URL parameters to support "reset on refresh"
  useEffect(() => {
    if (searchParams.get('lat') || searchParams.get('lng')) {
      const timeout = setTimeout(() => {
        router.replace('/');
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [searchParams, router]);

  useEffect(() => {
    updateIncidentsHeatmap(incidentHeatPoints);
    updateRatingsHeatmap(ratingHeatPoints);
    updateMarkers(reports);
    updateRatingMarkers(ratings);
  }, [selectedReportId, selectedRatingId, showIncidentsHeat, showRatingsHeat]);

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
    setLoading(true);
    setError(null);
    try {
      const b = {
        minLat: 15.30,
        maxLat: 15.41,
        minLng: 119.92,
        maxLng: 120.18,
      };


      // Use allSettled so one failing call doesn't kill the entire map load
      const [reportsResult, incidentHeatResult, ratingHeatResult, ratingsResult] = await Promise.allSettled([
        apiClient.get('/reports', { params: { ...b, page: 1, limit: 100 } }),
        apiClient.get('/heatmap/data', { params: { ...b, type: 'incidents' } }),
        apiClient.get('/heatmap/data', { params: { ...b, type: 'ratings' } }),
        apiClient.get('/streets/ratings', { params: { ...b, page: 1, limit: 100 } }),
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

      updateMarkers(reports);
      updateRatingMarkers(ratings);
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
      const upvoteClass = userVote === 'up' ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-indigo-400';
      const downvoteClass = userVote === 'down' ? 'text-orange-400 font-bold' : 'text-slate-400 hover:text-orange-400';

      const voteHtml = `
        <div class="mt-3 pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
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
              <strong class="text-indigo-300 capitalize">${r.type}</strong>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 ${
                r.severity_level === 'high' ? 'text-red-400 border-red-900/50' : 
                r.severity_level === 'medium' ? 'text-orange-400 border-orange-900/50' : 'text-emerald-400 border-emerald-900/50'
              }">${r.severity_level}</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">${r.description}</p>
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
    if (!mapRef.current) return;
    if (incidentsHeatLayerRef.current) incidentsHeatLayerRef.current.remove();
    
    // Suppress heatmap if a report is focused
    if (!showIncidentsHeatRef.current || points.length === 0 || selectedReportId) return;
    
    incidentsHeatLayerRef.current = (L as any).heatLayer(
      points.map((p: any) => [p.latitude, p.longitude, p.intensity]),
      { radius: 28, blur: 18, maxZoom: 17, gradient: { 0.2: '#fbbf24', 0.5: '#f97316', 0.8: '#ef4444', 1.0: '#dc2626' } }
    ).addTo(mapRef.current);
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
          <strong>Street Safety Rating</strong><br/>
          Score: <span class="text-violet-400 font-bold">${r.overall_safety_score}/5</span><br/>
          ${r.comment ? `<p class="italic text-xs mt-1">"${r.comment}"</p>` : ''}
          <div class="mt-2 text-[10px] space-y-0.5 text-slate-400">
            <div>Lighting: ${r.lighting_score}/5</div>
            <div>Pedestrian: ${r.pedestrian_safety_score}/5</div>
            <div>Driver: ${r.driver_safety_score}/5</div>
          </div>
          ${deleteHtml}
        `)
        .addTo(mapRef.current!);

      if (r.id === selectedRatingId) {
        setTimeout(() => marker.openPopup(), 500);
      }

      ratingMarkersRef.current.push(marker);
    });
  };

  const updateRatingsHeatmap = (points: any[]) => {
    if (!mapRef.current) return;
    if (ratingsHeatLayerRef.current) ratingsHeatLayerRef.current.remove();

    // Suppress heatmap if a rating is focused
    if (!showRatingsHeatRef.current || points.length === 0 || selectedRatingId) return;

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
    socket.on(SOCKET_EVENTS.HEATMAP_UPDATED, () => fetchMapData());

    // Force size recalculation to ensure the map fills the container
    setTimeout(() => {
      map.invalidateSize();
    }, 100);


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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
  
    setIsSearching(true);
    try {
      // Iba Bounding Box: [lon1, lat1, lon2, lat2] -> [west, north, east, south]
      const viewbox = "119.92,15.41,120.18,15.30";
      const baseParams = `format=json&viewbox=${viewbox}&bounded=1&limit=5&addressdetails=1`;
      
      // Step 1: Formal search with town/province
      let q = `${searchQuery}, Iba, Zambales`;
      let response = await fetch(`https://nominatim.openstreetmap.org/search?${baseParams}&q=${encodeURIComponent(q)}`);
      let data = await response.json();
  
      // Step 2: Fallback to loose search if first attempt fails
      if (!data || data.length === 0) {
        q = searchQuery;
        response = await fetch(`https://nominatim.openstreetmap.org/search?${baseParams}&q=${encodeURIComponent(q)}`);
        data = await response.json();
      }
  
      if (data && data.length > 0) {
        // Prefer building/poi results if multiple exist
        const bestMatch = data.find((d: any) => d.class === 'building' || d.class === 'amenity' || d.type === 'building') || data[0];
        
        const { lat, lon } = bestMatch;
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
  
        if (mapRef.current) {
          mapRef.current.flyTo([latNum, lonNum], 17, {
            duration: 1.5,
            easeLinearity: 0.25
          });
  
          const highlight = L.circle([latNum, lonNum], {
            radius: 40,
            color: '#4f46e5',
            fillColor: '#818cf8',
            fillOpacity: 0.4,
            weight: 2
          }).addTo(mapRef.current);
          
          setTimeout(() => highlight.remove(), 4000);
        }
      } else {
        alert(`Location "${searchQuery}" not found within Iba boundaries. Please try a more specific name or street.`);
      }
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search service currently unavailable. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };


  useEffect(() => {
    if (!mapRef.current) return;

    const onMapClick = (e: L.LeafletMouseEvent) => {
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
    <div className="relative w-full h-[750px] rounded-xl overflow-hidden shadow-2xl border border-slate-700 bg-slate-900">

      <div ref={mapContainerRef} className="w-full h-full" />



      {/* Top Center: Search Box & Selection Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[320px] px-4">
        {selectionMode ? (
          <div className="w-full bg-blue-600/90 text-white px-6 py-2.5 rounded-full font-bold shadow-2xl backdrop-blur-md text-center text-xs border border-white/20 whitespace-nowrap">
            📍 Click on the map to select location
          </div>
        ) : (
          <form onSubmit={handleSearch} className="relative group hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local streets/landmarks..."
              className="w-full glass-panel bg-slate-900/60 text-white pl-4 pr-12 py-2.5 rounded-full text-xs outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border-white/10 group-hover:border-white/20 shadow-2xl"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              {isSearching ? <span className="animate-spin text-[10px]">⌛</span> : <span>🔍</span>}
            </button>
          </form>
        )}
      </div>


      {/* Top Left: Title & Stats (Glassmorphic) */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="glass-panel p-4 rounded-xl text-white shadow-xl min-w-[180px]">
          <h3 className="font-extrabold text-sm mb-1 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">SafePath Iba</h3>
          <div className="flex flex-col gap-1">
             <div className="flex justify-between items-center text-[10px]">
               <span className="text-slate-400">Reports</span>
               <span className="font-mono text-indigo-300 font-bold">{stats.reports}</span>
             </div>
             <div className="flex justify-between items-center text-[10px]">
               <span className="text-slate-400">Heat Points</span>
               <span className="font-mono text-orange-300 font-bold">{stats.heatmapPoints}</span>
             </div>
             {loading && <div className="animate-pulse text-[9px] text-blue-400 mt-1">Fetching live data...</div>}
             {error && <div className="text-[9px] text-red-400 mt-1">{error}</div>}
          </div>
        </div>
      </div>

      {/* Bottom Left: Heatmap Legend (Static Scale) */}
      <div className="absolute bottom-6 left-6 z-[1000] hidden md:block">
        <HeatmapLegend />
      </div>

      {/* Top Right: Layer Toggles & Action Buttons */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-4 w-[220px]">
        {/* Heatmap Layer Toggles (Glassmorphic) */}
        <div className="glass-panel p-4 rounded-xl text-white shadow-xl flex flex-col gap-3">
          <h3 className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Heatmap Layers</h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                const next = !showIncidentsHeat;
                setIncidentsHeat(next);
                showIncidentsHeatRef.current = next;
                if (!next) {
                  if (incidentsHeatLayerRef.current) {
                    incidentsHeatLayerRef.current.remove(); 
                    incidentsHeatLayerRef.current = null; 
                  }
                  updateMarkers(reports);
                } else if (mapRef.current) {
                  updateMarkers(reports);
                  fetchMapData();
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                showIncidentsHeat 
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400' 
                  : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showIncidentsHeat ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : 'bg-slate-700'}`} />
              ⚠️ Incident Heat
            </button>
            <button
              onClick={() => {
                const next = !showRatingsHeat;
                setRatingsHeat(next);
                showRatingsHeatRef.current = next;
                if (!next) {
                  if (ratingsHeatLayerRef.current) {
                    ratingsHeatLayerRef.current.remove(); 
                    ratingsHeatLayerRef.current = null; 
                  }
                  updateRatingMarkers(ratings);
                } else if (mapRef.current) {
                  updateRatingMarkers(ratings);
                  fetchMapData();
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                showRatingsHeat 
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' 
                  : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showRatingsHeat ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-slate-700'}`} />
              🛡️ Safety Heat
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setSelectionMode(selectionMode === 'report' ? null : 'report')}
            className={`w-full ${selectionMode === 'report' ? 'bg-orange-500 shadow-orange-500/40' : 'bg-indigo-600/90 hover:bg-indigo-500 shadow-indigo-500/30'} text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg backdrop-blur-md flex items-center justify-center gap-2 border border-white/10`}
          >
            <span>⚠️</span> {selectionMode === 'report' ? 'Cancel Selection' : 'Report Incident'}
          </button>
          <button
            onClick={() => setSelectionMode(selectionMode === 'rating' ? null : 'rating')}
            className={`w-full ${selectionMode === 'rating' ? 'bg-orange-500 shadow-orange-500/40' : 'glass-panel hover:bg-slate-800/80'} text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 border border-white/10`}
          >
            <span>⭐</span> {selectionMode === 'rating' ? 'Cancel Selection' : 'Rate Safety'}
          </button>
        </div>
      </div>



      {showReportForm && selectedLocation && (
        <div className="absolute inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

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
        <div className="absolute inset-0 z-[2000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">

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
    </div>
  );
};

export default MapDashboard;