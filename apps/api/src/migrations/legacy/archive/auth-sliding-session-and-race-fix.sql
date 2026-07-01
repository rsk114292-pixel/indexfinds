-- Sliding session: track last usage time for idle timeout
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP;

-- Race condition fix: track replacement token for multi-tab grace period
ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS replaced_by_token_hash VARCHAR(64);

-- Initialize last_used_at for existing active tokens
UPDATE refresh_tokens SET last_used_at = created_at WHERE last_used_at IS NULL AND revoked_at IS NULL;
