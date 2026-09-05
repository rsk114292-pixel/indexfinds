import { getTenantResearchPage } from "./tenant-research-pages";

describe("tenant research source boundaries", () => {
  it("dates current transport sources without turning estimates into promises", () => {
    const loong = getTenantResearchPage("loongbuys.net", "shipping-calculator");
    const oop = getTenantResearchPage("oopbuyindex.net", "shipping");
    const parcel = getTenantResearchPage(
      "parcelupindex.com",
      "fees-and-budgeting",
    );

    expect(loong).toEqual(
      expect.objectContaining({
        sourceUrl: "https://service.loongbuy.com/en/content/freight",
        reviewedAt: "2026-09-06",
      }),
    );
    expect(loong?.methodNote).toContain("no live route price or final charge");
    expect(oop).toEqual(
      expect.objectContaining({
        sourceUrl: "https://oopbuy.com/product/0/934046990025",
        reviewedAt: "2026-09-06",
      }),
    );
    expect(oop?.methodNote).toContain("application shell");
    expect(parcel?.methodNote).toContain("time-sensitive");
  });

  it("labels LoveGoBuy coupon and refund pages as verification checklists", () => {
    for (const slug of [
      "lovegobuy-coupon-code",
      "refund-lovegobuy-order",
    ] as const) {
      const page = getTenantResearchPage("lovegobuyindex.com", slug);

      expect(page).toEqual(
        expect.objectContaining({
          sourceUrl: "https://lovegobuy.com/",
          reviewedAt: "2026-09-06",
        }),
      );
      expect(page?.methodNote).toMatch(/No current first-party/);
      expect(page?.methodNote).toMatch(/not an active offer|does not state/i);
    }
  });

  it("uses first-party Sugargoo sources for factual workflow pages", () => {
    expect(
      getTenantResearchPage("sugargooindex.net", "sugargoo-qc-guide"),
    ).toEqual(
      expect.objectContaining({
        sourceUrl:
          "https://blog.sugargoo.com/sugargoo-superbuy-mulebuy-kakobuy-check-qc-photos/",
        reviewedAt: "2026-09-06",
      }),
    );
    expect(
      getTenantResearchPage("sugargooindex.net", "sugargoo-shipping-guide"),
    ).toEqual(
      expect.objectContaining({
        sourceUrl:
          "https://blog.sugargoo.com/how-to-combine-multiple-orders-on-sugargoo/",
      }),
    );
    expect(
      getTenantResearchPage("sugargooindex.net", "tracking")?.methodNote,
    ).toContain("search-index-only evidence");
  });

  it("separates KameyMall historical context from current transport inputs", () => {
    const review = getTenantResearchPage(
      "kameymallindex.com",
      "review",
    );
    const shipping = getTenantResearchPage(
      "kameymallindex.com",
      "shipping",
    );

    expect(review?.sourceUrl).toBe(
      "https://www.kameymall.com/forum/7253?page=home_d",
    );
    expect(review?.methodNote).toContain("historical");
    expect(shipping).toEqual(
      expect.objectContaining({
        sourceUrl: "https://www.kameymall.com/agency/transport",
        reviewedAt: "2026-09-06",
      }),
    );
    expect(shipping?.methodNote).toContain("does not preserve a quoted rate");
  });

  it("uses the USFans estimator for parcel inputs and limits QC conclusions", () => {
    const qc = getTenantResearchPage("usfansindex.net", "qc-record");
    const parcel = getTenantResearchPage("usfansindex.net", "parcel-guide");

    expect(qc?.intro).toContain("supplied photos and visible condition");
    expect(qc?.methodNote).toContain("visible evidence");
    expect(parcel).toEqual(
      expect.objectContaining({
        sourceUrl: "https://www.usfans.com/estimation",
        reviewedAt: "2026-09-06",
      }),
    );
    expect(parcel?.methodNote).toContain("time-sensitive");
  });
});
