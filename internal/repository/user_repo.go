package repository

import (
	"context"
	"fmt"

	"ekokan/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
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
		RETURNING id, username, email, password_hash, display_name, avatar_file_id, role, is_active, created_at, updated_at
	`, input.Username, input.Email, input.PasswordHash, input.DisplayName, input.Role).Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.DisplayName, &u.AvatarFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating user: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, username, email, password_hash, display_name, avatar_file_id, role, is_active, created_at, updated_at
		FROM users
		WHERE username = $1
	`, username).Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.DisplayName, &u.AvatarFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting user by username: %w", err)
	}
	return &u, nil
}

func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	var u models.User
	err := r.pool.QueryRow(ctx, `
		SELECT id, username, email, password_hash, display_name, avatar_file_id, role, is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`, id).Scan(
		&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.DisplayName, &u.AvatarFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("getting user by id: %w", err)
	}
	return &u, nil
}
