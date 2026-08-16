import { buildUrlSetXml, getSitemapEntriesByChunk } from '@/lib/sitemap';

export const revalidate = 300;

export async function GET(
  _request: Request,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const numericId = Number(id);

  if (!id || !Number.isInteger(numericId) || numericId < 0) {
    return new Response('Not Found', { status: 404 });
  }

  const entries = await getSitemapEntriesByChunk(numericId);
  const xml = buildUrlSetXml(entries);

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
