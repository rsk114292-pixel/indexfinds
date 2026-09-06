import { getTenantResearchPage } from "./tenant-research-pages";

describe("C-group tenant source boundaries", () => {
  const sourcedPages = [
    ["joyabuyfinds.com", "guide", "https://mgt.joyagoo.com/help-center/shopping-assistant-guidance/"],
    ["joyabuyfinds.com", "shipping", "https://mgt.joyagoo.com/help-center/shopping-assistant-guidance/"],
    ["joyabuyfinds.com", "safety", "https://mgt.joyagoo.com/help-center/three-things-you-need-to-know-before-using-the-shopping-agent-service-for-the-first-time/"],
    ["joyabuyfinds.com", "faq", "https://mgt.joyagoo.com/help-center/shopping-assistant-guidance/"],
    ["joyagooindex.com", "guide", "https://mgt.joyagoo.com/help-center/shopping-assistant-guidance/"],
    ["joyagooindex.com", "shipping", "https://mgt.joyagoo.com/help-center/shopping-assistant-guidance/"],
    ["joyagooindex.com", "safety", "https://mgt.joyagoo.com/help-center/three-things-you-need-to-know-before-using-the-shopping-agent-service-for-the-first-time/"],
    ["joyagooindex.com", "faq", "https://mgt.joyagoo.com/help-center/do-you-help-me-to-do-quality-check/"],
    ["kakobuyindex.net", "shipping", "https://www.kakobuy.com/tools/estimate"],
    ["kakobuyindex.net", "faq", "https://www.kakobuy.com/service/help/question"],
    ["kakobuyitems.com", "guide", "https://www.kakobuy.com/quality-inspection"],
    ["kakobuyitems.com", "shipping", "https://www.kakobuy.com/tools/estimate"],
    ["kakobuyitems.com", "faq", "https://www.kakobuy.com/service/help/question"],
    ["mulebuyindex.net", "order-status-guide", "https://mulebuy.com/help/faq/"],
    ["mulebuyindex.net", "shipping-weight-guide", "https://mulebuy.com/help/shipping-weight/"],
    ["mulebuyindex.net", "tracking", "https://mulebuy.com/help/faq/"],
    ["mulebuyitems.com", "spreadsheet-checklist", "https://mulebuy.com/help/quality-check/"],
    ["mulebuyitems.com", "shipping-weight-guide", "https://mulebuy.com/help/shipping-weight/"],
    ["mulebuyitems.com", "faq", "https://mulebuy.com/help/quality-check/"],
    ["orientdigindex.com", "orientdig-spreadsheet", "https://mgt.orientdig.com/help-center/shopping-assistant-guidance/"],
    ["orientdigindex.com", "orientdig-qc-photos-guide", "https://mgt.orientdig.com/help-center/the-inspection-scope-of-the-shopping-agent-service/"],
    ["orientdigindex.com", "shipping-weight-guide", "https://mgt.orientdig.com/help-center/estimated-billing-weight-and-actual-billing-weight-when-will-the-overcharged-postage-be-refunded/"],
    ["orientdigindex.com", "buyer-safety", "https://mgt.orientdig.com/help-categories/shipping-delivery/customs-taxes/"],
    ["orientdigindex.com", "faq", "https://mgt.orientdig.com/help-center/the-inspection-scope-of-the-shopping-agent-service/"],
    ["superbuyindex.com", "shipping-weight-guide", "https://login.superbuy.com/en/page/query/freight/"],
    ["superbuyindex.com", "buyer-safety", "https://www.superbuy.com/en/page/newguide/userguide/"],
    ["superbuyindex.com", "faq", "https://www.superbuy.com/en/page/guide/shoppingagent/"],
    ["superbuyitems.com", "superbuy-qc", "https://www.superbuy.com/en/page/guide/shoppingagent/"],
    ["superbuyitems.com", "superbuy-shipping", "https://login.superbuy.com/en/page/query/freight/"],
    ["superbuyitems.com", "faq", "https://www.superbuy.com/en/page/guide/shoppingagent/"],
    ["yoybuyindex.com", "qc-checklist", "https://www.yoybuy.com/"],
    ["yoybuyindex.com", "search-ideas", "https://www.yoybuy.com/"],
    ["yoybuyindex.com", "shipping", "https://www.yoybuy.com/"],
    ["yoybuyindex.com", "faq", "https://www.yoybuy.com/"],
  ] as const;

  it.each(sourcedPages)(
    "%s/%s keeps a dated first-party source and editorial limit",
    (domain, slug, sourceUrl) => {
      const page = getTenantResearchPage(domain, slug);

      expect(page).not.toBeNull();
      expect(page?.sourceUrl).toBe(sourceUrl);
      expect(page?.sourceLabel).toBeTruthy();
      expect(page?.reviewedAt).toMatch(/^2026-09-0[56]$/);
      expect(page?.methodNote).toBeTruthy();
    },
  );

  it.each([
    ["joyabuyfinds.com", "joyagoo-score"],
    ["joyagooindex.com", "search-ideas"],
    ["kakobuyindex.net", "guide"],
    ["kakobuyitems.com", "safety"],
    ["kakobuyitems.com", "search-ideas"],
    ["mulebuyindex.net", "mulebuy-spreadsheet"],
    ["mulebuyitems.com", "search-ideas"],
    ["orientdigindex.com", "orient-score-methodology"],
    ["superbuyindex.com", "spreadsheet-checklist"],
    ["superbuyitems.com", "superbuy-review"],
    ["yoybuyindex.com", "spreadsheet"],
  ])("%s/%s remains an uncited editorial method", (domain, slug) => {
    const page = getTenantResearchPage(domain, slug);

    expect(page).not.toBeNull();
    expect(page?.sourceUrl).toBeUndefined();
    expect(page?.reviewedAt).toBeUndefined();
  });
});
