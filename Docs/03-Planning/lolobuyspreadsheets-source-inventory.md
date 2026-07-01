# lolobuyspreadsheets.com Source Inventory

> Status: local code/document inventory only
> Source project: findsspreadsheet.com
> Target project: lolobuyspreadsheets.com
> Last updated: 2026-06-30

## Scope

This inventory describes what can be inferred from the local source repository and existing project documentation before any production VPS access.

No production database query, export, migration, service restart, cache clear, or deploy has been performed.

## Production Access Boundary

The old project does have a production server/SSH memory document:

- `Docs/Deployment/Server_Memory.md`

That document is useful only for identifying the old source environment when a read-only production inventory/export is explicitly approved.

Do not copy old production host values, SSH aliases, usernames, key paths, project paths, GitHub Actions secrets, or Caddy/server details into the new project documentation or environment files. The new project must use placeholders until the new VPS is provisioned.

## Migration Decisions

- Exclude old users, favorites, collections, browsing history, and referral data.
- Launch v1 with visual search enabled.
- Keep existing product image URLs for v1.
- Do not mirror product images in the first migration.
- Treat Redis and Meilisearch as rebuildable runtime state.

## Core Product Tables

These are the first-pass product-domain tables to migrate, subject to production row-count verification:

- `products`
- `skus`
- `product_secondary_categories`
- `product_qc_media`
- `product_attribute_values`
- `category`
- TypeORM category closure table, name to verify in production
- `brands`
- `brand_aliases`
- `brand_relations`
- `product_brand_facts`
- `colors`
- `attributes`
- `attribute_values`
- `platforms`
- `settings`, only after reviewing/removing old domain and OAuth-sensitive values

Notes:

- `category` is the TypeORM default table name for `Category` because the entity does not specify a custom name.
- `product_secondary_categories` is the product-to-category join table declared in `Product`.
- `product_attribute_values` is created by migration and used by facets/filters.
- `platforms` may be needed for source/buy-link behavior and managed platform metadata.
- `settings` is not safe to copy blindly because it can contain old site, search, and integration settings.

## Visual Search Required Tables

Visual search is required for the first launch, so these tables need either selective copy or local regeneration:

- `product_image_embeddings`
- `product_text_embeddings`

Runtime requirements:

- PostgreSQL with `pgvector`
- vector indexes from migrations, including HNSW indexes if present
- embedding service reachable from API
- Redis/BullMQ for embedding jobs if regeneration is needed

Important details from code:

- Image vectors are stored in `product_image_embeddings.embedding` as native `vector(512)`.
- Text vectors are stored in `product_text_embeddings.embedding` as native `vector(384)`.
- TypeORM entity classes intentionally do not map the `embedding` column directly; services use raw SQL.
- `product_image_embeddings` is unique on `(product_id, image_url)`.
- Visual search joins `product_image_embeddings` to active `products`.
- Meilisearch product documents expose `hasEmbedding` by checking `product_image_embeddings`.

Production-only facts still needed:

- active product count
- products with at least one image embedding
- total non-null image embeddings
- products without image embeddings
- text embedding count
- failed image embedding count by failure code
- whether vector indexes exist and are valid

## Rebuild Instead Of Copy

These should not be copied from the old project:

- Redis keys
- BullMQ job state
- Meilisearch data directory/index files
- cache-manager keys
- visual-search by-product cache
- recommendation cache
- OAuth state
- token blacklist/cache state

Meilisearch should be rebuilt from the new local database using:

- `apps/api/scripts/ops/meilisearch-sync.ts`

## Excluded Tables

Do not migrate these by default:

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

Some excluded tables can be useful analytically, but they would pollute the new site's independent launch state.

## Optional Tables

Review before deciding:

- `weidian_cache`: useful for raw Weidian recovery/debugging, but not required if `products`, `skus`, image URLs, and source fields are already complete.
- `brand_candidates` and `brand_candidate_items`: operational review queues; probably exclude unless the new admin workflow needs the old review backlog.
- `social_links`: can be recreated for the new site.

## Uploads And Image URLs

The production compose file mounts `./uploads` into the API container, and upload code stores admin-uploaded files under `uploads`.

For product catalogue migration v1:

- Keep product `mainImage`, `images`, `detailImages`, SKU image URLs, and QC media URLs as existing URLs.
- Do not mirror images yet.
- Do not copy old uploads blindly.

Before deployment, do a targeted check for URLs containing `/uploads/`. If any active product, platform logo, brand logo, or QC media depends on old local uploads, decide whether to copy only those files or replace the URLs.

## New Project Sanitization Requirements

When copying code into `/Volumes/1T/lolobuyspreadsheets.com`, remove or rewrite old project identity and old production access data:

- old production server memory
- old SSH alias and key path references
- old GitHub Actions VPS secret names/values
- old production project path
- old Caddy/server host references
- old `SITE_URL`, `NEXT_PUBLIC_SITE_URL`, `API_URL`, OAuth callback URLs
- old `COMPOSE_PROJECT_NAME`
- old external Docker volume names
- old `.env`, `.env.local`, `.env.production`, and generated secret files

Use placeholders or new local values first. Add real new VPS values only after the new VPS exists.

## Local Validation Gates

Before any new VPS deploy:

- new local API health passes
- new local frontend points only to new local API
- product count matches import manifest
- SKU count matches import manifest
- category/brand counts match import manifest
- `/products/search` returns migrated products
- facets return without errors
- visual-search status is healthy
- image-search smoke test returns migrated products
- random sample of at least 20 products checks title, image, price, SKU, category, brand, source link
- browser network panel shows no calls to old production domains or APIs

## Production Read-Only Inventory Needed Later

When explicitly approved, collect only read-only counts from the old VPS or a production backup:

- `Docs/03-Planning/lolobuyspreadsheets-production-readonly-inventory.sql`
- `Docs/03-Planning/lolobuyspreadsheets-product-export-manifest.md`
- `Docs/03-Planning/lolobuyspreadsheets-production-inventory-report.md`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-manifest.sql`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-report.md`

- product count by status
- SKU count
- category count and closure table count
- brand, brand alias, brand relation counts
- product QC media count
- product attribute join count
- platform and setting counts
- image embedding count and coverage
- text embedding count and coverage
- upload URL dependency count

Do not run exports until these counts have been reviewed.
