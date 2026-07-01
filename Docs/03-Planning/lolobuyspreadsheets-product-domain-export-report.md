# lolobuyspreadsheets.com Product Domain Export Report

> Status: completed old production read-only export
> Source project: findsspreadsheet.com
> Target project: lolobuyspreadsheets.com
> Export date: 2026-06-30

## Scope

This export created a single data-only SQL dump for the approved product-domain tables.

No old production database writes, migrations, seeds, resets, cleanup commands, deletes, service restarts, Redis exports, Meilisearch exports, user-data exports, or deploys were performed.

## Output

Dump file:

```text
/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql
```

File details:

| Metric | Value |
| --- | --- |
| size | `5.2G` |
| lines | `6,170,787` |
| COPY sections | `17` |
| SHA-256 | `0a101e647abab0f860d6ba5b90e6e43fc499e30fff684b159933c4c962b89c51` |

## Exported Tables

The dump contains COPY sections for:

1. `attributes`
2. `colors`
3. `attribute_values`
4. `brands`
5. `brand_aliases`
6. `brand_relations`
7. `category`
8. `category_closure`
9. `platforms`
10. `products`
11. `product_attribute_values`
12. `product_brand_facts`
13. `product_image_embeddings`
14. `product_qc_media`
15. `product_secondary_categories`
16. `product_text_embeddings`
17. `skus`

## Excluded Tables Check

The dump did not include COPY sections for excluded tables such as:

- `settings`
- `weidian_cache`
- `brand_candidates`
- `brand_candidate_items`
- users, favorites, browsing, collections
- referrals, sessions, traffic, click/search logs
- points, checkins, withdrawals
- batch jobs and SKU split jobs

## pg_dump Warnings

`pg_dump` emitted circular foreign-key warnings for:

- `brands`
- `category`

This does not mean the export failed. The dump completed successfully and ends with PostgreSQL's standard dump-complete marker.

New project import may need an adjusted restore strategy if plain `psql -f` fails on self-referential/circular foreign keys, for example temporarily disabling triggers in the new local database or using a staged import plan. This should be handled only in the new project local database, not on old production.

## New Project Next Step

Return to the new project window and run the prepared local import flow from:

```text
/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/product-domain-import/README.md
```

Recommended order:

1. Import `lolobuy-product-domain-data.sql` into the new local database only.
2. Extract referenced uploads.
3. Rewrite only old API uploads URLs.
4. Run `20-post-import-validation.sql`.
5. Rebuild Meilisearch.
6. Start API, frontend, and embedding service for search and visual-search smoke tests.
