// Public login/register entry points are temporarily hidden. Set this public
// build-time flag to "true" when the authentication UI is ready to return.
export const PUBLIC_AUTH_ENTRY_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED === "true";

// Account creation is a separate capability from signing in. Keep it closed
// unless both the web build and API are explicitly enabled together.
export const PUBLIC_REGISTRATION_ENABLED =
  process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === "true";

// Only show Google sign-in when the API has matching OAuth credentials.
export const PUBLIC_GOOGLE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
