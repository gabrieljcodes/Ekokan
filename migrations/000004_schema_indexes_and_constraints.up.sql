-- Fix missing FK indexes to prevent sequential scans on file deletions
CREATE INDEX IF NOT EXISTS idx_users_avatar_file ON users (avatar_file_id) WHERE avatar_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_avatar_file ON artists (avatar_file_id) WHERE avatar_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_banner_file ON artists (banner_file_id) WHERE banner_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_media_file ON post_media (file_id);
CREATE INDEX IF NOT EXISTS idx_post_attachments_file ON post_attachments (file_id);

-- Add trigram GIN index on artist slug for fast ILIKE search
CREATE INDEX IF NOT EXISTS idx_artists_slug_trgm ON artists USING gin (slug gin_trgm_ops);

-- Replace CHAR(64) with TEXT and CHECK constraint for sha256
ALTER TABLE files ALTER COLUMN sha256 TYPE TEXT;
ALTER TABLE files ADD CONSTRAINT chk_files_sha256_len CHECK (length(sha256) = 64);

-- Add CHECK constraints for enum-like fields
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('user','admin','moderator'));
ALTER TABLE flags ADD CONSTRAINT chk_flags_status CHECK (status IN ('pending','resolved','dismissed'));
