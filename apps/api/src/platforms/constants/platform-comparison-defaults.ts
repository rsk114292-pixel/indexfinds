import type { PlatformComparisonData } from '../entities/platform.entity';

export const PLATFORM_COMPARISON_DATA_UPDATED_AT = '2026-08-12';

const PLATFORM_NAMES = {
  loongbuy: 'Loongbuy',
  kakobuy: 'Kakobuy',
  lovegobuy: 'Lovegobuy',
  litbuy: 'Litbuy',
  joyagoo: 'Joyagoo',
  sugargoo: 'Sugargoo',
  rizzitgo: 'RizzitGo',
  oopbuy: 'Oopbuy',
  superbuy: 'Superbuy',
  usfans: 'USFans',
  hipobuy: 'Hipobuy',
  boonbuy: 'Boonbuy',
  cssbuy: 'CSSBuy',
  pikobuy: 'Pikobuy',
  esgobuy: 'ESGOBuy',
  hubbuycn: 'HubbuyCN',
  fishgoo: 'Fishgoo',
  mycnbox: 'MyCNBox',
  ootdbuy: 'OOTDBuy',
  fansbuy: 'Fansbuy',
  lolobuy: 'Lolobuy',
} as const;

function createComparisonData(name: string): PlatformComparisonData {
  return {
    serviceFee: `Check ${name}'s official fee page for current service and handling fees.`,
    shippingCoverage:
      'International routes vary by destination, parcel contents and carrier availability.',
    qcService:
      'Warehouse inspection options may vary by order; confirm the current scope before payment.',
    paymentMethods:
      'Available payment methods vary by region, currency and account; confirm at checkout.',
    returnPolicy:
      'Seller approval and warehouse deadlines apply; review the current policy before ordering.',
    dataUpdatedAt: PLATFORM_COMPARISON_DATA_UPDATED_AT,
  };
}

export const DEFAULT_PLATFORM_COMPARISON_DATA = Object.fromEntries(
  Object.entries(PLATFORM_NAMES).map(([key, name]) => [
    key,
    createComparisonData(name),
  ]),
) as Record<string, PlatformComparisonData>;

export function hasConfiguredComparisonData(
  data: PlatformComparisonData | null | undefined,
): boolean {
  if (!data) return false;
  return Object.entries(data).some(
    ([key, value]) =>
      key !== 'dataUpdatedAt' &&
      value !== undefined &&
      value !== null &&
      value !== '',
  );
}
