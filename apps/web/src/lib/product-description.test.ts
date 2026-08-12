import { cleanProductDescription } from './product-description';

describe('cleanProductDescription', () => {
  it('removes a concatenated product description label', () => {
    expect(
      cleanProductDescription(
        'Product DescriptionHigh-performance running shoes with Boost technology.',
      ),
    ).toBe('High-performance running shoes with Boost technology.');
  });

  it('normalizes HTML and common entities', () => {
    expect(
      cleanProductDescription('<p>Description: Cotton &amp; polyester</p><p>Relaxed fit</p>'),
    ).toBe('Cotton & polyester\nRelaxed fit');
  });

  it('returns an empty string for missing content', () => {
    expect(cleanProductDescription(null)).toBe('');
  });
});
