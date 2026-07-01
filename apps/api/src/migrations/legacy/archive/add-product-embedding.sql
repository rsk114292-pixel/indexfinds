-- 添加商品图片 embedding 向量字段
-- 用于以图搜图功能 (CLIP + pgvector)
-- 执行方式: docker exec -it lolobuyspreadsheets_postgres psql -U postgres -d lolobuyspreadsheets_dev -f /path/to/this/file
-- 或者: 手动复制 SQL 到 psql 执行

-- 1. 确保 pgvector 扩展已启用
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 添加 512 维向量字段（CLIP 模型输出维度）
-- 使用 IF NOT EXISTS 逻辑来避免重复执行出错
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE products ADD COLUMN embedding vector(512);
    RAISE NOTICE 'Column embedding added to products table';
  ELSE
    RAISE NOTICE 'Column embedding already exists in products table';
  END IF;
END $$;

-- 3. 创建 IVFFlat 索引（适合 10 万级数据）
-- lists 参数：推荐值为 sqrt(行数)，10万数据约 316，这里用 100
-- 注意：索引只有在表中有足够数据时才有效，建议在导入 embedding 后创建
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_products_embedding'
  ) THEN
    -- 先检查是否有数据，如果没有则跳过索引创建（IVFFlat 需要数据来训练）
    IF (SELECT COUNT(*) FROM products WHERE embedding IS NOT NULL) > 100 THEN
      CREATE INDEX idx_products_embedding
      ON products
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
      RAISE NOTICE 'Index idx_products_embedding created';
    ELSE
      RAISE NOTICE 'Skipping index creation: need at least 100 products with embeddings';
      RAISE NOTICE 'Run this script again after generating embeddings';
    END IF;
  ELSE
    RAISE NOTICE 'Index idx_products_embedding already exists';
  END IF;
END $$;

-- 4. 验证
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'embedding';
