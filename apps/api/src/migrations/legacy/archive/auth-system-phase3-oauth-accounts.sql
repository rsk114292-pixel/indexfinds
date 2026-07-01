-- Phase 3: Create user_oauth_accounts table + allow nullable password
-- Run this BEFORE deploying Phase 3 code

-- OAuth accounts table
CREATE TABLE IF NOT EXISTS user_oauth_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  avatar VARCHAR(500),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_user_id ON user_oauth_accounts(user_id);

-- Allow password to be NULL (social login users have no password)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
