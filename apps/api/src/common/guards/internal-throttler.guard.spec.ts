import { matchesInternalApiToken } from './internal-throttler.guard';

describe('matchesInternalApiToken', () => {
  it('accepts only the configured internal token', () => {
    expect(matchesInternalApiToken('correct-token', 'correct-token')).toBe(
      true,
    );
    expect(matchesInternalApiToken('wrong-token', 'correct-token')).toBe(false);
  });

  it('fails closed when either token is absent', () => {
    expect(matchesInternalApiToken(undefined, 'correct-token')).toBe(false);
    expect(matchesInternalApiToken('correct-token', undefined)).toBe(false);
  });

  it('uses the first value when Node exposes a repeated header as an array', () => {
    expect(
      matchesInternalApiToken(['correct-token', 'ignored'], 'correct-token'),
    ).toBe(true);
  });
});
