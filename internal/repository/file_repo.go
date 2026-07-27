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

type FileRepo struct {
	pool  *pgxpool.Pool
	store *storage.OpenDALStore
}

func NewFileRepo(pool *pgxpool.Pool, store *storage.OpenDALStore) *FileRepo {
	return &FileRepo{pool: pool, store: store}
}

func (r *FileRepo) FindBySHA256(ctx context.Context, sha256 string) (*models.File, error) {
	var f models.File
	err := r.pool.QueryRow(ctx, `
		SELECT id, sha256, file_path, original_name, mime_type, file_size,
		       width, height, duration_ms, blurhash, storage_backend, ref_count, created_at
		FROM files WHERE sha256 = $1
	`, sha256).Scan(
		&f.ID, &f.SHA256, &f.FilePath, &f.OriginalName, &f.MimeType, &f.FileSize,
		&f.Width, &f.Height, &f.DurationMs, &f.BlurHash, &f.StorageBackend, &f.RefCount, &f.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("finding file by sha256: %w", err)
	}
	f.URL = r.store.PublicURL(f.FilePath)
	return &f, nil
}

func (r *FileRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.File, error) {
	var f models.File
	err := r.pool.QueryRow(ctx, `
		SELECT id, sha256, file_path, original_name, mime_type, file_size,
		       width, height, duration_ms, blurhash, storage_backend, ref_count, created_at
		FROM files WHERE id = $1
	`, id).Scan(
		&f.ID, &f.SHA256, &f.FilePath, &f.OriginalName, &f.MimeType, &f.FileSize,
		&f.Width, &f.Height, &f.DurationMs, &f.BlurHash, &f.StorageBackend, &f.RefCount, &f.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("finding file by id: %w", err)
	}
	f.URL = r.store.PublicURL(f.FilePath)
	return &f, nil
}

func (r *FileRepo) Create(ctx context.Context, f *models.File) error {
	return r.pool.QueryRow(ctx, `
		INSERT INTO files (sha256, file_path, original_name, mime_type, file_size, width, height, duration_ms, blurhash, storage_backend)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`, f.SHA256, f.FilePath, f.OriginalName, f.MimeType, f.FileSize,
		f.Width, f.Height, f.DurationMs, f.BlurHash, f.StorageBackend,
	).Scan(&f.ID, &f.CreatedAt)
}

// FindOrCreate looks up by SHA256 hash. If found, returns existing record. If not, creates new atomically.
func (r *FileRepo) FindOrCreate(ctx context.Context, f *models.File) (existing bool, err error) {
	err = r.pool.QueryRow(ctx, `
		INSERT INTO files (sha256, file_path, original_name, mime_type, file_size, width, height, duration_ms, blurhash, storage_backend)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (sha256) DO NOTHING
		RETURNING id, ref_count, created_at
	`, f.SHA256, f.FilePath, f.OriginalName, f.MimeType, f.FileSize,
		f.Width, f.Height, f.DurationMs, f.BlurHash, f.StorageBackend,
	).Scan(&f.ID, &f.RefCount, &f.CreatedAt)

	if err == nil {
		f.URL = r.store.PublicURL(f.FilePath)
		return false, nil
	}
	if err != pgx.ErrNoRows {
		return false, fmt.Errorf("creating file atomically: %w", err)
	}

	// Conflict occurred; fetch existing file
	found, err := r.FindBySHA256(ctx, f.SHA256)
	if err != nil {
		return false, fmt.Errorf("finding existing file after conflict: %w", err)
	}
	if found == nil {
		return false, fmt.Errorf("file sha256 conflict occurred but row not found")
	}
	*f = *found
	return true, nil
}

func (r *FileRepo) DeleteOrphaned(ctx context.Context) (int, error) {
	rows, err := r.pool.Query(ctx, `
		DELETE FROM files f
		WHERE f.ref_count <= 0
		  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.avatar_file_id = f.id)
		  AND NOT EXISTS (SELECT 1 FROM artists a WHERE a.avatar_file_id = f.id OR a.banner_file_id = f.id)
		RETURNING f.file_path
	`)
	if err != nil {
		return 0, fmt.Errorf("deleting orphaned files: %w", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var path string
		if err := rows.Scan(&path); err != nil {
			return count, err
		}
		// Best-effort delete from storage
		_ = r.store.Delete(ctx, path)
		count++
	}
	return count, rows.Err()
}
