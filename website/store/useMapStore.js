import { create } from 'zustand';
export const useMapStore = create((set) => ({
    lat: 15.390,
    lng: 120.060,
    zoom: 13,
    showIncidentsHeat: true,
    showRatingsHeat: true,
    setView: (lat, lng, zoom) => set({ lat, lng, zoom }),
    setIncidentsHeat: (show) => set({ showIncidentsHeat: show }),
    setRatingsHeat: (show) => set({ showRatingsHeat: show }),
}));
