import { isAdminIpAllowed, parseAdminAllowedIps } from './admin-network-policy';

describe('admin network policy', () => {
  it('keeps the allowlist opt-in to prevent accidental lockout', () => {
    expect(isAdminIpAllowed('203.0.113.10', '')).toBe(true);
  });

  it('allows only explicitly configured addresses', () => {
    const config = '203.0.113.10, 2001:db8::10';
    expect(parseAdminAllowedIps(config)).toEqual([
      '203.0.113.10',
      '2001:db8::10',
    ]);
    expect(isAdminIpAllowed('203.0.113.10', config)).toBe(true);
    expect(isAdminIpAllowed('203.0.113.11', config)).toBe(false);
  });

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    expect(isAdminIpAllowed('::ffff:203.0.113.10', '203.0.113.10')).toBe(true);
  });
});
