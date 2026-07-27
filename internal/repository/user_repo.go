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
		SELECT id, username, email, display_name, avatar_file_id, role, is_active, created_at, updated_at
		FROM users
		ORDER BY created_at DESC
		LIMIT 500
	`)
	if err != nil {
		return nil, fmt.Errorf("listing users: %w", err)
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.DisplayName, &u.AvatarFileID, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning user: %w", err)
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
