# lolobuyspreadsheets.com Referenced Uploads Asset Report

> Status: completed referenced uploads package
> Source project: findsspreadsheet.com
> Target project: lolobuyspreadsheets.com
> Date: 2026-06-30

## Scope

The target site should be fully independent, so uploads referenced by migrated catalogue data were packaged separately.

This did not copy the full old uploads directory. Only files referenced by the production database were included.

No old production database writes, file deletes, service restarts, deploys, migrations, or cleanup commands were run.

## Artifacts

Old project:

- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-manifest.sql`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-asset-manifest.csv`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-file-list.txt`
- `Docs/03-Planning/lolobuyspreadsheets-uploads-missing.log`

New project:

- `/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/uploads-referenced/referenced-uploads.tar`
- `/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/uploads-referenced/lolobuyspreadsheets-uploads-asset-manifest.csv`
- `/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/uploads-referenced/lolobuyspreadsheets-uploads-file-list.txt`
- `/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/uploads-referenced/lolobuyspreadsheets-uploads-missing.log`
- `/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/uploads-referenced/lolobuyspreadsheets-uploads-asset-manifest.sql`

## Counts

| Metric | Count |
| --- | ---: |
| referenced upload paths | 885 |
| packaged files | 881 |
| missing files | 4 |
| tar size | 146 MB |

Source distribution:

| Source | References |
| --- | ---: |
| `brand_logo` | 574 |
| `platform_logo` | 11 |
| `product_images_json` | 3 |
| `qc_url` | 297 |

## Missing Files

These four referenced brand logo files were not present in the old production uploads directory:

- `brand-bape-1770984035665.png`
- `brand-burberry-1770984029293.png`
- `brand-gallery dept.-1770872618255.png`
- `brand-supreme-1770984060724.png`

The new project should handle these by one of:

- replacing those brand logo URLs with new uploaded files
- clearing those logo URLs before launch
- recovering those files from another backup if available

## New Project Next Step

In the new project, extract `referenced-uploads.tar` into the new API uploads directory or deployment uploads volume after the local import path is finalized.

Then rewrite migrated DB URLs that currently point to the old API uploads host so they point to the new domain/API media path.

Do not rewrite non-upload product image URLs; those should remain as existing external product image URLs for v1.
