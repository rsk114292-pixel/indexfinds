export const SHIPPING_DESTINATIONS = ['US', 'GB', 'DE', 'FR', 'CA', 'AU', 'OTHER'] as const;

export type ShippingDestination = (typeof SHIPPING_DESTINATIONS)[number];

interface ShippingRouteDefaults {
  baseFeeUsd: number;
  ratePerKgUsd: number;
  multiplier: number;
}

const ROUTE_DEFAULTS: Record<ShippingDestination, ShippingRouteDefaults> = {
  US: { baseFeeUsd: 9, ratePerKgUsd: 12, multiplier: 1 },
  GB: { baseFeeUsd: 8, ratePerKgUsd: 11, multiplier: 0.95 },
  DE: { baseFeeUsd: 9, ratePerKgUsd: 12, multiplier: 1 },
  FR: { baseFeeUsd: 9, ratePerKgUsd: 12, multiplier: 1 },
  CA: { baseFeeUsd: 10, ratePerKgUsd: 14, multiplier: 1.08 },
  AU: { baseFeeUsd: 10, ratePerKgUsd: 13, multiplier: 1.05 },
  OTHER: { baseFeeUsd: 12, ratePerKgUsd: 16, multiplier: 1.15 },
};

export interface ShippingEstimateInput {
  destination: ShippingDestination;
  weightKg: number;
  baseFeeUsd?: number | null;
  ratePerKgUsd?: number | null;
}

export interface ShippingEstimateResult {
  minUsd: number;
  maxUsd: number;
  weightKg: number;
  usesPlatformRates: boolean;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateShippingEstimateUsd({
  destination,
  weightKg,
  baseFeeUsd,
  ratePerKgUsd,
}: ShippingEstimateInput): ShippingEstimateResult {
  const route = ROUTE_DEFAULTS[destination] ?? ROUTE_DEFAULTS.OTHER;
  const safeWeight = Math.min(30, Math.max(0.1, Number.isFinite(weightKg) ? weightKg : 1));
  const usesPlatformRates =
    typeof baseFeeUsd === 'number' &&
    Number.isFinite(baseFeeUsd) &&
    baseFeeUsd >= 0 &&
    typeof ratePerKgUsd === 'number' &&
    Number.isFinite(ratePerKgUsd) &&
    ratePerKgUsd > 0;
  const base = usesPlatformRates ? baseFeeUsd : route.baseFeeUsd;
  const rate = usesPlatformRates ? ratePerKgUsd : route.ratePerKgUsd;
  const midpoint = (base + rate * safeWeight) * route.multiplier;

  return {
    minUsd: roundCurrency(midpoint * 0.85),
    maxUsd: roundCurrency(midpoint * 1.25),
    weightKg: safeWeight,
    usesPlatformRates,
  };
}
