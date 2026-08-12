import { getHomeSeoCopy, getManifestDescription } from './home-seo';
import { getSiteName } from './site-config';

describe('home seo', () => {
  it('keeps the shared site name injection for homepage titles', () => {
    const zhSeo = getHomeSeoCopy('zh');

    expect(zhSeo.title).toContain(getSiteName());
    expect(zhSeo.ogTitle).toContain(getSiteName());
  });

  it('returns localized homepage titles for non-English locales', () => {
    expect(getHomeSeoCopy('zh').title).toContain('发现中国优质商品');
    expect(getHomeSeoCopy('fr').title).toContain('meilleurs produits de Chine');
    expect(getHomeSeoCopy('de').title).toContain('besten Produkte aus China');
    expect(getHomeSeoCopy('es').title).toContain('mejores productos de China');
    expect(getHomeSeoCopy('it').title).toContain('migliori prodotti dalla Cina');
    expect(getHomeSeoCopy('pt').title).toContain('melhores produtos da China');
    expect(getHomeSeoCopy('ar').title).toContain('أفضل المنتجات من الصين');
  });

  it('does not include the legacy brand in homepage SEO copy', () => {
    for (const locale of ['en', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ar'] as const) {
      expect(getHomeSeoCopy(locale).title).not.toContain('LoloBuy');
      expect(getHomeSeoCopy(locale).description).not.toContain('LoloBuy');
      expect(getHomeSeoCopy(locale).ogTitle).not.toContain('LoloBuy');
      expect(getHomeSeoCopy(locale).ogDescription).not.toContain('LoloBuy');
    }
  });

  it('keeps manifest description sourced from the default locale description', () => {
    expect(getManifestDescription()).toBe(getHomeSeoCopy('en').description);
  });
});
