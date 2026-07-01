#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

echo "[visual-search] API specs"
npm --prefix "$repo_root/apps/api" run test:visual-search

echo "[visual-search] API typecheck"
npm --prefix "$repo_root/apps/api" run typecheck

echo "[visual-search] Web spec"
npm --prefix "$repo_root/apps/web" run test:visual-search

echo "[visual-search] regression passed"
