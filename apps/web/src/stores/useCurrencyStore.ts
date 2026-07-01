import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_RATES } from '@/lib/utils';
import { syncPreferenceToServer } from '@/lib/sync-preferences';
import { buildApiUrl } from '@/lib/constants';

export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
];

interface CurrencyState {
  currency: CurrencyCode;
  rates: Record<string, number>;
  _hasHydrated: boolean;

  setCurrency: (currency: CurrencyCode) => void;
  setRates: (rates: Record<string, number>) => void;
  fetchRates: () => Promise<void>;
  convert: (amount: number, from?: string) => number;
  setHasHydrated: (state: boolean) => void;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'USD',
      rates: DEFAULT_RATES,
      _hasHydrated: false,

      setCurrency: (currency) => {
        set({ currency });
        // 已登录时同步到服务端
        syncPreferenceToServer('preferredCurrency', currency);
      },

      setRates: (rates) => set({ rates }),

      fetchRates: async () => {
        try {
          const res = await fetch(buildApiUrl('/settings/exchange-rates'));
          if (res.ok) {
            const data = await res.json();
            set({ rates: data });
          }
        } catch {
          // 失败时保留 DEFAULT_RATES
        }
      },

      convert: (amount, from = 'CNY') => {
        const { currency, rates } = get();
        if (from === currency) return amount;
        const fromRate = rates[from] ?? 1;
        const toRate = rates[currency] ?? 1;
        return (amount / fromRate) * toRate;
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'currency-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currency: state.currency,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.fetchRates();
      },
    }
  )
);
