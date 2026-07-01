# API Scripts

This directory contains operational entrypoints only.

- `backfill/`: one-off data backfills and large data generation jobs
- `diagnostics/`: audits, verification, and test helpers
  - `diagnostics/brands/`: brand taxonomy and assignment checks
  - `diagnostics/db/`: database/schema/account readiness checks
  - `diagnostics/debug/`: focused debug and one-off investigation entrypoints
  - `diagnostics/network/`: network and third-party connectivity probes
  - `diagnostics/products/`: product/import/shop data checks
  - `diagnostics/phase2/`: legacy phase-2 verification shell scripts
- `migrations/`: schema/data migration entrypoints
- `ops/`: operational data maintenance commands
- `seed/`: seed/reset commands
- `lib/`: shared script runner utilities

Application logic should stay in `src`. These entrypoints should remain thin wrappers.
