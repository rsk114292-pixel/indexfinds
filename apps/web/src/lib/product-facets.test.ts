import { buildProductFacetsPath } from './product-facets';

describe('buildProductFacetsPath', () => {
  it('returns the global facets path when no category is selected', () => {
    expect(buildProductFacetsPath()).toBe('/products/facets');
    expect(buildProductFacetsPath('   ')).toBe('/products/facets');
  });

  it('scopes facets to the selected categories and safely encodes them', () => {
    expect(buildProductFacetsPath('earphones')).toBe(
      '/products/facets?categories=earphones',
    );
    expect(buildProductFacetsPath('earphones,audio accessories')).toBe(
      '/products/facets?categories=earphones%2Caudio+accessories',
    );
  });
});
