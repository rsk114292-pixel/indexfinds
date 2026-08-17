function normalizeIp(ip?: string | null): string {
  const value = (ip || '').trim();
  return value.startsWith('::ffff:') ? value.slice(7) : value;
}

export function parseAdminAllowedIps(config?: string | null): string[] {
  return (config || '').split(',').map(normalizeIp).filter(Boolean);
}

export function isAdminIpAllowed(
  clientIp: string | null | undefined,
  config?: string | null,
): boolean {
  const allowedIps = parseAdminAllowedIps(config);
  if (allowedIps.length === 0) return true;
  return allowedIps.includes(normalizeIp(clientIp));
}
