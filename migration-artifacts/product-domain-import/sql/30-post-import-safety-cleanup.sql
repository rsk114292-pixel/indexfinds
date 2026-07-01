\if :{?new_upload_base}
\else
\set new_upload_base 'http://localhost:4101/uploads/'
\endif

\set stale_local_upload_base 'http://localhost:4100/uploads/'

BEGIN;

-- Normalize accidental local import URLs. The intended value must be passed for VPS/prod.
UPDATE products
SET "mainImage" = replace("mainImage", :'stale_local_upload_base', :'new_upload_base')
WHERE "mainImage" LIKE :'stale_local_upload_base' || '%';

UPDATE products
SET "images" = replace("images", :'stale_local_upload_base', :'new_upload_base')
WHERE "images" LIKE '%' || :'stale_local_upload_base' || '%';

UPDATE products
SET "detailImages" = replace("detailImages", :'stale_local_upload_base', :'new_upload_base')
WHERE "detailImages" LIKE '%' || :'stale_local_upload_base' || '%';

UPDATE skus
SET "image" = replace("image", :'stale_local_upload_base', :'new_upload_base')
WHERE "image" LIKE :'stale_local_upload_base' || '%';

UPDATE brands
SET "logoUrl" = replace("logoUrl", :'stale_local_upload_base', :'new_upload_base')
WHERE "logoUrl" LIKE :'stale_local_upload_base' || '%';

UPDATE platforms
SET "logoUrl" = replace("logoUrl", :'stale_local_upload_base', :'new_upload_base')
WHERE "logoUrl" LIKE :'stale_local_upload_base' || '%';

UPDATE product_qc_media
SET "url" = replace("url", :'stale_local_upload_base', :'new_upload_base')
WHERE "url" LIKE :'stale_local_upload_base' || '%';

UPDATE product_qc_media
SET "poster_url" = replace("poster_url", :'stale_local_upload_base', :'new_upload_base')
WHERE "poster_url" LIKE :'stale_local_upload_base' || '%';

-- Remove old platform invite/ref codes imported with product-domain data.
UPDATE platforms
SET "inviteCode" = ''
WHERE COALESCE("inviteCode", '') <> '';

UPDATE platforms
SET "urlTemplate" = replace("urlTemplate", 'ref=300189539', 'ref={inviteCode}')
WHERE key = 'joyagoo'
  AND "urlTemplate" LIKE '%ref=300189539%';

UPDATE platforms
SET "urlTemplate" = replace("urlTemplate", 'partnercode=ES7pVI', 'partnercode={inviteCode}')
WHERE key = 'superbuy'
  AND "urlTemplate" LIKE '%partnercode=ES7pVI%';

UPDATE platforms
SET "urlTemplate" = replace("urlTemplate", 'inviteCode=24PYNY3GL', 'inviteCode={inviteCode}')
WHERE key = 'litbuy'
  AND "urlTemplate" LIKE '%inviteCode=24PYNY3GL%';

-- settings is not bulk-copied. If baseline/default settings exist, keep only safe empty/off values.
UPDATE settings
SET value = ''
WHERE key = 'loongbuy_invitecode'
  AND value <> '';

UPDATE settings
SET value = 'false'
WHERE key = 'tracking_enabled'
  AND value <> 'false';

COMMIT;

SELECT 'brands stale localhost upload base' AS check_name, count(*) AS count
FROM brands
WHERE "logoUrl" LIKE :'stale_local_upload_base' || '%'
UNION ALL
SELECT 'platforms stale localhost upload base', count(*)
FROM platforms
WHERE "logoUrl" LIKE :'stale_local_upload_base' || '%'
UNION ALL
SELECT 'brands old production uploads', count(*)
FROM brands
WHERE "logoUrl" LIKE '%api.findsindex.com/uploads/%'
UNION ALL
SELECT 'platforms old production uploads', count(*)
FROM platforms
WHERE "logoUrl" LIKE '%api.findsindex.com/uploads/%'
UNION ALL
SELECT 'product_qc_media old production uploads', count(*)
FROM product_qc_media
WHERE "url" LIKE '%api.findsindex.com/uploads/%'
   OR "poster_url" LIKE '%api.findsindex.com/uploads/%'
UNION ALL
SELECT 'products stale localhost upload base', count(*)
FROM products
WHERE "mainImage" LIKE :'stale_local_upload_base' || '%'
   OR "images" LIKE '%' || :'stale_local_upload_base' || '%'
   OR "detailImages" LIKE '%' || :'stale_local_upload_base' || '%'
UNION ALL
SELECT 'skus stale localhost upload base', count(*)
FROM skus
WHERE "image" LIKE :'stale_local_upload_base' || '%'
UNION ALL
SELECT 'platform inviteCode non-empty', count(*)
FROM platforms
WHERE COALESCE("inviteCode", '') <> ''
UNION ALL
SELECT 'platform hardcoded invite/ref params', count(*)
FROM platforms
WHERE "urlTemplate" LIKE '%300189539%'
   OR "urlTemplate" LIKE '%ES7pVI%'
   OR "urlTemplate" LIKE '%24PYNY3GL%';

SELECT key, value
FROM settings
WHERE key IN ('loongbuy_invitecode', 'tracking_enabled')
ORDER BY key;
