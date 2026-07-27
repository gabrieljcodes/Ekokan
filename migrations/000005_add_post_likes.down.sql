DROP TRIGGER IF EXISTS trg_post_likes_count ON post_likes;
DROP FUNCTION IF EXISTS fn_posts_like_count();
ALTER TABLE posts DROP COLUMN IF EXISTS like_count;
DROP TABLE IF EXISTS post_likes;
