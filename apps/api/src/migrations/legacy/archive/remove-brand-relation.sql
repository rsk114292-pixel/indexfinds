-- 移除 products 表中的 brandId 外键关联
-- 执行时间: 2026-01-23
-- 原因: 品牌现在完全由 AI 生成，存储在 aiBrandName 字段，不再关联品牌表

-- 1. 首先移除外键约束（如果存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'products'
        AND constraint_name LIKE '%brand%'
    ) THEN
        -- 查找并删除外键约束
        EXECUTE (
            SELECT 'ALTER TABLE products DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints
            WHERE constraint_type = 'FOREIGN KEY'
            AND table_name = 'products'
            AND constraint_name LIKE '%brand%'
            LIMIT 1
        );
    END IF;
END $$;

-- 2. 移除 brandId 列上的索引（如果存在）
DROP INDEX IF EXISTS "IDX_products_brandId";
DROP INDEX IF EXISTS "idx_products_brand_id";

-- 3. 将 brandId 数据迁移到 aiBrandName（如果还没有 aiBrandName 值）
UPDATE products p
SET "aiBrandName" = b.name
FROM brands b
WHERE p."brandId" = b.id
AND (p."aiBrandName" IS NULL OR p."aiBrandName" = '');

-- 4. 移除 brandId 列
ALTER TABLE products DROP COLUMN IF EXISTS "brandId";

-- 5. 为 aiBrandName 添加索引（如果不存在）
CREATE INDEX IF NOT EXISTS "IDX_products_aiBrandName" ON products ("aiBrandName");

-- 验证结果
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
AND column_name IN ('brandId', 'aiBrandName');

-- 注意: 执行此迁移后，请确保:
-- 1. 后端代码已移除所有 brandId 引用
-- 2. 前端代码已改用 aiBrandName
-- 3. 品牌管理后台仍然保留（用于其他用途）
