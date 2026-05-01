import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useSettingsStore = create()(persist((set) => ({
    theme: 'dark',
    setTheme: (theme) => set({ theme }),
}), {
    name: 'safepath-settings',
}));
