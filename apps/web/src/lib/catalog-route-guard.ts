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

export interface GuardedCatalogDetailRoute {
  locale: string;
  entityType: GuardedEntityType;
  slug: string;
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

export async function guardedCatalogSlugExists(
  entityType: GuardedEntityType,
  slug: string,
): Promise<boolean | null> {
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
      return true;
    }

    if (response.status === 404) {
      return false;
    }

    return null;
  } catch {
    return null;
  }
}
