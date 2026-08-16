import { buildSitemapIndexXml, getSitemapChunkIds } from '@/lib/sitemap';

export const revalidate = 300;

export async function GET() {
  const ids = await getSitemapChunkIds();
  const xml = buildSitemapIndexXml(ids);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
