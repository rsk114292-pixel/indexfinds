# Deployment and production verification

Last updated: 2026-09-05 (Asia/Shanghai)

## Production topology observed

- Hostinger Nginx exposes 62 root hostnames: 58 shared tenant websites, `indexfinds.com`, independent `xiangshoe.net`, `api-next.indexfinds.com`, and the Hostinger server hostname.
- The 58 tenant websites currently use the unified tenant application. `1to1reps.com` is routed to the healthy tenant production service on port 3158.
- `indexfinds.com` and `xiangshoe.net` remain separate production surfaces and are not counted as tenant clones.
- Hostinger disk usage was approximately 84%, with about 33 GB free, during the latest read-only check. This is not an active outage but remains a release-capacity risk.

## Build and test evidence

- Web unit/integration tests: 133 suites, 922 tests passed.
- Web TypeScript check: passed.
- Web lint: passed.
- Web production build: passed on Next.js 15.5.23.
- API platform tests: 64 tests passed.
- API TypeScript check: passed.
- API build: passed.

## Public tenant acceptance

- Audit timestamp: 2026-09-04T14:11:22.647Z.
- Tenant domains: 58 checked, 58 passed, 0 failed.
- Sitemap/editorial pages: 454 checked.
- Representative deep pages: 232 checked.
- Failures: 0.
- External-source fetch warnings: 14. These were upstream `403`/`502` responses during automated checking and did not represent broken internal tenant routes.

## Homepage visual acceptance

- All 58 tenant homepages were rechecked at 1440x900 and 390x844.
- Homepage status, one visible H1, centered command bar, document width and header identity were checked in both viewports.
- The command bar center offset was 0 pixels on the checked desktop and mobile layouts.
- No tenant homepage hero used a URL-backed decorative product image; current heroes use CSS color/gradient treatments.
- No actual document-width overflow was detected. The mobile brand rail remains intentionally horizontally scrollable inside its own clipped container.
- `bbdbuyeus.com` and `rizzitgoindex.com` produced one transient image-timing warning during the batch run. A dedicated recheck returned HTTP 200 and successfully decoded every header logo at a non-zero natural size, so no asset replacement was made.

## Cross-site snippet review

- All 454 public sitemap/editorial pages had unique exact titles, descriptions and H1s across domains.
- Shared catalog, brand, category and representative product pages may reuse source data, but the audited copies remain `noindex, follow` and outside tenant sitemaps.
- One indexable near-duplicate snippet pair was found: Kakobuy Items shipping versus LitBuy Items shipping (token Jaccard 0.786). The LitBuy page was rewritten around post-arrival parcel scenarios and an automated cross-domain similarity guard was added. This source change is not yet a production release.
- `litbuyproducts.com` retains the invitation-code search intent. The older `litbuyitems.com/en/invitation-code` URL remains reachable but was removed from that tenant's index allowlist and sitemap so it will emit `noindex, follow` after deployment.

## 1to1Reps acceptance

- HTTPS apex and redirect behavior: passed; homepage resolves to `/en`.
- Homepage and seven sitemap pages: HTTP 200.
- Unknown route: HTTP 404.
- Per-page canonical: exact-domain/self-referencing.
- H1: one per checked page.
- Robots: editorial pages `index, follow`; raw catalog/product pages remain `noindex, follow`.
- Sitemap and favicon: HTTP 200.
- Retirement residue/410: not present in the current live route.

## Main and independent sites

- `indexfinds.com`: homepage HTTP 200; sitemap HTTP 200 with 4,648 same-host URLs.
- `xiangshoe.net`: homepage HTTP 200; robots and sitemap HTTP 200; sitemap contains 13,408 same-host URLs. It remains independent and needs a separate sitemap-scale content audit.
