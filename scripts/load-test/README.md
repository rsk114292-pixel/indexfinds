# Performance Baseline

This directory contains the first-stage API load-testing baseline for this project.

## Included Scripts

- `search.k6.js`
  Tests public search, facets, autocomplete, fuzzy search, pagination, and cache-hit behavior on `GET /products*`.
- `visual-search.k6.js`
  Tests `GET /visual-search/status`, `GET /visual-search/by-product/:id`, and image upload search when the embedding service is available.
- `mixed.k6.js`
  Simulates a more realistic user journey across homepage-style discovery, search, product detail, and similar products.
- `run.sh`
  Wrapper for running the three suites and exporting JSON summaries to `results/`.

## Quick Start

Check the API first:

```bash
curl -sf http://127.0.0.1:4000/health
```

Run the search baseline:

```bash
k6 run -e BASE_URL=http://127.0.0.1:4000 -e STAGE=baseline scripts/load-test/search.k6.js
```

Run the mixed load profile:

```bash
./scripts/load-test/run.sh mixed load
```

Run against a staging host:

```bash
BASE_URL=https://api.your-domain.example ./scripts/load-test/run.sh search stress
```

## Recommended Order

1. `search` baseline
2. `search` load
3. `mixed` load
4. `visual` baseline
5. `visual` load only after confirming the embedding service is healthy

## What To Check After Each Run

- `http_req_failed`
- `http_req_duration` p95 and p99
- product search vs cached search duration
- visual search duration and embedding availability
- API logs, database load, Redis behavior, and search metrics

## Current Limits

- These scripts do not authenticate for `GET /metrics`, so Prometheus correlation still needs an admin token workflow.
- Browser rendering is not covered here. Use Lighthouse CI and Playwright/Artillery for frontend performance.
- Final numbers should come from staging or production-like environments, not `nest start --watch`.
