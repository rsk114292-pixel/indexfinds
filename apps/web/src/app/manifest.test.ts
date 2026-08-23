/**
 * @jest-environment node
 */

import { buildManifest } from './manifest';
import { getManifestDescription } from '@/lib/home-seo';
import { getSiteName } from '@/lib/site-config';

describe('manifest', () => {
  it('uses a neutral root start_url instead of a hard-coded locale', () => {
    const result = buildManifest();

    expect(result.start_url).toBe('/');
    expect(result.scope).toBe('/');
  });

  it('uses the site name without an English-only suffix', () => {
    const result = buildManifest();

    expect(result.name).toBe(getSiteName());
    expect(result.short_name).toBe(getSiteName());
  });

  it('reuses the shared manifest description source', () => {
    const result = buildManifest();

    expect(result.description).toBe(getManifestDescription());
  });

  it('uses tenant branding when a tenant manifest is requested', () => {
    const result = buildManifest({
      siteName: 'USFans Index',
      wordmark: 'USFans Index',
      logoPath: '/images/agents/usfans.png',
      faviconPath: '/tenants/usfans/favicon.svg',
      themeColor: '#111827',
      primaryColor: '#d84a24',
      primaryHoverColor: '#b83a1b',
      accentColor: '#f4a340',
      seoTitle: 'USFans Product Index',
      description: 'USFans product search.',
      heroEyebrow: 'USFans product discovery',
      heroPrimary: 'Search the USFans product index.',
      heroSecondary: 'Compare before you buy.',
      supportingLine: 'Review available product details.',
      indexing: 'ready',
      editorial: {
        homeVariant: 'index',
        introTitle: 'Start with the USFans index.',
        introDescription: 'Search current products.',
        primaryCtaLabel: 'Open the USFans guide',
        primaryCtaHref: '/usfans-spreadsheet',
        brandTitle: 'Brands in the USFans index.',
        brandDescription: 'Browse current brand pages.',
      },
    });

    expect(result.name).toBe('USFans Index');
    expect(result.description).toBe('USFans product search.');
    expect(result.theme_color).toBe('#111827');
    expect(result.icons?.[0]).toMatchObject({
      src: '/tenants/usfans/favicon.svg',
      sizes: 'any',
    });
  });
});
