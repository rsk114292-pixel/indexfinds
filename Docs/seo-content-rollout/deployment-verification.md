# Deployment and production verification

Last updated: 2026-09-05 (Asia/Shanghai)

## Production topology verified

- Hostinger Nginx exposes 62 root hostnames: 58 shared tenant websites, `indexfinds.com`, independent `xiangshoe.net`, `api-next.indexfinds.com`, and the Hostinger server hostname.
- All 58 tenant websites, including restored `1to1reps.com`, route to the unified web release on port 3163 and the API release on port 4105.
- `indexfinds.com` and `xiangshoe.net` remain separate production surfaces; neither was converted into a shared tenant.
- Hostinger disk use reached 92% before the release. Removing only rebuildable Docker builder cache reclaimed 11.78 GB. After the final image build the filesystem was at 88% with approximately 24 GB free.

## Released change chain

- `f975814` — distinct tenant research surfaces and the 453-page tenant editorial/sitemap set.
- `0c65b55` — a transient upstream API failure no longer renders as a false `Product Not Found`; only 404/410 represent a missing product.
- `2d21d35` — authenticated same-origin tenant SSR traffic is separated from public API throttling. The internal token is accepted only by constant-time comparison and the web client does not forward it to a different origin.
- `f053cf5` — removes invented initials/gradient brand badges. Missing or failed logos render no image; verified logos and brand text remain.

## Build and test evidence

- API: 130 suites and 2,086 tests passed; targeted lint, TypeScript validation, and production build passed.
- Web after the final logo change: 133 suites and 933 tests passed; targeted lint, TypeScript validation, and the Next.js 15.5.23 production build passed (48 generated routes).
- The exact API and web source archives were SHA-256 checked before building on Hostinger. The web archive for `f053cf5` was `F95CD3DE6AFACF0D279038EF2D535B5106E61F0816D7FFE1B2025C366D6B0CCB`.

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
- `1to1reps.com` briefly drifted back to an older port during the release window. Its configuration was backed up and restored to the same 3163/4105 release as the other 57 tenants.

## Brand-image acceptance

- 314 active brands with products were inspected. Of 137 configured logo URLs, 111 returned a usable image and 26 returned HTTP 404.
- The 26 broken records were exported before mutation to `/root/.indexfinds-migration/database-backups/broken-brand-logos-20260905T024250Z.csv`, then only their `logoUrl` values were set to null.
- 229 brand-related cache keys were selectively invalidated. The public API subsequently returned all 26 affected brands with null logo URLs.
- Desktop and narrow-width brand pages were rendered before release, followed by a public production screenshot. Verified logos remain visible and missing logos show text without fabricated image badges.

## Main and independent sitemap sampling

- `indexfinds.com`: 4,648 HTTPS same-host sitemap URLs, zero duplicates. Twelve evenly distributed pages were sampled for HTTP, canonical, H1, and robots state.
- `xiangshoe.net`: 13,408 HTTPS same-host sitemap URLs, zero duplicates. Twelve evenly distributed pages passed the same sampled checks.
- The first concurrent IndexFinds sample produced three Cloudflare 522 responses and one client timeout. Each affected URL then returned HTTP 200 in three sequential retries; direct Hostinger-origin checks were also HTTP 200 and the main container was healthy. No restart or unrelated infrastructure change was made.

## Rollback evidence

- API/Nginx backup: `/root/.indexfinds-migration/nginx-backups/tenant-internal-2d21d35-20260904T201650Z`.
- Web/Nginx backups: `/root/.indexfinds-migration/nginx-backups/tenant-brand-logo-f053cf5-20260905T024128Z` and `/root/.indexfinds-migration/nginx-backups/tenant-brand-cache-f053cf5-20260905T024757Z`.
- Previous API and web containers remain available on their old local ports during the observation period. No database, uploads volume, SSL certificate, or unrelated site configuration was deleted.
