-- 清空品牌库
-- 执行时间: 2026-01-23
-- 原因: 清空预设品牌，让 AI 自动创建需要的品牌

-- 1. 先清空商品表中的 brandId 关联（避免外键约束错误）
UPDATE products SET "brandId" = NULL WHERE "brandId" IS NOT NULL;

-- 2. 清空批量导入 items 中的 brandId（如果有的话）
-- UPDATE batch_job_items SET ... （如果需要的话）

-- 3. 删除所有品牌
DELETE FROM brands;

-- 4. 验证结果
SELECT 'Brands count after clear:' as info, COUNT(*) as count FROM brands;
SELECT 'Products with brandId:' as info, COUNT(*) as count FROM products WHERE "brandId" IS NOT NULL;

-- 完成！品牌库已清空，新导入的商品会自动创建品牌
