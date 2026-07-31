package repository

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"ekokan/internal/storage"
)

// StartThumbnailWorker runs as a background process to backfill thumbnails in storage/CDN
// for all existing files that were imported before the thumbnail system was enabled.
func StartThumbnailWorker(pool *pgxpool.Pool, store *storage.OpenDALStore) {
	// Give the HTTP server a few seconds to finish initializing before scanning
	time.Sleep(5 * time.Second)

	slog.Info("thumbnail background worker started: scanning database to generate missing media thumbnails")
	ctx := context.Background()

	rows, err := pool.Query(ctx, "SELECT file_path, original_name FROM files ORDER BY created_at DESC")
	if err != nil {
		slog.Error("thumbnail worker: failed to query files from database", "error", err)
		return
	}
	defer rows.Close()

	type fileItem struct {
		Path string
		Name string
	}
	var items []fileItem
	for rows.Next() {
		var i fileItem
		if err := rows.Scan(&i.Path, &i.Name); err == nil {
			items = append(items, i)
		}
	}
	rows.Close()

	slog.Info("thumbnail worker: checking files in storage", "total_files", len(items))

	count := 0
	for _, item := range items {
		thumbPath := item.Path + ".thumb.jpg"
		exists, err := store.Exists(ctx, thumbPath)
		if err != nil {
			slog.Debug("thumbnail worker: error checking existence", "path", thumbPath, "error", err)
			continue
		}
		if !exists {
			// Thumbnail missing on CDN/storage, let's fetch original file and generate it
			origBytes, err := store.Get(ctx, item.Path)
			if err != nil {
				slog.Error("thumbnail worker: failed to fetch original media", "path", item.Path, "error", err)
				continue
			}

			thumbBytes, genErr := storage.GenerateThumbnail(ctx, origBytes, item.Name)
			if genErr != nil {
				slog.Error("thumbnail worker: failed to generate thumbnail", "path", item.Path, "error", genErr)
				continue
			}

			if putErr := store.Put(ctx, thumbPath, thumbBytes); putErr != nil {
				slog.Error("thumbnail worker: failed to upload thumbnail to storage", "path", thumbPath, "error", putErr)
				continue
			}

			count++
			slog.Info("thumbnail worker: generated and uploaded missing thumbnail", "path", thumbPath, "session_generated_count", count)
			// Small sleep to avoid throttling external S3/CDN APIs
			time.Sleep(200 * time.Millisecond)
		}
	}

	slog.Info("thumbnail worker: scan finished", "new_thumbnails_created", count, "total_files_checked", len(items))
}
