package repository

import (
	"context"
	"fmt"

	"ekokan/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CommentRepo struct {
	pool *pgxpool.Pool
}

func NewCommentRepo(pool *pgxpool.Pool) *CommentRepo {
	return &CommentRepo{pool: pool}
}

func (r *CommentRepo) ListByPost(ctx context.Context, postID uuid.UUID) ([]models.Comment, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.post_id, c.user_id, c.parent_id, 
		       COALESCE(u.display_name, u.username, c.author_name), 
		       c.content, c.is_edited, c.created_at, c.updated_at,
		       u.role
		FROM comments c
		LEFT JOIN users u ON c.user_id = u.id
		WHERE c.post_id = $1
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, fmt.Errorf("listing comments: %w", err)
	}
	defer rows.Close()

	var all []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(
			&c.ID, &c.PostID, &c.UserID, &c.ParentID, &c.AuthorName,
			&c.Content, &c.IsEdited, &c.CreatedAt, &c.UpdatedAt,
			&c.AuthorRole,
		); err != nil {
			return nil, err
		}
		if c.UserID != nil {
			c.IsMember = true
		}
		all = append(all, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Build tree structure
	return buildCommentTree(all), nil
}

func buildCommentTree(flat []models.Comment) []models.Comment {
	byID := make(map[uuid.UUID]*models.Comment)
	var roots []models.Comment

	// First pass: index by ID
	for i := range flat {
		flat[i].Replies = []models.Comment{}
		byID[flat[i].ID] = &flat[i]
	}

	// Second pass: attach children to parents
	for i := range flat {
		if flat[i].ParentID != nil {
			if parent, ok := byID[*flat[i].ParentID]; ok {
				parent.Replies = append(parent.Replies, flat[i])
				continue
			}
		}
		roots = append(roots, flat[i])
	}

	if roots == nil {
		roots = []models.Comment{}
	}
	return roots
}

type CreateCommentInput struct {
	PostID     uuid.UUID  `json:"post_id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	ParentID   *uuid.UUID `json:"parent_id"`
	AuthorName string     `json:"author_name"`
	Content    string     `json:"content"`
}

func (r *CommentRepo) Create(ctx context.Context, input CreateCommentInput) (*models.Comment, error) {
	if input.AuthorName == "" && input.UserID == nil {
		input.AuthorName = "Anonymous"
	}

	var c models.Comment
	err := r.pool.QueryRow(ctx, `
		INSERT INTO comments (post_id, user_id, parent_id, author_name, content)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, post_id, user_id, parent_id, author_name, content, is_edited, created_at, updated_at
	`, input.PostID, input.UserID, input.ParentID, input.AuthorName, input.Content).Scan(
		&c.ID, &c.PostID, &c.UserID, &c.ParentID, &c.AuthorName,
		&c.Content, &c.IsEdited, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating comment: %w", err)
	}
	if c.UserID != nil {
		c.IsMember = true
	}
	c.Replies = []models.Comment{}
	return &c, nil
}

func (r *CommentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM comments WHERE id = $1`, id)
	return err
}

func (r *CommentRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Comment, error) {
	var c models.Comment
	err := r.pool.QueryRow(ctx, `
		SELECT id, post_id, user_id, parent_id, author_name, content, is_edited, created_at, updated_at
		FROM comments WHERE id = $1
	`, id).Scan(
		&c.ID, &c.PostID, &c.UserID, &c.ParentID, &c.AuthorName,
		&c.Content, &c.IsEdited, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}
