import { create } from 'zustand';
import type { Settings } from '../types/settings';

interface SettingsStore {
  settings: Settings | null;
  setSettings: (settings: Settings | null) => void;
  updateLocalSettings: (newSettings: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings }),
  updateLocalSettings: (newSettings) => 
    set((state) => ({
      settings: state.settings ? { ...state.settings, ...newSettings } : null
    })),
}));
