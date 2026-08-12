interface ProductCardImageInput {
  mainImage?: string | null;
  secondImage?: string | null;
  images?: Array<string | null | undefined> | null;
}

export function getProductCardImageCandidates({
  mainImage,
  secondImage,
  images,
}: ProductCardImageInput): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const value of [mainImage, secondImage, ...(images || [])]) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push(normalized);
  }

  return candidates;
}

export function getProductSourceLabel(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;

  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    if (hostname.includes('weidian')) return 'Weidian';
    if (hostname.includes('taobao') || hostname.includes('tmall')) return 'Taobao';
    if (hostname.includes('1688')) return '1688';
    if (hostname.includes('yupoo')) return 'Yupoo';
  } catch {
    return null;
  }

  return null;
}
