import { buildSitemapIndexXml, getSitemapChunkIds } from '@/lib/sitemap';

// Product totals change independently of Web deployments. Generate the index
// at request time and let the explicit CDN header below provide the short cache.
export const dynamic = 'force-dynamic';

export async function GET() {
  const ids = await getSitemapChunkIds();
  const xml = buildSitemapIndexXml(ids);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
