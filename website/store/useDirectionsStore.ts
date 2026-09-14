import { create } from 'zustand';

export type DirectionsProfile = 'foot' | 'bike' | 'car';
export type DirectionsSelectionTarget = 'start' | 'end' | null;
export type RouteMode = 'safest' | 'balanced';

export interface DirectionsPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface RouteSafetyBreakdown {
  lighting: number;
  pedestrian: number;
  overall: number;
  composite: number;
  ratedSegmentCount: number;
  totalSegments: number;
  /** 0-1. How much evidence backs this score; the score is shrunk toward neutral by it. */
  confidence: number;
  ratingCount: number;
  /** Incidents reported today near this route. */
  incidentCount: number;
  /** Severity-weighted incidents per km. */
  incidentPressure: number;
  /** distance / shortest candidate distance. 1.0 means this IS the shortest. */
  detourRatio: number;
  /** Combined selection cost; lower is better. */
  cost: number;
}

export interface ScoredRoute {
  index: number;
  geometry: [number, number][];  // [lng, lat] GeoJSON order
  distance: number;
  duration: number;
  /** Composite risk on the 1-4 severity scale; higher = more dangerous. */
  riskScore: number;
  hasRatings: boolean;
  scoreStatus?: 'ok' | 'unavailable';
  /** Short human explanations of why this route scored as it did. */
  reasons?: string[];
  breakdown: RouteSafetyBreakdown;
}

interface DirectionsState {
  isOpen: boolean;
  profile: DirectionsProfile;
  routeMode: RouteMode;
  startPoint: DirectionsPoint | null;
  endPoint: DirectionsPoint | null;
  routes: ScoredRoute[];
  selectedRouteIndex: number;
  selectionTarget: DirectionsSelectionTarget;
  isLoading: boolean;
  error: string | null;
  // Recommended indexes returned by the backend.
  // safestRecommendedIndex is null when safety data could not be loaded — the UI
  // must not badge a route as "safest" in that case.
  safestRecommendedIndex: number | null;
  balancedRecommendedIndex: number;
  safetyDegraded: boolean;
  safetyDegradedReason: string | null;

  // Actions
  setOpen: (open: boolean) => void;
  setProfile: (profile: DirectionsProfile) => void;
  setRouteMode: (mode: RouteMode) => void;
  setStartPoint: (point: DirectionsPoint | null) => void;
  setEndPoint: (point: DirectionsPoint | null) => void;
  /**
   * Patch just the label of the start/end point (e.g. once reverse geocoding
   * resolves a readable address for a map-clicked pin) without touching its
   * coordinates or clearing the fetched routes — unlike setStartPoint/setEndPoint,
   * which intentionally reset routes because they represent a genuinely new pick.
   */
  updatePointLabel: (target: 'start' | 'end', label: string) => void;
  setRoutes: (
    routes: ScoredRoute[],
    safestIdx?: number | null,
    balancedIdx?: number,
    degraded?: boolean,
    degradedReason?: string | null
  ) => void;
  setSelectedRouteIndex: (index: number) => void;
  setSelectionTarget: (target: DirectionsSelectionTarget) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useDirectionsStore = create<DirectionsState>((set, get) => ({
  isOpen: false,
  profile: 'foot',
  routeMode: 'safest',
  startPoint: null,
  endPoint: null,
  routes: [],
  selectedRouteIndex: 0,
  selectionTarget: null,
  isLoading: false,
  error: null,
  safestRecommendedIndex: 0,
  balancedRecommendedIndex: 0,
  safetyDegraded: false,
  safetyDegradedReason: null,

  setOpen: (open) => set({ isOpen: open }),
  setProfile: (profile) => set({ profile, routes: [], selectedRouteIndex: 0, error: null }),
  setRouteMode: (routeMode) => {
    const state = get();
    // Auto-select the recommended route for the new mode. With no safety
    // opinion available, fall back to the shortest rather than pretending.
    const newSelectedIndex =
      routeMode === 'safest'
        ? (state.safestRecommendedIndex ?? state.balancedRecommendedIndex)
        : state.balancedRecommendedIndex;
    set({ routeMode, selectedRouteIndex: newSelectedIndex });
  },
  setStartPoint: (point) => set({ startPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
  setEndPoint: (point) => set({ endPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
  updatePointLabel: (target, label) => set((state) => {
    if (target === 'start' && state.startPoint) {
      return { startPoint: { ...state.startPoint, label } };
    }
    if (target === 'end' && state.endPoint) {
      return { endPoint: { ...state.endPoint, label } };
    }
    return {};
  }),
  setRoutes: (routes, safestIdx = 0, balancedIdx = 0, degraded = false, degradedReason = null) =>
    set({
      routes,
      safestRecommendedIndex: safestIdx,
      balancedRecommendedIndex: balancedIdx,
      safetyDegraded: degraded,
      safetyDegradedReason: degradedReason,
    }),
  setSelectedRouteIndex: (index) => set({ selectedRouteIndex: index }),
  setSelectionTarget: (target) => set({ selectionTarget: target }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clear: () => set({
    startPoint: null,
    endPoint: null,
    routes: [],
    selectedRouteIndex: 0,
    selectionTarget: null,
    isLoading: false,
    error: null,
    safestRecommendedIndex: 0,
    balancedRecommendedIndex: 0,
    safetyDegraded: false,
    safetyDegradedReason: null,
  }),
}));
