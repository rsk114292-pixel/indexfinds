import {
  buildAuthRedirectPath,
  buildLoginHref,
  consumeAuthRedirect,
  getSafeRedirectPath,
  persistAuthRedirect,
} from './auth-redirect';

describe('auth-redirect', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('builds redirect paths with query strings', () => {
    expect(
      buildAuthRedirectPath('/account/points', new URLSearchParams('page=2&tab=all')),
    ).toBe('/account/points?page=2&tab=all');
  });

  it('builds a login href with redirect when needed', () => {
    expect(buildLoginHref('/account/points')).toBe(
      '/login?redirect=%2Faccount%2Fpoints',
    );
    expect(buildLoginHref('/')).toBe('/login');
  });

  it('rejects unsafe or looping redirect targets', () => {
    expect(getSafeRedirectPath('//evil.example', '/account')).toBe('/account');
    expect(getSafeRedirectPath('/login?redirect=%2Faccount', '/account')).toBe('/account');
  });

  it('persists and consumes a safe redirect target', () => {
    persistAuthRedirect('/account/points');

    expect(consumeAuthRedirect('/')).toBe('/account/points');
    expect(consumeAuthRedirect('/')).toBe('/');
  });
});
