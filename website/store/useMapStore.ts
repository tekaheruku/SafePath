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

  // The map's mobile Directions/Report/Road Safety bottom sheet is rendered
  // inside the map's own `position: fixed` panel, which (per the CSS stacking
  // rules) always opens its own stacking context — so no z-index on the sheet
  // can ever out-rank an element like the chat widget that lives outside that
  // panel, no matter how high it's set. Tracking "is it open" here instead
  // lets the widget hide itself while the sheet is up.
  isActionSheetOpen: boolean;

  // Actions
  setView: (lat: number, lng: number, zoom: number) => void;
  setIncidentsHeat: (show: boolean) => void;
  setRatingsHeat: (show: boolean) => void;
  setActionSheetOpen: (open: boolean) => void;
}

export const useMapStore = create<MapState>((set) => ({
  lat: MAP_CONFIG.CENTER_LAT,
  lng: MAP_CONFIG.CENTER_LNG,
  zoom: MAP_CONFIG.DEFAULT_ZOOM,
  showIncidentsHeat: true,
  showRatingsHeat: true,
  isActionSheetOpen: false,

  setView: (lat, lng, zoom) => set({ lat, lng, zoom }),
  setIncidentsHeat: (show) => set({ showIncidentsHeat: show }),
  setRatingsHeat: (show) => set({ showRatingsHeat: show }),
  setActionSheetOpen: (open) => set({ isActionSheetOpen: open }),
}));
