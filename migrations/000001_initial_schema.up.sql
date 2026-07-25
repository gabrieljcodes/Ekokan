-- Ekokan: Initial Schema
-- All tables, indexes, and constraints

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- files: Central file registry with SHA-256 deduplication
-- ============================================================
CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sha256          CHAR(64) NOT NULL,
    file_path       TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    mime_type       TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_size       BIGINT NOT NULL DEFAULT 0,
    width           INT,
    height          INT,
    duration_ms     INT,
    blurhash        TEXT,
    storage_backend TEXT NOT NULL DEFAULT 'fs',
    ref_count       INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_files_sha256 ON files (sha256);
CREATE INDEX idx_files_mime_type ON files (mime_type);

-- ============================================================
-- users: Prepared for future authentication
-- ============================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT NOT NULL,
    email           TEXT,
    password_hash   TEXT,
    display_name    TEXT,
    avatar_file_id  UUID REFERENCES files(id) ON DELETE SET NULL,
    role            TEXT NOT NULL DEFAULT 'user',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_users_username ON users (username);
CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE email IS NOT NULL;

-- ============================================================
-- artists: Creator profiles
-- ============================================================
CREATE TABLE artists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    bio             TEXT NOT NULL DEFAULT '',
    avatar_file_id  UUID REFERENCES files(id) ON DELETE SET NULL,
    banner_file_id  UUID REFERENCES files(id) ON DELETE SET NULL,
    links           JSONB NOT NULL DEFAULT '{}',
    post_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_artists_slug ON artists (slug);
CREATE INDEX idx_artists_user_id ON artists (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_artists_name ON artists USING gin (name gin_trgm_ops);

-- ============================================================
-- posts: Content entries belonging to an artist
-- ============================================================
CREATE TABLE posts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id        UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    slug             TEXT NOT NULL,
    content          TEXT NOT NULL DEFAULT '',
    source_url       TEXT,
    published_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    imported_at      TIMESTAMPTZ,
    media_count      INT NOT NULL DEFAULT 0,
    attachment_count INT NOT NULL DEFAULT 0,
    comment_count    INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_posts_artist_slug ON posts (artist_id, slug);
CREATE INDEX idx_posts_artist_published ON posts (artist_id, published_at DESC);
CREATE INDEX idx_posts_published ON posts (published_at DESC);

-- ============================================================
-- post_media: Junction between posts and files (visual media)
-- ============================================================
CREATE TABLE post_media (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_id     UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
    sort_order  INT NOT NULL DEFAULT 0,
    caption     TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_media_post ON post_media (post_id, sort_order);
CREATE UNIQUE INDEX idx_post_media_post_file ON post_media (post_id, file_id);

-- ============================================================
-- post_attachments: Junction between posts and files (downloads)
-- ============================================================
CREATE TABLE post_attachments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    file_id       UUID NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
    display_name  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_attachments_post ON post_attachments (post_id);
CREATE UNIQUE INDEX idx_post_attachments_post_file ON post_attachments (post_id, file_id);

-- ============================================================
-- tags: With categories for organization
-- ============================================================
CREATE TABLE tags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'general',
    post_count  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_tags_slug ON tags (slug);
CREATE INDEX idx_tags_category ON tags (category);
CREATE INDEX idx_tags_post_count ON tags (post_count DESC) WHERE post_count > 0;

-- ============================================================
-- post_tags: Junction between posts and tags
-- ============================================================
CREATE TABLE post_tags (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX idx_post_tags_tag ON post_tags (tag_id);

-- ============================================================
-- comments: Threaded comments on posts
-- ============================================================
CREATE TABLE comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL DEFAULT 'Anonymous',
    content     TEXT NOT NULL,
    is_edited   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_post ON comments (post_id, created_at);
CREATE INDEX idx_comments_parent ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_user ON comments (user_id) WHERE user_id IS NOT NULL;

-- ============================================================
-- favorites: User bookmarks (future, requires auth)
-- ============================================================
CREATE TABLE favorites (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_favorites_post ON favorites (post_id);

-- ============================================================
-- flags: Report system (future, requires auth)
-- ============================================================
CREATE TABLE flags (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    reason      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_flags_post ON flags (post_id);
CREATE INDEX idx_flags_status ON flags (status) WHERE status = 'pending';

COMMIT;
