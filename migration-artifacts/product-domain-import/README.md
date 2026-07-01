# lolobuyspreadsheets.com Product Domain Local Import

> Status: local import validated, ready to reuse for new VPS empty-db import.
> Scope: product-domain data only.

## Safety Boundary

- Only import into the new lolobuyspreadsheets.com local database.
- Do not connect to the old production database from this new project window.
- Do not import users, favorites, browsing history, referrals, sessions, search/click/traffic logs, points, jobs, Redis, or Meilisearch data.
- Do not bulk-copy `settings`; safe runtime keys must be rebuilt later.
- Do not rewrite normal external product image URLs.
- Do rewrite only old `api.findsindex.com/uploads/...` URLs after referenced uploads files are extracted.

## Baseline Readiness

The local baseline schema now includes the product-domain import surface:

- `colors`, `attributes`, `attribute_values`
- `category`, `category_closure`
- `brands`, `brand_aliases`, `brand_relations`
- `brand_candidates`, `brand_candidate_items` as empty schema support tables
- `platforms`
- `products`, `skus`
- `product_secondary_categories`
- `product_attribute_values`
- `product_qc_media`
- `product_brand_facts`
- `product_image_embeddings`, `product_text_embeddings`

`brand_candidates` and `brand_candidate_items` are intentionally not exported/imported for v1. They exist so `product_brand_facts.candidateId` has a valid nullable FK target. Production inventory showed non-null `candidateId` count is 0.

## Expected Counts

| Table | Expected rows |
| --- | ---: |
| `products` | 331776 |
| `skus` | 1672709 |
| `category` | 203 |
| `category_closure` | 551 |
| `product_secondary_categories` | 653 |
| `product_qc_media` | 297 |
| `brands` | 3259 |
| `brand_aliases` | 22 |
| `brand_relations` | 10 |
| `product_brand_facts` | 155992 |
| `colors` | 19 |
| `attributes` | 5 |
| `attribute_values` | 45 |
| `product_attribute_values` | 3341521 |
| `platforms` | 11 |
| `product_image_embeddings` | 331776 |
| `product_text_embeddings` | 331776 |

## Dump File

Put the old project read-only export in:

```bash
/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/product-domain-import/dumps
```

Recommended file:

```text
lolobuy-product-domain-data.sql
```

Logical dependency order:

```text
colors
attributes
attribute_values
category
category_closure
brands
brand_aliases
brand_relations
platforms
products
skus
product_secondary_categories
product_attribute_values
product_qc_media
product_brand_facts
product_image_embeddings
product_text_embeddings
```

Use a single `pg_dump` command for the actual export so all tables come from one consistent snapshot. Per-table dump files are easier to retry but can drift if production data changes between commands.

## Old Project Read-Only Export Commands

Run these only in the old project window, using a read-only production connection source. Do not paste the secret connection string into this repository.

```bash
EXPORT_DIR=/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/product-domain-import/dumps
mkdir -p "$EXPORT_DIR"

pg_dump "$OLD_READONLY_DATABASE_URL" \
  --data-only \
  --no-owner \
  --no-acl \
  --format=plain \
  --serializable-deferrable \
  --table=public.colors \
  --table=public.attributes \
  --table=public.attribute_values \
  --table=public.category \
  --table=public.category_closure \
  --table=public.brands \
  --table=public.brand_aliases \
  --table=public.brand_relations \
  --table=public.platforms \
  --table=public.products \
  --table=public.skus \
  --table=public.product_secondary_categories \
  --table=public.product_attribute_values \
  --table=public.product_qc_media \
  --table=public.product_brand_facts \
  --table=public.product_image_embeddings \
  --table=public.product_text_embeddings \
  --file="$EXPORT_DIR/lolobuy-product-domain-data.sql"
```

Do not export `settings`, `weidian_cache`, `brand_candidates`, `brand_candidate_items`, user tables, referral tables, tracking tables, search event tables, points tables, or job tables.

## New Project Local Import Commands

Run these only after the dump files exist and the new local DB has been initialized from the baseline.

```bash
cd /Volumes/1T/lolobuyspreadsheets.com/apps/api
pnpm migration:show
```

Then import the single consistent dump:

```bash
cd /Volumes/1T/lolobuyspreadsheets.com

psql "$NEW_LOCAL_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql
```

Use the new project's local database URL only. Do not use the old production URL in this window.

## Uploads Import

Extract the referenced uploads tar into the new API uploads root:

```bash
cd /Volumes/1T/lolobuyspreadsheets.com
mkdir -p apps/api/uploads
tar -xf migration-artifacts/uploads-referenced/referenced-uploads.tar -C apps/api/uploads
```

The package has 885 referenced paths, 881 packaged files, and 4 missing brand logos:

- `brand-bape-1770984035665.png`
- `brand-burberry-1770984029293.png`
- `brand-gallery dept.-1770872618255.png`
- `brand-supreme-1770984060724.png`

Handle the four missing logos before launch by replacing, clearing, or recovering them.

## URL Rewrite

After data import and uploads extraction, rewrite only old API uploads URLs:

```bash
psql "$NEW_LOCAL_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v new_upload_base='http://localhost:4101/uploads/' \
  -f migration-artifacts/product-domain-import/sql/10-rewrite-upload-urls.sql
```

For new VPS/prod, pass the new production uploads base instead, for example the new API media URL. Do not rewrite non-upload product image URLs.

## Post-Import Safety Cleanup

After URL rewrite, clear old platform invite/ref codes and normalize any accidental stale local upload base:

```bash
psql "$NEW_LOCAL_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v new_upload_base='http://localhost:4101/uploads/' \
  -f migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql
```

For new VPS/prod, pass the new production uploads base, for example:

```bash
psql "$NEW_PRODUCTION_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v new_upload_base='https://api.lolobuyspreadsheets.com/uploads/' \
  -f migration-artifacts/product-domain-import/sql/30-post-import-safety-cleanup.sql
```

This cleanup intentionally:

- clears `platforms.inviteCode`
- replaces known hard-coded old platform invite/ref params with `{inviteCode}`
- keeps `settings.loongbuy_invitecode` empty if the key exists
- keeps `settings.tracking_enabled=false` if the key exists
- fixes accidental `http://localhost:4100/uploads/` URL residues

It does not bulk-copy or create old `settings` data.

## Post-Import Validation

```bash
psql "$NEW_LOCAL_DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -f migration-artifacts/product-domain-import/sql/20-post-import-validation.sql
```

Validation must show:

- expected row counts match
- excluded data remains absent or empty
- settings count remains 0 before selective safe rebuild
- orphan checks are 0
- image embeddings are `vector(512)`, text embeddings are `vector(384)`
- old `api.findsindex.com/uploads/` URL residues are 0 after rewrite
