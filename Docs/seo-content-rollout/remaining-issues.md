# Remaining issues and external waits

Last updated: 2026-09-05 (Asia/Shanghai)

## GSC data still required

1. The verified 2026-08-31 baseline contains current 28-day domain/query aggregates for the original 42 tenant properties, but not the preceding 28 days, the two 90-day windows, or page-by-query landing URLs. Established ranked URLs must not be retargeted from aggregate-only data.
2. Sixteen tenants added beyond the original 42-domain release need their own property/onboarding and first reliable baseline confirmed before a ranking or indexing claim can be made.
3. Google crawl, indexing, and ranking are external waits. A successful deployment, HTTP 200, sitemap submission, or GSC validation start is not evidence that a page has been indexed.

## Content/source follow-up

- Fourteen automated official/external-source checks returned upstream 403/502 responses. They are not internal broken links, but volatile facts behind those sources require browser/manual reconfirmation before future copy changes.
- `indexfinds.com` and `xiangshoe.net` passed sitemap invariants and 12 distributed page samples each. Their combined 18,056 URLs were not subjected to a high-rate public crawl; future deep auditing must remain rate-limited to avoid creating edge failures.
- Use the comparison-window GSC export to choose high-impression/position-5-to-30 opportunities. Do not create replacement keyword pages merely because a domain currently has no impressions.

## Operational observation

- Hostinger currently has about 24 GB free (88% used) after the final image build. The immediate 92% release risk was reduced, but old rollback containers/images should be retained only through the observation window and then reviewed individually before any removal.
- A few stale browser/client requests may temporarily ask the new web container to optimize one of the former broken brand URLs. The database and public API now return null for all 26 affected records; monitor for new 404 image requests after caches age out rather than recreating unofficial logos.
- A later process briefly rewrote `1to1reps.com` to an older web/API port. It has been restored and backed up, but configuration ownership/automation should be watched for another drift.
- The checkout contains unrelated concurrent source/document changes and historical untracked acceptance JSON files. They remain preserved and must be reviewed/committed by scope rather than swept into this release.

## Next review criteria

- Recheck the production API/web logs for 429, 5xx, false missing-product pages, and stale brand-image 404s after the observation window.
- For every content URL changed in a later SEO batch, record release date, pre-change 28/90-day baseline, target query, landing URL, and next review date.
- Pages without enough independent value remain `noindex`; do not repeatedly redeploy or submit thin variants while waiting for Google.
