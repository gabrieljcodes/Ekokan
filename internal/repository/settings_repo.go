package repository

import (
	"context"
	"fmt"
	"strconv"

	"ekokan/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepo struct {
	pool *pgxpool.Pool
}

func NewSettingsRepo(pool *pgxpool.Pool) *SettingsRepo {
	return &SettingsRepo{pool: pool}
}

func (r *SettingsRepo) GetSettings(ctx context.Context) (*models.AppSettings, error) {
	rows, err := r.pool.Query(ctx, `SELECT key, value FROM app_settings`)
	if err != nil {
		return nil, fmt.Errorf("getting settings: %w", err)
	}
	defer rows.Close()

	settings := &models.AppSettings{
		AllowUserArtistCreation: true,
		AllowUserPostCreation:   true,
	}

	for rows.Next() {
		var key, val string
		if err := rows.Scan(&key, &val); err != nil {
			continue
		}
		if key == "allow_user_artist_creation" {
			settings.AllowUserArtistCreation, _ = strconv.ParseBool(val)
		} else if key == "allow_user_post_creation" {
			settings.AllowUserPostCreation, _ = strconv.ParseBool(val)
		}
	}
	return settings, nil
}

func (r *SettingsRepo) UpdateSettings(ctx context.Context, s models.AppSettings) (*models.AppSettings, error) {
	queries := map[string]string{
		"allow_user_artist_creation": strconv.FormatBool(s.AllowUserArtistCreation),
		"allow_user_post_creation":   strconv.FormatBool(s.AllowUserPostCreation),
	}
	for k, v := range queries {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
		`, k, v)
		if err != nil {
			return nil, fmt.Errorf("updating setting %s: %w", k, err)
		}
	}
	return r.GetSettings(ctx)
}
