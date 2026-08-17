export function isPublicRegistrationEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.PUBLIC_REGISTRATION_ENABLED === 'true';
}
