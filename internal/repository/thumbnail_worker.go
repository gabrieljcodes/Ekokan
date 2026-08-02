package repository

import (
	"context"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"ekokan/internal/storage"
)

// StartThumbnailWorker runs as a high-performance multi-threaded background pool to backfill
// thumbnails in storage/CDN for all existing files imported before the thumbnail system was enabled.
func StartThumbnailWorker(pool *pgxpool.Pool, store *storage.OpenDALStore) {
	// Give the HTTP server and storage enough time to initialize before scanning
	time.Sleep(15 * time.Second)

	slog.Info("thumbnail background worker started: scanning database to generate missing media thumbnails")
	ctx := context.Background()

	rows, err := pool.Query(ctx, "SELECT file_path, original_name FROM files WHERE mime_type LIKE 'image/%%' OR mime_type LIKE 'video/%%' ORDER BY created_at DESC")
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

	totalFiles := len(items)
	const numWorkers = 2 // Concurrency limit kept low to prevent OpenDAL FFI thread starvation and memory saturation
	slog.Info("thumbnail worker: starting concurrent scan in storage", "total_files", totalFiles, "concurrency_workers", numWorkers)

	itemChan := make(chan fileItem, numWorkers*4)
	var generatedCount int32
	var wg sync.WaitGroup

	// Launch worker pool goroutines
	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for item := range itemChan {
				// Gentle pacing yield to avoid blocking Go scheduler / FFI operations during active user HTTP uploads
				time.Sleep(100 * time.Millisecond)

				thumbPath := item.Path + ".thumb.jpg"
				exists, err := store.Exists(ctx, thumbPath)
				if err != nil {
					slog.Debug("thumbnail worker: error checking existence", "worker", workerID, "path", thumbPath, "error", err)
					continue
				}
				if !exists {
					origBytes, err := store.Get(ctx, item.Path)
					if err != nil {
						slog.Error("thumbnail worker: failed to fetch original media", "worker", workerID, "path", item.Path, "error", err)
						continue
					}

					thumbBytes, genErr := storage.GenerateThumbnail(ctx, origBytes, item.Name)
					if genErr != nil {
						slog.Error("thumbnail worker: failed to generate thumbnail", "worker", workerID, "path", item.Path, "error", genErr)
						continue
					}

					if putErr := store.Put(ctx, thumbPath, thumbBytes); putErr != nil {
						slog.Error("thumbnail worker: failed to upload thumbnail to storage", "worker", workerID, "path", thumbPath, "error", putErr)
						continue
					}

					current := atomic.AddInt32(&generatedCount, 1)
					slog.Info("thumbnail worker: generated & uploaded missing thumbnail", "worker", workerID, "path", thumbPath, "total_generated", current)
				}
			}
		}(w)
	}

	// Feed items into channel
	for _, item := range items {
		itemChan <- item
	}
	close(itemChan)

	// Wait for all concurrent workers to complete their jobs
	wg.Wait()

	finalCount := atomic.LoadInt32(&generatedCount)
	slog.Info("thumbnail worker: concurrent scan finished", "new_thumbnails_created", finalCount, "total_files_checked", totalFiles, "concurrency_workers", numWorkers)
}
