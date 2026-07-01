-- Phase 4: Add password_changed_at field to users table
-- Run this BEFORE deploying the passwordChangedAt feature

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
