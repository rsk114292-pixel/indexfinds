import { resolveSourceProductRedirectHref } from './source-product-redirect';

describe('resolveSourceProductRedirectHref', () => {
  it('resolves a known Weidian source id to the active product detail page', async () => {
    const lookup = jest.fn().mockResolvedValue({
      id: 'product-1',
      slug: 'balenciaga-t-shirt-1y8pdm',
    });

    await expect(
      resolveSourceProductRedirectHref(
        { locale: 'en', query: '7831607056', source: 'link' },
        lookup,
      ),
    ).resolves.toBe(
      '/en/products/balenciaga-t-shirt-1y8pdm?source=link',
    );
    expect(lookup).toHaveBeenCalledWith('7831607056');
  });

  it('does not perform a source lookup for an ordinary keyword search', async () => {
    const lookup = jest.fn();

    await expect(
      resolveSourceProductRedirectHref(
        { locale: 'en', query: 'balenciaga', source: null },
        lookup,
      ),
    ).resolves.toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });
});
