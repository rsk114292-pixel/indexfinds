export interface CorsOriginPolicy {
  isProduction: boolean;
  allowedOrigins: string[];
  vercelPreviewProject?: string;
  vercelPreviewOwner?: string;
}

function isValidVercelSegment(value: string | undefined): value is string {
  return Boolean(value && /^[a-z0-9-]+$/.test(value));
}

function isAllowedVercelPreview(
  origin: string,
  project: string | undefined,
  owner: string | undefined,
): boolean {
  if (!isValidVercelSegment(project) || !isValidVercelSegment(owner)) {
    return false;
  }

  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    return (
      hostname.startsWith(`${project}-`) &&
      hostname.endsWith(`-${owner}.vercel.app`)
    );
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(
  origin: string | undefined,
  policy: CorsOriginPolicy,
): boolean {
  if (!origin) return true;

  if (!policy.isProduction) {
    if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
    if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  }

  if (policy.allowedOrigins.includes(origin)) return true;

  return isAllowedVercelPreview(
    origin,
    policy.vercelPreviewProject,
    policy.vercelPreviewOwner,
  );
}
