import { generateAlternates, getOgLocale, getProductMetadataKeywords } from './seo';

describe('getOgLocale', () => {
  it.each([
    ['en', 'en_US'],
    ['zh', 'zh_CN'],
    ['fr', 'fr_FR'],
    ['de', 'de_DE'],
    ['es', 'es_ES'],
    ['it', 'it_IT'],
    ['pt', 'pt_BR'],
    ['ar', 'ar_SA'],
  ])('should map %s to %s', (locale, expected) => {
    expect(getOgLocale(locale)).toBe(expected);
  });

  it('should fallback to en_US for unknown locale', () => {
    expect(getOgLocale('ja')).toBe('en_US');
    expect(getOgLocale('')).toBe('en_US');
  });
});

describe('generateAlternates', () => {
  it('should generate alternates for all 8 locales', () => {
    const result = generateAlternates('/products/nike-dunk', 'zh');

    expect(result.canonical).toBe('/zh/products/nike-dunk');
    expect(result.languages.en).toBe('/en/products/nike-dunk');
    expect(result.languages.zh).toBe('/zh/products/nike-dunk');
    expect(result.languages.fr).toBe('/fr/products/nike-dunk');
    expect(result.languages.de).toBe('/de/products/nike-dunk');
    expect(result.languages.es).toBe('/es/products/nike-dunk');
    expect(result.languages.it).toBe('/it/products/nike-dunk');
    expect(result.languages.pt).toBe('/pt/products/nike-dunk');
    expect(result.languages.ar).toBe('/ar/products/nike-dunk');
    expect(result.languages['x-default']).toBe('/en/products/nike-dunk');
  });

  it('should handle empty path for homepage', () => {
    const result = generateAlternates('', 'en');

    expect(result.canonical).toBe('/en');
    expect(result.languages.zh).toBe('/zh');
    expect(result.languages['x-default']).toBe('/en');
  });

  it('should include exactly 9 language entries (8 locales + x-default)', () => {
    const result = generateAlternates('/test', 'en');
    expect(Object.keys(result.languages)).toHaveLength(9);
  });

  it('supports a tenant-specific canonical origin', () => {
    const result = generateAlternates('', 'en', 'https://usfansindex.net');

    expect(result.canonical).toBe('https://usfansindex.net/en');
    expect(result.languages['x-default']).toBe('https://usfansindex.net/en');
  });
});

describe('getProductMetadataKeywords', () => {
  it('returns localized generic keywords for zh', () => {
    expect(getProductMetadataKeywords('zh')).toEqual(['中国商品', '代购']);
  });

  it('returns localized generic keywords for fr', () => {
    expect(getProductMetadataKeywords('fr')).toEqual(['produits chinois', "agent d'achat"]);
  });

  it('falls back to en for unknown locales', () => {
    expect(getProductMetadataKeywords('ja')).toEqual(['Chinese products', 'daigou']);
  });
});
