import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeType = 'white' | 'dark-blue' | 'dark-slate' | 'dark';

interface SettingsState {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'safepath-settings',
    }
  )
);
