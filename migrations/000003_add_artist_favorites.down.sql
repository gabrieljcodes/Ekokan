-- Ekokan Migration: Down Add Artist Favorites

BEGIN;

DROP TABLE IF EXISTS artist_favorites;

COMMIT;
