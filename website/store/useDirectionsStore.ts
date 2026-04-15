import { create } from 'zustand';

export type DirectionsProfile = 'foot' | 'bike' | 'car';
export type DirectionsSelectionTarget = 'start' | 'end' | null;

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
  breakdown: RouteSafetyBreakdown;
}

interface DirectionsState {
  isOpen: boolean;
  profile: DirectionsProfile;
  startPoint: DirectionsPoint | null;
  endPoint: DirectionsPoint | null;
  routes: ScoredRoute[];
  selectedRouteIndex: number;
  selectionTarget: DirectionsSelectionTarget;
  isLoading: boolean;
  error: string | null;

  // Actions
  setOpen: (open: boolean) => void;
  setProfile: (profile: DirectionsProfile) => void;
  setStartPoint: (point: DirectionsPoint | null) => void;
  setEndPoint: (point: DirectionsPoint | null) => void;
  setRoutes: (routes: ScoredRoute[]) => void;
  setSelectedRouteIndex: (index: number) => void;
  setSelectionTarget: (target: DirectionsSelectionTarget) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useDirectionsStore = create<DirectionsState>((set) => ({
  isOpen: false,
  profile: 'foot',
  startPoint: null,
  endPoint: null,
  routes: [],
  selectedRouteIndex: 0,
  selectionTarget: null,
  isLoading: false,
  error: null,

  setOpen: (open) => set({ isOpen: open }),
  setProfile: (profile) => set({ profile, routes: [], selectedRouteIndex: 0, error: null }),
  setStartPoint: (point) => set({ startPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
  setEndPoint: (point) => set({ endPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
  setRoutes: (routes) => set({ routes }),
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
  }),
}));
