-- 创建外跳点击记录表
CREATE TABLE IF NOT EXISTS "outbound_clicks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "productId" uuid NOT NULL,
  "platformType" varchar(50) NOT NULL,
  "platformUrl" varchar(1000),
  "source" varchar(20) NOT NULL DEFAULT 'direct',
  "searchClickId" uuid,
  "userId" uuid,
  "sessionId" varchar(255),
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_outbound_clicks" PRIMARY KEY ("id")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_productId" ON "outbound_clicks" ("productId");
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_source" ON "outbound_clicks" ("source");
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_platformType" ON "outbound_clicks" ("platformType");
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_createdAt" ON "outbound_clicks" ("createdAt");
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_productId_createdAt" ON "outbound_clicks" ("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_source_createdAt" ON "outbound_clicks" ("source", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_outbound_clicks_platformType_createdAt" ON "outbound_clicks" ("platformType", "createdAt");

-- 验证表是否创建成功
SELECT 'outbound_clicks 表创建成功!' AS result;
