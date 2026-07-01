# lolobuyspreadsheets.com Product Export Manifest

> Status: prepared for old production read-only inventory
> Source project: findsspreadsheet.com
> Target project: lolobuyspreadsheets.com
> Last updated: 2026-06-30

## Goal

Prepare the exact product-domain export scope for lolobuyspreadsheets.com without changing the old production project.

The old production database must be treated as read-only. The first old-side step is to run:

- `Docs/03-Planning/lolobuyspreadsheets-production-readonly-inventory.sql`
- `Docs/03-Planning/lolobuyspreadsheets-production-inventory-report.md`

No export should run until the inventory counts are reviewed.

## Assumptions

- The new project already has an auditable baseline schema migration.
- The new local database can be recreated from that baseline.
- Old users, favorites, browsing history, referrals, sessions, analytics, and caches stay excluded.
- Product image URLs stay as existing URLs for v1.
- Visual search is required for v1, so embedding data must be copied or regenerated.
- Meilisearch and Redis are rebuilt in the new project, not copied.

## Read-Only Inventory Success Criteria

- Product and SKU counts are known by status.
- Image and text embedding counts are known.
- Active product visual-search coverage is known.
- `product_image_embeddings.embedding` is confirmed as `vector(512)`.
- `product_text_embeddings.embedding` is confirmed as `vector(384)`.
- Upload URL dependencies are counted.
- Orphan checks return zero or are explicitly explained.
- Settings keys are listed without exposing values.

## Export Tables

Recommended parent-first order for a data-only export:

1. `colors`
2. `attributes`
3. `attribute_values`
4. `brands`
5. `brand_aliases`
6. `brand_relations`
7. `category`
8. `category_closure`
9. `platforms`
10. `products`
11. `skus`
12. `product_secondary_categories`
13. `product_attribute_values`
14. `product_qc_media`
15. `product_image_embeddings`
16. `product_text_embeddings`

## Conditional Tables

Review after inventory:

- `settings`: copy only safe operational keys. Do not copy old domain, OAuth, token, secret, tracking, or production integration values.
- `weidian_cache`: optional. Useful for recovery/debugging, not required if product, SKU, image URL, and source fields are complete.
- `product_brand_facts`: optional. It references `brand_candidates` through `candidateId`; do not copy blindly unless candidate dependencies are handled.
- `brand_candidates` and `brand_candidate_items`: usually old operational review backlog. Exclude by default unless the new admin workflow needs this backlog.
- `social_links`: recreate for the new site.

## Excluded Tables

Do not export by default:

- `users`
- `refresh_tokens`
- `login_logs`
- `user_oauth_accounts`
- `user_favorites`
- `user_collections`
- `collection_items`
- `user_browsing_history`
- `user_search_history`
- `referral_codes`
- `referral_clicks`
- `referral_attributions`
- `referral_experiment_events`
- `visit_sessions`
- `traffic_blocks`
- `click_events`
- `search_logs`
- `search_clicks`
- `search_impressions`
- `outbound_clicks`
- `product_interaction_events`
- `hot_searches`
- `hot_search_experiments`
- `hot_search_experiment_events`
- `batch_jobs`
- `batch_job_items`
- `sku_split_jobs`
- `sku_split_items`
- `sku_split_batches`
- `sku_split_batch_items`
- `point_accounts`
- `point_transactions`
- `point_withdrawals`
- `user_checkins`
- `product_sourcing_requests`

## Export Shape

Preferred artifact set:

- one data-only SQL dump for approved tables
- one row-count manifest produced before export
- one row-count manifest produced after import into the new local database
- one short exception report for conditional tables
- `Docs/03-Planning/lolobuyspreadsheets-product-domain-export-report.md`

Use `pg_dump --data-only --table=...` only after the inventory report is approved.

Do not export Redis keys, BullMQ jobs, Meilisearch indexes, old uploads directory, or old `.env` files.

## Referenced Upload Assets

Because the target site should be fully independent, referenced `/uploads/` assets must be migrated as a separate, narrow artifact.

Use:

- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-manifest.sql`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-report.md`

Rules:

- Export only files referenced by product JSON image fields, QC media, brand logos, and platform logos.
- Do not copy the full old uploads directory.
- Preserve the relative path after `/uploads/`.
- Record missing files separately.
- After import, rewrite or serve URLs from the new domain/API path instead of depending on the old API media domain.

## Import Validation Gates

After import into the new local database:

- product count matches the export manifest
- SKU count matches the export manifest
- category, brand, color, and attribute counts match
- product relationship orphan checks return zero
- image embedding and text embedding counts match, unless regeneration is intentionally chosen
- Meilisearch is rebuilt from the new DB
- `/products/search` returns migrated products
- visual search status is healthy after the embedding service starts
- an image-search smoke test returns migrated products
- a sample of at least 20 products verifies title, image, price, SKU, category, brand, source link, and QC media
