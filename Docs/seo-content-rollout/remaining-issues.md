# Remaining work, blockers, and external waits

Last updated: 2026-09-07 (Asia/Shanghai)

This file distinguishes work that can still be completed now from outcomes that require Google or another account owner. A deployment, successful sitemap read, or GSC validation start is not evidence of indexing or ranking success.

## Work in progress now

### Production page coverage

- `indexfinds.com`: the 4,648-URL low-load audit completed with 4,633 immediate passes and 15 recorded failures. All 15 were resolved and rechecked: seven transient brand requests now return HTTP 200, while eight invalid `/brands/null` routes correctly return HTTP 404 with `X-Robots-Tag: noindex, nofollow` and are absent from the current 4,712-URL sitemap. Release `ee560ee` is live on port 3137 with a healthy rollback container. Evidence: `main-indexfinds-url-audit-resolution-20260906.json` and `main-ee560ee-production-acceptance-20260906.json`.
- `xiangshoe.net`: 13,408 current sitemap URLs, all unique HTTPS same-host entries. Its resumable one-worker scan reached 6,858/13,408 with zero recorded page failures before pausing on one persistent TLS connection interruption. The affected URL then returned normally in three public checks and one origin-targeted check, so the same checkpoint was resumed at a two-second interval rather than restarting. Any 429, 522, or persistent 5xx still pauses expansion while the origin is diagnosed.
- Browser acceptance remains intentionally narrower than the lightweight URL crawl. After each crawl, desktop and mobile browser checks must cover each important page type, every modified page type, and every anomalous URL. A lightweight crawl is never labelled a full browser render.

### Brand images

- The 26 failed database logo URLs were backed up and cleared, but that cleanup alone is not a correct-logo replacement.
- Official identity and usage terms were reviewed row by row. None of the 26 sources grants a public third-party commercial logo licence, so the safe presentation is verified brand text without a fabricated badge. No candidate logo will be copied or hotlinked.
- Six records still need identity data normalisation or scope resolution before any future asset request: `godspeed`, `psd`, `spider`, `spider-mmuhc8qn`, `travis-scott`, and `wolves-club`. Twenty other identities are clear enough for text-only presentation but still do not have reusable logo permission.
- The production-before-fix browser baseline was 0/26. The safe text-only fallback and cache/detail fixes are now live. Tenant production and main production each passed 52/52 checks (26 identities across desktop and mobile): headings were visible, no fabricated placeholder appeared, no stale logo URL was requested, and no broken brand image was rendered. This proves the alternative treatment, not official-logo licensing or replacement. Itemised evidence is in `brand-image-audit.csv`; browser evidence is in `tenant58-419dab7-brand-production-audit-20260905.json` and `main-2344949-brand-production-audit-20260906.json`.

### Content and source coverage

- The tenant page map contains 454 routes: 394 research pages, 58 homes, and two dedicated routes. One legacy route is intentionally `noindex`; 453 are indexable.
- No duplicate route key, exact SEO title, or H1 was found in the generated research set, and the focused content tests pass. This is structural evidence, not proof that every external factual claim is current.
- In final clean release `64b62dc`, 221/394 generated research pages have a page-specific `sourceUrl`, 232/394 have `reviewedAt`, 232/394 have `methodNote`, and 221/394 have all three. Twenty-two domains are complete, three have every page reviewed while only factual pages carry exact source URLs, 24 have partial page-level coverage, and nine methodology/community-reference domains have no hard page-level source. The consistency counters `sourceWithoutReview`, `reviewWithoutMethod`, and `methodWithoutReview` are all zero. Missing page-level sources are not automatically defects: pure editorial methods, community-reference pages, and pages whose first-party application exposes only a JavaScript shell remain explicitly bounded instead of receiving invented citations or dates. The renderer says `Not recorded for this page` when appropriate and never labels a fallback homepage as the exact page source.
- High-risk factual claims were checked first against first-party pages: LitBuy coupons; LoongBuy, Superbuy, HooBuy and related shipping tools; CSSBuy forwarding; MuleBuy tracking; Oopbuy shipping; Parcel Up payments/tracking; Sugargoo tracking; iTaoBuy policies; and platform-specific workflow assertions. Unsupported precise claims were narrowed, expired iTaoBuy promotion copy was removed, and source method notes now state when direct fetch was blocked or only an application shell was visible. Generic methodology pages were not bulk-filled with invented review dates.
- Seven source-ledger mappings that pointed to nonexistent local routes were corrected to real OrientDig, USFans, and GoatedBuy pages. The current BBDbuy application entry is recorded, while the legacy-domain identity discrepancy (`bbdbuyeu.com` versus `bbdbuy.com`) remains explicit rather than guessed. The combined candidate has 122 structurally valid source-ledger rows, 11 columns, and zero exact duplicate domain/source/target-page keys.

### Stability and storage

- YDA currently returns normally through the shared web/API release, but a later 200 is recovery evidence rather than proof of the earlier 522's cause. Available logs show no OOM, disk I/O fault, Nginx connection exhaustion, or active origin outage. They do show periods of load above four cores, high swap use, remote-image timeouts, and active image-cache growth. Because YDA did not have request-level Nginx logging and no exact Cloudflare Ray ID/time is available, the 522 root cause remains unconfirmed.
- No DNS, Cloudflare, Nginx, port, or architecture change is justified by the available evidence. The low-risk application false-404 fixes and reduced audit rate address confirmed behaviour without rebuilding infrastructure.
- Hostinger is currently 87% used with about 27 GB free after reclaiming 7.471 GB of Docker builder cache and deleting ten exact rebuildable `/tmp` build/audit paths totalling about 53 MB. Databases, uploads, product images, active volumes, current releases, certificates, and rollback assets were left untouched. Stopped containers and old rollback directories remain review candidates only; they are not safe to delete automatically while their rollback purpose is unresolved.

## GSC states that must not be conflated

### Verified and accessible; data processing

- `1to1finds.cloud`
- `1to1finds.com`
- `1to1spreadsheet.com`

These properties are configured and accessible. Search performance has not completed processing, so the value is unavailable, not zero.

### Verified and accessible; partial data available

- `1to1reps.com`

Index-coverage information is available. The current/prior 28-day and 90-day page-query performance exports still need to be captured when the interface/API permits them.

### Verified and accessible through the secondary owner account; data processing

- `dgobuyindex.com`
- `hubbuyindex.com`
- `mycnboxindex.com`
- `okeyhaulindex.com`
- `ootdbuyindex.com`
- `ossbuyindex.com`
- `pantherbuyindex.com`
- `ponybuyindex.com`
- `rizzitgoindex.com`
- `spanbuyindex.com`
- `tigbuyindex.com`
- `vigorbuyindex.com`

The DNS ownership TXT records remain present, the secondary owner account can open every property, and every sitemap is successful with eight discovered pages. No DNS change is required. Search/indexing data is still processing and is unavailable, not zero. The index monitor can read these properties, but the separate 24-hour query task still needs the secondary login restored in that task's own browser session; until then those query values remain unavailable rather than zero.

## Genuine Google waits

- Re-crawling, indexing changes, and ranking changes are controlled by Google. Current state: technical deployment and sitemap availability can be verified immediately, but SEO outcome cannot.
- The two existing daily GSC tasks were updated rather than duplicated. `gsc-42` checks index/sitemap state across both account groups; `gsc-spreadsheet` compares the latest available 24 hours with the preceding 24 hours and records no-impression queries only as `未出现`. Both run at 09:00 Asia/Shanghai, write to `D:/桌面/Desktop/新建文件夹/gsc-monitor/`, preserve checkpoints, and must not retire or noindex `1to1reps.com`.
- The 2026-09-06 scheduled runs created real reports and checkpoints. The index monitor completed 47 properties, partially completed `mulebuyitems.com`, then correctly stopped with 12 pending after repeated GSC HTTP 429; the secondary-account group itself completed 12/12. The query monitor completed the 48-property primary group but could not read the 12-property secondary group because that automation task's browser session no longer contained the secondary owner login. This is an authentication-session blocker for that report only, not missing properties or DNS failure. No unavailable value was entered as zero.
- The deployment baseline is 2026-09-06. Review current/prior 28-day page-query windows on 2026-10-04 and 90-day windows on 2026-12-05. Metrics: valid indexed pages, sitemap fetch errors, clicks, impressions, CTR, average position, target query, and landing URL.
- Trigger actions: investigate only a confirmed crawl/indexing error, persistent loss of previously observed impressions, wrong canonical/robots, sitemap read failure, or material CTR/ranking regression with enough impressions. Do not redeploy unchanged pages merely while waiting.

## Production blockers and completion rule

- Tenant-content release `64b62dc` completed the scoped clean build, 58/58 canary checks, 28/28 representative desktop/mobile browser views, Nginx cutover, 58/58 public domain checks, and 453-page public content verification. Port 3165 remains healthy as the immediate rollback. The production observation window remains active; this is deployment/acceptance evidence, not Google indexing or ranking evidence.
- The IndexFinds URL audit is closed with zero unresolved recorded failures. The Xiangshoe report is not complete until its checkpoint `remainingCount` is zero and persistent anomalies have been classified. Correct 404s and intentional redirects are retained; sitemap entries that truly fail remain defects.
- Content pages are not declared factually complete merely because duplication, headings, canonical, and structured data pass. The source ledger must match the exact published claim and review date.
