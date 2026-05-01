import { create } from 'zustand';
import { MAP_CONFIG } from '@safepath/shared';

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
  lat: MAP_CONFIG.CENTER_LAT,
  lng: MAP_CONFIG.CENTER_LNG,
  zoom: MAP_CONFIG.DEFAULT_ZOOM,
  showIncidentsHeat: true,
  showRatingsHeat: true,

  setView: (lat, lng, zoom) => set({ lat, lng, zoom }),
  setIncidentsHeat: (show) => set({ showIncidentsHeat: show }),
  setRatingsHeat: (show) => set({ showRatingsHeat: show }),
}));
