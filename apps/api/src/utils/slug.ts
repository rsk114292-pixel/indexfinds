import { randomBytes } from 'crypto';

export function slugifySegment(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function randomBase36(length: number = 6): string {
  const targetLength = Math.max(1, Math.floor(length));
  const bytes = randomBytes(Math.ceil(targetLength * 0.75) + 2);
  const base36 = BigInt(`0x${bytes.toString('hex')}`).toString(36);
  return base36.slice(0, targetLength).padEnd(targetLength, '0');
}

export function buildProductSlug(params: {
  brandSlug: string;
  categorySlug: string;
  rand: string;
}): string {
  const brand = slugifySegment(params.brandSlug);
  const category = slugifySegment(params.categorySlug) || 'product';
  const rand = slugifySegment(params.rand);

  // 如果有品牌名，使用 brand-category-rand
  // 如果没有品牌名，使用 category-rand（避免 category-category-rand 重复）
  if (brand) {
    return `${brand}-${category}-${rand}`;
  }
  return `${category}-${rand}`;
}

export async function generateUniqueProductSlug(params: {
  brandSlug: string;
  categorySlug: string;
  exists: (slug: string) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<string> {
  const maxAttempts = Math.max(1, params.maxAttempts ?? 20);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = buildProductSlug({
      brandSlug: params.brandSlug,
      categorySlug: params.categorySlug,
      rand: randomBase36(6),
    });
    if (!(await params.exists(slug))) return slug;
  }

  return buildProductSlug({
    brandSlug: params.brandSlug,
    categorySlug: params.categorySlug,
    rand: randomBase36(10),
  });
}
