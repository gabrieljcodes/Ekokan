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
			return nil, fmt.Errorf("scanning setting: %w", err)
		}
		if key == "allow_user_artist_creation" {
			settings.AllowUserArtistCreation, _ = strconv.ParseBool(val)
		} else if key == "allow_user_post_creation" {
			settings.AllowUserPostCreation, _ = strconv.ParseBool(val)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating settings: %w", err)
	}
	return settings, nil
}

func (r *SettingsRepo) UpdateSettings(ctx context.Context, s models.AppSettings) (*models.AppSettings, error) {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO app_settings (key, value, updated_at)
		VALUES ('allow_user_artist_creation', $1, NOW()), ('allow_user_post_creation', $2, NOW())
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`, strconv.FormatBool(s.AllowUserArtistCreation), strconv.FormatBool(s.AllowUserPostCreation))
	if err != nil {
		return nil, fmt.Errorf("updating app settings: %w", err)
	}
	return r.GetSettings(ctx)
}
