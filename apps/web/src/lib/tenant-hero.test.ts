import { getTenantHeroVisual } from "./tenant-hero";

describe("tenant hero visuals", () => {
  it("reuses the verified 1to1 photography with distinct visual treatments", () => {
    const visuals = [
      "1to1finds.cloud",
      "1to1finds.com",
      "1to1spreadsheet.com",
    ].map((domain) => getTenantHeroVisual(domain));

    expect(visuals.every(Boolean)).toBe(true);
    expect(new Set(visuals.map((visual) => visual?.backgroundColor)).size).toBe(3);
    expect(
      visuals.every(
        (visual) => visual?.desktopPath === "/tenants/1to1reps/hero-desktop.webp",
      ),
    ).toBe(true);
  });

  it("keeps the 1to1Reps homepage centered without a background image", () => {
    expect(getTenantHeroVisual("1to1reps.com")).toBeNull();
  });

  it("gives the two YDA research tenants different visual systems", () => {
    const parcelGuide = getTenantHeroVisual("ydaexpress.net");
    const sourceReview = getTenantHeroVisual("ydaexpress.org");

    expect(parcelGuide).not.toBeNull();
    expect(sourceReview).not.toBeNull();
    expect(parcelGuide?.desktopPath).not.toBe(sourceReview?.desktopPath);
    expect(parcelGuide?.backgroundColor).not.toBe(
      sourceReview?.backgroundColor,
    );
    expect(parcelGuide?.alt).toContain("Parcel");
    expect(sourceReview?.alt).toContain("source");
  });
});
