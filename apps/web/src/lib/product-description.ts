const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>',
  '&nbsp;': ' ',
};

export function cleanProductDescription(value?: string | null): string {
  if (!value) return '';

  let text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|quot|#39|lt|gt|nbsp);/gi, (entity) =>
      HTML_ENTITIES[entity.toLowerCase()] ?? entity,
    )
    .replace(/\r/g, '')
    .replace(/[\t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  text = text
    .replace(
      /^\s*(?:product\s*description|item\s*description|description|产品描述|商品描述)\s*(?:[:：\-–—]\s*)?/i,
      '',
    )
    .trim();

  return text;
}
