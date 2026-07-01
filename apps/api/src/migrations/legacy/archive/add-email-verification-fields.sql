-- Phase 4: Add email verification fields to users table
-- Old users are set to email_verified = true by default

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Mark all existing users as verified (old user handling)
UPDATE users SET email_verified = true, email_verified_at = NOW() WHERE email_verified = false;
