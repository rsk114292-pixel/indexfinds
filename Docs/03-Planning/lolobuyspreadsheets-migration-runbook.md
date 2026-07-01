# lolobuyspreadsheets.com Migration Runbook

> Status: discussion draft
> Source project: findsspreadsheet.com
> Target project: lolobuyspreadsheets.com
> Last updated: 2026-06-30

## Goal

Create a separate lolobuyspreadsheets.com project with copied code and selected product data from the existing findsspreadsheet.com stack, without affecting the old production project.

Source inventory:

- `Docs/03-Planning/lolobuyspreadsheets-source-inventory.md`
- `Docs/03-Planning/lolobuyspreadsheets-production-readonly-inventory.sql`
- `Docs/03-Planning/lolobuyspreadsheets-product-export-manifest.md`
- `Docs/03-Planning/lolobuyspreadsheets-production-inventory-report.md`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-manifest.sql`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-report.md`
- `Docs/03-Planning/lolobuyspreadsheets-product-domain-export-report.md`

The migration must be local-first:

1. Prepare the new local project.
2. Import selected data into the new local database.
3. Validate the new local project.
4. Deploy to the new VPS only after local validation passes.

## Assumptions

- The existing production project must remain online and untouched.
- The new project will reuse the current backend architecture unless a later decision changes it.
- The new frontend can be redesigned, but it should call the new API, not the old API.
- Product data should be copied, but old runtime state should not be blindly copied.
- Redis cache and Meilisearch indexes can be rebuilt from the new database.
- Old users, favorites, collections, browsing history, and referral data are excluded.
- Visual search is required for the first launch.
- Existing product image URLs should be kept for the first migration; image mirroring is a later project.

## Non-Negotiable Safety Rules

- Do not run migrations against the old production database.
- Do not run seed, reset, cleanup, or delete scripts against the old project.
- Do not restart old production services during migration preparation.
- Do not reuse old production `.env` files directly in the new project.
- Do not let the new project connect to the old database, Redis, Meilisearch, or uploads path.
- Do not reuse the same Docker Compose project name or external volume names.
- Treat old production as read-only. The only allowed old-side operation is a verified read-only export.
- Do not copy old production VPS/SSH host values, key paths, server paths, GitHub Actions secrets, or Caddy/server details into the new project.

## Recommended Strategy

Use a selective product-domain migration.

This is safer than a full database clone because it avoids copying old users, sessions, OAuth state, analytics noise, referral history, cached state, and old domain settings.

### Migrate

- products
- skus
- categories
- brands
- colors and attributes, if used by product filters
- product secondary category relationships
- product QC media
- product/source fields such as `weidianItemId`, `weidianShopId`, `sourceUrl`
- product image fields such as `mainImage`, `images`, `detailImages`
- product image embeddings needed by visual search, if the old production data is healthy enough to copy

### Rebuild

- Meilisearch product index
- Redis cache
- search/facet cache
- recommendation cache
- visual-search service runtime and health checks

### Required For First Launch

- product text embeddings
- product image embeddings
- visual search data

Visual search is part of the first launch scope. It needs a separate validation gate because it depends on pgvector tables, image embeddings, and the embedding service runtime.

### Optional Later

- browsing/click-derived popularity data
- image mirroring to new storage

Popularity data and image mirroring should not block the first safe local clone.

### Do Not Migrate By Default

- users
- refresh tokens
- login logs
- OAuth accounts
- browsing history
- user favorites and collections
- search logs
- click logs
- visit sessions
- referral attribution history
- traffic abuse/block records
- old admin settings tied to old domains

This exclusion is intentional for lolobuyspreadsheets.com v1.

## Execution Plan

### Phase 0: Inventory

Goal: confirm exactly what the new project needs before exporting data.

Checks:

- Confirm target local path: `/Volumes/1T/lolobuyspreadsheets.com`
- Confirm target domain: `lolobuyspreadsheets.com`
- Confirm whether the new project keeps the current API or replaces it.
- Confirm old users, favorites, collections, browsing history, and referral data remain excluded.
- Confirm visual search launch requirements and current embedding table health.
- Confirm product images can keep existing URLs for launch.

Success criteria:

- Migration scope is explicit.
- No command has touched old production state.

### Phase 1: Copy Code Locally

Goal: create an isolated local codebase for lolobuyspreadsheets.com.

Recommended approach:

- Copy repository files into `/Volumes/1T/lolobuyspreadsheets.com`.
- Remove old generated artifacts if any are copied accidentally.
- Create new local environment files from examples, not from production secrets.
- Set a new local database name, Redis namespace, Meilisearch key, ports, and site URL.
- Replace old deployment/server memory documents with sanitized placeholders for the new project.
- Remove old `.env`, `.env.local`, `.env.production`, SSH, Caddy, and GitHub Actions production references unless they are converted to new-project placeholders.

Target local settings should be clearly different from the old project:

- `SITE_URL=http://localhost:<new-web-port>` for local
- `PUBLIC_SITE_URL=http://localhost:<new-web-port>` for local frontend
- `DB_NAME=lolobuyspreadsheets_dev`
- `COMPOSE_PROJECT_NAME=lolobuyspreadsheets`
- separate Postgres, Redis, Meilisearch, and uploads locations

Success criteria:

- New local project starts without connecting to the old local or production services.
- Health endpoints respond.
- Empty product list works before importing data.

### Phase 2: Prepare New Local Database

Goal: create the schema in the new local database.

Recommended approach:

- Start only new local infrastructure.
- Run migrations against the new local database.
- Verify table count and migration state.

Success criteria:

- New database has the expected schema.
- Old database table counts and service health are unchanged.

### Phase 3: Export Product-Domain Data From Old Project

Goal: export only approved product-domain data.

Allowed source action:

- Read-only export from old production or a verified production backup.

Preferred export shape:

- schema-compatible SQL or data-only dump for selected tables
- separate manifest listing exported tables and row counts
- checksum or row-count report

Success criteria:

- Export artifact exists.
- Export table list matches the approved scope.
- Old production health checks still pass.

### Phase 4: Import Into New Local Project

Goal: import selected data into the new local database only.

Checks before import:

- `DB_HOST`, `DB_NAME`, and `COMPOSE_PROJECT_NAME` point to the new local project.
- Old production credentials are not loaded.
- Import command is run from the new project context.

Success criteria:

- Product count matches the export manifest.
- SKU count matches the export manifest.
- Category and brand counts are reasonable.
- Random product detail queries return image, price, SKU, and source URL data.

### Phase 5: Rebuild Derived Services

Goal: make search, filters, and visual search work from the imported database.

Recommended order:

1. Rebuild Meilisearch product index.
2. Clear or ignore Redis cache.
3. Validate product search.
4. Validate facets/category filters.
5. Validate pgvector extension and visual-search embedding tables.
6. Start and validate the embedding service.
7. Run visual-search status checks.
8. Run a small image-search smoke test against migrated products.

Success criteria:

- `/products/search` returns migrated products.
- Facets do not fail on empty or partial derived data.
- Product detail pages load without depending on old services.
- Visual search status is healthy.
- Visual search returns relevant migrated products for a small sample.

### Phase 6: Local Frontend Validation

Goal: prove the new frontend can operate against the new local API.

Checks:

- Homepage loads.
- Product list loads.
- Product detail loads.
- Search works.
- Visual search works.
- Category filter works.
- Buy Now/source link works.
- Browser network panel shows no calls to the old domain or old API.

Success criteria:

- Random sample of at least 20 migrated products is visually checked.
- No request points to findsspreadsheet.com or the old production API.

### Phase 7: New VPS Deployment

Goal: deploy only after local validation passes.

New VPS must have:

- new project directory
- new `.env.production`
- new database password
- new Redis password
- new Meilisearch master key
- new Docker Compose project name
- new external volume names
- new Caddy or reverse proxy config
- new domain DNS pointing only to the new VPS

Success criteria:

- `lolobuyspreadsheets.com` resolves to the new VPS.
- New API health endpoint passes.
- Product list/detail/search pass on production.
- Visual search status and a small image-search smoke test pass on production.
- Old site remains healthy.

## Expert Recommendation

Do not deploy first.

The safer order is:

1. Copy code to the new local project.
2. Bring up an empty isolated local stack.
3. Import product-domain data locally.
4. Import or regenerate visual-search embedding data locally.
5. Rebuild search locally.
6. Validate visual search locally.
7. Validate local frontend/API behavior.
8. Only then provision the new VPS and deploy.

This avoids the highest-risk failure mode: a new project accidentally connecting to or mutating the old production database.

## Decision Points Before Work Starts

Answer these before running migration commands:

1. Should old users, favorites, collections, and referral records be excluded? Decision: yes, exclude.
2. Should visual search launch on day one? Decision: yes, launch with visual search.
3. Should product images remain as existing external URLs, or should they be mirrored later? Decision: keep existing URLs first.
4. Should the new project be a full fork of the old backend or a thinner API for the new frontend? Recommended: full fork first, simplify later.

## First Safe Checklist

- [ ] Confirm old project remains read-only.
- [ ] Confirm target local folder is `/Volumes/1T/lolobuyspreadsheets.com`.
- [ ] Confirm target domain is `lolobuyspreadsheets.com`.
- [ ] Confirm excluded old data: users, favorites, collections, browsing history, referral data.
- [ ] Confirm first-launch visual search requirements.
- [ ] Confirm existing product image URLs remain unchanged for launch.
- [ ] Copy `lolobuyspreadsheets-source-inventory.md` into the new project docs.
- [ ] Sanitize old VPS/SSH/deploy references before using the new project.
- [ ] Create new local project copy.
- [ ] Create isolated local env files.
- [ ] Start isolated local infra.
- [ ] Run migrations on new local database only.
- [ ] Export approved product-domain data.
- [ ] Import into new local database only.
- [ ] Rebuild Meilisearch from new local database.
- [ ] Import or regenerate visual-search embeddings.
- [ ] Validate product list/detail/search locally.
- [ ] Validate visual search locally.
- [ ] Deploy to new VPS after local validation.
