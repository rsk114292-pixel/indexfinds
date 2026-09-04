# SEO content rollout change log

Last updated: 2026-09-05 (Asia/Shanghai)

## Current verified baseline

- Restored `1to1reps.com` as an active, indexable tenant. The live homepage, editorial pages, redirects, robots, sitemap, canonical URLs, favicon, H1 count and JSON-LD were rechecked. No retirement or `410` behavior remains in the current production route.
- Expanded the shared tenant source from the earlier 46-domain set to 58 live tenants, including 12 new platform-specific tenant configurations and their official platform identity assets.
- Kept product/listing deep pages `noindex, follow` while editorial pages in each tenant sitemap remain `index, follow`. This prevents raw shared catalog pages from automatically becoming Google landing pages.
- Added or refined tenant-specific editorial profiles and research pages. The current public audit covers 454 sitemap pages and 232 representative deep pages.
- Updated platform logo mappings and platform metadata used by the web and API layers.
- Updated Hostinger tenant routing configuration so the current unified tenant release includes all 58 tenant domains.
- Recovered the authenticated 28-day GSC baseline captured on 2026-08-31 for 42 released tenants: 40 properties had data, two were waiting for first data, with 89 clicks and 8,019 impressions in total. The priority ledger now uses this baseline instead of treating the 24-hour sample as the primary ranking source.
- Rechecked all 58 tenant homepages at desktop and mobile widths. Search bars are centered, no tenant hero uses a URL-backed decorative product image, page width does not overflow, and the dedicated BBDbuy/RizzitGo logo decode recheck passed.
- Reworked the LitBuy Items shipping page around post-arrival parcel scenarios after it crossed the cross-domain snippet similarity threshold against Kakobuy Items shipping.
- Assigned the LitBuy invitation-code query to `litbuyproducts.com`. The legacy LitBuy Items page remains accessible but is removed from that tenant's sitemap/index allowlist.
- Added a regression test that rejects cross-domain indexable research-page SEO snippet similarity at or above 0.72.

## Evidence and scope rules

- Shared application code may be reused; titles, descriptions, H1s, editorial page combinations and search intent must remain domain-specific.
- Official-platform sources support only the facts stated by those sources. Fees, delivery times, storage periods, promotions, route availability and policies must be rechecked before publication.
- A query with no current GSC impressions is recorded as `未出现`, not as a ranking decline. Position changes based on fewer than three impressions in either comparison window are treated as small-sample observations.

## Work still open

- The current checkout now contains a verified current-28-day domain/query aggregate, but it does not contain the preceding 28-day comparison, either 90-day comparison window, or page-by-query landing URL detail. Those exports are still required before changing established ranked URLs.
- The existing relevant source changes are tested but remain uncommitted in the current checkout. They must be separated from generated acceptance artifacts before committing.
- The new LitBuy indexing/content changes still require a complete build, isolated runtime verification, production deployment and post-release audit.
