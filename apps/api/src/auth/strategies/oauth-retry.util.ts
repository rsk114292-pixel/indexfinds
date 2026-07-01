export const OAUTH_MAX_RETRIES = 2;
export const OAUTH_RETRY_BASE_DELAY_MS = 2000;

export function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as any).message || (err as any).code || '');
  return (
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENETUNREACH') ||
    msg.includes('EHOSTUNREACH') ||
    msg.includes('socket hang up')
  );
}

/**
 * Wrap an OAuth2 strategy's getOAuthAccessToken with retry logic
 * to handle intermittent network timeouts.
 */
export function wrapOAuth2WithRetry(
  strategy: any,
  logger: { warn: (msg: string) => void },
  providerName: string,
): void {
  const oauth2 = strategy._oauth2;
  const originalGetToken = oauth2.getOAuthAccessToken.bind(oauth2);

  oauth2.getOAuthAccessToken = (
    code: string,
    params: Record<string, string>,
    callback: (
      err: Error | null,
      accessToken?: string,
      refreshToken?: string,
      results?: any,
    ) => void,
  ) => {
    let attempt = 0;

    const tryRequest = () => {
      attempt++;
      originalGetToken(
        code,
        params,
        (
          err: Error | null,
          accessToken?: string,
          refreshToken?: string,
          results?: any,
        ) => {
          if (err && attempt <= OAUTH_MAX_RETRIES && isNetworkError(err)) {
            const delay = OAUTH_RETRY_BASE_DELAY_MS * attempt;
            logger.warn(
              `${providerName} token exchange timeout (attempt ${attempt}/${OAUTH_MAX_RETRIES + 1}), retrying in ${delay}ms...`,
            );
            setTimeout(tryRequest, delay);
            return;
          }
          callback(err, accessToken, refreshToken, results);
        },
      );
    };

    tryRequest();
  };
}
