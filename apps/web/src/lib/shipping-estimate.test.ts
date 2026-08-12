import { calculateShippingEstimateUsd } from './shipping-estimate';

describe('calculateShippingEstimateUsd', () => {
  it('uses conservative route defaults when the agent has no configured rates', () => {
    expect(calculateShippingEstimateUsd({ destination: 'US', weightKg: 1 })).toEqual({
      minUsd: 17.85,
      maxUsd: 26.25,
      weightKg: 1,
      usesPlatformRates: false,
    });
  });

  it('uses configured platform rates', () => {
    expect(
      calculateShippingEstimateUsd({
        destination: 'GB',
        weightKg: 2,
        baseFeeUsd: 5,
        ratePerKgUsd: 10,
      }),
    ).toEqual({
      minUsd: 20.19,
      maxUsd: 29.69,
      weightKg: 2,
      usesPlatformRates: true,
    });
  });

  it('clamps invalid weights into the supported range', () => {
    expect(calculateShippingEstimateUsd({ destination: 'US', weightKg: 0 }).weightKg).toBe(0.1);
    expect(calculateShippingEstimateUsd({ destination: 'US', weightKg: 99 }).weightKg).toBe(30);
  });
});
