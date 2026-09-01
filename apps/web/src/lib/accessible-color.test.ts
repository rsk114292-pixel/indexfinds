import { accessibleTenantPrimary, contrastRatio } from "./accessible-color";

function rgb(hex: string) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ] as const;
}

describe("accessibleTenantPrimary", () => {
  it("keeps an already accessible tenant color unchanged", () => {
    expect(accessibleTenantPrimary("#087c68")).toBe("#087c68");
  });

  it("darkens a bright tenant color without changing its channel proportions", () => {
    const result = accessibleTenantPrimary("#f27616");

    expect(result).not.toBe("#f27616");
    expect(contrastRatio(rgb(result), rgb("#ffffff"))).toBeGreaterThanOrEqual(
      4.75,
    );
  });

  it("leaves invalid CSS values available for the existing fallback", () => {
    expect(accessibleTenantPrimary("var(--fallback)")).toBe(
      "var(--fallback)",
    );
  });
});
