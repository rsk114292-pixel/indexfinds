# Remaining issues and external waits

Last updated: 2026-09-05 (Asia/Shanghai)

## Blocking complete SEO prioritization

1. **Comparison-window and page-level GSC data are not yet available in the working checkout.** A current 28-day domain/query aggregate from 2026-08-31 is verified for 42 released tenants, but the preceding 28 days, both 90-day windows and page-by-query landing URLs are absent. Do not infer trends or retarget established URLs from the aggregate alone.
2. **Twelve current tenant domains are absent from the 42-domain 28-day GSC baseline and the latest 48-property daily inventory.** Ownership/onboarding and a first baseline must be confirmed before claiming indexing or ranking results.
3. **The LitBuy duplicate-intent fix is local only.** It must pass the full build and isolated runtime audit before a small production release. Until deployment, the live LitBuy Items invitation-code page remains indexable under the previous release.

## Work that can continue without GSC access

- Review official evidence and existing copy for the 28-day priority group without changing ranked URLs from aggregate-only data.
- Extend desktop/mobile visual and interaction acceptance from homepages to the changed LitBuy deep pages before release.
- Fix only evidence-backed technical or content defects, then rebuild and deploy in a small batch.
- Verify production HTTP, canonical, robots, sitemap, favicon, structured data and regression behavior after deployment.

## Current operational risks

- Hostinger disk usage is approximately 84%. Before large new image/build releases, recheck free space and safely clear only known caches or obsolete build artifacts.
- Fourteen automated external-source checks returned upstream `403` or `502`. These links need browser/manual confirmation before relying on volatile facts; they are not internal-site failures.
- The current source checkout contains tested but uncommitted tenant/API/routing changes plus numerous generated acceptance reports. Relevant source changes must be committed separately from optional evidence artifacts.

## Google waiting items

- Deployment, sitemap availability and a GSC submission do not prove indexing or ranking.
- For every changed URL, record the release date, pre-change 28/90-day baseline, target query and next review date.
- Pages without enough independent value remain `noindex`; do not publish or repeatedly redeploy thin variants while waiting for Google.
