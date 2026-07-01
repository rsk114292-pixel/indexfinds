\set old_upload_host 'api.findsindex.com/uploads/'

WITH actual_counts AS (
  SELECT 'products' AS table_name, count(*)::bigint AS actual_rows FROM products
  UNION ALL SELECT 'skus', count(*)::bigint FROM skus
  UNION ALL SELECT 'category', count(*)::bigint FROM category
  UNION ALL SELECT 'category_closure', count(*)::bigint FROM category_closure
  UNION ALL SELECT 'product_secondary_categories', count(*)::bigint FROM product_secondary_categories
  UNION ALL SELECT 'product_qc_media', count(*)::bigint FROM product_qc_media
  UNION ALL SELECT 'brands', count(*)::bigint FROM brands
  UNION ALL SELECT 'brand_aliases', count(*)::bigint FROM brand_aliases
  UNION ALL SELECT 'brand_relations', count(*)::bigint FROM brand_relations
  UNION ALL SELECT 'product_brand_facts', count(*)::bigint FROM product_brand_facts
  UNION ALL SELECT 'colors', count(*)::bigint FROM colors
  UNION ALL SELECT 'attributes', count(*)::bigint FROM attributes
  UNION ALL SELECT 'attribute_values', count(*)::bigint FROM attribute_values
  UNION ALL SELECT 'product_attribute_values', count(*)::bigint FROM product_attribute_values
  UNION ALL SELECT 'platforms', count(*)::bigint FROM platforms
  UNION ALL SELECT 'product_image_embeddings', count(*)::bigint FROM product_image_embeddings
  UNION ALL SELECT 'product_text_embeddings', count(*)::bigint FROM product_text_embeddings
  UNION ALL SELECT 'brand_candidates', count(*)::bigint FROM brand_candidates
  UNION ALL SELECT 'brand_candidate_items', count(*)::bigint FROM brand_candidate_items
),
expected_counts(table_name, expected_rows) AS (
  VALUES
    ('products', 331776::bigint),
    ('skus', 1672709::bigint),
    ('category', 203::bigint),
    ('category_closure', 551::bigint),
    ('product_secondary_categories', 653::bigint),
    ('product_qc_media', 297::bigint),
    ('brands', 3259::bigint),
    ('brand_aliases', 22::bigint),
    ('brand_relations', 10::bigint),
    ('product_brand_facts', 155992::bigint),
    ('colors', 19::bigint),
    ('attributes', 5::bigint),
    ('attribute_values', 45::bigint),
    ('product_attribute_values', 3341521::bigint),
    ('platforms', 11::bigint),
    ('product_image_embeddings', 331776::bigint),
    ('product_text_embeddings', 331776::bigint),
    ('brand_candidates', 0::bigint),
    ('brand_candidate_items', 0::bigint)
)
SELECT
  e.table_name,
  e.expected_rows,
  a.actual_rows,
  (a.actual_rows = e.expected_rows) AS pass
FROM expected_counts e
JOIN actual_counts a ON a.table_name = e.table_name
ORDER BY e.table_name;

SELECT 'orphan_skus' AS check_name, count(*) AS count
FROM skus s
LEFT JOIN products p ON p.id = s."productId"
WHERE p.id IS NULL
UNION ALL
SELECT 'orphan_product_secondary_categories_products', count(*)
FROM product_secondary_categories psc
LEFT JOIN products p ON p.id = psc."productId"
WHERE p.id IS NULL
UNION ALL
SELECT 'orphan_product_secondary_categories_categories', count(*)
FROM product_secondary_categories psc
LEFT JOIN category c ON c.id = psc."categoryId"
WHERE c.id IS NULL
UNION ALL
SELECT 'orphan_product_attribute_values_products', count(*)
FROM product_attribute_values pav
LEFT JOIN products p ON p.id = pav.product_id
WHERE p.id IS NULL
UNION ALL
SELECT 'orphan_product_attribute_values_attribute_values', count(*)
FROM product_attribute_values pav
LEFT JOIN attribute_values av ON av.id = pav.attribute_value_id
WHERE av.id IS NULL
UNION ALL
SELECT 'orphan_product_qc_media', count(*)
FROM product_qc_media pqm
LEFT JOIN products p ON p.id = pqm.product_id
WHERE p.id IS NULL
UNION ALL
SELECT 'orphan_product_brand_facts_products', count(*)
FROM product_brand_facts pbf
LEFT JOIN products p ON p.id = pbf."productId"
WHERE p.id IS NULL
UNION ALL
SELECT 'orphan_product_brand_facts_brands', count(*)
FROM product_brand_facts pbf
LEFT JOIN brands b ON b.id = pbf."matchedBrandId"
WHERE pbf."matchedBrandId" IS NOT NULL AND b.id IS NULL
UNION ALL
SELECT 'non_null_product_brand_facts_candidate_id', count(*)
FROM product_brand_facts
WHERE "candidateId" IS NOT NULL
UNION ALL
SELECT 'orphan_image_embeddings', count(*)
FROM product_image_embeddings pie
LEFT JOIN products p ON p.id = pie.product_id
WHERE p.id IS NULL
UNION ALL
SELECT 'orphan_text_embeddings', count(*)
FROM product_text_embeddings pte
LEFT JOIN products p ON p.id = pte.product_id
WHERE p.id IS NULL;

SELECT
  c.relname AS table_name,
  a.attname AS column_name,
  format_type(a.atttypid, a.atttypmod) AS type
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('product_image_embeddings', 'product_text_embeddings', 'products')
  AND a.attname = 'embedding'
  AND NOT a.attisdropped
ORDER BY c.relname;

SELECT
  'product_image_embeddings' AS table_name,
  count(*) AS rows,
  count(embedding) AS non_null_embeddings,
  count(*) FILTER (WHERE embedding IS NULL) AS null_embeddings,
  count(DISTINCT product_id) AS distinct_products
FROM product_image_embeddings
UNION ALL
SELECT
  'product_text_embeddings',
  count(*),
  count(embedding),
  count(*) FILTER (WHERE embedding IS NULL),
  count(DISTINCT product_id)
FROM product_text_embeddings;

SELECT 'old_upload_residue_products_mainImage' AS check_name, count(*) AS count
FROM products
WHERE "mainImage" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_products_images', count(*)
FROM products
WHERE "images" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_products_detailImages', count(*)
FROM products
WHERE "detailImages" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_skus_image', count(*)
FROM skus
WHERE "image" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_product_qc_media_url', count(*)
FROM product_qc_media
WHERE "url" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_product_qc_media_poster', count(*)
FROM product_qc_media
WHERE "poster_url" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_brands_logoUrl', count(*)
FROM brands
WHERE "logoUrl" LIKE '%' || :'old_upload_host' || '%'
UNION ALL
SELECT 'old_upload_residue_platforms_logoUrl', count(*)
FROM platforms
WHERE "logoUrl" LIKE '%' || :'old_upload_host' || '%';

SELECT
  'settings_key_audit' AS check_group,
  key,
  "isSecret",
  CASE WHEN key = 'search_engine' THEN value ELSE NULL END AS visible_value
FROM settings
ORDER BY key;

WITH runtime_empty_counts(table_name, actual_rows) AS (
  SELECT 'users', count(*)::bigint FROM users
  UNION ALL SELECT 'refresh_tokens', count(*)::bigint FROM refresh_tokens
  UNION ALL SELECT 'login_logs', count(*)::bigint FROM login_logs
  UNION ALL SELECT 'user_oauth_accounts', count(*)::bigint FROM user_oauth_accounts
  UNION ALL SELECT 'user_favorites', count(*)::bigint FROM user_favorites
  UNION ALL SELECT 'user_collections', count(*)::bigint FROM user_collections
  UNION ALL SELECT 'collection_items', count(*)::bigint FROM collection_items
  UNION ALL SELECT 'user_browsing_history', count(*)::bigint FROM user_browsing_history
  UNION ALL SELECT 'user_search_history', count(*)::bigint FROM user_search_history
  UNION ALL SELECT 'referral_codes', count(*)::bigint FROM referral_codes
  UNION ALL SELECT 'referral_clicks', count(*)::bigint FROM referral_clicks
  UNION ALL SELECT 'referral_attributions', count(*)::bigint FROM referral_attributions
  UNION ALL SELECT 'referral_experiment_events', count(*)::bigint FROM referral_experiment_events
  UNION ALL SELECT 'traffic_blocks', count(*)::bigint FROM traffic_blocks
  UNION ALL SELECT 'hot_search_experiments', count(*)::bigint FROM hot_search_experiments
  UNION ALL SELECT 'hot_search_experiment_events', count(*)::bigint FROM hot_search_experiment_events
  UNION ALL SELECT 'weidian_cache', count(*)::bigint FROM weidian_cache
  UNION ALL SELECT 'point_accounts', count(*)::bigint FROM point_accounts
  UNION ALL SELECT 'point_transactions', count(*)::bigint FROM point_transactions
  UNION ALL SELECT 'point_withdrawals', count(*)::bigint FROM point_withdrawals
  UNION ALL SELECT 'user_checkins', count(*)::bigint FROM user_checkins
  UNION ALL SELECT 'batch_jobs', count(*)::bigint FROM batch_jobs
  UNION ALL SELECT 'batch_job_items', count(*)::bigint FROM batch_job_items
  UNION ALL SELECT 'sku_split_jobs', count(*)::bigint FROM sku_split_jobs
  UNION ALL SELECT 'sku_split_items', count(*)::bigint FROM sku_split_items
  UNION ALL SELECT 'sku_split_batches', count(*)::bigint FROM sku_split_batches
  UNION ALL SELECT 'sku_split_batch_items', count(*)::bigint FROM sku_split_batch_items
)
SELECT
  table_name,
  0::bigint AS expected_rows_after_import,
  actual_rows,
  (actual_rows = 0) AS pass
FROM runtime_empty_counts
ORDER BY table_name;

WITH runtime_telemetry_counts(table_name, current_rows) AS (
  SELECT 'visit_sessions', count(*)::bigint FROM visit_sessions
  UNION ALL SELECT 'search_logs', count(*)::bigint FROM search_logs
  UNION ALL SELECT 'search_clicks', count(*)::bigint FROM search_clicks
  UNION ALL SELECT 'search_impressions', count(*)::bigint FROM search_impressions
  UNION ALL SELECT 'outbound_clicks', count(*)::bigint FROM outbound_clicks
  UNION ALL SELECT 'click_events', count(*)::bigint FROM click_events
  UNION ALL SELECT 'product_interaction_events', count(*)::bigint FROM product_interaction_events
)
SELECT
  table_name,
  current_rows,
  'local runtime only; verify separately if this is run after smoke tests' AS note
FROM runtime_telemetry_counts
ORDER BY table_name;

SELECT
  name AS runtime_table,
  to_regclass('public.' || name) AS present_regclass
FROM (
  VALUES
    ('users'),
    ('refresh_tokens'),
    ('login_logs'),
    ('user_oauth_accounts'),
    ('user_favorites'),
    ('user_collections'),
    ('collection_items'),
    ('user_browsing_history'),
    ('user_search_history'),
    ('referral_codes'),
    ('referral_clicks'),
    ('referral_attributions'),
    ('referral_experiment_events'),
    ('visit_sessions'),
    ('traffic_blocks'),
    ('click_events'),
    ('search_logs'),
    ('search_clicks'),
    ('search_impressions'),
    ('outbound_clicks'),
    ('product_interaction_events'),
    ('point_accounts'),
    ('point_transactions'),
    ('point_withdrawals'),
    ('user_checkins'),
    ('batch_jobs'),
    ('batch_job_items'),
    ('sku_split_jobs'),
    ('sku_split_items'),
    ('sku_split_batches'),
    ('sku_split_batch_items')
) AS excluded(name)
ORDER BY name;
