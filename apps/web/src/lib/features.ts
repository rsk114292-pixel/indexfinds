// Public login/register entry points are temporarily hidden. Set this public
// build-time flag to "true" when the authentication UI is ready to return.
export const PUBLIC_AUTH_ENTRY_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED === "true";

// Account creation is a separate capability from signing in. Keep it closed
// unless both the web build and API are explicitly enabled together.
export const PUBLIC_REGISTRATION_ENABLED =
  process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === "true";

interface PublicAuthRouteOptions {
  authEnabled?: boolean;
  registrationEnabled?: boolean;
}

export function isDisabledPublicAuthPath(
  pathname: string,
  {
    authEnabled = PUBLIC_AUTH_ENTRY_ENABLED,
    registrationEnabled = PUBLIC_REGISTRATION_ENABLED,
  }: PublicAuthRouteOptions = {},
): boolean {
  const match = pathname.match(
    /^\/[a-z]{2}\/(login|register|forgot-password|reset-password|verify-email)\/?$/i,
  );
  if (!match) return false;

  return match[1].toLowerCase() === "register"
    ? !registrationEnabled
    : !authEnabled;
}
