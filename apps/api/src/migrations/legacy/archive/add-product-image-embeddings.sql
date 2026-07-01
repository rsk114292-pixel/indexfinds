-- 创建商品图片向量表
-- 每张图片一个向量，支持多角度/多SKU搜索

-- 确保 pgvector 扩展已启用
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建商品图片向量表
CREATE TABLE IF NOT EXISTS product_image_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_index INTEGER NOT NULL DEFAULT 0,  -- 图片在产品中的顺序 (0=主图)
  embedding vector(512),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 唯一约束：同一产品的同一图片URL只能有一个向量
  CONSTRAINT unique_product_image UNIQUE (product_id, image_url)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_pie_product_id ON product_image_embeddings(product_id);
CREATE INDEX IF NOT EXISTS idx_pie_embedding ON product_image_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 添加注释
COMMENT ON TABLE product_image_embeddings IS '商品图片向量表，支持多图搜索';
COMMENT ON COLUMN product_image_embeddings.image_index IS '图片顺序：0=主图，1+=其他图片';
