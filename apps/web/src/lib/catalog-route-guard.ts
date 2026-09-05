type GuardedEntityType = 'brands' | 'categories' | 'products';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4101';
const GUARDED_ENTITY_TYPES: GuardedEntityType[] = [
  'brands',
  'categories',
  'products',
];
const LOCALIZED_DETAIL_ROUTE_PATTERN = new RegExp(
  `^/(?<locale>[a-z]{2})/(?<entityType>${GUARDED_ENTITY_TYPES.join('|')})/(?<slug>[^/]+?)/?$`,
  'i',
);
const INVALID_CATALOG_SLUGS = new Set(['null', 'undefined']);

export interface GuardedCatalogDetailRoute {
  locale: string;
  entityType: GuardedEntityType;
  slug: string;
}

export interface GuardedCatalogSlugResolution {
  exists: boolean | null;
  canonicalSlug: string | null;
}

export function getGuardedCatalogDetailRoute(
  pathname: string,
): GuardedCatalogDetailRoute | null {
  const match = LOCALIZED_DETAIL_ROUTE_PATTERN.exec(pathname);
  if (!match?.groups) {
    return null;
  }

  const { locale, entityType, slug } = match.groups;
  if (!locale || !entityType || !slug) {
    return null;
  }

  return {
    locale,
    entityType: entityType.toLowerCase() as GuardedEntityType,
    slug: decodeURIComponent(slug),
  };
}

export async function resolveGuardedCatalogSlug(
  entityType: GuardedEntityType,
  slug: string,
): Promise<GuardedCatalogSlugResolution> {
  if (INVALID_CATALOG_SLUGS.has(slug.trim().toLowerCase())) {
    return { exists: false, canonicalSlug: null };
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/${entityType}/slug/${encodeURIComponent(slug)}`,
      {
        headers: {
          accept: 'application/json',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(1200),
      },
    );

    if (response.ok) {
      let canonicalSlug: string | null = null;
      if (typeof response.json === 'function') {
        const payload = (await response.json().catch(() => null)) as
          | { slug?: unknown; data?: { slug?: unknown } }
          | null;
        const resolvedSlug = payload?.slug ?? payload?.data?.slug;
        canonicalSlug =
          typeof resolvedSlug === 'string' && resolvedSlug.length > 0
            ? resolvedSlug
            : null;
      }
      return { exists: true, canonicalSlug };
    }

    if (response.status === 404) {
      return { exists: false, canonicalSlug: null };
    }

    return { exists: null, canonicalSlug: null };
  } catch {
    return { exists: null, canonicalSlug: null };
  }
}

export async function guardedCatalogSlugExists(
  entityType: GuardedEntityType,
  slug: string,
): Promise<boolean | null> {
  return (await resolveGuardedCatalogSlug(entityType, slug)).exists;
}
