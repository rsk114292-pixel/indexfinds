const PRODUCT_ID_KEYS = [
  'itemID',
  'itemId',
  'item_id',
  'id',
  'goodsId',
  'goods_id',
  'productId',
  'product_id',
];

export function extractProductLinkSearchTerm(value: string): string | null {
  const input = value.trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(url.protocol)) return null;

  for (const key of PRODUCT_ID_KEYS) {
    const candidate = url.searchParams.get(key)?.trim();
    if (candidate) return candidate;
  }

  const numericPathMatch = url.pathname.match(/(?:offer|item|albums?)\/(\d{5,})/i);
  if (numericPathMatch?.[1]) return numericPathMatch[1];

  const lastSegment = url.pathname
    .split('/')
    .filter(Boolean)
    .at(-1)
    ?.replace(/\.(?:html?|php)$/i, '')
    .trim();

  if (lastSegment && /\d{5,}/.test(lastSegment)) {
    return lastSegment.match(/\d{5,}/)?.[0] ?? null;
  }

  return null;
}
