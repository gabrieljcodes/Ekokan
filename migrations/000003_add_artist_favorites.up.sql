-- Ekokan Migration: Add Artist Favorites

BEGIN;

CREATE TABLE IF NOT EXISTS artist_favorites (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_favorites_artist ON artist_favorites (artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_favorites_user ON artist_favorites (user_id);

COMMIT;
