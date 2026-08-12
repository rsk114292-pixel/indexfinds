import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get } from '@/lib/api';
import { syncPreferenceToServer } from '@/lib/sync-preferences';

export interface PlatformTranslation {
  name?: string;
  description?: string;
}

export type PlatformTranslations = Record<string, PlatformTranslation>;

export interface PlatformComparisonData {
  serviceFee?: string;
  shippingCoverage?: string;
  freeStorageDays?: number;
  qcService?: string;
  paymentMethods?: string;
  returnPolicy?: string;
  shippingBaseFeeUsd?: number;
  shippingRatePerKgUsd?: number;
  dataUpdatedAt?: string;
}

export interface Platform {
  id: string;
  key: string;
  name: string;
  description?: string;
  translations?: PlatformTranslations | null;
  logoUrl?: string;
  isActive: boolean;
  baseUrl?: string;
  updatedAt?: string;
  comparisonData?: PlatformComparisonData | null;
}

function getLocaleCandidates(locale: string): string[] {
  const normalized = (locale || '').toLowerCase();
  if (!normalized) return [];
  const short = normalized.split('-')[0];
  return short && short !== normalized ? [normalized, short] : [normalized];
}

function pickTranslation(
  translations: PlatformTranslations | null | undefined,
  locale: string,
): PlatformTranslation | undefined {
  if (!translations) return undefined;
  for (const code of getLocaleCandidates(locale)) {
    if (translations[code]) return translations[code];
  }
  return undefined;
}

export function getLocalizedPlatformName(platform: Platform, locale: string): string {
  const exact = pickTranslation(platform.translations, locale)?.name;
  if (exact) return exact;
  const fallback =
    (locale === 'zh'
      ? platform.translations?.zh?.name
      : platform.translations?.en?.name) || platform.name;
  return fallback;
}

export function getLocalizedPlatformDescription(
  platform: Platform,
  locale: string,
): string | undefined {
  const exact = pickTranslation(platform.translations, locale)?.description;
  if (exact) return exact;
  const fallback =
    (locale === 'zh'
      ? platform.translations?.zh?.description
      : platform.translations?.en?.description) || platform.description;
  return fallback || undefined;
}

interface PlatformState {
  platformKey: string | null;
  platforms: Platform[];
  _hasHydrated: boolean;

  setPlatform: (key: string) => void;
  clearPlatform: () => void;
  fetchPlatforms: () => Promise<void>;
  setHasHydrated: (state: boolean) => void;
}

export const usePlatformStore = create<PlatformState>()(
  persist(
    (set) => ({
      platformKey: null,
      platforms: [],
      _hasHydrated: false,

      setPlatform: (key) => {
        set({ platformKey: key });
        syncPreferenceToServer('preferredPlatform', key);
      },

      clearPlatform: () => set({ platformKey: null }),

      fetchPlatforms: async () => {
        try {
          const data = await get<Platform[]>('/platforms/active');
          set({ platforms: data });
        } catch {
          // keep empty list on failure
        }
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'preferred_platform_store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        platformKey: state.platformKey,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.fetchPlatforms();

        // Migrate from old localStorage key if present
        if (typeof window !== 'undefined' && !state?.platformKey) {
          const oldKey = localStorage.getItem('preferred_platform');
          if (oldKey) {
            state?.setPlatform(oldKey);
            localStorage.removeItem('preferred_platform');
          }
        }
      },
    },
  ),
);

/** Get current platform object (derived) */
export function useCurrentPlatform(): Platform | undefined {
  const { platformKey, platforms } = usePlatformStore();
  return platforms.find((p) => p.key === platformKey);
}

/** Backward-compatible helpers used by PlatformSelectModal / useBuyProduct */
export function getSavedPlatform(): string | null {
  return usePlatformStore.getState().platformKey;
}

export function savePlatformPreference(platformKey: string): void {
  usePlatformStore.getState().setPlatform(platformKey);
}

export function clearPlatformPreference(): void {
  usePlatformStore.getState().clearPlatform();
}
