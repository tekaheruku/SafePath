import { create } from 'zustand';

interface MapState {
  // Map View
  lat: number;
  lng: number;
  zoom: number;

  // Toggles
  showIncidentsHeat: boolean;
  showRatingsHeat: boolean;

  // Actions
  setView: (lat: number, lng: number, zoom: number) => void;
  setIncidentsHeat: (show: boolean) => void;
  setRatingsHeat: (show: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  lat: 15.390,
  lng: 120.060,
  zoom: 13,
  showIncidentsHeat: true,
  showRatingsHeat: true,

  setView: (lat, lng, zoom) => set({ lat, lng, zoom }),
  setIncidentsHeat: (show) => set({ showIncidentsHeat: show }),
  setRatingsHeat: (show) => set({ showRatingsHeat: show }),
}));
