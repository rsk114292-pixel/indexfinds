import {
  getTrackingIdError,
  isValidTrackingId,
  normalizeTrackingId,
} from './tracking-config';

describe('tracking-config', () => {
  it('normalizes surrounding whitespace', () => {
    expect(normalizeTrackingId('  G-ABC123  ')).toBe('G-ABC123');
  });

  it('accepts a GA measurement ID', () => {
    expect(getTrackingIdError('ga', 'G-ABC123456')).toBeNull();
    expect(isValidTrackingId('ga', 'G-ABC123456')).toBe(true);
  });

  it('rejects pasted GA script snippets', () => {
    expect(getTrackingIdError('ga', '<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123456"></script>')).toContain(
      '不能粘贴整段脚本',
    );
    expect(isValidTrackingId('ga', '<script>gtag()</script>')).toBe(false);
  });

  it('accepts a GTM container ID', () => {
    expect(getTrackingIdError('gtm', 'GTM-ABC1234')).toBeNull();
    expect(isValidTrackingId('gtm', 'GTM-ABC1234')).toBe(true);
  });

  it('rejects invalid GTM IDs', () => {
    expect(getTrackingIdError('gtm', 'G-ABC123456')).toContain('GTM ID');
    expect(isValidTrackingId('gtm', 'G-ABC123456')).toBe(false);
  });
});
