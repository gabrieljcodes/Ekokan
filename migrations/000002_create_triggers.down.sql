BEGIN;

DROP TRIGGER IF EXISTS trg_post_attachments_file_ref ON post_attachments;
DROP TRIGGER IF EXISTS trg_post_media_file_ref ON post_media;
DROP TRIGGER IF EXISTS trg_post_tags_count ON post_tags;
DROP TRIGGER IF EXISTS trg_post_comment_count ON comments;
DROP TRIGGER IF EXISTS trg_post_attachment_count ON post_attachments;
DROP TRIGGER IF EXISTS trg_post_media_count ON post_media;
DROP TRIGGER IF EXISTS trg_posts_artist_count ON posts;
DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS trg_artists_updated_at ON artists;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

DROP FUNCTION IF EXISTS fn_file_ref_count();
DROP FUNCTION IF EXISTS fn_tags_post_count();
DROP FUNCTION IF EXISTS fn_posts_comment_count();
DROP FUNCTION IF EXISTS fn_posts_attachment_count();
DROP FUNCTION IF EXISTS fn_posts_media_count();
DROP FUNCTION IF EXISTS fn_artists_post_count();
DROP FUNCTION IF EXISTS fn_set_updated_at();

COMMIT;
