package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"ekokan/internal/models"
	"ekokan/internal/storage"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FavoriteRepo struct {
	pool  *pgxpool.Pool
	store *storage.OpenDALStore
}

func NewFavoriteRepo(pool *pgxpool.Pool, store *storage.OpenDALStore) *FavoriteRepo {
	return &FavoriteRepo{pool: pool, store: store}
}

// Post Favorites

func (r *FavoriteRepo) TogglePostFavorite(ctx context.Context, userID, postID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM favorites WHERE user_id = $1 AND post_id = $2`, userID, postID)
	if err != nil {
		return false, fmt.Errorf("toggling post favorite delete: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return false, nil // Was removed
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO favorites (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, postID)
	if err != nil {
		return false, fmt.Errorf("toggling post favorite insert: %w", err)
	}
	return true, nil // Now favorited
}

func (r *FavoriteRepo) ListUserFavPostIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `SELECT post_id FROM favorites WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user fav post ids: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return ids, nil
}

func (r *FavoriteRepo) TogglePostLike(ctx context.Context, userID, postID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2`, userID, postID)
	if err != nil {
		return false, fmt.Errorf("toggling post like delete: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return false, nil // Was removed
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, postID)
	if err != nil {
		return false, fmt.Errorf("toggling post like insert: %w", err)
	}
	return true, nil // Now liked
}

func (r *FavoriteRepo) ListUserLikedPostIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `SELECT post_id FROM post_likes WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user liked post ids: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return ids, nil
}

func (r *FavoriteRepo) ListUserFavPosts(ctx context.Context, userID uuid.UUID) ([]models.Post, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT p.id, p.artist_id, p.title, p.slug, p.content, p.source_url,
		       p.published_at, p.imported_at, p.media_count, p.attachment_count,
		       p.comment_count, p.like_count, p.created_at, p.updated_at,
		       a.id, a.name, a.slug
		FROM favorites f
		JOIN posts p ON f.post_id = p.id
		JOIN artists a ON p.artist_id = a.id
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user fav posts: %w", err)
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		var art models.Artist
		if err := rows.Scan(
			&p.ID, &p.ArtistID, &p.Title, &p.Slug, &p.Content, &p.SourceURL,
			&p.PublishedAt, &p.ImportedAt, &p.MediaCount, &p.AttachmentCount,
			&p.CommentCount, &p.LikeCount, &p.CreatedAt, &p.UpdatedAt,
			&art.ID, &art.Name, &art.Slug,
		); err != nil {
			return nil, fmt.Errorf("scanning fav post: %w", err)
		}
		p.IsFavorited = true
		p.Artist = &art
		posts = append(posts, p)
	}
	if posts == nil {
		posts = []models.Post{}
	}
	return posts, nil
}

// Artist Favorites

func (r *FavoriteRepo) ToggleArtistFavorite(ctx context.Context, userID, artistID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx, `DELETE FROM artist_favorites WHERE user_id = $1 AND artist_id = $2`, userID, artistID)
	if err != nil {
		return false, fmt.Errorf("toggling artist favorite delete: %w", err)
	}
	if tag.RowsAffected() > 0 {
		return false, nil
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO artist_favorites (user_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, artistID)
	if err != nil {
		return false, fmt.Errorf("toggling artist favorite insert: %w", err)
	}
	return true, nil
}

func (r *FavoriteRepo) ListUserFavArtistIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `SELECT artist_id FROM artist_favorites WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user fav artist ids: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err == nil {
			ids = append(ids, id)
		}
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return ids, nil
}

func (r *FavoriteRepo) ListUserFavArtists(ctx context.Context, userID uuid.UUID) ([]models.Artist, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT a.id, a.user_id, a.name, a.slug, a.bio, a.avatar_file_id, a.banner_file_id,
		       a.links, a.post_count, a.created_at, a.updated_at,
		       af.file_path, bf.file_path
		FROM artist_favorites fav
		JOIN artists a ON fav.artist_id = a.id
		LEFT JOIN files af ON a.avatar_file_id = af.id
		LEFT JOIN files bf ON a.banner_file_id = bf.id
		WHERE fav.user_id = $1
		ORDER BY fav.created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user fav artists: %w", err)
	}
	defer rows.Close()

	var artists []models.Artist
	for rows.Next() {
		var a models.Artist
		var linksJSON []byte
		var avatarPath, bannerPath *string
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.Slug, &a.Bio, &a.AvatarFileID, &a.BannerFileID,
			&linksJSON, &a.PostCount, &a.CreatedAt, &a.UpdatedAt,
			&avatarPath, &bannerPath,
		); err != nil {
			return nil, fmt.Errorf("scanning fav artist: %w", err)
		}
		if avatarPath != nil {
			a.AvatarURL = r.store.PublicURL(*avatarPath)
		}
		if bannerPath != nil {
			a.BannerURL = r.store.PublicURL(*bannerPath)
		}
		_ = json.Unmarshal(linksJSON, &a.Links)
		a.IsFavorited = true
		artists = append(artists, a)
	}
	if artists == nil {
		artists = []models.Artist{}
	}
	return artists, nil
}
