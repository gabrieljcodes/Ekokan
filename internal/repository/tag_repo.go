package repository

import (
	"context"
	"fmt"
	"strings"

	"ekokan/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type TagRepo struct {
	pool *pgxpool.Pool
}

func NewTagRepo(pool *pgxpool.Pool) *TagRepo {
	return &TagRepo{pool: pool}
}

func (r *TagRepo) List(ctx context.Context, category string) ([]models.Tag, error) {
	var query string
	var args []any

	if category != "" {
		query = `SELECT id, name, slug, category, post_count, created_at FROM tags WHERE category = $1 ORDER BY name ASC LIMIT 1000`
		args = []any{category}
	} else {
		query = `SELECT id, name, slug, category, post_count, created_at FROM tags ORDER BY post_count DESC, name ASC LIMIT 1000`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("listing tags: %w", err)
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var t models.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Category, &t.PostCount, &t.CreatedAt); err != nil {
			return nil, err
		}
		tags = append(tags, t)
	}
	if tags == nil {
		tags = []models.Tag{}
	}
	return tags, rows.Err()
}

func (r *TagRepo) GetBySlug(ctx context.Context, slug string) (*models.Tag, error) {
	var t models.Tag
	err := r.pool.QueryRow(ctx,
		`SELECT id, name, slug, category, post_count, created_at FROM tags WHERE slug = $1`,
		slug,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Category, &t.PostCount, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting tag: %w", err)
	}
	return &t, nil
}

func (r *TagRepo) FindOrCreate(ctx context.Context, name, category string) (*models.Tag, error) {
	slug := slugify(name)
	if category == "" {
		category = "general"
	}

	var t models.Tag
	err := r.pool.QueryRow(ctx, `
		INSERT INTO tags (name, slug, category)
		VALUES ($1, $2, $3)
		ON CONFLICT (slug) DO UPDATE
		SET name = EXCLUDED.name, category = EXCLUDED.category
		WHERE tags.name IS DISTINCT FROM EXCLUDED.name OR tags.category IS DISTINCT FROM EXCLUDED.category
		RETURNING id, name, slug, category, post_count, created_at
	`, name, slug, category).Scan(&t.ID, &t.Name, &t.Slug, &t.Category, &t.PostCount, &t.CreatedAt)
	if err == nil {
		return &t, nil
	}
	if err != pgx.ErrNoRows {
		return nil, fmt.Errorf("upserting tag: %w", err)
	}

	// Tag already existed without changes; fetch it
	return r.GetBySlug(ctx, slug)
}

func (r *TagRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM tags WHERE id = $1`, id)
	return err
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			return r
		}
		if r == ' ' || r == '_' {
			return '-'
		}
		return -1
	}, s)
	// Remove consecutive dashes
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	return strings.Trim(s, "-")
}
