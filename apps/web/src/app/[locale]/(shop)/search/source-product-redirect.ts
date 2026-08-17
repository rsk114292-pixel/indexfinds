interface SourceProductMatch {
  id: string;
  slug: string;
}

interface SourceProductRedirectInput {
  locale: string;
  query: string;
  source: string | null;
}

type SourceProductLookup = (
  sourceProductId: string,
) => Promise<SourceProductMatch | null>;

export async function resolveSourceProductRedirectHref(
  { locale, query, source }: SourceProductRedirectInput,
  lookup: SourceProductLookup,
): Promise<string | null> {
  if (source !== 'link' || !query) return null;

  const sourceProduct = await lookup(query);
  if (!sourceProduct?.slug) return null;

  return `/${locale}/products/${sourceProduct.slug}?source=link`;
}
