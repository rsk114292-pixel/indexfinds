\if :{?new_upload_base}
\else
\set new_upload_base 'http://localhost:4101/uploads/'
\endif

\set old_upload_base_https 'https://api.findsindex.com/uploads/'
\set old_upload_base_http 'http://api.findsindex.com/uploads/'

BEGIN;

UPDATE products
SET
  "mainImage" = replace(replace("mainImage", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "mainImage" LIKE '%' || :'old_upload_base_https' || '%'
   OR "mainImage" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE products
SET
  "images" = replace(replace("images", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "images" LIKE '%' || :'old_upload_base_https' || '%'
   OR "images" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE products
SET
  "detailImages" = replace(replace("detailImages", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "detailImages" LIKE '%' || :'old_upload_base_https' || '%'
   OR "detailImages" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE skus
SET
  "image" = replace(replace("image", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "image" LIKE '%' || :'old_upload_base_https' || '%'
   OR "image" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE product_qc_media
SET
  "url" = replace(replace("url", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "url" LIKE '%' || :'old_upload_base_https' || '%'
   OR "url" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE product_qc_media
SET
  "poster_url" = replace(replace("poster_url", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "poster_url" LIKE '%' || :'old_upload_base_https' || '%'
   OR "poster_url" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE brands
SET
  "logoUrl" = replace(replace("logoUrl", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "logoUrl" LIKE '%' || :'old_upload_base_https' || '%'
   OR "logoUrl" LIKE '%' || :'old_upload_base_http' || '%';

UPDATE platforms
SET
  "logoUrl" = replace(replace("logoUrl", :'old_upload_base_https', :'new_upload_base'), :'old_upload_base_http', :'new_upload_base')
WHERE "logoUrl" LIKE '%' || :'old_upload_base_https' || '%'
   OR "logoUrl" LIKE '%' || :'old_upload_base_http' || '%';

COMMIT;

SELECT 'products.mainImage old upload residues' AS check_name, count(*) AS residues
FROM products
WHERE "mainImage" LIKE '%' || :'old_upload_base_https' || '%'
   OR "mainImage" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'products.images old upload residues', count(*)
FROM products
WHERE "images" LIKE '%' || :'old_upload_base_https' || '%'
   OR "images" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'products.detailImages old upload residues', count(*)
FROM products
WHERE "detailImages" LIKE '%' || :'old_upload_base_https' || '%'
   OR "detailImages" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'skus.image old upload residues', count(*)
FROM skus
WHERE "image" LIKE '%' || :'old_upload_base_https' || '%'
   OR "image" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'product_qc_media.url old upload residues', count(*)
FROM product_qc_media
WHERE "url" LIKE '%' || :'old_upload_base_https' || '%'
   OR "url" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'product_qc_media.poster_url old upload residues', count(*)
FROM product_qc_media
WHERE "poster_url" LIKE '%' || :'old_upload_base_https' || '%'
   OR "poster_url" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'brands.logoUrl old upload residues', count(*)
FROM brands
WHERE "logoUrl" LIKE '%' || :'old_upload_base_https' || '%'
   OR "logoUrl" LIKE '%' || :'old_upload_base_http' || '%'
UNION ALL
SELECT 'platforms.logoUrl old upload residues', count(*)
FROM platforms
WHERE "logoUrl" LIKE '%' || :'old_upload_base_https' || '%'
   OR "logoUrl" LIKE '%' || :'old_upload_base_http' || '%';
