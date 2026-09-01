export function isTenantSafeBrandDescription(
  description?: string | null,
): boolean {
  if (!description?.trim()) return false;
  return !/IndexFinds|search_term_string|lorem ipsum|\bundefined\b|\bnull\b/i.test(
    description,
  );
}
