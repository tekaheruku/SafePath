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
  driver: number;
  overall: number;
  composite: number;
  ratedSegmentCount: number;
  totalSegments: number;
}

export interface ScoredRoute {
  index: number;
  geometry: [number, number][];  // [lng, lat] GeoJSON order
  distance: number;
  duration: number;
  safetyScore: number;
  hasRatings: boolean;
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
  // Recommended indexes returned by the backend
  safestRecommendedIndex: number;
  balancedRecommendedIndex: number;

  // Actions
  setOpen: (open: boolean) => void;
  setProfile: (profile: DirectionsProfile) => void;
  setRouteMode: (mode: RouteMode) => void;
  setStartPoint: (point: DirectionsPoint | null) => void;
  setEndPoint: (point: DirectionsPoint | null) => void;
  setRoutes: (routes: ScoredRoute[], safestIdx?: number, balancedIdx?: number) => void;
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

  setOpen: (open) => set({ isOpen: open }),
  setProfile: (profile) => set({ profile, routes: [], selectedRouteIndex: 0, error: null }),
  setRouteMode: (routeMode) => {
    const state = get();
    // Auto-select the recommended route for the new mode
    const newSelectedIndex =
      routeMode === 'safest'
        ? state.safestRecommendedIndex
        : state.balancedRecommendedIndex;
    set({ routeMode, selectedRouteIndex: newSelectedIndex });
  },
  setStartPoint: (point) => set({ startPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
  setEndPoint: (point) => set({ endPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
  setRoutes: (routes, safestIdx = 0, balancedIdx = 0) =>
    set({
      routes,
      safestRecommendedIndex: safestIdx,
      balancedRecommendedIndex: balancedIdx,
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
  }),
}));
