\set ON_ERROR_STOP on
\pset pager off

-- lolobuyspreadsheets.com source production read-only inventory
-- Source: findsspreadsheet.com production PostgreSQL
-- Safety: this script uses a read-only transaction and only SELECT statements.

SET default_transaction_read_only = on;
BEGIN TRANSACTION READ ONLY;

SELECT
  now() AS inspected_at,
  current_database() AS database_name,
  current_user AS database_user,
  inet_server_addr() AS server_addr,
  inet_server_port() AS server_port;

SELECT
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('vector', 'pg_trgm', 'uuid-ossp')
ORDER BY extname;

SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'products',
    'skus',
    'category',
    'category_closure',
    'product_secondary_categories',
    'product_qc_media',
    'brands',
    'brand_aliases',
    'brand_relations',
    'product_brand_facts',
    'brand_candidates',
    'brand_candidate_items',
    'colors',
    'attributes',
    'attribute_values',
    'product_attribute_values',
    'platforms',
    'settings',
    'product_image_embeddings',
    'product_text_embeddings',
    'weidian_cache'
  )
ORDER BY table_name;

SELECT 'products' AS table_name, COUNT(*) AS row_count FROM products
UNION ALL SELECT 'skus', COUNT(*) FROM skus
UNION ALL SELECT 'category', COUNT(*) FROM category
UNION ALL SELECT 'category_closure', COUNT(*) FROM category_closure
UNION ALL SELECT 'product_secondary_categories', COUNT(*) FROM product_secondary_categories
UNION ALL SELECT 'product_qc_media', COUNT(*) FROM product_qc_media
UNION ALL SELECT 'brands', COUNT(*) FROM brands
UNION ALL SELECT 'brand_aliases', COUNT(*) FROM brand_aliases
UNION ALL SELECT 'brand_relations', COUNT(*) FROM brand_relations
UNION ALL SELECT 'product_brand_facts', COUNT(*) FROM product_brand_facts
UNION ALL SELECT 'brand_candidates', COUNT(*) FROM brand_candidates
UNION ALL SELECT 'brand_candidate_items', COUNT(*) FROM brand_candidate_items
UNION ALL SELECT 'colors', COUNT(*) FROM colors
UNION ALL SELECT 'attributes', COUNT(*) FROM attributes
UNION ALL SELECT 'attribute_values', COUNT(*) FROM attribute_values
UNION ALL SELECT 'product_attribute_values', COUNT(*) FROM product_attribute_values
UNION ALL SELECT 'platforms', COUNT(*) FROM platforms
UNION ALL SELECT 'settings', COUNT(*) FROM settings
UNION ALL SELECT 'product_image_embeddings', COUNT(*) FROM product_image_embeddings
UNION ALL SELECT 'product_text_embeddings', COUNT(*) FROM product_text_embeddings
UNION ALL SELECT 'weidian_cache', COUNT(*) FROM weidian_cache
ORDER BY table_name;

SELECT
  status,
  COUNT(*) AS products
FROM products
GROUP BY status
ORDER BY status;

SELECT
  status,
  COUNT(*) AS skus
FROM skus
GROUP BY status
ORDER BY status;

SELECT
  COUNT(*) AS total_products,
  COUNT(*) FILTER (WHERE status = 'active') AS active_products,
  COUNT(*) FILTER (WHERE "mainImage" IS NOT NULL AND "mainImage" <> '') AS products_with_main_image,
  COUNT(*) FILTER (WHERE images IS NOT NULL) AS products_with_images_json,
  COUNT(*) FILTER (WHERE "detailImages" IS NOT NULL) AS products_with_detail_images_json,
  COUNT(*) FILTER (WHERE "sourceUrl" IS NOT NULL AND "sourceUrl" <> '') AS products_with_source_url,
  COUNT(*) FILTER (WHERE "weidianItemId" IS NOT NULL AND "weidianItemId" <> '') AS products_with_weidian_item_id
FROM products;

SELECT
  COUNT(*) AS total_skus,
  COUNT(*) FILTER (WHERE image IS NOT NULL AND image <> '') AS skus_with_image,
  COUNT(DISTINCT "productId") AS products_with_skus
FROM skus;

SELECT
  COUNT(*) AS image_embedding_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS image_embeddings_non_null,
  COUNT(*) FILTER (WHERE embedding IS NULL) AS image_embeddings_null,
  COUNT(DISTINCT product_id) AS products_with_image_embedding_rows,
  COUNT(DISTINCT product_id) FILTER (WHERE embedding IS NOT NULL) AS products_with_non_null_image_embeddings,
  COUNT(*) FILTER (WHERE embedding_failure_code IS NOT NULL) AS image_embedding_failure_rows
FROM product_image_embeddings;

SELECT
  embedding_failure_code,
  COUNT(*) AS rows
FROM product_image_embeddings
WHERE embedding_failure_code IS NOT NULL
GROUP BY embedding_failure_code
ORDER BY rows DESC, embedding_failure_code;

SELECT
  COUNT(*) AS text_embedding_rows,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS text_embeddings_non_null,
  COUNT(*) FILTER (WHERE embedding IS NULL) AS text_embeddings_null,
  COUNT(DISTINCT product_id) AS products_with_text_embedding_rows,
  COUNT(DISTINCT product_id) FILTER (WHERE embedding IS NOT NULL) AS products_with_non_null_text_embeddings
FROM product_text_embeddings;

SELECT
  COUNT(*) AS active_products,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM product_image_embeddings pie
      WHERE pie.product_id = p.id
        AND pie.embedding IS NOT NULL
    )
  ) AS active_products_with_image_embedding,
  COUNT(*) FILTER (
    WHERE NOT EXISTS (
      SELECT 1
      FROM product_image_embeddings pie
      WHERE pie.product_id = p.id
        AND pie.embedding IS NOT NULL
    )
  ) AS active_products_without_image_embedding,
  COUNT(*) FILTER (
    WHERE EXISTS (
      SELECT 1
      FROM product_text_embeddings pte
      WHERE pte.product_id = p.id
        AND pte.embedding IS NOT NULL
    )
  ) AS active_products_with_text_embedding
FROM products p
WHERE p.status = 'active';

SELECT
  cls.relname AS table_name,
  attr.attname AS column_name,
  format_type(attr.atttypid, attr.atttypmod) AS data_type
FROM pg_attribute attr
JOIN pg_class cls ON cls.oid = attr.attrelid
JOIN pg_namespace ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public'
  AND cls.relname IN ('product_image_embeddings', 'product_text_embeddings')
  AND attr.attname = 'embedding'
  AND attr.attnum > 0
  AND NOT attr.attisdropped
ORDER BY cls.relname, attr.attname;

SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('product_image_embeddings', 'product_text_embeddings')
ORDER BY tablename, indexname;

SELECT
  COUNT(*) AS product_main_upload_urls
FROM products
WHERE "mainImage" LIKE '%/uploads/%';

SELECT
  COUNT(*) AS product_json_upload_url_rows
FROM products
WHERE images::text LIKE '%/uploads/%'
   OR "detailImages"::text LIKE '%/uploads/%';

SELECT
  COUNT(*) AS sku_upload_urls
FROM skus
WHERE image LIKE '%/uploads/%';

SELECT
  COUNT(*) AS qc_upload_urls
FROM product_qc_media
WHERE url LIKE '%/uploads/%'
   OR poster_url LIKE '%/uploads/%';

SELECT
  COUNT(*) AS brand_logo_upload_urls
FROM brands
WHERE "logoUrl" LIKE '%/uploads/%';

SELECT
  COUNT(*) AS platform_logo_upload_urls
FROM platforms
WHERE "logoUrl" LIKE '%/uploads/%';

SELECT
  COUNT(*) AS orphan_skus
FROM skus s
LEFT JOIN products p ON p.id = s."productId"
WHERE p.id IS NULL;

SELECT
  COUNT(*) AS orphan_product_secondary_categories
FROM product_secondary_categories psc
LEFT JOIN products p ON p.id = psc."productId"
LEFT JOIN category c ON c.id = psc."categoryId"
WHERE p.id IS NULL OR c.id IS NULL;

SELECT
  COUNT(*) AS orphan_product_attribute_values
FROM product_attribute_values pav
LEFT JOIN products p ON p.id = pav.product_id
LEFT JOIN attribute_values av ON av.id = pav.attribute_value_id
WHERE p.id IS NULL OR av.id IS NULL;

SELECT
  COUNT(*) AS orphan_product_qc_media
FROM product_qc_media pqm
LEFT JOIN products p ON p.id = pqm.product_id
WHERE p.id IS NULL;

SELECT
  COUNT(*) AS orphan_image_embeddings
FROM product_image_embeddings pie
LEFT JOIN products p ON p.id = pie.product_id
WHERE p.id IS NULL;

SELECT
  COUNT(*) AS orphan_text_embeddings
FROM product_text_embeddings pte
LEFT JOIN products p ON p.id = pte.product_id
WHERE p.id IS NULL;

SELECT
  COUNT(*) AS product_brand_facts_with_candidate_id
FROM product_brand_facts
WHERE "candidateId" IS NOT NULL;

SELECT
  key,
  "isSecret",
  "updatedAt"
FROM settings
ORDER BY key;

COMMIT;
