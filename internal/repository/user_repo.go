package repository

import (
	"context"
	"fmt"

	"ekokan/internal/models"
	"ekokan/internal/storage"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	pool  *pgxpool.Pool
	store *storage.OpenDALStore
}

func NewUserRepo(pool *pgxpool.Pool, store *storage.OpenDALStore) *UserRepo {
	return &UserRepo{pool: pool, store: store}
}

type CreateUserInput struct {
	Username     string
	Email        *string
	PasswordHash string
	DisplayName  *string
	Role         string
}

func (r *UserRepo) Create(ctx context.Context, input CreateUserInput) (*models.User, error) {
	if input.Role == "" {
		input.Role = "user"
	}

	var u models.User
	err := r.pool.QueryRow(ctx, `
		INSERT INTO users (username, email, password_hash, display_name, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, username, email, password_hash, display_name, avatar_file_id, banner_file_id, role, is_active, created_at, updated_at
	`, input.Username, input.Email, input.PasswordHash, input.DisplayName, input.Role).Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.DisplayName, &u.AvatarFileID, &u.BannerFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	var u models.User
	var avatarPath, bannerPath *string
	err := r.pool.QueryRow(ctx, `
		SELECT u.id, u.username, u.email, u.password_hash, u.display_name, u.avatar_file_id, u.banner_file_id, u.role, u.is_active, u.created_at, u.updated_at,
		       af.file_path, bf.file_path
		FROM users u
		LEFT JOIN files af ON u.avatar_file_id = af.id
		LEFT JOIN files bf ON u.banner_file_id = bf.id
		WHERE u.username = $1
	`, username).Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.DisplayName, &u.AvatarFileID, &u.BannerFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		&avatarPath, &bannerPath,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting user by username: %w", err)
	}
	if avatarPath != nil && r.store != nil {
		u.AvatarURL = r.store.PublicURL(*avatarPath)
	}
	if bannerPath != nil && r.store != nil {
		u.BannerURL = r.store.PublicURL(*bannerPath)
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var u models.User
	var avatarPath, bannerPath *string
	err := r.pool.QueryRow(ctx, `
		SELECT u.id, u.username, u.email, u.password_hash, u.display_name, u.avatar_file_id, u.banner_file_id, u.role, u.is_active, u.created_at, u.updated_at,
		       af.file_path, bf.file_path
		FROM users u
		LEFT JOIN files af ON u.avatar_file_id = af.id
		LEFT JOIN files bf ON u.banner_file_id = bf.id
		WHERE u.id = $1
	`, id).Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.DisplayName, &u.AvatarFileID, &u.BannerFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		&avatarPath, &bannerPath,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting user by id: %w", err)
	}
	if avatarPath != nil && r.store != nil {
		u.AvatarURL = r.store.PublicURL(*avatarPath)
	}
	if bannerPath != nil && r.store != nil {
		u.BannerURL = r.store.PublicURL(*bannerPath)
	}
	return &u, nil
}

func (r *UserRepo) UpdateAvatar(ctx context.Context, userID uuid.UUID, fileID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET avatar_file_id = $2, updated_at = NOW() WHERE id = $1`, userID, fileID)
	return err
}

func (r *UserRepo) UpdateBanner(ctx context.Context, userID uuid.UUID, fileID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE users SET banner_file_id = $2, updated_at = NOW() WHERE id = $1`, userID, fileID)
	return err
}

func (r *UserRepo) SetRole(ctx context.Context, username string, role string) error {
	tag, err := r.pool.Exec(ctx, `UPDATE users SET role = $2, updated_at = NOW() WHERE username = $1`, username, role)
	if err != nil {
		return fmt.Errorf("setting user role: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("user %s not found", username)
	}
	return nil
}

func (r *UserRepo) ListUsers(ctx context.Context) ([]models.User, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT u.id, u.username, u.email, u.display_name, u.avatar_file_id, u.banner_file_id, u.role, u.is_active, u.created_at, u.updated_at,
		       af.file_path, bf.file_path
		FROM users u
		LEFT JOIN files af ON u.avatar_file_id = af.id
		LEFT JOIN files bf ON u.banner_file_id = bf.id
		ORDER BY u.created_at DESC
		LIMIT 500
	`)
	if err != nil {
		return nil, fmt.Errorf("listing users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		var avatarPath, bannerPath *string
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.AvatarFileID, &u.BannerFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt, &avatarPath, &bannerPath); err != nil {
			return nil, fmt.Errorf("scanning user: %w", err)
		}
		if avatarPath != nil && r.store != nil {
			u.AvatarURL = r.store.PublicURL(*avatarPath)
		}
		if bannerPath != nil && r.store != nil {
			u.BannerURL = r.store.PublicURL(*bannerPath)
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating users: %w", err)
	}
	if users == nil {
		users = []models.User{}
	}
	return users, nil
}

func (r *UserRepo) ListUserExcludedTagIDs(ctx context.Context, userID uuid.UUID) ([]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT tag_id::text FROM user_excluded_tags WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing excluded tag ids: %w", err)
	}
	defer rows.Close()

	var tagIDs []string
	for rows.Next() {
		var tagID string
		if err := rows.Scan(&tagID); err != nil {
			return nil, err
		}
		tagIDs = append(tagIDs, tagID)
	}
	if tagIDs == nil {
		tagIDs = []string{}
	}
	return tagIDs, nil
}

func (r *UserRepo) SetUserExcludedTags(ctx context.Context, userID uuid.UUID, tagIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("beginning tx for excluded tags: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM user_excluded_tags WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("deleting old excluded tags: %w", err)
	}

	if len(tagIDs) > 0 {
		_, err = tx.Exec(ctx, `
			INSERT INTO user_excluded_tags (user_id, tag_id)
			SELECT $1, unnest($2::uuid[])
			ON CONFLICT DO NOTHING
		`, userID, tagIDs)
		if err != nil {
			return fmt.Errorf("inserting new excluded tags: %w", err)
		}
	}

	return tx.Commit(ctx)
}
