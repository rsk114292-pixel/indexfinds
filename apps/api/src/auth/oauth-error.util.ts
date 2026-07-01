import { isNetworkError } from './strategies/oauth-retry.util';

export type OAuthCallbackErrorCode =
  | 'provider_timeout'
  | 'provider_error'
  | 'invalid_state';

export interface OAuthCallbackFailureRequest {
  oauthErrorCode?: OAuthCallbackErrorCode;
}

export function classifyOAuthCallbackError(
  error: unknown,
): OAuthCallbackErrorCode {
  const oauthError = (error as { oauthError?: unknown } | undefined)
    ?.oauthError;

  if (isNetworkError(oauthError) || isNetworkError(error)) {
    return 'provider_timeout';
  }

  const message = String(
    (error as { message?: string } | undefined)?.message || '',
  );
  const providerMessage = String(
    (oauthError as { message?: string } | undefined)?.message || '',
  );

  if (
    message.includes('Unauthorized') ||
    providerMessage.includes('Invalid authorization request state') ||
    providerMessage.includes('authorization request state') ||
    providerMessage.includes('state')
  ) {
    return 'invalid_state';
  }

  return 'provider_error';
}
