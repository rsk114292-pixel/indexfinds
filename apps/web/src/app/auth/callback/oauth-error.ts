export interface OAuthCallbackTranslations {
  userCancelled: string;
  providerError: string;
  providerTimeout: string;
  invalidState: string;
  loginCompleteFailed: string;
}

export function getOAuthCallbackErrorMessage(
  error: string | null | undefined,
  t: OAuthCallbackTranslations,
): string | null {
  if (!error) {
    return null;
  }

  const errorMessages: Record<string, string> = {
    access_denied: t.userCancelled,
    server_error: t.providerError,
    temporarily_unavailable: t.providerError,
    invalid_request: t.invalidState,
    invalid_state: t.invalidState,
    provider_error: t.providerError,
    provider_timeout: t.providerTimeout,
  };

  return errorMessages[error] || t.loginCompleteFailed;
}
