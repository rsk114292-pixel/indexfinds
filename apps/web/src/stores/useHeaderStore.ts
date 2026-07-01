import { create } from 'zustand';

interface HeaderState {
  /** Whether the hero section's search box is visible in the viewport */
  heroSearchVisible: boolean;
  setHeroSearchVisible: (visible: boolean) => void;
}

export const useHeaderStore = create<HeaderState>()((set) => ({
  heroSearchVisible: false,
  setHeroSearchVisible: (visible) => set({ heroSearchVisible: visible }),
}));
