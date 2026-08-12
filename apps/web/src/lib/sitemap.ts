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
const PRODUCTS_PER_SITEMAP = 5000;
const LOCALES = ['en', 'zh', 'fr', 'de', 'es', 'it', 'pt', 'ar'] as const;

function buildLocaleAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = Object.fromEntries(
    LOCALES.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
  );
  languages['x-default'] = `${SITE_URL}/en${path}`;
  return languages;
}

async function fetchJson<T>(url: string, revalidate: number): Promise<T | null> {
  return fetchServerApiJson<T>(url, {
    next: { revalidate },
  });
}

export async function getProductTotal(): Promise<number> {
  const data = await fetchJson<{ total?: number }>(
    `${API_BASE_URL}/products/slugs?page=1&limit=1`,
    3600,
  );
  return data?.total || 0;
}

export async function getProductSlugsPage(
  page: number,
  limit: number,
): Promise<string[]> {
  const data = await fetchJson<{ slugs?: string[] }>(
    `${API_BASE_URL}/products/slugs?page=${page}&limit=${limit}`,
    3600,
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
    lastModified: Date;
    changeFrequency: string;
    priority: number;
  },
): SitemapEntry[] {
  const alternates = buildLocaleAlternates(path);

  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}${path}`,
    alternates,
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  }));
}

export async function getSitemapChunkIds(): Promise<number[]> {
  const total = await getProductTotal();
  const productChunks = Math.max(1, Math.ceil(total / PRODUCTS_PER_SITEMAP));
  return Array.from({ length: productChunks + 1 }, (_, index) => index);
}

export async function getSitemapEntriesByChunk(id: number): Promise<SitemapEntry[]> {
  if (id === 0) {
    const [categorySlugs, brandSlugs] = await Promise.all([
      getAllCategorySlugs(),
      getAllBrandSlugs(),
    ]);

    const now = new Date();
    const staticPages: SitemapEntry[] = [
      ...multiLocaleEntries('', {
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1.0,
      }),
      ...multiLocaleEntries('/products', {
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.9,
      }),
      ...multiLocaleEntries('/categories', {
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
      ...multiLocaleEntries('/brands', {
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
      ...multiLocaleEntries('/agents', {
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.8,
      }),
      ...multiLocaleEntries('/agents/compare', {
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.8,
      }),
      ...AGENT_PLATFORMS.flatMap((agent) =>
        multiLocaleEntries(`/agents/${agent.key}`, {
          lastModified: now,
          changeFrequency: 'monthly',
          priority: 0.7,
        }),
      ),
      ...multiLocaleEntries('/how-it-works', {
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
      }),
      ...multiLocaleEntries('/about', {
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...multiLocaleEntries('/contact', {
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...multiLocaleEntries('/help', {
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      }),
      ...multiLocaleEntries('/privacy', {
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/terms', {
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/cookies', {
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/shipping', {
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
      ...multiLocaleEntries('/returns', {
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      }),
    ];

    const categoryPages = categorySlugs.flatMap((slug) =>
      multiLocaleEntries(`/categories/${slug}`, {
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }),
    );

    const brandPages = brandSlugs.flatMap((slug) =>
      multiLocaleEntries(`/brands/${slug}`, {
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }),
    );

    return [...staticPages, ...categoryPages, ...brandPages];
  }

  const slugs = await getProductSlugsPage(id, PRODUCTS_PER_SITEMAP);
  const now = new Date();

  return slugs.flatMap((slug) =>
    multiLocaleEntries(`/products/${slug}`, {
      lastModified: now,
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

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`;
}

export function buildSitemapIndexXml(ids: number[]): string {
  const body = ids
    .map((id) => {
      const now = new Date().toISOString();
      return `<sitemap><loc>${escapeXml(
        `${SITE_URL}/sitemaps/${id}`,
      )}</loc><lastmod>${now}</lastmod></sitemap>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}
