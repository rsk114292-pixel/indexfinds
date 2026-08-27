#!/usr/bin/env bash
set -uo pipefail

container="${1:-indexfinds-web-batch1-local}"
domains=(
  acbuyindex.com
  allchinabuyfinder.com
  allchinabuyindex.com
  bbdbuyeufinds.com
  bbdbuyeus.com
  bbdbuyeusheet.com
  boonbuyfind.net
  boonbuyindex.com
  cnshopperindex.com
)

for domain in "${domains[@]}"; do
  html="$(docker exec "$container" wget -qO- \
    --header="Host: ${domain}.localhost" \
    http://127.0.0.1:3101/en)"

  title="$(printf '%s' "$html" | grep -m1 -oE '<title>[^<]*</title>' || true)"
  canonical="$(printf '%s' "$html" | grep -m1 -oE '<link rel="canonical" href="[^"]+"' || true)"
  robots="$(printf '%s' "$html" | grep -m1 -oE '<meta name="robots" content="[^"]+"' || true)"
  website_count="$({ printf '%s' "$html" | grep -o '"@type":"WebSite"' || true; } | wc -l | tr -d ' ')"
  organization_count="$({ printf '%s' "$html" | grep -o '"@type":"Organization"' || true; } | wc -l | tr -d ' ')"

  printf '%s\t%s\t%s\t%s\tWebSite=%s\tOrganization=%s\n' \
    "$domain" "$title" "$canonical" "$robots" "$website_count" "$organization_count"

  zh_html="$(docker exec "$container" wget -qO- \
    --header="Host: ${domain}.localhost" \
    http://127.0.0.1:3101/zh-CN 2>/dev/null || true)"
  products_html="$(docker exec "$container" wget -qO- \
    --header="Host: ${domain}.localhost" \
    http://127.0.0.1:3101/en/products 2>/dev/null || true)"
  sitemap="$(docker exec "$container" wget -qO- \
    --header="Host: ${domain}.localhost" \
    http://127.0.0.1:3101/sitemap.xml 2>/dev/null || true)"
  robots_txt="$(docker exec "$container" wget -qO- \
    --header="Host: ${domain}.localhost" \
    http://127.0.0.1:3101/robots.txt 2>/dev/null || true)"
  favicon_path="$(printf '%s' "$html" | grep -oE '<link rel="icon" href="[^"]+' | sed -n '1{s/.*href="//;p}' || true)"
  favicon_status="$(docker exec "$container" wget --spider -S \
    --header="Host: ${domain}.localhost" \
    "http://127.0.0.1:3101${favicon_path}" 2>&1 | awk '/HTTP\// { code=$2 } END { print code }' || true)"
  sitemap_count="$(printf '%s' "$sitemap" | grep -o '<loc>' | wc -l | tr -d ' ')"
  sitemap_wrong_host="$({ printf '%s' "$sitemap" | grep -o '<loc>[^<]*</loc>' | grep -v "https://${domain}/" || true; } | wc -l | tr -d ' ')"
  sitemap_chunk_url="$(printf '%s' "$sitemap" | grep -oE '<loc>[^<]+</loc>' | sed -n '1{s#</\?loc>##g;p}' || true)"
  sitemap_chunk_path="${sitemap_chunk_url#https://${domain}}"
  sitemap_chunk="$(docker exec "$container" wget -qO- \
    --header="Host: ${domain}.localhost" \
    "http://127.0.0.1:3101${sitemap_chunk_path}" 2>/dev/null || true)"
  sitemap_url_count="$(printf '%s' "$sitemap_chunk" | grep -o '<url>' | wc -l | tr -d ' ')"
  sitemap_chunk_wrong_host="$({ printf '%s' "$sitemap_chunk" | grep -o '<loc>[^<]*</loc>' | grep -v "https://${domain}/" || true; } | wc -l | tr -d ' ')"
  zh_headers="$(docker exec "$container" wget --spider -S \
    --header="Host: ${domain}.localhost" \
    http://127.0.0.1:3101/zh-CN 2>&1 || true)"
  zh_status="$(printf '%s' "$zh_headers" | awk '/HTTP\// { code=$2 } END { print code }')"
  zh_robots="$(printf '%s' "$zh_headers" | awk 'tolower($1)=="x-robots-tag:" {$1=""; sub(/^ /, ""); value=$0} END {print value}')"
  products_robots="$(printf '%s' "$products_html" | grep -m1 -oE '<meta name="robots" content="[^"]+"' || true)"
  robots_sitemap="$(printf '%s' "$robots_txt" | grep -o "Sitemap: https://${domain}/sitemap.xml" || true)"

  printf 'GATES\t%s\tzh=%s:%s\tproducts=%s\tsitemap_chunks=%s\turls=%s\twrong_host=%s/%s\tfavicon=%s:%s\trobots_sitemap=%s\n' \
    "$domain" "$zh_status" "$zh_robots" "$products_robots" "$sitemap_count" "$sitemap_url_count" "$sitemap_wrong_host" "$sitemap_chunk_wrong_host" \
    "$favicon_path" "$favicon_status" "$robots_sitemap"
done
