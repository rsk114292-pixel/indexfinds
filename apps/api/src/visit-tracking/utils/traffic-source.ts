type DomainKind = 'internal' | 'owned' | 'external' | 'unknown';

function normalizeToken(value?: string | null): string | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  return normalized || null;
}

function getRootLabel(host: string): string | null {
  const parts = host.split('.').filter(Boolean);
  return parts[0] || null;
}

function parseDomainList(
  raw: string | undefined,
  defaults: string[],
): Set<string> {
  const configured = (raw || '')
    .split(',')
    .map((item) => normalizeToken(item))
    .filter((item): item is string => !!item);

  const values = configured.length > 0 ? configured : defaults;
  const tokens = new Set<string>();

  for (const value of values) {
    const normalized = normalizeToken(value);
    if (!normalized) continue;

    tokens.add(normalized);
    const rootLabel = getRootLabel(normalized);
    if (rootLabel) {
      tokens.add(rootLabel);
    }
  }

  return tokens;
}

function getConfiguredDomains() {
  let siteHost = 'indexfinds.com';

  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      'https://indexfinds.com';
    siteHost = normalizeToken(new URL(siteUrl).hostname) || siteHost;
  } catch {
    // Fall back to the production hostname when env is absent.
  }

  return {
    internalDomains: parseDomainList(process.env.TRAFFIC_INTERNAL_DOMAINS, [
      siteHost,
      'indexfinds.com',
      'lolobuyspreadsheets.com',
    ]),
    ownedDomains: parseDomainList(process.env.TRAFFIC_OWNED_DOMAINS, []),
  };
}

function tokenMatches(token: string, knownDomains: Set<string>): boolean {
  if (knownDomains.has(token)) return true;

  const rootLabel = getRootLabel(token);
  if (rootLabel && knownDomains.has(rootLabel)) return true;

  for (const known of knownDomains) {
    if (token.endsWith(`.${known}`)) {
      return true;
    }
  }

  return false;
}

export function getDomainKind(value?: string | null): DomainKind {
  const token = normalizeToken(value);
  if (!token) return 'unknown';

  const { internalDomains, ownedDomains } = getConfiguredDomains();

  if (tokenMatches(token, internalDomains)) {
    return 'internal';
  }

  if (tokenMatches(token, ownedDomains)) {
    return 'owned';
  }

  return 'external';
}

export function isInternalDomain(value?: string | null): boolean {
  return getDomainKind(value) === 'internal';
}

export function isOwnedReferralDomain(value?: string | null): boolean {
  return getDomainKind(value) === 'owned';
}
