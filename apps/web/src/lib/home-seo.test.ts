import { getHomeSeoCopy, getManifestDescription } from './home-seo';
import { getSiteName } from './site-config';

describe('home seo', () => {
  it('keeps the shared site name injection for homepage titles', () => {
    const zhSeo = getHomeSeoCopy('zh');

    expect(zhSeo.title).toContain(getSiteName());
    expect(zhSeo.ogTitle).toContain(getSiteName());
  });

  it('returns localized homepage titles for non-English locales', () => {
    expect(getHomeSeoCopy('zh').title).toContain('Spreadsheet 精选');
    expect(getHomeSeoCopy('fr').title).toContain('Selections Spreadsheet');
    expect(getHomeSeoCopy('de').title).toContain('Spreadsheet-Auswahl');
    expect(getHomeSeoCopy('es').title).toContain('Selecciones Spreadsheet');
    expect(getHomeSeoCopy('it').title).toContain('Selezioni Spreadsheet');
    expect(getHomeSeoCopy('pt').title).toContain('Selecoes Spreadsheet');
    expect(getHomeSeoCopy('ar').title).toContain('مختارات');
  });

  it('does not fall back to the old english Spreadsheet Finds title outside en', () => {
    for (const locale of ['zh', 'fr', 'de', 'es', 'it', 'pt', 'ar'] as const) {
      expect(getHomeSeoCopy(locale).title).not.toContain('Spreadsheet Finds');
      expect(getHomeSeoCopy(locale).ogTitle).not.toContain('Spreadsheet Finds');
    }
  });

  it('keeps manifest description sourced from the default locale description', () => {
    expect(getManifestDescription()).toBe(getHomeSeoCopy('en').description);
  });
});
