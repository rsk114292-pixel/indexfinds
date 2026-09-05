# SEO content rollout change log

Last updated: 2026-09-05 (Asia/Shanghai)

## Released tenant/content baseline

- Restored `1to1reps.com` as an active tenant. Its homepage, seven sitemap pages, redirects, robots, sitemap, canonical URLs, favicon, H1 count, JSON-LD, unknown-route 404, and noindex catalog boundary were accepted.
- Expanded the shared tenant source to 58 live tenants while keeping `indexfinds.com` and independent `xiangshoe.net` isolated.
- Published domain-specific editorial profiles and page combinations. The accepted tenant set contains 453 indexable editorial/sitemap URLs plus noindex catalog, brand, category, and product discovery routes.
- Preserved the rule that automated/shared catalog data does not automatically become indexable content. Editorial pages must have independent intent and pass domain-level acceptance.
- Reworked the LitBuy Items shipping content after it crossed the similarity threshold against Kakobuy Items. A cross-domain test rejects indexable research-page snippets at or above 0.72 similarity.
- Consolidated the LitBuy invitation-code intent on `litbuyproducts.com`. The legacy `litbuyitems.com/en/invitation-code` page remains reachable with `noindex, follow` and is absent from its sitemap.

## Reliability and visual fixes released

- `0c65b55`: distinguishes transient API timeouts/5xx/429 from a true missing product so temporary upstream trouble does not produce a false missing-product page.
- `2d21d35`: lets authenticated same-origin SSR traffic bypass only the shared-IP public throttle while retaining public throttling and preventing internal-token leakage to other origins.
- `f053cf5`: removes unverified initials/gradient brand-logo placeholders. A missing or failed image is omitted and the brand name remains.
- Audited 137 configured active-brand logo URLs: 111 usable, 26 broken. The 26 broken values were backed up, set to null, and their relevant caches invalidated without deleting brand or product records.
- Removed the release-space blocker by pruning only Docker builder cache; disk use improved from 92% to 86% before the final build and settled at 88% afterward.

## Verification snapshot

- Web: 133 suites / 933 tests, lint, typecheck, and production build passed.
- API: 130 suites / 2,086 tests, targeted lint, typecheck, and production build passed.
- Tenant release: 58/58 public homes, robots files, and sitemap entries passed; four YDA apex/`www` English URLs passed.
- Product concurrency: 80/80 canary requests passed without API 429 or web error.
- Main/independent sitemap manifests: 4,648 IndexFinds URLs and 13,408 Xiangshoe URLs were HTTPS, same-host, and duplicate-free; 24 distributed samples passed after sequential retry of four transient main-site edge failures.

## GSC baseline retained

- The authenticated 28-day snapshot captured on 2026-08-31 covers the original 42 released tenant properties: 40 had data, two were waiting for first data, with 89 clicks and 8,019 impressions in total.
- No-impression queries are recorded as `未出现`, never as a ranking decline. Position changes based on fewer than three impressions in either comparison window remain small-sample observations.
- Deployment and sitemap availability are not recorded as Google indexing or ranking success. Comparison windows and landing-page/query exports remain required for the next content-priority cycle.

## Source and workspace boundaries

- Shared application code may be reused; titles, descriptions, H1s, editorial page combinations, source evidence, and search intent must remain domain-specific.
- Official-source evidence supports only the exact facts it contains. Promotions, fees, routes, storage periods, and service terms require rechecking before publication.
- User-owned and concurrently modified source files, generated historical acceptance artifacts, `AGENTS.md`, and unrelated document folders were not overwritten or included in the focused reliability commits.
