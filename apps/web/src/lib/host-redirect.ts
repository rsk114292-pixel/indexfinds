function normalizeHost(host: string): string {
  return host
    .split(',')[0]
    .trim()
    .replace(/\.$/, '')
    .replace(/:\d+$/, '')
    .toLowerCase();
}

function parseHostCandidate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return normalizeHost(new URL(trimmed).host);
  } catch {
    return normalizeHost(trimmed);
  }
}

function getCanonicalSiteUrl(): URL | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return null;
  }

  try {
    return new URL(siteUrl);
  } catch {
    return null;
  }
}

function getLegacyHosts(): Set<string> {
  const rawValue = process.env.LEGACY_SITE_URLS || '';
  const hosts = rawValue
    .split(/[\s,]+/)
    .map(parseHostCandidate)
    .filter((value): value is string => Boolean(value));

  return new Set(hosts);
}

export function getLegacyHostRedirectUrl(
  requestUrl: string,
  requestHost: string | null,
): string | null {
  if (!requestHost) {
    return null;
  }

  const canonicalSiteUrl = getCanonicalSiteUrl();
  if (!canonicalSiteUrl) {
    return null;
  }

  const incomingHost = normalizeHost(requestHost);
  const canonicalHost = normalizeHost(canonicalSiteUrl.host);
  if (!incomingHost || incomingHost === canonicalHost) {
    return null;
  }

  const legacyHosts = getLegacyHosts();
  if (!legacyHosts.has(incomingHost)) {
    return null;
  }

  const redirectUrl = new URL(requestUrl);
  redirectUrl.protocol = canonicalSiteUrl.protocol;
  redirectUrl.hostname = canonicalSiteUrl.hostname;
  redirectUrl.port = canonicalSiteUrl.port;

  return redirectUrl.toString();
}
