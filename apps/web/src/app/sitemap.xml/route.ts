import {
  buildSitemapIndexXml,
  getSitemapChunkIds,
  getTenantSitemapOptions,
} from '@/lib/sitemap';
import { resolveTenantFromHeaders } from '@/lib/tenant-config';

// Product totals change independently of Web deployments. Generate the index
// at request time and let the explicit CDN header below provide the short cache.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const tenant = resolveTenantFromHeaders(
    request.headers,
    process.env.INDEXFINDS_LOCAL_TENANT_HOST,
  );
  const options = getTenantSitemapOptions(tenant);
  const ids = await getSitemapChunkIds(options);
  const xml = buildSitemapIndexXml(ids, options?.siteUrl);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
