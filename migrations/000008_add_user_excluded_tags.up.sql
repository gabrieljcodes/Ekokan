-- ============================================================
-- user_excluded_tags: Persistent user blacklisted tags
-- ============================================================
CREATE TABLE IF NOT EXISTS user_excluded_tags (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_user_excluded_tags_user_id ON user_excluded_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_excluded_tags_tag_id ON user_excluded_tags(tag_id);
