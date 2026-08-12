import {
  DEFAULT_PLATFORM_COMPARISON_DATA,
  PLATFORM_COMPARISON_DATA_UPDATED_AT,
  hasConfiguredComparisonData,
} from './platform-comparison-defaults';

describe('platform comparison defaults', () => {
  it('provides controlled comparison guidance for all supported platforms', () => {
    expect(Object.keys(DEFAULT_PLATFORM_COMPARISON_DATA)).toHaveLength(21);

    for (const comparisonData of Object.values(
      DEFAULT_PLATFORM_COMPARISON_DATA,
    )) {
      expect(comparisonData).toEqual(
        expect.objectContaining({
          serviceFee: expect.any(String),
          shippingCoverage: expect.any(String),
          qcService: expect.any(String),
          paymentMethods: expect.any(String),
          returnPolicy: expect.any(String),
          dataUpdatedAt: PLATFORM_COMPARISON_DATA_UPDATED_AT,
        }),
      );
      expect(comparisonData.shippingBaseFeeUsd).toBeUndefined();
      expect(comparisonData.shippingRatePerKgUsd).toBeUndefined();
    }
  });

  it('does not treat a date alone as configured comparison data', () => {
    expect(
      hasConfiguredComparisonData({
        dataUpdatedAt: PLATFORM_COMPARISON_DATA_UPDATED_AT,
      }),
    ).toBe(false);
    expect(
      hasConfiguredComparisonData(DEFAULT_PLATFORM_COMPARISON_DATA.loongbuy),
    ).toBe(true);
  });
});
