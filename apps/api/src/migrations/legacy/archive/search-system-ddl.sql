-- 搜索系统 DDL 迁移
-- 将原先散布在 onModuleInit 中的 DDL 统一收归此处
-- 执行方式: psql -U postgres -d lolobuyspreadsheets_dev -f search-system-ddl.sql

-- ============================================================
-- 1. pg_trgm 扩展（FullTextSearchService 依赖）
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. pgvector 扩展（SemanticSearchService / VisualSearchService 依赖）
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 3. Trigram 索引（FullTextSearchService 模糊搜索 + 拼写纠正）
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_product_title_trgm
  ON products USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_description_trgm
  ON products USING gin (description gin_trgm_ops);

-- ============================================================
-- 4. 文本向量表（SemanticSearchService）
-- ============================================================
-- 注: 向量维度 384 对应 all-MiniLM-L6-v2 模型
-- 配置位置: SEMANTIC_CONFIG.vectorDimensions (config/search.config.ts)
-- 若需更改维度，需创建新的 migration: ALTER TABLE ... ALTER COLUMN embedding TYPE vector(新维度)
CREATE TABLE IF NOT EXISTS product_text_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source_text TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  embedding vector(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_product_text_embedding UNIQUE (product_id)
);

CREATE INDEX IF NOT EXISTS idx_pte_product_id
  ON product_text_embeddings(product_id);

-- ============================================================
-- 5. 图片向量表（VisualSearchService）
--    注: 已有独立迁移文件 add-product-image-embeddings.sql
--    此处仅作为幂等保障，重复执行不会出错
-- ============================================================
CREATE TABLE IF NOT EXISTS product_image_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_index INTEGER NOT NULL DEFAULT 0,
  embedding vector(512),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_product_image UNIQUE (product_id, image_url)
);

CREATE INDEX IF NOT EXISTS idx_pie_product_id
  ON product_image_embeddings(product_id);

-- ============================================================
-- 6. 热搜表（SearchRecordingService / SearchAnalyticsService）
-- ============================================================
CREATE TABLE IF NOT EXISTS hot_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(255) NOT NULL UNIQUE,
  search_count INTEGER NOT NULL DEFAULT 0,
  search_count_24h INTEGER NOT NULL DEFAULT 0,
  search_count_7d INTEGER NOT NULL DEFAULT 0,
  avg_result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hot_searches_keyword
  ON hot_searches(keyword);

CREATE INDEX IF NOT EXISTS idx_hot_searches_search_count
  ON hot_searches(search_count DESC);
