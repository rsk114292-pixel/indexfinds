import { API_BASE_URL } from '@/lib/constants';
import { getSiteUrl } from '@/lib/site-config';
import { fetchServerApiJson } from '@/lib/server-api-fetch';
import { AGENT_PLATFORMS } from '@/lib/agent-platforms';

export type SitemapEntry = {
  url: string;
  alternates?: Record<string, string>;
  lastModified?: Date;
  changeFrequency?: string;
  priority?: number;
};

const SITE_URL = getSiteUrl();
// Each product expands to eight localized URLs with hreflang alternates.
// Keep chunks comfortably below the 50 MB uncompressed sitemap limit.
export const PRODUCTS_PER_SITEMAP = 2500;
const LOCALES = ['en', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ar'] as const;

function buildLocaleAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
  );
  languages['x-default'] = `${SITE_URL}/en${path}`;
  return languages;
}

async function fetchJson<T>(
  url: string,
  revalidate: number,
): Promise<T | null> {
  return fetchServerApiJson<T>(url, {
    next: { revalidate },
  });
}

export async function getProductTotal(): Promise<number> {
  const data = await fetchJson<{ total?: number }>(
    `${API_BASE_URL}/products/slugs?page=1&limit=1`,
    300,
  );
  return data?.total || 0;
}

export async function getProductSlugsPage(
  page: number,
  limit: number,
): Promise<string[]> {
  const data = await fetchJson<{ slugs?: string[] }>(
    `${API_BASE_URL}/products/slugs?page=${page}&limit=${limit}`,
    300,
  );
  return data?.slugs || [];
}

export async function getAllCategorySlugs(): Promise<string[]> {
  const data = await fetchJson<{ slugs?: string[] }>(
    `${API_BASE_URL}/categories/slugs`,
    86400,
  );
  return data?.slugs || [];
}

export async function getAllBrandSlugs(): Promise<string[]> {
  const data = await fetchJson<{ slugs?: string[] }>(
    `${API_BASE_URL}/brands/slugs`,
    86400,
  );
  return data?.slugs || [];
}

function multiLocaleEntries(
  path: string,
  options: {
    changeFrequency: string;
    priority: number;
  },
): SitemapEntry[] {
  const alternates = buildLocaleAlternates(path);

  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    alternates,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  }));
}

export async function getSitemapChunkIds(): Promise<number[]> {
  const total = await getProductTotal();
  const productChunks = Math.max(1, Math.ceil(total / PRODUCTS_PER_SITEMAP));
  return Array.from({ length: productChunks + 1 }, (_, index) => index);
}

export async function getSitemapEntriesByChunk(
  id: number,
): Promise<SitemapEntry[]> {
  if (id === 0) {
    const [categorySlugs, brandSlugs] = await Promise.all([
      getAllCategorySlugs(),
      getAllBrandSlugs(),
    ]);

    const staticPages: SitemapEntry[] = [
      ...multiLocaleEntries('', {
        changeFrequency: 'daily',
        priority: 1.0,
      }),
      ...multiLocaleEntries('/products', {
        changeFrequency: 'daily',
        priority: 0.9,
      }),
      ...multiLocaleEntries('/categories', {
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
      ...multiLocaleEntries('/brands', {
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
      ...multiLocaleEntries('/agents', {
        changeFrequency: 'monthly',
        priority: 0.8,
      }),
      ...multiLocaleEntries('/agents/compare', {
        changeFrequency: 'monthly',
        priority: 0.8,
      }),
      ...AGENT_PLATFORMS.flatMap((agent) =>
        multiLocaleEntries(`/agents/${agent.key}`, {
          changeFrequency: 'monthly',
          priority: 0.7,
        }),
      ),
      ...multiLocaleEntries('/how-it-works', {
        changeFrequency: 'monthly',
        priority: 0.6,
      }),
      ...multiLocaleEntries('/about', {
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...multiLocaleEntries('/contact', {
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...multiLocaleEntries('/help', {
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...multiLocaleEntries('/privacy', {
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/terms', {
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/cookies', {
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/shipping', {
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/returns', {
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
    ];

    const categoryPages = categorySlugs.flatMap((slug) =>
      multiLocaleEntries(`/categories/${slug}`, {
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    );

    const brandPages = brandSlugs.flatMap((slug) =>
      multiLocaleEntries(`/brands/${slug}`, {
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    );

    return [...staticPages, ...categoryPages, ...brandPages];
  }

  const slugs = await getProductSlugsPage(id, PRODUCTS_PER_SITEMAP);
  return slugs.flatMap((slug) =>
    multiLocaleEntries(`/products/${slug}`, {
      changeFrequency: 'weekly',
      priority: 0.9,
    }),
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildUrlSetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const lines = [`<url><loc>${escapeXml(entry.url)}</loc>`];
      if (entry.alternates) {
        for (const [locale, href] of Object.entries(entry.alternates)) {
          lines.push(
            `<xhtml:link rel="alternate" hreflang="${escapeXml(locale)}" href="${escapeXml(href)}" />`,
          );
        }
      }
      if (entry.lastModified) {
        lines.push(`<lastmod>${entry.lastModified.toISOString()}</lastmod>`);
      }
      if (entry.changeFrequency) {
        lines.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
      }
      if (entry.priority !== undefined) {
        lines.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
      }
      lines.push('</url>');
      return lines.join('');
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`
  );
}

export function buildSitemapIndexXml(ids: number[]): string {
  const body = ids
    .map(
      (id) =>
        `<sitemap><loc>${escapeXml(
        `${SITE_URL}/sitemaps/${id}`,
      )}</loc></sitemap>`,
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`
  );
}
