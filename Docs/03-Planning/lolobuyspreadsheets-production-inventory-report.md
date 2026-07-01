# lolobuyspreadsheets.com Production Inventory Report

> Status: completed read-only production inventory
> Source project: findsspreadsheet.com
> Target project: lolobuyspreadsheets.com
> Inventory date: 2026-06-30

## Scope

This report records read-only production counts used to plan the lolobuyspreadsheets.com product-domain migration.

No production migration, seed, reset, cleanup, delete, service restart, export, import, or deploy was performed.

The production check used:

- `Docs/03-Planning/lolobuyspreadsheets-production-readonly-inventory.sql`
- PostgreSQL read-only transaction
- `SELECT` statements only

## Environment Health

- API health: ok
- Database health: ok
- PostgreSQL container: healthy
- API container: healthy
- Embedding service container: healthy

## Extensions

| Extension | Version |
| --- | --- |
| `pg_trgm` | `1.6` |
| `uuid-ossp` | `1.1` |
| `vector` | `0.8.1` |

## Core Counts

| Table | Rows |
| --- | ---: |
| `products` | 331,776 |
| `skus` | 1,672,709 |
| `category` | 203 |
| `category_closure` | 551 |
| `product_secondary_categories` | 653 |
| `product_qc_media` | 297 |
| `brands` | 3,259 |
| `brand_aliases` | 22 |
| `brand_relations` | 10 |
| `product_brand_facts` | 155,992 |
| `colors` | 19 |
| `attributes` | 5 |
| `attribute_values` | 45 |
| `product_attribute_values` | 3,341,521 |
| `platforms` | 11 |
| `settings` | 15 |
| `product_image_embeddings` | 331,776 |
| `product_text_embeddings` | 331,776 |
| `weidian_cache` | 45,894 |
| `brand_candidates` | 0 |
| `brand_candidate_items` | 0 |

## Product And SKU Health

| Metric | Count |
| --- | ---: |
| total products | 331,776 |
| active products | 331,770 |
| draft products | 6 |
| products with main image | 331,776 |
| products with images JSON | 331,776 |
| products with detail images JSON | 331,776 |
| products with source URL | 331,776 |
| products with Weidian item ID | 0 |
| total SKUs | 1,672,709 |
| products with SKUs | 331,584 |
| active products without SKUs | 192 |
| active products without source URL | 0 |
| active products without main image | 0 |

Notes:

- `weidianItemId` is empty across products, but `sourceUrl` is complete.
- The new site should preserve `sourceUrl` and should not assume `weidianItemId` exists for existing products.
- The 192 active products without SKUs should be accepted as legacy catalogue state unless a later cleanup is explicitly requested.

## Visual Search

| Metric | Count |
| --- | ---: |
| image embedding rows | 331,776 |
| non-null image embeddings | 331,775 |
| null image embeddings | 1 |
| products with image embedding rows | 331,776 |
| products with non-null image embeddings | 331,775 |
| image embedding failure rows | 1 |
| image embedding failure code | `http_404`: 1 |
| text embedding rows | 331,776 |
| non-null text embeddings | 331,776 |
| null text embeddings | 0 |
| active products with image embedding | 331,769 |
| active products without image embedding | 1 |
| active products with text embedding | 331,770 |

Vector columns:

| Table | Column | Type |
| --- | --- | --- |
| `product_image_embeddings` | `embedding` | `vector(512)` |
| `product_text_embeddings` | `embedding` | `vector(384)` |

Indexes present:

- `idx_pie_embedding_hnsw`
- `idx_pte_embedding_hnsw`
- `idx_pie_product_id`
- `idx_pte_product_id`
- unique product/image and product/text indexes
- image embedding failure-code partial index

Recommendation:

- Copy image and text embedding tables for the first local import.
- Accept the one failed image embedding initially, or regenerate that one record later from the new project.
- Do not rebuild all embeddings unless import validation reveals schema or compatibility issues.

## Upload URL Dependencies

| Area | Rows |
| --- | ---: |
| product main image URLs containing `/uploads/` | 0 |
| product images/detailImages JSON rows containing `/uploads/` | 1 |
| SKU image URLs containing `/uploads/` | 0 |
| QC media URLs containing `/uploads/` | 297 |
| brand logo URLs containing `/uploads/` | 574 |
| platform logo URLs containing `/uploads/` | 11 |

Read-only samples show these are absolute old API-domain URLs, not relative database paths.

Recommendation:

- Product catalogue migration can keep existing non-upload image URLs for v1.
- Because lolobuyspreadsheets.com should be fully independent, copy only the referenced uploads files for QC media, brand logos, platform logos, and the one product JSON row.
- Do not copy the whole old uploads directory blindly.

Use `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-manifest.sql` to produce the exact file manifest before packaging uploads.

Packaging result is recorded in `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-report.md`.

## Orphan Checks

| Check | Count |
| --- | ---: |
| orphan SKUs | 0 |
| orphan product secondary categories | 0 |
| orphan product attribute values | 0 |
| orphan product QC media | 0 |
| orphan image embeddings | 0 |
| orphan text embeddings | 0 |
| `product_brand_facts` rows with `candidateId` | 0 |

This means the approved product-domain export can be imported without carrying `brand_candidates` / `brand_candidate_items`, as long as the target schema allows `product_brand_facts.candidateId` to remain null.

## Settings

Production has 15 setting keys. Values were not exported or recorded.

Keys observed:

- `ai_api_endpoint`
- `ai_api_key`
- `ai_model`
- `exchange_rate_aud`
- `exchange_rate_cad`
- `exchange_rate_eur`
- `exchange_rate_gbp`
- `exchange_rate_last_sync`
- `exchange_rate_usd`
- `loongbuy_base_url`
- `loongbuy_invitecode`
- `search_engine`
- `tracking_enabled`
- `tracking_ga_id`
- `tracking_gtm_id`

Recommendation:

- Do not bulk-copy `settings`.
- Recreate safe runtime settings in the new project.
- Do not copy old AI key, analytics IDs, tracking flags, or old integration identifiers unless explicitly reviewed for the new domain.

## Export Decision

Approved for first export after user review:

- `colors`
- `attributes`
- `attribute_values`
- `brands`
- `brand_aliases`
- `brand_relations`
- `category`
- `category_closure`
- `platforms`
- `products`
- `skus`
- `product_secondary_categories`
- `product_attribute_values`
- `product_qc_media`
- `product_brand_facts`
- `product_image_embeddings`
- `product_text_embeddings`

Conditional:

- `settings`: recreate or selectively insert reviewed keys only.
- `weidian_cache`: skip for v1 unless raw source recovery is required.
- uploads files: copy only referenced files if the new site must stop depending on the old API media domain.

Still excluded:

- users
- favorites
- browsing history
- collections
- referrals
- sessions
- search/click/traffic logs
- points/checkins/withdrawals
- batch and SKU split jobs
- Meilisearch data
- Redis data
