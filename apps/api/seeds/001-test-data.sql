-- =========================================
-- 测试数据 SQL 脚本
-- 用于快速插入种子数据以验证数据模型
-- =========================================

-- 1. 清空现有数据（可选，谨慎使用）
-- TRUNCATE TABLE products, skus, brands, category, category_closure, weidian_cache, product_secondary_categories CASCADE;

-- 2. 插入分类数据（Category）
-- 使用闭包表，需要先插入父分类，再插入子分类

-- 顶级分类
INSERT INTO category (id, name, slug, level, "isActive") VALUES
('11111111-1111-1111-1111-111111111111', 'Clothing', 'clothing', 0, true),
('22222222-2222-2222-2222-222222222222', 'Shoes', 'shoes', 0, true),
('33333333-3333-3333-3333-333333333333', 'Accessories', 'accessories', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Clothing 子分类
INSERT INTO category (id, name, slug, level, "isActive") VALUES
('11111111-1111-1111-1111-111111111112', 'Tops', 'tops', 1, true),
('11111111-1111-1111-1111-111111111113', 'Bottoms', 'bottoms', 1, true),
('11111111-1111-1111-1111-111111111114', 'Dresses', 'dresses', 1, true)
ON CONFLICT (id) DO NOTHING;

-- Tops 子分类
INSERT INTO category (id, name, slug, level, "isActive") VALUES
('11111111-1111-1111-1111-111111111115', 'T-Shirts', 't-shirts', 2, true),
('11111111-1111-1111-1111-111111111116', 'Hoodies', 'hoodies', 2, true),
('11111111-1111-1111-1111-111111111117', 'Sweaters', 'sweaters', 2, true)
ON CONFLICT (id) DO NOTHING;

-- Shoes 子分类
INSERT INTO category (id, name, slug, level, "isActive") VALUES
('22222222-2222-2222-2222-222222222223', 'Sneakers', 'sneakers', 1, true),
('22222222-2222-2222-2222-222222222224', 'Boots', 'boots', 1, true)
ON CONFLICT (id) DO NOTHING;

-- 注意：闭包表关系由 TypeORM 自动维护，这里需要手动插入闭包表数据
-- 或者通过 TypeORM Repository 的 save 方法插入（推荐）

-- 3. 插入品牌数据（Brand）
INSERT INTO brands (id, name, slug, aliases, tier, status, "logoUrl", description) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nike', 'nike', 'Nike,耐克,NIKE', 'A', 'active', 'https://example.com/nike-logo.png', 'Leading sports brand'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Adidas', 'adidas', 'Adidas,阿迪达斯,adidas', 'A', 'active', 'https://example.com/adidas-logo.png', 'German sportswear brand'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'New Balance', 'new-balance', 'New Balance,NB,纽巴伦,新百伦', 'B', 'active', NULL, 'American footwear brand'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Unbranded', 'unbranded', 'Generic,无品牌', 'D', 'active', NULL, 'Generic products')
ON CONFLICT (id) DO NOTHING;

-- 4. 插入商品数据（Product）
-- 商品 1: Nike T-Shirt
INSERT INTO products (
  id, title, slug, description,
  "originalTitle", "weidianItemId", "weidianShopId", "weidianShopName",
  "brandId", "brandConfidence",
  "primaryCategoryId",
  "priceMin", "priceMax", currency,
  "mainImage", images, "detailImages",
  "aiAttributes", attributes,
  "sourceUrl", status, "isFeatured", "viewCount"
) VALUES (
  'prod1111-1111-1111-1111-111111111111',
  'Nike Classic White Cotton T-Shirt for Men',
  'nike-classic-white-cotton-t-shirt-men',
  '<h2>Product Description</h2><p>Classic Nike t-shirt made from 100% cotton. Perfect for daily wear and sports activities.</p>',
  'Nike 经典款纯棉 T 恤男',
  '7569577612',
  '1708516832',
  '测试店铺A',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  0.95,
  '11111111-1111-1111-1111-111111111115',
  99.00,
  129.00,
  'CNY',
  'https://si.geilicdn.com/open1708516832-main.jpg',
  '["https://si.geilicdn.com/open1708516832-1.jpg","https://si.geilicdn.com/open1708516832-2.jpg"]',
  '["https://si.geilicdn.com/open1708516832-detail-1.jpg"]',
  '{"colors":["White","Black","Gray"],"materials":["Cotton"],"styles":["Casual","Street"],"occasions":["Daily","Sports"],"seasons":["Summer","Spring"],"gender":"Men"}',
  '{"material":"100% Cotton","origin":"China"}',
  'https://weidian.com/item.html?itemID=7569577612',
  'active',
  true,
  120
)
ON CONFLICT (id) DO NOTHING;

-- 商品 2: Adidas Sneakers
INSERT INTO products (
  id, title, slug, description,
  "originalTitle", "weidianItemId", "weidianShopId", "weidianShopName",
  "brandId", "brandConfidence",
  "primaryCategoryId",
  "priceMin", "priceMax", currency,
  "mainImage", images,
  "aiAttributes",
  "sourceUrl", status, "isFeatured", "viewCount"
) VALUES (
  'prod2222-2222-2222-2222-222222222222',
  'Adidas Ultraboost Running Shoes Black White',
  'adidas-ultraboost-running-shoes-black-white',
  '<h2>Product Description</h2><p>High-performance running shoes with Boost technology for maximum energy return.</p>',
  'Adidas Ultraboost 跑步鞋黑白',
  '7613410521',
  '1708516832',
  '测试店铺A',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  0.92,
  '22222222-2222-2222-2222-222222222223',
  599.00,
  799.00,
  'CNY',
  'https://si.geilicdn.com/adidas-main.jpg',
  '["https://si.geilicdn.com/adidas-1.jpg","https://si.geilicdn.com/adidas-2.jpg"]',
  '{"colors":["Black","White"],"materials":["Textile","Rubber"],"styles":["Sports","Running"],"occasions":["Sports","Running"],"seasons":["All Season"],"gender":"Unisex"}',
  'https://weidian.com/item.html?itemID=7613410521',
  'active',
  false,
  85
)
ON CONFLICT (id) DO NOTHING;

-- 5. 插入 SKU 数据
-- Nike T-Shirt 的 SKU（多颜色、多尺码）
INSERT INTO skus (
  id, "productId", "skuCode",
  "weidianSkuId", "weidianAttrIds",
  attributes, "skuKey",
  price, stock, image, status
) VALUES
('sku11111-1111-1111-1111-111111111111', 'prod1111-1111-1111-1111-111111111111', 'NIKE-TSHIRT-WHITE-M',
 '123456', '{9679297372,9677463371}',
 '{"颜色":"White","尺码":"M"}', '颜色=White;尺码=M',
 99.00, 50, 'https://si.geilicdn.com/white-m.jpg', 'available'),

('sku11111-1111-1111-1111-111111111112', 'prod1111-1111-1111-1111-111111111111', 'NIKE-TSHIRT-WHITE-L',
 '123457', '{9679297372,9677463373}',
 '{"颜色":"White","尺码":"L"}', '颜色=White;尺码=L',
 99.00, 30, 'https://si.geilicdn.com/white-l.jpg', 'available'),

('sku11111-1111-1111-1111-111111111113', 'prod1111-1111-1111-1111-111111111111', 'NIKE-TSHIRT-BLACK-M',
 '123458', '{9679297374,9677463371}',
 '{"颜色":"Black","尺码":"M"}', '颜色=Black;尺码=M',
 109.00, 45, 'https://si.geilicdn.com/black-m.jpg', 'available'),

('sku11111-1111-1111-1111-111111111114', 'prod1111-1111-1111-1111-111111111111', 'NIKE-TSHIRT-BLACK-L',
 '123459', '{9679297374,9677463373}',
 '{"颜色":"Black","尺码":"L"}', '颜色=Black;尺码=L',
 109.00, 20, 'https://si.geilicdn.com/black-l.jpg', 'available')
ON CONFLICT (id) DO NOTHING;

-- Adidas Sneakers 的 SKU
INSERT INTO skus (
  id, "productId", "skuCode",
  "weidianSkuId", "weidianAttrIds",
  attributes, "skuKey",
  price, stock, image, status
) VALUES
('sku22222-2222-2222-2222-222222222221', 'prod2222-2222-2222-2222-222222222222', 'ADIDAS-UB-BLACK-40',
 '234561', '{8679297372}',
 '{"颜色":"Black","尺码":"40"}', '颜色=Black;尺码=40',
 599.00, 15, 'https://si.geilicdn.com/adidas-black-40.jpg', 'available'),

('sku22222-2222-2222-2222-222222222222', 'prod2222-2222-2222-2222-222222222222', 'ADIDAS-UB-BLACK-41',
 '234562', '{8679297372}',
 '{"颜色":"Black","尺码":"41"}', '颜色=Black;尺码=41',
 599.00, 10, 'https://si.geilicdn.com/adidas-black-41.jpg', 'available'),

('sku22222-2222-2222-2222-222222222223', 'prod2222-2222-2222-2222-222222222222', 'ADIDAS-UB-WHITE-40',
 '234563', '{8679297373}',
 '{"颜色":"White","尺码":"40"}', '颜色=White;尺码=40',
 649.00, 8, 'https://si.geilicdn.com/adidas-white-40.jpg', 'out_of_stock')
ON CONFLICT (id) DO NOTHING;

-- 6. 插入微店缓存数据（可选，用于测试爬虫功能）
INSERT INTO weidian_cache (
  "itemId", title, "mainImage", images,
  "skuInfo", "detailDesc", "detailImages",
  "shopId", "shopName",
  "priceMin", "priceMax",
  status, "lastFetchedAt"
) VALUES (
  '7569577612',
  'Nike 经典款纯棉 T 恤男',
  'https://si.geilicdn.com/open1708516832-main.jpg',
  '["https://si.geilicdn.com/open1708516832-1.jpg","https://si.geilicdn.com/open1708516832-2.jpg"]',
  '{"attrList":[{"attrTitle":"颜色","attrValues":[{"attrId":9679297372,"attrValue":"White"},{"attrId":9679297374,"attrValue":"Black"}]},{"attrTitle":"尺码","attrValues":[{"attrId":9677463371,"attrValue":"M"},{"attrId":9677463373,"attrValue":"L"}]}]}',
  '{"desc_content":[{"type":2,"url":"https://si.geilicdn.com/open1708516832-detail-1.jpg"}]}',
  '["https://si.geilicdn.com/open1708516832-detail-1.jpg"]',
  '1708516832',
  '测试店铺A',
  99.00,
  129.00,
  'success',
  NOW()
)
ON CONFLICT ("itemId") DO NOTHING;

-- 完成
SELECT '✅ 测试数据插入完成！' AS message;
SELECT COUNT(*) AS "分类数量" FROM category;
SELECT COUNT(*) AS "品牌数量" FROM brands;
SELECT COUNT(*) AS "商品数量" FROM products;
SELECT COUNT(*) AS "SKU数量" FROM skus;
SELECT COUNT(*) AS "缓存数量" FROM weidian_cache;
