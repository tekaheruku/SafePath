import { create } from 'zustand';
import { MAP_CONFIG } from '@safepath/shared';
export const useMapStore = create((set) => ({
    lat: MAP_CONFIG.CENTER_LAT,
    lng: MAP_CONFIG.CENTER_LNG,
    zoom: MAP_CONFIG.DEFAULT_ZOOM,
    showIncidentsHeat: true,
    showRatingsHeat: true,
    setView: (lat, lng, zoom) => set({ lat, lng, zoom }),
    setIncidentsHeat: (show) => set({ showIncidentsHeat: show }),
    setRatingsHeat: (show) => set({ showRatingsHeat: show }),
}));
