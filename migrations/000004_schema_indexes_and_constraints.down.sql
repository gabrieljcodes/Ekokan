ALTER TABLE flags DROP CONSTRAINT IF EXISTS chk_flags_status;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role;

ALTER TABLE files DROP CONSTRAINT IF EXISTS chk_files_sha256_len;
ALTER TABLE files ALTER COLUMN sha256 TYPE CHAR(64);

DROP INDEX IF EXISTS idx_artists_slug_trgm;

DROP INDEX IF EXISTS idx_post_attachments_file;
DROP INDEX IF EXISTS idx_post_media_file;
DROP INDEX IF EXISTS idx_artists_banner_file;
DROP INDEX IF EXISTS idx_artists_avatar_file;
DROP INDEX IF EXISTS idx_users_avatar_file;
