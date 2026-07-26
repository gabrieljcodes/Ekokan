package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"ekokan/internal/models"
	"ekokan/internal/storage"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostRepo struct {
	pool  *pgxpool.Pool
	store *storage.OpenDALStore
}

func NewPostRepo(pool *pgxpool.Pool, store *storage.OpenDALStore) *PostRepo {
	return &PostRepo{pool: pool, store: store}
}

func (r *PostRepo) ListByArtist(ctx context.Context, artistID uuid.UUID, params models.PaginationParams) (*models.PaginatedResult[models.Post], error) {
	var total int
	if err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM posts WHERE artist_id = $1`, artistID,
	).Scan(&total); err != nil {
		return nil, fmt.Errorf("counting posts: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.artist_id, p.title, p.slug, p.content, p.source_url,
		       p.published_at, p.imported_at, p.media_count, p.attachment_count,
		       p.comment_count, p.created_at, p.updated_at
		FROM posts p
		WHERE p.artist_id = $1
		ORDER BY p.published_at DESC
		LIMIT $2 OFFSET $3
	`, artistID, params.Limit(), params.Offset())
	if err != nil {
		return nil, fmt.Errorf("listing posts: %w", err)
	}
	defer rows.Close()

	posts, err := r.scanPosts(ctx, rows, true)
	if err != nil {
		return nil, err
	}

	limit := params.Limit()
	totalPages := (total + limit - 1) / limit

	return &models.PaginatedResult[models.Post]{
		Data:       posts,
		Total:      total,
		Page:       params.Page,
		PerPage:    limit,
		TotalPages: totalPages,
	}, nil
}

func (r *PostRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Post, error) {
	var p models.Post
	err := r.pool.QueryRow(ctx, `
		SELECT p.id, p.artist_id, p.title, p.slug, p.content, p.source_url,
		       p.published_at, p.imported_at, p.media_count, p.attachment_count,
		       p.comment_count, p.created_at, p.updated_at
		FROM posts p
		WHERE p.id = $1
	`, id).Scan(
		&p.ID, &p.ArtistID, &p.Title, &p.Slug, &p.Content, &p.SourceURL,
		&p.PublishedAt, &p.ImportedAt, &p.MediaCount, &p.AttachmentCount,
		&p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting post: %w", err)
	}

	// Load related data
	p.Media, _ = r.loadMedia(ctx, p.ID)
	p.Attachments, _ = r.loadAttachments(ctx, p.ID)
	p.Tags, _ = r.loadTags(ctx, p.ID)

	return &p, nil
}

// GetAdjacentPosts returns the previous and next post for an artist, sorted by published_at.
func (r *PostRepo) GetAdjacentPosts(ctx context.Context, postID, artistID uuid.UUID, publishedAt interface{}) (prev *models.Post, next *models.Post, err error) {
	// Previous (older)
	var prevPost models.Post
	err = r.pool.QueryRow(ctx, `
		SELECT id, title, slug, published_at
		FROM posts
		WHERE artist_id = $1 AND published_at < (SELECT published_at FROM posts WHERE id = $2)
		ORDER BY published_at DESC
		LIMIT 1
	`, artistID, postID).Scan(&prevPost.ID, &prevPost.Title, &prevPost.Slug, &prevPost.PublishedAt)
	if err == nil {
		prev = &prevPost
	}

	// Next (newer)
	var nextPost models.Post
	err = r.pool.QueryRow(ctx, `
		SELECT id, title, slug, published_at
		FROM posts
		WHERE artist_id = $1 AND published_at > (SELECT published_at FROM posts WHERE id = $2)
		ORDER BY published_at ASC
		LIMIT 1
	`, artistID, postID).Scan(&nextPost.ID, &nextPost.Title, &nextPost.Slug, &nextPost.PublishedAt)
	if err == nil {
		next = &nextPost
	}

	return prev, next, nil
}

type CreatePostInput struct {
	ArtistID    uuid.UUID   `json:"artist_id"`
	Title       string      `json:"title"`
	Slug        string      `json:"slug"`
	Content     string      `json:"content"`
	SourceURL   *string     `json:"source_url"`
	PublishedAt *time.Time  `json:"published_at"`
	ImportedAt  *time.Time  `json:"imported_at"`
	TagIDs      []uuid.UUID `json:"tag_ids"`
}

func (r *PostRepo) Create(ctx context.Context, input CreatePostInput) (*models.Post, error) {
	publishedAt := time.Now()
	if input.PublishedAt != nil && !input.PublishedAt.IsZero() {
		publishedAt = *input.PublishedAt
	}

	var importedAt *time.Time
	if input.ImportedAt != nil && !input.ImportedAt.IsZero() {
		importedAt = input.ImportedAt
	} else if input.SourceURL != nil && *input.SourceURL != "" {
		now := time.Now()
		importedAt = &now
	}

	var p models.Post
	err := r.pool.QueryRow(ctx, `
		INSERT INTO posts (artist_id, title, slug, content, source_url, published_at, imported_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (artist_id, slug) DO UPDATE
		SET title = EXCLUDED.title,
		    content = EXCLUDED.content,
		    source_url = EXCLUDED.source_url,
		    published_at = EXCLUDED.published_at,
		    imported_at = EXCLUDED.imported_at,
		    updated_at = now()
		RETURNING id, artist_id, title, slug, content, source_url, published_at, imported_at,
		          media_count, attachment_count, comment_count, created_at, updated_at
	`, input.ArtistID, input.Title, input.Slug, input.Content, input.SourceURL, publishedAt, importedAt,
	).Scan(
		&p.ID, &p.ArtistID, &p.Title, &p.Slug, &p.Content, &p.SourceURL,
		&p.PublishedAt, &p.ImportedAt, &p.MediaCount, &p.AttachmentCount,
		&p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating post: %w", err)
	}

	// Add tags
	for _, tagID := range input.TagIDs {
		_, _ = r.pool.Exec(ctx, `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, p.ID, tagID)
	}

	p.Tags, _ = r.loadTags(ctx, p.ID)
	return &p, nil
}

type UpdatePostInput struct {
	Title       *string     `json:"title"`
	Content     *string     `json:"content"`
	PublishedAt *time.Time  `json:"published_at"`
	ImportedAt  *time.Time  `json:"imported_at"`
	TagIDs      []uuid.UUID `json:"tag_ids"`
}

func (r *PostRepo) Update(ctx context.Context, id uuid.UUID, input UpdatePostInput) (*models.Post, error) {
	post, err := r.GetByID(ctx, id)
	if err != nil || post == nil {
		return nil, err
	}

	if input.Title != nil {
		post.Title = *input.Title
	}
	if input.Content != nil {
		post.Content = *input.Content
	}
	if input.PublishedAt != nil {
		post.PublishedAt = *input.PublishedAt
	}
	if input.ImportedAt != nil {
		post.ImportedAt = input.ImportedAt
	}

	err = r.pool.QueryRow(ctx, `
		UPDATE posts SET title=$2, content=$3, published_at=$4, imported_at=$5, updated_at=now()
		WHERE id=$1
		RETURNING id, artist_id, title, slug, content, source_url, published_at, imported_at,
		          media_count, attachment_count, comment_count, created_at, updated_at
	`, id, post.Title, post.Content, post.PublishedAt, post.ImportedAt).Scan(
		&post.ID, &post.ArtistID, &post.Title, &post.Slug, &post.Content, &post.SourceURL,
		&post.PublishedAt, &post.ImportedAt, &post.MediaCount, &post.AttachmentCount,
		&post.CommentCount, &post.CreatedAt, &post.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("updating post: %w", err)
	}

	// Rebuild tags if provided
	if input.TagIDs != nil {
		_, _ = r.pool.Exec(ctx, `DELETE FROM post_tags WHERE post_id = $1`, id)
		for _, tagID := range input.TagIDs {
			_, _ = r.pool.Exec(ctx, `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, id, tagID)
		}
	}

	post.Tags, _ = r.loadTags(ctx, id)
	post.Media, _ = r.loadMedia(ctx, id)
	post.Attachments, _ = r.loadAttachments(ctx, id)

	return post, nil
}

func (r *PostRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM posts WHERE id = $1`, id)
	return err
}

func (r *PostRepo) ListByTag(ctx context.Context, tagID uuid.UUID, params models.PaginationParams) (*models.PaginatedResult[models.Post], error) {
	var total int
	if err := r.pool.QueryRow(ctx,
		`SELECT count(*) FROM post_tags WHERE tag_id = $1`, tagID,
	).Scan(&total); err != nil {
		return nil, fmt.Errorf("counting posts by tag: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.artist_id, p.title, p.slug, p.content, p.source_url,
		       p.published_at, p.imported_at, p.media_count, p.attachment_count,
		       p.comment_count, p.created_at, p.updated_at
		FROM posts p
		JOIN post_tags pt ON pt.post_id = p.id
		WHERE pt.tag_id = $1
		ORDER BY p.published_at DESC
		LIMIT $2 OFFSET $3
	`, tagID, params.Limit(), params.Offset())
	if err != nil {
		return nil, fmt.Errorf("listing posts by tag: %w", err)
	}
	defer rows.Close()

	posts, err := r.scanPosts(ctx, rows, true)
	if err != nil {
		return nil, err
	}

	limit := params.Limit()
	totalPages := (total + limit - 1) / limit

	return &models.PaginatedResult[models.Post]{
		Data:       posts,
		Total:      total,
		Page:       params.Page,
		PerPage:    limit,
		TotalPages: totalPages,
	}, nil
}

// Recent returns recent posts across all artists
func (r *PostRepo) Recent(ctx context.Context, params models.PaginationParams) (*models.PaginatedResult[models.Post], error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT count(*) FROM posts`).Scan(&total); err != nil {
		return nil, fmt.Errorf("counting all posts: %w", err)
	}

	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.artist_id, p.title, p.slug, p.content, p.source_url,
		       p.published_at, p.imported_at, p.media_count, p.attachment_count,
		       p.comment_count, p.created_at, p.updated_at
		FROM posts p
		ORDER BY p.published_at DESC
		LIMIT $1 OFFSET $2
	`, params.Limit(), params.Offset())
	if err != nil {
		return nil, fmt.Errorf("listing recent posts: %w", err)
	}
	defer rows.Close()

	posts, err := r.scanPosts(ctx, rows, true)
	if err != nil {
		return nil, err
	}

	limit := params.Limit()
	totalPages := (total + limit - 1) / limit

	return &models.PaginatedResult[models.Post]{
		Data:       posts,
		Total:      total,
		Page:       params.Page,
		PerPage:    limit,
		TotalPages: totalPages,
	}, nil
}

// --- helpers ---

func (r *PostRepo) scanPosts(ctx context.Context, rows pgx.Rows, loadThumb bool) ([]models.Post, error) {
	var posts []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(
			&p.ID, &p.ArtistID, &p.Title, &p.Slug, &p.Content, &p.SourceURL,
			&p.PublishedAt, &p.ImportedAt, &p.MediaCount, &p.AttachmentCount,
			&p.CommentCount, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning post: %w", err)
		}
		posts = append(posts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(posts) == 0 {
		return []models.Post{}, nil
	}

	postIDs := make([]uuid.UUID, len(posts))
	for i, p := range posts {
		postIDs[i] = p.ID
	}

	if loadThumb {
		mediaMap, _ := r.loadFirstMediaBatch(ctx, postIDs)
		for i := range posts {
			if m, ok := mediaMap[posts[i].ID]; ok && posts[i].MediaCount > 0 {
				posts[i].Media = []models.PostMedia{m}
			}
		}
	}

	tagsMap, _ := r.loadTagsBatch(ctx, postIDs)
	for i := range posts {
		if tags, ok := tagsMap[posts[i].ID]; ok {
			posts[i].Tags = tags
		} else {
			posts[i].Tags = []models.Tag{}
		}
	}

	return posts, nil
}

func (r *PostRepo) loadFirstMediaBatch(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID]models.PostMedia, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT DISTINCT ON (pm.post_id)
		       pm.id, pm.post_id, pm.file_id, pm.sort_order, pm.caption, pm.created_at,
		       f.id, f.sha256, f.file_path, f.original_name, f.mime_type, f.file_size,
		       f.width, f.height, f.duration_ms
		FROM post_media pm
		JOIN files f ON f.id = pm.file_id
		WHERE pm.post_id = ANY($1)
		ORDER BY pm.post_id, pm.sort_order ASC
	`, postIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[uuid.UUID]models.PostMedia)
	for rows.Next() {
		var m models.PostMedia
		var f models.File
		if err := rows.Scan(
			&m.ID, &m.PostID, &m.FileID, &m.SortOrder, &m.Caption, &m.CreatedAt,
			&f.ID, &f.SHA256, &f.FilePath, &f.OriginalName, &f.MimeType, &f.FileSize,
			&f.Width, &f.Height, &f.DurationMs,
		); err != nil {
			return nil, err
		}
		f.URL = r.store.PublicURL(f.FilePath)
		m.File = &f
		res[m.PostID] = m
	}
	return res, rows.Err()
}

func (r *PostRepo) loadTagsBatch(ctx context.Context, postIDs []uuid.UUID) (map[uuid.UUID][]models.Tag, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT pt.post_id, t.id, t.name, t.slug, t.category, t.post_count
		FROM tags t
		JOIN post_tags pt ON pt.tag_id = t.id
		WHERE pt.post_id = ANY($1)
		ORDER BY t.name ASC
	`, postIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := make(map[uuid.UUID][]models.Tag)
	for rows.Next() {
		var postID uuid.UUID
		var tag models.Tag
		if err := rows.Scan(&postID, &tag.ID, &tag.Name, &tag.Slug, &tag.Category, &tag.PostCount); err != nil {
			return nil, err
		}
		res[postID] = append(res[postID], tag)
	}
	return res, rows.Err()
}

func (r *PostRepo) loadMedia(ctx context.Context, postID uuid.UUID) ([]models.PostMedia, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT pm.id, pm.post_id, pm.file_id, pm.sort_order, pm.caption, pm.created_at,
		       f.id, f.sha256, f.file_path, f.original_name, f.mime_type, f.file_size,
		       f.width, f.height, f.duration_ms
		FROM post_media pm
		JOIN files f ON f.id = pm.file_id
		WHERE pm.post_id = $1
		ORDER BY pm.sort_order ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var media []models.PostMedia
	for rows.Next() {
		var m models.PostMedia
		var f models.File
		if err := rows.Scan(
			&m.ID, &m.PostID, &m.FileID, &m.SortOrder, &m.Caption, &m.CreatedAt,
			&f.ID, &f.SHA256, &f.FilePath, &f.OriginalName, &f.MimeType, &f.FileSize,
			&f.Width, &f.Height, &f.DurationMs,
		); err != nil {
			return nil, err
		}
		f.URL = r.store.PublicURL(f.FilePath)
		m.File = &f
		media = append(media, m)
	}
	if media == nil {
		media = []models.PostMedia{}
	}
	return media, rows.Err()
}

func (r *PostRepo) loadFirstMedia(ctx context.Context, postID uuid.UUID) (*models.PostMedia, error) {
	var m models.PostMedia
	var f models.File
	err := r.pool.QueryRow(ctx, `
		SELECT pm.id, pm.post_id, pm.file_id, pm.sort_order, pm.caption, pm.created_at,
		       f.id, f.sha256, f.file_path, f.original_name, f.mime_type, f.file_size,
		       f.width, f.height, f.duration_ms
		FROM post_media pm
		JOIN files f ON f.id = pm.file_id
		WHERE pm.post_id = $1
		ORDER BY pm.sort_order ASC
		LIMIT 1
	`, postID).Scan(
		&m.ID, &m.PostID, &m.FileID, &m.SortOrder, &m.Caption, &m.CreatedAt,
		&f.ID, &f.SHA256, &f.FilePath, &f.OriginalName, &f.MimeType, &f.FileSize,
		&f.Width, &f.Height, &f.DurationMs,
	)
	if err != nil {
		return nil, err
	}
	f.URL = r.store.PublicURL(f.FilePath)
	m.File = &f
	return &m, nil
}

func (r *PostRepo) loadAttachments(ctx context.Context, postID uuid.UUID) ([]models.PostAttachment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT pa.id, pa.post_id, pa.file_id, pa.display_name, pa.created_at,
		       f.id, f.sha256, f.file_path, f.original_name, f.mime_type, f.file_size
		FROM post_attachments pa
		JOIN files f ON f.id = pa.file_id
		WHERE pa.post_id = $1
		ORDER BY pa.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attachments []models.PostAttachment
	for rows.Next() {
		var a models.PostAttachment
		var f models.File
		if err := rows.Scan(
			&a.ID, &a.PostID, &a.FileID, &a.DisplayName, &a.CreatedAt,
			&f.ID, &f.SHA256, &f.FilePath, &f.OriginalName, &f.MimeType, &f.FileSize,
		); err != nil {
			return nil, err
		}
		f.URL = r.store.PublicURL(f.FilePath)
		a.File = &f
		attachments = append(attachments, a)
	}
	if attachments == nil {
		attachments = []models.PostAttachment{}
	}
	return attachments, rows.Err()
}

func (r *PostRepo) loadTags(ctx context.Context, postID uuid.UUID) ([]models.Tag, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT t.id, t.name, t.slug, t.category, t.post_count
		FROM tags t
		JOIN post_tags pt ON pt.tag_id = t.id
		WHERE pt.post_id = $1
		ORDER BY t.name ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Category, &t.PostCount); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	if tags == nil {
		tags = []models.Tag{}
	}
	return tags, rows.Err()
}

// AddMedia adds a file reference as media to a post (idempotent on duplicate)
func (r *PostRepo) AddMedia(ctx context.Context, postID, fileID uuid.UUID, sortOrder int, caption string) (*models.PostMedia, error) {
	var m models.PostMedia
	err := r.pool.QueryRow(ctx, `
		INSERT INTO post_media (post_id, file_id, sort_order, caption)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (post_id, file_id) DO UPDATE SET file_id = EXCLUDED.file_id
		RETURNING id, post_id, file_id, sort_order, caption, created_at
	`, postID, fileID, sortOrder, caption).Scan(
		&m.ID, &m.PostID, &m.FileID, &m.SortOrder, &m.Caption, &m.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("adding media: %w", err)
	}
	return &m, nil
}

func (r *PostRepo) RemoveMedia(ctx context.Context, mediaID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM post_media WHERE id = $1`, mediaID)
	return err
}

// AddAttachment adds a file reference as attachment to a post (idempotent on duplicate)
func (r *PostRepo) AddAttachment(ctx context.Context, postID, fileID uuid.UUID, displayName string) (*models.PostAttachment, error) {
	var dn *string
	if displayName != "" {
		dn = &displayName
	}
	var a models.PostAttachment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO post_attachments (post_id, file_id, display_name)
		VALUES ($1, $2, $3)
		ON CONFLICT (post_id, file_id) DO UPDATE SET file_id = EXCLUDED.file_id
		RETURNING id, post_id, file_id, display_name, created_at
	`, postID, fileID, dn).Scan(
		&a.ID, &a.PostID, &a.FileID, &a.DisplayName, &a.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("adding attachment: %w", err)
	}
	return &a, nil
}

func (r *PostRepo) RemoveAttachment(ctx context.Context, attachmentID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM post_attachments WHERE id = $1`, attachmentID)
	return err
}

// ReorderMedia updates sort_order for all media in a post
func (r *PostRepo) ReorderMedia(ctx context.Context, postID uuid.UUID, mediaIDs []uuid.UUID) error {
	for i, id := range mediaIDs {
		_, err := r.pool.Exec(ctx, `UPDATE post_media SET sort_order = $1 WHERE id = $2 AND post_id = $3`, i, id, postID)
		if err != nil {
			return fmt.Errorf("reordering media: %w", err)
		}
	}
	return nil
}

// Helper to load artist data for a post
func (r *PostRepo) LoadArtistForPost(ctx context.Context, artistID uuid.UUID) (*models.Artist, error) {
	var a models.Artist
	var linksJSON []byte
	var avatarPath, bannerPath *string

	err := r.pool.QueryRow(ctx, `
		SELECT a.id, a.name, a.slug, a.avatar_file_id,
		       af.file_path, bf.file_path
		FROM artists a
		LEFT JOIN files af ON a.avatar_file_id = af.id
		LEFT JOIN files bf ON a.banner_file_id = bf.id
		WHERE a.id = $1
	`, artistID).Scan(
		&a.ID, &a.Name, &a.Slug, &a.AvatarFileID,
		&avatarPath, &bannerPath,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	_ = json.Unmarshal(linksJSON, &a.Links)
	if a.Links == nil {
		a.Links = make(map[string]string)
	}
	if avatarPath != nil {
		a.AvatarURL = r.store.PublicURL(*avatarPath)
	}
	if bannerPath != nil {
		a.BannerURL = r.store.PublicURL(*bannerPath)
	}
	return &a, nil
}
