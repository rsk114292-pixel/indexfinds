-- 创建同义词组表
-- 执行日期: 2026-01-28
-- 功能: 支持搜索同义词扩展

CREATE TABLE IF NOT EXISTS synonym_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  canonical_term VARCHAR(100) NOT NULL,
  synonyms TEXT[] NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_synonym_groups_canonical ON synonym_groups(canonical_term);
CREATE INDEX IF NOT EXISTS idx_synonym_groups_category ON synonym_groups(category);
CREATE INDEX IF NOT EXISTS idx_synonym_groups_active ON synonym_groups(is_active) WHERE is_active = true;

-- 初始数据：欧美市场同义词
INSERT INTO synonym_groups (name, canonical_term, synonyms, category) VALUES
-- 英美差异
('sneakers/trainers', 'sneakers', ARRAY['trainers', 'kicks', 'tennis shoes', 'athletic shoes'], 'locale'),
('pants/trousers', 'pants', ARRAY['trousers', 'slacks'], 'locale'),
('sweater/jumper', 'sweater', ARRAY['jumper', 'pullover', 'knit'], 'locale'),
('vest/waistcoat', 'vest', ARRAY['waistcoat'], 'locale'),
('suspenders/braces', 'suspenders', ARRAY['braces'], 'locale'),

-- 时尚术语
('t-shirt variants', 't-shirt', ARRAY['tee', 'tshirt', 't shirt'], 'general'),
('hoodie variants', 'hoodie', ARRAY['hoody', 'hooded sweatshirt'], 'general'),
('jacket/coat', 'jacket', ARRAY['coat', 'outerwear'], 'general'),
('sweatshirt variants', 'sweatshirt', ARRAY['crew neck', 'crewneck'], 'general'),
('denim variants', 'denim', ARRAY['jean', 'jeans'], 'material'),

-- 风格术语
('athleisure', 'athleisure', ARRAY['sporty casual', 'athletic leisure'], 'style'),
('streetwear', 'streetwear', ARRAY['street style', 'urban'], 'style'),
('preppy', 'preppy', ARRAY['ivy league', 'collegiate'], 'style'),

-- 场合/季节
('formal', 'formal', ARRAY['dressy', 'elegant', 'fancy'], 'general'),
('casual', 'casual', ARRAY['everyday', 'relaxed', 'laid-back'], 'general'),
('summer', 'summer', ARRAY['warm weather', 'hot weather'], 'general'),
('winter', 'winter', ARRAY['cold weather', 'snow'], 'general')
ON CONFLICT DO NOTHING;
