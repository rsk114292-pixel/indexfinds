-- 启用 pgvector 扩展
-- 此脚本在 PostgreSQL 容器首次启动时自动执行

CREATE EXTENSION IF NOT EXISTS vector;

-- 验证扩展已启用
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE NOTICE 'pgvector extension is enabled successfully';
  ELSE
    RAISE EXCEPTION 'Failed to enable pgvector extension';
  END IF;
END $$;
