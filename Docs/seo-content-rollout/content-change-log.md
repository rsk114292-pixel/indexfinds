# SEO content rollout change log

Last updated: 2026-09-07 (Asia/Shanghai)

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
- `419dab7`: removed remaining brand-detail placeholders, shortened stale brand caching, and hardened tenant brand/category routes. The 26 affected identities subsequently passed 52/52 tenant and 52/52 main desktop/mobile text-fallback checks; no unlicensed logo was installed.
- `4100919` → `a9fbaf7` → `c4905a9` → `e742c38` → `3dd6aad`: tightened content/source boundaries, added exact first-party evidence where available, removed the expired iTaoBuy campaign, corrected seven source-to-route mappings, and avoided fabricated citations on methodology-only pages.
- `64b62dc`: eagerly loads only the selected desktop/mobile platform icon while keeping repeated platform lists lazy. This is the current 58-tenant release on Hostinger port 3167.
- Removed the release-space blocker by pruning 7.471 GB of rebuildable Docker builder cache and ten exact temporary build/audit paths totalling about 53 MB. Disk is now 87% used with about 27 GB free. Business data, volumes, certificates, and rollback versions were retained.

## Verification snapshot

- Web at `64b62dc`: 137 suites / 1,005 tests, lint, typecheck, production build, and 48 generated static pages passed.
- API: 130 suites / 2,086 tests, targeted lint, typecheck, and production build passed.
- Tenant release: 58/58 canary domain checks, 28/28 representative desktop/mobile browser views, 58/58 public production domains, and 453 indexable content pages passed with zero internal failures. Thirty-nine warnings are inconclusive third-party source responses, not internal broken links.
- Nginx cut 58 tenant configurations and 116 upstream references from port 3165 to 3167 after a successful global configuration test. The healthy `419dab7` container remains on 3165 as the immediate rollback; backup `/root/indexfinds-rollbacks/nginx-tenant58-64b62dc-20260906T160900Z` contains all 58 configurations.
- Product concurrency: 80/80 canary requests passed without API 429 or web error.
- Main site: the 4,648-URL low-load source audit closed all 15 recorded anomalies; the current sitemap contains 4,712 URLs and no placeholder brand slug. Release `ee560ee` remains healthy on port 3137 with `207a5e1` on 3136 as rollback.
- Xiangshoe: the 13,408-URL sitemap is HTTPS, same-host, and duplicate-free. The resumable two-second audit reached 6,858 URLs with zero recorded page failures, paused on one TLS interruption, confirmed that URL had recovered, and resumed from the same checkpoint. Full coverage is not claimed until the remaining count reaches zero.
- Exact tenant archive SHA-256: `9BC16B441887B9DF4C079DFB84BD9166A5E7388E39E590DC0DBA3EFDE7942B5B`. Hostinger image ID: `sha256:70a782b449e6e9bde2d6b6cac59d1441470c53bc66c75830ff0fb3b5eca8fcf8`.

## GSC baseline retained

- The authenticated 28-day snapshot captured on 2026-08-31 covers the original 42 released tenant properties: 40 had data, two were waiting for first data, with 89 clicks and 8,019 impressions in total.
- Sixteen additional properties were reconciled rather than grouped under one generic wait state: three 1to1 research properties are verified/accessible with data processing; `1to1reps.com` is verified/accessible with partial index coverage but no complete page-query performance baseline; twelve properties are verified/accessible through the secondary owner account with successful sitemaps and data still processing.
- The daily index monitor can read both account groups. The separate 24-hour query monitor completed the 48-property primary group on 2026-09-06 but its browser session lacked the secondary login, so twelve query rows remain unavailable rather than zero. The index run stopped safely after a Google 429, preserving its checkpoint instead of rewriting pending values as zero.
- No-impression queries are recorded as `未出现`, never as a ranking decline. Position changes based on fewer than three impressions in either comparison window remain small-sample observations.
- Deployment and sitemap availability are not recorded as Google indexing or ranking success. The deployment baseline is 2026-09-06; 28-day and 90-day review dates are 2026-10-04 and 2026-12-05.

## Source and workspace boundaries

- Shared application code may be reused; titles, descriptions, H1s, editorial page combinations, source evidence, and search intent must remain domain-specific.
- Official-source evidence supports only the exact facts it contains. Promotions, fees, routes, storage periods, and service terms require rechecking before publication.
- The final research set contains 394 pages: 221 with `sourceUrl`, 232 with `reviewedAt`, 232 with `methodNote`, and 221 with all three. Coverage is 22 complete domains, three fully reviewed source-split domains, 24 partial domains, and nine methodology/community-reference domains without page-level hard sources. All three mismatch counters are zero.
- `official-platform-sources.csv` contains 122 data rows across 58 domains and 11 columns with zero exact duplicates. The six unresolved brand-identity/scope cases remain text-only: `godspeed`, `psd`, `spider`, `spider-mmuhc8qn`, `travis-scott`, and `wolves-club`.
- User-owned and concurrently modified source files, generated historical acceptance artifacts, `AGENTS.md`, and unrelated document folders were not overwritten or included in the focused reliability commits.

## Evidence records

- Tenant release: `deploy/indexfinds/hostinger/tenant58-64b62dc-production-acceptance-20260906.json`.
- GSC reconciliation: `deploy/indexfinds/hostinger/gsc-16-property-reconciliation-20260906.json`.
- Main production: `deploy/indexfinds/hostinger/main-ee560ee-production-acceptance-20260906.json`, `main-indexfinds-url-audit-resolution-20260906.json`, and `main-2344949-brand-production-audit-20260906.json`.
