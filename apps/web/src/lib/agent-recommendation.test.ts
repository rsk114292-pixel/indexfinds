import { recommendAgentOptions } from './agent-recommendation';
import type { Platform } from '@/stores/usePlatformStore';

function platform(key: string, comparisonData?: Platform['comparisonData']): Platform {
  return { id: key, key, name: key, isActive: true, comparisonData };
}

describe('agent recommendation', () => {
  it('prioritizes lower configured shipping estimates for budget matching', () => {
    const result = recommendAgentOptions({
      platforms: [
        platform('high', { shippingBaseFeeUsd: 20, shippingRatePerKgUsd: 20 }),
        platform('low', { shippingBaseFeeUsd: 5, shippingRatePerKgUsd: 8 }),
        platform('generic'),
      ],
      destination: 'US',
      weightKg: 2,
      priority: 'budget',
    });

    expect(result.map((item) => item.platform.key)).toEqual(['low', 'high']);
  });

  it('prioritizes configured free storage for storage matching', () => {
    const result = recommendAgentOptions({
      platforms: [
        platform('short', { freeStorageDays: 10 }),
        platform('long', { freeStorageDays: 60 }),
      ],
      destination: 'GB',
      weightKg: 1,
      priority: 'storage',
    });

    expect(result[0].platform.key).toBe('long');
  });

  it('does not rank platforms without data for the selected priority', () => {
    const result = recommendAgentOptions({
      platforms: [
        platform('generic'),
        platform('payment-only', { paymentMethods: 'Card' }),
      ],
      destination: 'US',
      weightKg: 1,
      priority: 'budget',
    });

    expect(result).toEqual([]);
  });
});
