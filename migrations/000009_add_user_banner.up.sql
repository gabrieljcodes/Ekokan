ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_file_id UUID REFERENCES files(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_banner_file ON users (banner_file_id) WHERE banner_file_id IS NOT NULL;
