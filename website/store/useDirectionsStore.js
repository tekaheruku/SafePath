import { create } from 'zustand';
export const useDirectionsStore = create((set, get) => ({
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
        const newSelectedIndex = routeMode === 'safest'
            ? state.safestRecommendedIndex
            : state.balancedRecommendedIndex;
        set({ routeMode, selectedRouteIndex: newSelectedIndex });
    },
    setStartPoint: (point) => set({ startPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
    setEndPoint: (point) => set({ endPoint: point, routes: [], selectedRouteIndex: 0, error: null }),
    setRoutes: (routes, safestIdx = 0, balancedIdx = 0) => set({
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
