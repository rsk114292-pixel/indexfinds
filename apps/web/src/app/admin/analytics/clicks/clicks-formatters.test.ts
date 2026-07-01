import { getDistributionItems } from './clicks-formatters';

describe('getDistributionItems', () => {
  it('sorts items by count and computes rounded percentages', () => {
    expect(
      getDistributionItems(
        { mobile: 5, desktop: 3, tablet: 2 },
        { mobile: '移动端', desktop: '桌面端', tablet: '平板' },
      ),
    ).toEqual([
      { key: 'mobile', label: '移动端', count: 5, percent: 50 },
      { key: 'desktop', label: '桌面端', count: 3, percent: 30 },
      { key: 'tablet', label: '平板', count: 2, percent: 20 },
    ]);
  });

  it('returns zero percentages when the distribution is empty', () => {
    expect(getDistributionItems({ mobile: 0 })).toEqual([
      { key: 'mobile', label: 'mobile', count: 0, percent: 0 },
    ]);
  });
});
