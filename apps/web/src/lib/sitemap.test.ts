/**
 * @jest-environment node
 */

import {
  buildUrlSetXml,
  getSitemapEntriesByChunk,
  getSitemapChunkIds,
} from './sitemap';
import { getSiteUrl } from './site-config';

const SITE_URL = getSiteUrl();
const mockFetch = jest.fn();

global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sitemap', () => {
  it('keeps localized product chunks below the sitemap size limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ total: 8001 }),
    });

    await expect(getSitemapChunkIds()).resolves.toEqual([0, 1, 2, 3, 4]);
  });

  it('adds locale alternates to generated entries', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slugs: ['shoes'] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slugs: ['nike'] }),
      });

    const entries = await getSitemapEntriesByChunk(0);
    const zhHome = entries.find((entry) => entry.url === `${SITE_URL}/zh`);

    expect(zhHome).toBeDefined();
    expect(zhHome?.alternates?.en).toBe(`${SITE_URL}/en`);
    expect(zhHome?.alternates?.zh).toBe(`${SITE_URL}/zh`);
    expect(zhHome?.alternates?.['x-default']).toBe(`${SITE_URL}/en`);
  });

  it('renders xhtml hreflang links in urlset xml', () => {
    const xml = buildUrlSetXml([
      {
        url: `${SITE_URL}/fr/products`,
        alternates: {
          en: `${SITE_URL}/en/products`,
          fr: `${SITE_URL}/fr/products`,
          'x-default': `${SITE_URL}/en/products`,
        },
      },
    ]);

    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/en/products" />`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="fr" href="${SITE_URL}/fr/products" />`,
    );
    expect(xml).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/products" />`,
    );
  });
});
