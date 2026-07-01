import {
  getOAuthCallbackErrorMessage,
  type OAuthCallbackTranslations,
} from './oauth-error';

describe('oauth callback error mapping', () => {
  const t: OAuthCallbackTranslations = {
    userCancelled: 'cancelled',
    providerError: 'provider-error',
    providerTimeout: 'provider-timeout',
    invalidState: 'invalid-state',
    loginCompleteFailed: 'fallback',
  };

  it('maps provider timeout errors to a retryable message', () => {
    expect(getOAuthCallbackErrorMessage('provider_timeout', t)).toBe(
      'provider-timeout',
    );
  });

  it('maps invalid state errors to the invalid session message', () => {
    expect(getOAuthCallbackErrorMessage('invalid_state', t)).toBe(
      'invalid-state',
    );
    expect(getOAuthCallbackErrorMessage('invalid_request', t)).toBe(
      'invalid-state',
    );
  });

  it('falls back for unknown errors', () => {
    expect(getOAuthCallbackErrorMessage('mystery_error', t)).toBe('fallback');
  });
});
