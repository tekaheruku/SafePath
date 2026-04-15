'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Navigation, Footprints, Bike, Car, X, RotateCcw, ArrowUpDown,
  MapPin, Clock, Ruler, Shield, ChevronRight, Loader2, AlertCircle,
  MousePointerClick, CheckCircle2, Star, TrendingUp, Zap, Info
} from 'lucide-react';
import {
  useDirectionsStore, ScoredRoute, DirectionsPoint,
  DirectionsProfile, RouteMode
} from '../store/useDirectionsStore';

/* ── Local search data (same JSON used by SearchBar) ─────────────────────── */
interface LocalLocation {
  name: string;
  address: string;
  lat: number;
  lon: number;
  type: string;
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

function formatDuration(s: number): string {
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function safetyColor(score: number, hasRatings: boolean): { stroke: string; label: string; bg: string; ring: string } {
  if (!hasRatings) return { stroke: '#818cf8', label: 'Unrated',  bg: 'bg-indigo-500/15', ring: 'ring-indigo-500/40' };
  if (score >= 4.0) return { stroke: '#22c55e', label: 'Safest',   bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/40' };
  if (score >= 2.5) return { stroke: '#f59e0b', label: 'Moderate', bg: 'bg-amber-500/15',   ring: 'ring-amber-500/40'   };
  return               { stroke: '#ef4444', label: 'Caution',  bg: 'bg-red-500/15',     ring: 'ring-red-500/40'     };
}

function safetyBarWidth(score: number): string {
  return `${Math.max(4, (score / 5) * 100)}%`;
}

/* ── Profile config ───────────────────────────────────────────────────────── */
const PROFILES: { id: DirectionsProfile; label: string; icon: React.ReactNode; osrm: string }[] = [
  { id: 'foot', label: 'Walk',  icon: <Footprints className="w-4 h-4" />, osrm: 'foot' },
  { id: 'bike', label: 'Cycle', icon: <Bike        className="w-4 h-4" />, osrm: 'bike' },
  { id: 'car',  label: 'Drive', icon: <Car         className="w-4 h-4" />, osrm: 'car'  },
];

/* ── Route Mode config ────────────────────────────────────────────────────── */
const ROUTE_MODES: { id: RouteMode; label: string; sublabel: string; icon: React.ReactNode; color: string }[] = [
  {
    id: 'safest',
    label: 'Safest Route',
    sublabel: 'Prioritizes safety, even if longer',
    icon: <Shield className="w-3.5 h-3.5" />,
    color: 'emerald',
  },
  {
    id: 'balanced',
    label: 'Shortest Route',
    sublabel: 'Fastest path regardless of safety',
    icon: <Zap className="w-3.5 h-3.5" />,
    color: 'amber',
  },
];

/* ── Input Field ─────────────────────────────────────────────────────────── */
interface InputFieldProps {
  id: 'start' | 'end';
  label: string;
  point: DirectionsPoint | null;
  isSelectingMap: boolean;
  localData: LocalLocation[];
  onSelectPoint: (point: DirectionsPoint) => void;
  onClear: () => void;
  onStartMapSelect: () => void;
}

const InputField: React.FC<InputFieldProps> = ({
  id, label, point, isSelectingMap, localData, onSelectPoint, onClear, onStartMapSelect
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocalLocation[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync input text with selected point
  useEffect(() => {
    if (point) setQuery(point.label);
    else setQuery('');
  }, [point]);

  // Filter locally
  useEffect(() => {
    if (!query.trim() || query.length < 2 || point) {
      setSuggestions([]);
      setShowSugg(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = localData
      .filter(l => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q))
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSugg(filtered.length > 0);
  }, [query, localData, point]);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSugg(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dotColor = id === 'start' ? 'bg-emerald-400' : 'bg-red-400';
  const Icon = id === 'start'
    ? <div className={`w-3.5 h-3.5 rounded-full ${dotColor} ring-2 ring-white/20 flex-shrink-0`} />
    : <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />;

  return (
    <div ref={containerRef} className="relative">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-3 transition-all ${
        isSelectingMap
          ? 'border-indigo-400/60 bg-indigo-500/10 ring-1 ring-indigo-500/30'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}>
        {Icon}
        <input
          type="text"
          value={isSelectingMap ? '📍 Click map to place pin…' : query}
          onChange={(e) => {
            if (isSelectingMap) return;
            if (point) onClear();       // typing clears the locked point
            setQuery(e.target.value);
          }}
          onFocus={() => suggestions.length > 0 && !point && setShowSugg(true)}
          readOnly={isSelectingMap}
          placeholder={label}
          className={`flex-1 bg-transparent text-sm outline-none placeholder:text-white/35 min-w-0 ${
            isSelectingMap ? 'text-indigo-300 cursor-default' : 'text-white'
          }`}
          style={{ color: isSelectingMap ? undefined : 'white', caretColor: 'white' }}
        />
        {/* Map-click button */}
        {!point && !isSelectingMap && (
          <button
            onClick={onStartMapSelect}
            title="Click on map to select"
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-indigo-300"
          >
            <MousePointerClick className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Clear / cancel */}
        {(point || isSelectingMap) && (
          <button
            onClick={onClear}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete dropdown */}
      {showSugg && !point && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-10 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                onSelectPoint({ lat: s.lat, lng: s.lon, label: `${s.name}, ${s.address}` });
                setShowSugg(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="p-1.5 rounded-lg bg-indigo-500/10">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{s.name}</div>
                <div className="text-xs text-white/50 truncate">{s.address}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Route Card ──────────────────────────────────────────────────────────── */
interface RouteCardProps {
  route: ScoredRoute;
  rank: number;
  isSelected: boolean;
  isRecommended: boolean;
  recommendedLabel: string;
  onClick: () => void;
}

const RouteCard: React.FC<RouteCardProps> = ({ route, rank, isSelected, isRecommended, recommendedLabel, onClick }) => {
  const [expanded, setExpanded] = useState(false);
  const color = safetyColor(route.safetyScore, route.hasRatings);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-xl border transition-all duration-200 overflow-hidden ${
        isSelected
          ? `${color.bg} ring-1 ${color.ring} border-white/20`
          : 'border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15'
      }`}
    >
      {/* Recommended badge */}
      {isRecommended && (
        <div
          className="flex items-center gap-1.5 px-3 py-2 border-b border-white/8"
          style={{ background: `${color.stroke}18` }}
        >
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: color.stroke }} />
          <span className="text-xs font-black tracking-wide" style={{ color: color.stroke }}>
            {recommendedLabel}
          </span>
        </div>
      )}

      {/* Main row */}
      <div className="p-3.5 flex items-center gap-3">
        {/* Rank badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black border ${
          isSelected ? 'bg-white/20 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60'
        }`}>
          {rank}
        </div>

        {/* Core info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Safety badge */}
            <span
              className="px-2 py-0.5 rounded-full text-xs font-black tracking-wide"
              style={{ backgroundColor: color.stroke + '25', color: color.stroke }}
            >
              {color.label}
            </span>

            {/* Unrated info icon or score stars */}
            {route.hasRatings ? (
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <Star
                    key={n}
                    className="w-3 h-3"
                    style={{ color: n <= Math.round(route.safetyScore) ? color.stroke : '#ffffff20', fill: n <= Math.round(route.safetyScore) ? color.stroke : 'transparent' }}
                  />
                ))}
                <span className="text-xs font-bold ml-1" style={{ color: color.stroke }}>
                  {route.safetyScore.toFixed(1)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-indigo-300/70 font-medium flex items-center gap-1">
                <Info className="w-3 h-3" />
                No ratings yet
              </span>
            )}
          </div>

          {/* Distance & Duration */}
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" />{formatDistance(route.distance)}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(route.duration)}</span>
          </div>

          {/* Safety bar */}
          {route.hasRatings && (
            <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: safetyBarWidth(route.safetyScore), backgroundColor: color.stroke }}
              />
            </div>
          )}
        </div>

        {/* Expand arrow */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        </button>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-white/8">
          {route.hasRatings ? (
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {[
                { label: 'Lighting',    value: route.breakdown.lighting,   icon: '💡' },
                { label: 'Pedestrian',  value: route.breakdown.pedestrian, icon: '🚶' },
                { label: 'Driver',      value: route.breakdown.driver,     icon: '🚗' },
                { label: 'Overall',     value: route.breakdown.overall,    icon: '🛡️' },
              ].map(({ label, value, icon }) => {
                const c = safetyColor(value, true);
                return (
                  <div key={label} className="flex items-center justify-between bg-white/4 rounded-lg px-2.5 py-2">
                    <span className="text-xs text-white/60">{icon} {label}</span>
                    <span className="text-sm font-bold" style={{ color: c.stroke }}>{value.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-2.5 p-3.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs text-indigo-300/80 leading-relaxed text-center">
                🗺️ No community ratings found near this route. It may pass through areas not yet rated — treating it as neutral.
              </p>
            </div>
          )}
          {route.hasRatings && (
            <p className="text-[11px] text-white/35 mt-2 text-center">
              Based on {route.breakdown.ratedSegmentCount} community rating{route.breakdown.ratedSegmentCount !== 1 ? 's' : ''} along this route
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ── Main Component ──────────────────────────────────────────────────────── */
interface DirectionsPanelProps {
  onMapSelectStart: (target: 'start' | 'end') => void;
  onCancelMapSelect: () => void;
  onRoutesFetched: (routes: ScoredRoute[], selectedIndex: number) => void;
  onClose: () => void;
  /** Called when user selects a different route card */
  onRouteSelected: (index: number) => void;
}

const DirectionsPanel: React.FC<DirectionsPanelProps> = ({
  onMapSelectStart,
  onCancelMapSelect,
  onRoutesFetched,
  onClose,
  onRouteSelected,
}) => {
  const {
    profile, setProfile,
    routeMode, setRouteMode,
    startPoint, setStartPoint,
    endPoint, setEndPoint,
    routes, setRoutes,
    selectedRouteIndex, setSelectedRouteIndex,
    selectionTarget, setSelectionTarget,
    isLoading, setLoading,
    error, setError,
    safestRecommendedIndex,
    balancedRecommendedIndex,
    clear,
  } = useDirectionsStore();

  const [localData, setLocalData] = useState<LocalLocation[]>([]);

  // Load local search data once
  useEffect(() => {
    fetch('/data/iba_locations.json')
      .then(r => r.json())
      .then(setLocalData)
      .catch(() => {});
  }, []);

  /* ── Route fetching ───────────────────────────────────────────────────── */
  const fetchRoutes = useCallback(async (
    start: DirectionsPoint,
    end: DirectionsPoint,
    activeProfile: DirectionsProfile,
    activeMode: RouteMode
  ) => {
    setLoading(true);
    setError(null);
    setRoutes([], 0, 0);

    try {
      // 1. Fetch raw routes from OSRM via Next.js proxy
      const osrmRes = await axios.get('/api/route', {
        params: {
          startLat: start.lat,
          startLng: start.lng,
          endLat: end.lat,
          endLng: end.lng,
          profile: activeProfile,
        },
      });

      const osrmData = osrmRes.data;

      if (!osrmData.routes || osrmData.routes.length === 0) {
        setError('No route found between these points. Try different locations.');
        setLoading(false);
        return;
      }

      // 2. Prepare routes for safety scoring
      const routesToScore = osrmData.routes.map((r: any, i: number) => ({
        index: i,
        geometry: r.geometry.coordinates as [number, number][],
        distance: r.distance,
        duration: r.duration,
      }));

      // 3. Score routes via SafePath backend
      const scoreRes = await axios.post('/api/v1/routes/safety', { routes: routesToScore });
      const { routes: scoredRoutes, safestRecommendedIndex: safestIdx, balancedRecommendedIndex: balancedIdx } = scoreRes.data.data;

      // 4. Choose initial selected route based on current mode
      const initialSelected = activeMode === 'safest' ? safestIdx : balancedIdx;

      setRoutes(scoredRoutes, safestIdx ?? 0, balancedIdx ?? 0);
      setSelectedRouteIndex(initialSelected);
      onRoutesFetched(scoredRoutes, initialSelected);
    } catch (err: any) {
      console.error('[DirectionsPanel] fetchRoutes error:', err);
      const msg = err.response?.data?.error?.message || err.response?.data?.error || err.message;
      if (msg?.includes('unavailable') || err.code === 'ECONNREFUSED') {
        setError('Routing service is temporarily unavailable. Try again in a moment.');
      } else {
        setError(msg || 'Failed to fetch routes. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when both points are set
  useEffect(() => {
    if (startPoint && endPoint) {
      fetchRoutes(startPoint, endPoint, profile, routeMode);
    }
  }, [startPoint, endPoint, profile]);

  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleStartMapSelect = (target: 'start' | 'end') => {
    setSelectionTarget(target);
    onMapSelectStart(target);
  };

  const handleCancelMapSelect = (target: 'start' | 'end') => {
    setSelectionTarget(null);
    onCancelMapSelect();
  };

  const handleSwap = () => {
    const tmp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(tmp);
  };

  const handleRouteCardClick = (rank: number) => {
    setSelectedRouteIndex(rank);
    onRouteSelected(rank);
  };

  const handleRouteModeChange = (mode: RouteMode) => {
    setRouteMode(mode);
    // The store auto-updates selectedRouteIndex; sync to map
    const newIdx = mode === 'safest' ? safestRecommendedIndex : balancedRecommendedIndex;
    onRouteSelected(newIdx);
  };

  const handleClose = () => {
    clear();
    onClose();
  };

  const currentRecommendedIndex = routeMode === 'safest' ? safestRecommendedIndex : balancedRecommendedIndex;
  const currentModeConfig = ROUTE_MODES.find(m => m.id === routeMode)!;

  return (
    <div className="absolute top-4 left-4 z-[1500] w-[360px] flex flex-col gap-2 max-h-[calc(100vh-6rem)] pointer-events-none">
      {/* Panel */}
      <div
        className="pointer-events-auto rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(2,6,23,0.98) 100%)',
          backdropFilter: 'blur(24px)',
          maxHeight: 'calc(100vh - 6rem)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Navigation className="w-4 h-4 text-indigo-400" />
            </div>
            <span className="text-base font-black text-white tracking-tight">Directions</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile tabs */}
        <div className="flex gap-1.5 px-3 pt-3 flex-shrink-0">
          {PROFILES.map(p => (
            <button
              key={p.id}
              onClick={() => setProfile(p.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                profile === p.id
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Route Mode Toggle */}
        <div className="px-3 pt-3 flex-shrink-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/35 mb-2">Route Preference</p>
          <div className="grid grid-cols-2 gap-2">
            {ROUTE_MODES.map(mode => {
              const isActive = routeMode === mode.id;
              const borderColor = mode.color === 'emerald' ? '#22c55e' : '#f59e0b';
              const bgColor     = mode.color === 'emerald' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)';
              return (
                <button
                  key={mode.id}
                  onClick={() => handleRouteModeChange(mode.id)}
                  className={`relative flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl text-left transition-all border ${
                    isActive
                      ? 'text-white'
                      : 'border-white/8 bg-white/3 text-white/50 hover:bg-white/6 hover:text-white/70'
                  }`}
                  style={isActive ? { borderColor, background: bgColor } : {}}
                >
                  {isActive && (
                    <div
                      className="absolute top-2 right-2 w-2 h-2 rounded-full"
                      style={{ backgroundColor: borderColor }}
                    />
                  )}
                  <div className="flex items-center gap-1.5" style={isActive ? { color: borderColor } : {}}>
                    {mode.icon}
                    <span className="text-sm font-black">{mode.label}</span>
                  </div>
                  <span className="text-xs text-white/45 leading-tight">{mode.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inputs */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="flex gap-2">
            <div className="flex flex-col items-center gap-1 pt-3.5 flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" />
              <div className="w-px h-4 bg-white/15 rounded" />
              <MapPin className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <InputField
                id="start"
                label="Choose starting point"
                point={startPoint}
                isSelectingMap={selectionTarget === 'start'}
                localData={localData}
                onSelectPoint={setStartPoint}
                onClear={() => {
                  setStartPoint(null);
                  if (selectionTarget === 'start') {
                    setSelectionTarget(null);
                    onCancelMapSelect();
                  }
                }}
                onStartMapSelect={() => handleStartMapSelect('start')}
              />
              <InputField
                id="end"
                label="Choose destination"
                point={endPoint}
                isSelectingMap={selectionTarget === 'end'}
                localData={localData}
                onSelectPoint={setEndPoint}
                onClear={() => {
                  setEndPoint(null);
                  if (selectionTarget === 'end') {
                    setSelectionTarget(null);
                    onCancelMapSelect();
                  }
                }}
                onStartMapSelect={() => handleStartMapSelect('end')}
              />
            </div>
            {/* Swap button */}
            <div className="flex flex-col justify-center flex-shrink-0">
              <button
                onClick={handleSwap}
                disabled={!startPoint && !endPoint}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-white/30 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed"
                title="Swap start and end"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Clear all */}
          {(startPoint || endPoint) && (
            <button
              onClick={clear}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear route
            </button>
          )}
        </div>

        {/* Results area — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ minHeight: 0 }}>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-indigo-500 animate-spin" />
                <Navigation className="absolute inset-0 m-auto w-5 h-5 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/70">Finding safe routes…</p>
                <p className="text-xs text-white/35 mt-1">Scoring with community data</p>
              </div>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="p-2.5 rounded-full bg-red-500/10">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <p className="text-sm text-red-300/80 leading-relaxed px-2">{error}</p>
              {startPoint && endPoint && (
                <button
                  onClick={() => fetchRoutes(startPoint, endPoint, profile, routeMode)}
                  className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Try again →
                </button>
              )}
            </div>
          )}

          {/* Prompt */}
          {!isLoading && !error && routes.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8 text-center px-2">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                <Shield className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white/75">Set start &amp; destination</p>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                  Type a location or click the 📍 icon to pick from the map
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full mt-1">
                {[
                  { c: '#22c55e', l: '≥ 4.0 — Safest'   },
                  { c: '#f59e0b', l: '≥ 2.5 — Moderate' },
                  { c: '#ef4444', l: '< 2.5 — Caution'  },
                  { c: '#818cf8', l: 'Unrated — Neutral' },
                ].map(({ c, l }) => (
                  <div key={l} className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl bg-white/3 border border-white/6">
                    <div className="w-8 h-2 rounded-full" style={{ backgroundColor: c }} />
                    <span className="text-xs text-white/50 text-center leading-tight">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Route cards */}
          {!isLoading && !error && routes.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
                  {routes.length} route{routes.length !== 1 ? 's' : ''} found
                </p>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: currentModeConfig.color === 'emerald' ? '#22c55e' : '#f59e0b' }}>
                  {currentModeConfig.icon}
                  <span className="font-bold">{currentModeConfig.label}</span>
                </div>
              </div>
              {routes.map((route, i) => (
                <RouteCard
                  key={route.index}
                  route={route}
                  rank={i + 1}
                  isSelected={selectedRouteIndex === i}
                  isRecommended={i === currentRecommendedIndex}
                  recommendedLabel={
                    routeMode === 'safest'
                      ? (!route.hasRatings ? '✦ Recommended — Unrated (neutral)' : '✦ Recommended — Highest Safety')
                      : '✦ Recommended — Shortest Route'
                  }
                  onClick={() => handleRouteCardClick(i)}
                />
              ))}
              <p className="text-[11px] text-white/25 text-center mt-1 leading-relaxed">
                Safety scores powered by community street ratings in SafePath's database
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectionsPanel;
