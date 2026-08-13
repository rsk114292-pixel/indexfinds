// Public login/register entry points are temporarily hidden. Set this public
// build-time flag to "true" when the authentication UI is ready to return.
export const PUBLIC_AUTH_ENTRY_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENTRY_ENABLED === "true";
