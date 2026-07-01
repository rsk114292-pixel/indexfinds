-- 添加 aiBrandName 字段到 products 表
-- 用于存储 AI 识别但未匹配到数据库的品牌名，供后台审核使用
-- 执行时间: 2026-01-23
-- 相关改动: 品牌匹配改用 AI + 模糊匹配，不再自动创建新品牌

-- 检查字段是否存在，不存在则添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'aiBrandName'
    ) THEN
        ALTER TABLE products ADD COLUMN "aiBrandName" VARCHAR(255) NULL;
        COMMENT ON COLUMN products."aiBrandName" IS 'AI 识别的品牌名（未匹配到数据库时暂存，待审核）';
    END IF;
END $$;

-- 验证字段已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'aiBrandName';
