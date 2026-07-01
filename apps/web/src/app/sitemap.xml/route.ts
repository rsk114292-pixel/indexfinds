import { buildSitemapIndexXml, getSitemapChunkIds } from '@/lib/sitemap';

export const revalidate = 3600;

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
