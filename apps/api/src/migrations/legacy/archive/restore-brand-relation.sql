-- 恢复 products 表中的 brandId 外键关联
-- 执行时间: 2026-01-23
-- 原因: 实现品牌归一化功能，AI 识别品牌后自动匹配或创建品牌记录
--
-- 新设计:
-- 1. brandId: 关联品牌表（归一化后的品牌）
-- 2. aiBrandName: 保留 AI 识别的原始品牌名（用于追溯）
-- 3. AI 识别品牌后自动匹配已有品牌（通过别名）或创建新品牌

-- 1. 添加 brandId 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'brandId'
    ) THEN
        ALTER TABLE products ADD COLUMN "brandId" UUID;
    END IF;
END $$;

-- 2. 为 brandId 创建索引
CREATE INDEX IF NOT EXISTS "IDX_products_brandId" ON products ("brandId");

-- 3. 添加外键约束
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'products'
        AND constraint_name = 'FK_products_brand'
    ) THEN
        ALTER TABLE products
        ADD CONSTRAINT "FK_products_brand"
        FOREIGN KEY ("brandId") REFERENCES brands(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. 迁移现有数据：根据 aiBrandName 匹配或创建品牌
-- 4.1 首先，为现有的 aiBrandName 创建品牌记录（如果不存在）
INSERT INTO brands (id, name, slug, status, tier, metadata, "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    p."aiBrandName",
    LOWER(REGEXP_REPLACE(p."aiBrandName", '[^a-zA-Z0-9\u4e00-\u9fa5]+', '-', 'g')),
    'active',
    3,
    '{"aiSource": "migrated-from-aiBrandName"}'::jsonb,
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT "aiBrandName"
    FROM products
    WHERE "aiBrandName" IS NOT NULL
    AND "aiBrandName" != ''
) p
WHERE NOT EXISTS (
    SELECT 1 FROM brands b
    WHERE LOWER(b.name) = LOWER(p."aiBrandName")
    OR LOWER(b.aliases::text) LIKE '%' || LOWER(p."aiBrandName") || '%'
);

-- 4.2 更新 products.brandId 关联到品牌
UPDATE products p
SET "brandId" = b.id
FROM brands b
WHERE p."aiBrandName" IS NOT NULL
AND p."brandId" IS NULL
AND (
    LOWER(b.name) = LOWER(p."aiBrandName")
    OR LOWER(b.aliases::text) LIKE '%' || LOWER(p."aiBrandName") || '%'
);

-- 5. 验证结果
SELECT
    'Products with brandId' as metric,
    COUNT(*) as count
FROM products WHERE "brandId" IS NOT NULL
UNION ALL
SELECT
    'Products without brandId' as metric,
    COUNT(*) as count
FROM products WHERE "brandId" IS NULL
UNION ALL
SELECT
    'Total brands' as metric,
    COUNT(*) as count
FROM brands;

-- 注意: 执行此迁移后:
-- 1. 现有商品会自动关联到匹配的品牌或新创建的品牌
-- 2. aiBrandName 字段保留作为原始识别记录
-- 3. 新导入的商品会自动匹配或创建品牌
