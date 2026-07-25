package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"ekokan/internal/models"
	"ekokan/internal/storage"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ArtistRepo struct {
	pool  *pgxpool.Pool
	store *storage.OpenDALStore
}

func NewArtistRepo(pool *pgxpool.Pool, store *storage.OpenDALStore) *ArtistRepo {
	return &ArtistRepo{pool: pool, store: store}
}

func (r *ArtistRepo) List(ctx context.Context, params models.PaginationParams, search string) (*models.PaginatedResult[models.Artist], error) {
	var total int
	var countQuery string
	var countArgs []any

	if search != "" {
		countQuery = `SELECT count(*) FROM artists WHERE name ILIKE $1 OR slug ILIKE $1`
		countArgs = []any{"%" + search + "%"}
	} else {
		countQuery = `SELECT count(*) FROM artists`
	}

	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, fmt.Errorf("counting artists: %w", err)
	}

	var query string
	var args []any

	if search != "" {
		query = `
			SELECT a.id, a.user_id, a.name, a.slug, a.bio, a.avatar_file_id, a.banner_file_id,
			       a.links, a.post_count, a.created_at, a.updated_at,
			       af.file_path, bf.file_path
			FROM artists a
			LEFT JOIN files af ON a.avatar_file_id = af.id
			LEFT JOIN files bf ON a.banner_file_id = bf.id
			WHERE a.name ILIKE $1 OR a.slug ILIKE $1
			ORDER BY a.name ASC
			LIMIT $2 OFFSET $3
		`
		args = []any{"%" + search + "%", params.Limit(), params.Offset()}
	} else {
		query = `
			SELECT a.id, a.user_id, a.name, a.slug, a.bio, a.avatar_file_id, a.banner_file_id,
			       a.links, a.post_count, a.created_at, a.updated_at,
			       af.file_path, bf.file_path
			FROM artists a
			LEFT JOIN files af ON a.avatar_file_id = af.id
			LEFT JOIN files bf ON a.banner_file_id = bf.id
			ORDER BY a.name ASC
			LIMIT $1 OFFSET $2
		`
		args = []any{params.Limit(), params.Offset()}
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listing artists: %w", err)
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
			return nil, fmt.Errorf("scanning artist: %w", err)
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
		artists = append(artists, a)
	}

	if artists == nil {
		artists = []models.Artist{}
	}

	limit := params.Limit()
	totalPages := (total + limit - 1) / limit

	return &models.PaginatedResult[models.Artist]{
		Data:       artists,
		Total:      total,
		Page:       params.Page,
		PerPage:    limit,
		TotalPages: totalPages,
	}, nil
}

func (r *ArtistRepo) GetBySlug(ctx context.Context, slug string) (*models.Artist, error) {
	var a models.Artist
	var linksJSON []byte
	var avatarPath, bannerPath *string

	err := r.pool.QueryRow(ctx, `
		SELECT a.id, a.user_id, a.name, a.slug, a.bio, a.avatar_file_id, a.banner_file_id,
		       a.links, a.post_count, a.created_at, a.updated_at,
		       af.file_path, bf.file_path
		FROM artists a
		LEFT JOIN files af ON a.avatar_file_id = af.id
		LEFT JOIN files bf ON a.banner_file_id = bf.id
		WHERE a.slug = $1
	`, slug).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Slug, &a.Bio, &a.AvatarFileID, &a.BannerFileID,
		&linksJSON, &a.PostCount, &a.CreatedAt, &a.UpdatedAt,
		&avatarPath, &bannerPath,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting artist by slug: %w", err)
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

func (r *ArtistRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Artist, error) {
	var a models.Artist
	var linksJSON []byte
	var avatarPath, bannerPath *string

	err := r.pool.QueryRow(ctx, `
		SELECT a.id, a.user_id, a.name, a.slug, a.bio, a.avatar_file_id, a.banner_file_id,
		       a.links, a.post_count, a.created_at, a.updated_at,
		       af.file_path, bf.file_path
		FROM artists a
		LEFT JOIN files af ON a.avatar_file_id = af.id
		LEFT JOIN files bf ON a.banner_file_id = bf.id
		WHERE a.id = $1
	`, id).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Slug, &a.Bio, &a.AvatarFileID, &a.BannerFileID,
		&linksJSON, &a.PostCount, &a.CreatedAt, &a.UpdatedAt,
		&avatarPath, &bannerPath,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting artist by id: %w", err)
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

type CreateArtistInput struct {
	Name         string            `json:"name"`
	Slug         string            `json:"slug"`
	Bio          string            `json:"bio"`
	Links        map[string]string `json:"links"`
	AvatarFileID *uuid.UUID        `json:"avatar_file_id"`
	BannerFileID *uuid.UUID        `json:"banner_file_id"`
}

func (r *ArtistRepo) Create(ctx context.Context, input CreateArtistInput) (*models.Artist, error) {
	links := input.Links
	if links == nil {
		links = make(map[string]string)
	}
	linksJSON, _ := json.Marshal(links)

	var a models.Artist
	err := r.pool.QueryRow(ctx, `
		INSERT INTO artists (name, slug, bio, avatar_file_id, banner_file_id, links)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, name, slug, bio, avatar_file_id, banner_file_id, links, post_count, created_at, updated_at
	`, input.Name, input.Slug, input.Bio, input.AvatarFileID, input.BannerFileID, linksJSON,
	).Scan(
		&a.ID, &a.UserID, &a.Name, &a.Slug, &a.Bio, &a.AvatarFileID, &a.BannerFileID,
		&linksJSON, &a.PostCount, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating artist: %w", err)
	}
	_ = json.Unmarshal(linksJSON, &a.Links)
	return &a, nil
}

type UpdateArtistInput struct {
	Name         *string            `json:"name"`
	Bio          *string            `json:"bio"`
	Links        map[string]string  `json:"links"`
	AvatarFileID *uuid.UUID         `json:"avatar_file_id"`
	BannerFileID *uuid.UUID         `json:"banner_file_id"`
}

func (r *ArtistRepo) Update(ctx context.Context, id uuid.UUID, input UpdateArtistInput) (*models.Artist, error) {
	artist, err := r.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if artist == nil {
		return nil, nil
	}

	if input.Name != nil {
		artist.Name = *input.Name
	}
	if input.Bio != nil {
		artist.Bio = *input.Bio
	}
	if input.Links != nil {
		artist.Links = input.Links
	}
	if input.AvatarFileID != nil {
		artist.AvatarFileID = input.AvatarFileID
	}
	if input.BannerFileID != nil {
		artist.BannerFileID = input.BannerFileID
	}

	linksJSON, _ := json.Marshal(artist.Links)

	var linksOut []byte
	err = r.pool.QueryRow(ctx, `
		UPDATE artists SET name=$2, bio=$3, links=$4, avatar_file_id=$5, banner_file_id=$6
		WHERE id=$1
		RETURNING id, user_id, name, slug, bio, avatar_file_id, banner_file_id, links, post_count, created_at, updated_at
	`, id, artist.Name, artist.Bio, linksJSON, artist.AvatarFileID, artist.BannerFileID,
	).Scan(
		&artist.ID, &artist.UserID, &artist.Name, &artist.Slug, &artist.Bio,
		&artist.AvatarFileID, &artist.BannerFileID,
		&linksOut, &artist.PostCount, &artist.CreatedAt, &artist.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("updating artist: %w", err)
	}
	_ = json.Unmarshal(linksOut, &artist.Links)
	return artist, nil
}

func (r *ArtistRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM artists WHERE id = $1`, id)
	return err
}
