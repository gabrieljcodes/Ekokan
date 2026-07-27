-- Table for user likes on posts
CREATE TABLE IF NOT EXISTS post_likes (
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    post_id     UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes (user_id);

-- Add like_count column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count INT NOT NULL DEFAULT 0;

-- Trigger to automatically update posts.like_count
CREATE OR REPLACE FUNCTION fn_posts_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_likes_count ON post_likes;
CREATE TRIGGER trg_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION fn_posts_like_count();
