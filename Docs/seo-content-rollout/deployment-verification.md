# Deployment and production verification

Last updated: 2026-09-07 (Asia/Shanghai)

## Production topology verified

- Hostinger Nginx exposes 62 root hostnames: 58 shared tenant websites, `indexfinds.com`, independent `xiangshoe.net`, `api-next.indexfinds.com`, and the Hostinger server hostname.
- All 58 tenant websites, including `1to1reps.com`, route to unified web release `64b62dc` on port 3167 and the API release on port 4105. The loaded Nginx configuration contains 116 references to port 3167 and zero references to the previous port 3165 across those 58 tenant hosts.
- `indexfinds.com` and `xiangshoe.net` remain separate production surfaces; neither was converted into a shared tenant.
- Hostinger disk use reached 90% after the final image build. A safe Docker builder-cache prune reclaimed 7.471 GB, and ten exact rebuildable `/tmp` build/audit paths removed a further approximately 53 MB. Databases, uploads, original product images, volumes, certificates, Nginx configuration, current/rollback images, and current/rollback containers were not deleted. The current filesystem is 87% used with approximately 27 GB free.

## Released change chain

- `f975814` — distinct tenant research surfaces and the 453-page tenant editorial/sitemap set.
- `0c65b55` — a transient upstream API failure no longer renders as a false `Product Not Found`; only 404/410 represent a missing product.
- `2d21d35` — authenticated same-origin tenant SSR traffic is separated from public API throttling. The internal token is accepted only by constant-time comparison and the web client does not forward it to a different origin.
- `f053cf5` — removed invented initials/gradient badges from the shared `BrandLogo` component.
- `419dab7` — removed the remaining brand-detail placeholders, shortened stale brand caching, hardened tenant brand/category routes, and added repeatable browser and sitemap audit tooling. It remains healthy on port 3165 as the immediate tenant rollback.
- `2344949` — kept analytics on the main site while preserving tenant tracking isolation.
- `207a5e1` — validates sitemap entries before publication and strengthens resumable production audits.
- `ee560ee` — rejects placeholder catalog slugs before API lookup. It is the current `indexfinds.com` main release on port 3137.
- `4100919` → `a9fbaf7` → `c4905a9` → `e742c38` → `3dd6aad` — tighten claim/source boundaries, bind reviewed tenant content to exact first-party evidence where available, remove expired iTaoBuy campaign copy, and close the remaining confirmed source gaps without inventing citations.
- `64b62dc` — keeps repeated platform-logo lists lazy while eagerly loading only the selected desktop/mobile platform icon. This is the current 58-tenant release on port 3167.

## Build and test evidence

- API: 130 suites and 2,086 tests passed; targeted lint, TypeScript validation, and production build passed.
- Web at the final tenant release `64b62dc`: 137 suites and 1,005 tests passed; lint, TypeScript validation, the Next.js production build, and all 48 generated static pages passed.
- The exact API and web source archives were SHA-256 checked before building on Hostinger. The `64b62dc` archive hash is `9BC16B441887B9DF4C079DFB84BD9166A5E7388E39E590DC0DBA3EFDE7942B5B`; Hostinger built image `sha256:70a782b449e6e9bde2d6b6cac59d1441470c53bc66c75830ff0fb3b5eca8fcf8` (90,196,794 bytes).

## API and product-route acceptance

- API canary: 45 unauthenticated concurrent health requests produced 30 HTTP 200 and 15 HTTP 429, proving public throttling still applies.
- API canary: 80 authenticated internal health requests produced 80 HTTP 200 and no 429.
- Web-to-API product stress: 80 concurrent product requests produced 80 HTTP 200, with no API 429 and no web error.
- Five public tenant domains were sampled three times each after cutover. All 15 responses were HTTP 200 and all rendered the expected product H1.
- Since the API cutover, the checked production log window contained zero 429 and zero 5xx responses.

## Tenant production acceptance

- Full isolated audit: 58 tenant domains, 453 sitemap/editorial pages, zero failures, and no duplicate exact title, description, or H1 across indexable tenant pages.
- Final public release regression: 58/58 homepages, 58/58 robots files, and 58/58 sitemap entry points returned HTTP 200; canonical host checks and sitemap-host checks had zero failures.
- All four YDA English endpoints passed: apex and `www` for both `ydaexpress.net` and `ydaexpress.org` resolved to their canonical apex `/en` page with HTTP 200.
- `indexfinds.com/en` and `api-next.indexfinds.com/health` returned HTTP 200. Disabled `indexfinds.com/en/register` returned HTTP 404.
- `1to1reps.com` briefly drifted back to an older port during an earlier release window. It now uses the same 3167/4105 production pair as the other 57 tenants; `/en` returned 200 after the final cutover.

## Brand-image verification scope

- 314 active brands with products were inspected. Of 137 configured logo URLs, 111 returned a usable image and 26 returned HTTP 404.
- The 26 broken records were exported before mutation to `/root/.indexfinds-migration/database-backups/broken-brand-logos-20260905T024250Z.csv`, then only their `logoUrl` values were set to null.
- 229 brand-related cache keys were selectively invalidated. The public API subsequently returned all 26 affected brands with null logo URLs.
- A later row-by-row official-source and usage-terms review found no public third-party commercial logo licence for any of these 26 identities. No logo was copied, traced, hotlinked, or described as licensed. Twenty identities are sufficiently clear for text-only presentation; six still require identity normalisation or scope resolution (`godspeed`, `psd`, `spider`, `spider-mmuhc8qn`, `travis-scott`, and `wolves-club`).
- The production-before-fix browser baseline was 0/26 passed: 13 detail pages showed an initial-letter placeholder, 12 retained stale broken image elements, and one page produced a transient false 404 before immediately recovering. The fixed tenant release passed 52/52 production checks on `acbuyindex.com`, and the fixed main release passed a separate 52/52 production check on `indexfinds.com` (26 identities at desktop and mobile widths). Every page returned 200, showed its heading, rendered no fabricated placeholder or broken brand image, and requested none of the retired logo URLs. This is a verified text-only alternative, not an assertion that an official logo was licensed or replaced.
- The itemised identity source, terms source, decision, and verification state are recorded in `brand-image-audit.csv`.

## Main and independent sitemap coverage

- `indexfinds.com`: the resumable 4,648-URL low-load audit completed with 4,633 immediate passes and 15 recorded failures. Seven transient brand requests were rechecked sequentially and now return 200. Eight invalid locale variants of `/brands/null` were a real defect; release `ee560ee` now returns 404 plus `X-Robots-Tag: noindex, nofollow`, and the current 4,712-URL sitemap contains zero placeholder-brand entries. All 15 recorded failures are resolved; this remains a lightweight technical audit rather than 4,648 full browser renders.
- `xiangshoe.net`: 13,408 HTTPS same-host sitemap URLs, zero duplicates. The two-URL preflight passed with all checked resources healthy. Its resumable one-worker audit reached 6,858/13,408 with zero recorded page failures before pausing on a TLS connection interruption. The affected URL then returned normally in three public checks and one origin-targeted check, so the same checkpoint was resumed at a two-second interval. Final coverage is not claimed until `remainingCount` reaches zero and every persistent anomaly is classified.
- The first concurrent IndexFinds sample produced three Cloudflare 522 responses and one client timeout. Each affected URL then returned HTTP 200 in three sequential retries; direct Hostinger-origin checks were also HTTP 200 and the main container was healthy. No restart, DNS change, or unrelated infrastructure change was made; the historical 522 cause remains unconfirmed.

## Evidence scope reconciliation

- The production inventory contains 60 website roots: 58 shared tenants, the separate `indexfinds.com` application, and the separate static `xiangshoe.net` site. API and Hostinger infrastructure hostnames are not counted as websites.
- The final public tenant audit covers all 58 homepage, robots, favicon, and sitemap entry points plus 453 indexable content routes. All 58 domains and all 453 reviewed content pages passed with zero internal failures. Fourteen affected/representative pages also passed 28 desktop/mobile browser views. This does not mean every catalog/product URL on every tenant received a browser render.
- Before this review, `indexfinds.com` and `xiangshoe.net` had only sitemap invariants plus 12 distributed pages each. The full lightweight IndexFinds audit and recorded-failure resolution are now complete. Xiangshoe is being checked separately with a persistent low-load checkpoint. Browser acceptance remains targeted to important page types, every modified type, and every anomalous URL; neither lightweight URL count is described as an equal number of visual browser checks.

## GSC onboarding reconciliation

- `1to1finds.cloud`, `1to1finds.com`, and `1to1spreadsheet.com` have accessible, verified properties; Search performance data is still processing and is not recorded as zero.
- `1to1reps.com` has an accessible, verified property and index-coverage information; its page-query performance baseline still needs export. It remains a live production domain and is not a retirement or whole-site `noindex` candidate.
- Twelve newer properties (`dgobuyindex.com`, `hubbuyindex.com`, `mycnboxindex.com`, `okeyhaulindex.com`, `ootdbuyindex.com`, `ossbuyindex.com`, `pantherbuyindex.com`, `ponybuyindex.com`, `rizzitgoindex.com`, `spanbuyindex.com`, `tigbuyindex.com`, and `vigorbuyindex.com`) are DNS-verified and accessible through the secondary owner account. Each sitemap is successful with eight discovered pages; index data is still processing. The index monitor accessed all twelve. The 24-hour query monitor still lacks that secondary login in its own browser session, so its twelve query rows remain unavailable rather than zero; no DNS change is required.

## Rollback evidence

- API/Nginx backup: `/root/.indexfinds-migration/nginx-backups/tenant-internal-2d21d35-20260904T201650Z`.
- Web/Nginx backups: `/root/.indexfinds-migration/nginx-backups/tenant-brand-logo-f053cf5-20260905T024128Z` and `/root/.indexfinds-migration/nginx-backups/tenant-brand-cache-f053cf5-20260905T024757Z`.
- Main `ee560ee` Nginx backup: `/opt/indexfinds/nginx-backups/main-ee560ee-20260905T1910Z/indexfinds.com.conf.before` (SHA-256 `ae7459f95bcfa9eb939bcf6a23a10c7353e3194afb1151494ec4fe4288fb9201`). The healthy `207a5e1` container remains on port 3136 as the immediate main-site rollback.
- Final tenant Nginx backup: `/root/indexfinds-rollbacks/nginx-tenant58-64b62dc-20260906T160900Z` (58 files; archive SHA-256 `a7008affb35a5b2ff4cabee32310517c2063ffba64b185369765db89b083214e`). The healthy `419dab7` container remains on port 3165 as the immediate tenant rollback.
- Previous API and web containers remain available on their old local ports during the observation period. No database, uploads volume, SSL certificate, or unrelated site configuration was deleted.

The compact release record is `tenant58-64b62dc-production-acceptance-20260906.json`.
