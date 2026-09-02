#!/bin/sh
set -eu

max_age_minutes="${INDEXFINDS_IMAGE_CACHE_MAX_AGE_MINUTES:-720}"
cache_path="/app/.next/cache/images"

case "$max_age_minutes" in
  ''|*[!0-9]*)
    echo "INDEXFINDS_IMAGE_CACHE_MAX_AGE_MINUTES must be a positive integer" >&2
    exit 2
    ;;
  0)
    echo "INDEXFINDS_IMAGE_CACHE_MAX_AGE_MINUTES must be greater than zero" >&2
    exit 2
    ;;
esac

containers="$(docker ps --filter name=indexfinds-web --format '{{.Names}}')"
if [ -z "$containers" ]; then
  echo "No running IndexFinds web containers found."
  exit 0
fi

for container in $containers; do
  case "$container" in
    indexfinds-web-*) ;;
    *) continue ;;
  esac

  if ! docker exec "$container" test -d "$cache_path"; then
    continue
  fi

  before_kb="$(docker exec "$container" du -sk "$cache_path" | cut -f1)"
  before_files="$(docker exec "$container" sh -c 'find "$1" -type f | wc -l' _ "$cache_path")"

  docker exec "$container" sh -c \
    'find "$1" -type f -mmin "+$2" -delete && find "$1" -mindepth 1 -type d -empty -delete' \
    _ "$cache_path" "$max_age_minutes"

  after_kb="$(docker exec "$container" du -sk "$cache_path" | cut -f1)"
  after_files="$(docker exec "$container" sh -c 'find "$1" -type f | wc -l' _ "$cache_path")"
  removed_files=$((before_files - after_files))

  printf '%s container=%s before_kb=%s after_kb=%s removed_files=%s max_age_minutes=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$container" \
    "$before_kb" \
    "$after_kb" \
    "$removed_files" \
    "$max_age_minutes"
done
