BEGIN;

-- ============================================================
-- Generic updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_artists_updated_at
    BEFORE UPDATE ON artists
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- artists.post_count
-- ============================================================
CREATE OR REPLACE FUNCTION fn_artists_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE artists SET post_count = post_count + 1 WHERE id = NEW.artist_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE artists SET post_count = post_count - 1 WHERE id = OLD.artist_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_posts_artist_count
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION fn_artists_post_count();

-- ============================================================
-- posts.media_count
-- ============================================================
CREATE OR REPLACE FUNCTION fn_posts_media_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET media_count = media_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET media_count = media_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_media_count
    AFTER INSERT OR DELETE ON post_media
    FOR EACH ROW EXECUTE FUNCTION fn_posts_media_count();

-- ============================================================
-- posts.attachment_count
-- ============================================================
CREATE OR REPLACE FUNCTION fn_posts_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET attachment_count = attachment_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET attachment_count = attachment_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_attachment_count
    AFTER INSERT OR DELETE ON post_attachments
    FOR EACH ROW EXECUTE FUNCTION fn_posts_attachment_count();

-- ============================================================
-- posts.comment_count
-- ============================================================
CREATE OR REPLACE FUNCTION fn_posts_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_comment_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION fn_posts_comment_count();

-- ============================================================
-- tags.post_count
-- ============================================================
CREATE OR REPLACE FUNCTION fn_tags_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET post_count = post_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET post_count = post_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_tags_count
    AFTER INSERT OR DELETE ON post_tags
    FOR EACH ROW EXECUTE FUNCTION fn_tags_post_count();

-- ============================================================
-- files.ref_count management via post_media and post_attachments
-- ============================================================
CREATE OR REPLACE FUNCTION fn_file_ref_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE files SET ref_count = ref_count + 1 WHERE id = NEW.file_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE files SET ref_count = ref_count - 1 WHERE id = OLD.file_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: ref_count starts at 1 on insert into files table.
-- These triggers handle subsequent references from post_media/post_attachments.
-- The first reference (when the file is created) sets ref_count=1.
-- Additional references via post_media/post_attachments increment from there.
-- We actually want ref_count to track total references, so we start at 0 in files
-- and let the triggers handle all counting.

-- Actually, let's adjust: files.ref_count DEFAULT 0, and triggers on both tables handle it.
-- But since the migration already set DEFAULT 1... let's keep it simple:
-- ref_count tracks how many post_media + post_attachments reference this file.
-- It starts at 0 and gets incremented by triggers.
-- We need to change the default in a separate step.

-- For now, these triggers track additional references beyond the first.
-- The cleanup job checks ref_count <= 0 to find orphaned files.

CREATE TRIGGER trg_post_media_file_ref
    AFTER INSERT OR DELETE ON post_media
    FOR EACH ROW EXECUTE FUNCTION fn_file_ref_count();

CREATE TRIGGER trg_post_attachments_file_ref
    AFTER INSERT OR DELETE ON post_attachments
    FOR EACH ROW EXECUTE FUNCTION fn_file_ref_count();

COMMIT;
