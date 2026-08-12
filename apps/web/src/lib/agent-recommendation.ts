import {
  calculateShippingEstimateUsd,
  type ShippingDestination,
  type ShippingEstimateResult,
} from '@/lib/shipping-estimate';
import type { Platform, PlatformComparisonData } from '@/stores/usePlatformStore';

export type AgentMatchPriority = 'budget' | 'storage' | 'qc' | 'payment';

export interface AgentRecommendation {
  platform: Platform;
  estimate: ShippingEstimateResult;
  configuredFields: number;
  score: number;
}

const COMPARISON_FIELDS: Array<keyof PlatformComparisonData> = [
  'serviceFee',
  'shippingCoverage',
  'freeStorageDays',
  'qcService',
  'paymentMethods',
  'returnPolicy',
  'shippingBaseFeeUsd',
  'shippingRatePerKgUsd',
  'dataUpdatedAt',
];

function hasConfiguredValue(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

export function hasPlatformDataForPriority(
  platform: Platform,
  priority: AgentMatchPriority,
): boolean {
  const data = platform.comparisonData;
  if (!data) return false;

  if (priority === 'budget') {
    return (
      hasConfiguredValue(data.shippingBaseFeeUsd) &&
      hasConfiguredValue(data.shippingRatePerKgUsd)
    );
  }
  if (priority === 'storage') return hasConfiguredValue(data.freeStorageDays);
  if (priority === 'qc') return hasConfiguredValue(data.qcService);
  return hasConfiguredValue(data.paymentMethods);
}

export function countConfiguredComparisonFields(
  data?: PlatformComparisonData | null,
): number {
  if (!data) return 0;
  return COMPARISON_FIELDS.filter((field) => hasConfiguredValue(data[field])).length;
}

function getPriorityScore(
  platform: Platform,
  priority: AgentMatchPriority,
  estimate: ShippingEstimateResult,
): number {
  const data = platform.comparisonData;

  if (priority === 'budget') {
    return estimate.usesPlatformRates ? Math.max(0, 1000 - estimate.maxUsd) : 0;
  }
  if (priority === 'storage') {
    return typeof data?.freeStorageDays === 'number' ? data.freeStorageDays * 10 : 0;
  }
  if (priority === 'qc') return hasConfiguredValue(data?.qcService) ? 200 : 0;
  return hasConfiguredValue(data?.paymentMethods) ? 200 : 0;
}

export function recommendAgentOptions({
  platforms,
  destination,
  weightKg,
  priority,
  limit = 3,
}: {
  platforms: Platform[];
  destination: ShippingDestination;
  weightKg: number;
  priority: AgentMatchPriority;
  limit?: number;
}): AgentRecommendation[] {
  return platforms
    .filter(
      (platform) =>
        platform.isActive && hasPlatformDataForPriority(platform, priority),
    )
    .map((platform, index) => {
      const estimate = calculateShippingEstimateUsd({
        destination,
        weightKg,
        baseFeeUsd: platform.comparisonData?.shippingBaseFeeUsd,
        ratePerKgUsd: platform.comparisonData?.shippingRatePerKgUsd,
      });
      const configuredFields = countConfiguredComparisonFields(platform.comparisonData);
      return {
        platform,
        estimate,
        configuredFields,
        score:
          getPriorityScore(platform, priority, estimate) + configuredFields - index / 1000,
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, limit));
}
