import {
  buildUrlSetXml,
  getSitemapEntriesByChunk,
  getTenantSitemapOptions,
} from '@/lib/sitemap';
import { resolveTenantFromHeaders } from '@/lib/tenant-config';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const numericId = Number(id);

  if (!id || !Number.isInteger(numericId) || numericId < 0) {
    return new Response('Not Found', { status: 404 });
  }

  const tenant = resolveTenantFromHeaders(
    request.headers,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  const options = getTenantSitemapOptions(tenant);
  if (options?.includeCatalog === false && numericId !== 0) {
    return new Response('Not Found', { status: 404 });
  }

  const entries = await getSitemapEntriesByChunk(numericId, options);
  const xml = buildUrlSetXml(entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
