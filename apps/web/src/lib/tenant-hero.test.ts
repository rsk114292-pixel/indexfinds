import { getTenantHeroVisual } from "./tenant-hero";

describe("tenant hero visuals", () => {
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
