package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"ekokan/internal/config"

	opendal "github.com/apache/opendal/bindings/go"
	fsService "github.com/apache/opendal-go-services/fs"
	s3Service "github.com/apache/opendal-go-services/s3"
)

type OpenDALStore struct {
	op      *opendal.Operator
	backend string
	baseURL string
}

// NewStore creates a storage backend using Apache OpenDAL based on config.
func NewStore(cfg *config.Config) (*OpenDALStore, error) {
	var options map[string]string
	var scheme opendal.Scheme

	switch cfg.StorageBackend {
	case "fs":
		absRoot, err := filepath.Abs(cfg.StorageFSRoot)
		if err != nil {
			return nil, fmt.Errorf("resolving storage root: %w", err)
		}
		if err := os.MkdirAll(absRoot, 0755); err != nil {
			return nil, fmt.Errorf("creating storage root: %w", err)
		}
		scheme = fsService.Scheme
		options = map[string]string{
			"root": absRoot,
		}
	case "s3":
		scheme = s3Service.Scheme
		options = map[string]string{
			"bucket":            cfg.S3Bucket,
			"region":            cfg.S3Region,
			"access_key_id":     cfg.S3AccessKey,
			"secret_access_key": cfg.S3SecretKey,
		}
		if cfg.S3Endpoint != "" {
			options["endpoint"] = cfg.S3Endpoint
		}
	default:
		return nil, fmt.Errorf("unknown storage backend: %s", cfg.StorageBackend)
	}

	op, err := opendal.NewOperator(scheme, options, opendal.WithTimeout(operatorMetaTimeout, operatorIOTimeout))
	if err != nil {
		return nil, fmt.Errorf("creating opendal operator for %s: %w", cfg.StorageBackend, err)
	}

	baseURL := cfg.MediaBaseURL
	if baseURL == "" || strings.Contains(baseURL, "localhost") {
		if cfg.StorageBackend == "s3" {
			endpoint := strings.TrimRight(cfg.S3Endpoint, "/")
			if endpoint != "" {
				baseURL = fmt.Sprintf("%s/%s", endpoint, cfg.S3Bucket)
			} else {
				baseURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.S3Bucket, cfg.S3Region)
			}
		} else {
			baseURL = fmt.Sprintf("http://localhost:%d/media", cfg.Port)
		}
	}

	slog.Info("storage: hardware-adaptive FFI concurrency active", "system_cpus", runtime.GOMAXPROCS(0), "max_concurrent_ffi_threads", cap(ffiSem))
	return &OpenDALStore{
		op:      op,
		backend: cfg.StorageBackend,
		baseURL: strings.TrimRight(baseURL, "/"),
	}, nil
}

// ffiSem dynamically limits concurrent OpenDAL FFI executions based on hardware logical CPUs
// to prevent thread starvation on smaller VPS instances while scaling throughput on multi-core servers.
var ffiSem = initFFISemaphore()

const (
	operatorMetaTimeout = 10 * time.Second
	operatorIOTimeout   = 25 * time.Second
	ffiOpTimeout        = operatorIOTimeout + 5*time.Second
	ThumbnailGenTimeout = 20 * time.Second
)

func initFFISemaphore() chan struct{} {
	cpus := runtime.GOMAXPROCS(0)
	// Reserve at least 2 cores unblocked exclusively for HTTP server traffic and Postgres networking.
	limit := cpus - 2
	if limit < 1 {
		limit = 1 // Ensure low-core (1-2 CPU) machines remain stable and unblocked
	} else if limit > 16 {
		limit = 16 // Prevent file descriptor and socket saturation on high-end enterprise servers
	}
	return make(chan struct{}, limit)
}

// runFFI executes a blocking OpenDAL native call bounded by ffiSem.
// The semaphore slot is released only after fn genuinely returns to prevent FFI thread starvation.
func runFFI[T any](ctx context.Context, op, key string, fn func() (T, error)) (T, error) {
	var zero T

	waitCtx, cancel := context.WithTimeout(ctx, ffiOpTimeout)
	defer cancel()

	select {
	case ffiSem <- struct{}{}:
	case <-waitCtx.Done():
		return zero, waitCtx.Err()
	}

	type result struct {
		val T
		err error
	}
	done := make(chan result, 1)
	go func() {
		v, err := fn()
		done <- result{v, err}
		<-ffiSem // released only once fn has actually returned - keeps real concurrency bounded
	}()

	select {
	case res := <-done:
		return res.val, res.err
	case <-waitCtx.Done():
		if ctx.Err() != nil {
			return zero, ctx.Err()
		}
		slog.Warn("storage: FFI call still running past deadline; native operator timeout will bound it",
			"op", op, "key", key, "deadline", ffiOpTimeout)
		return zero, fmt.Errorf("storage %s exceeded %s waiting on native layer: %s", op, ffiOpTimeout, key)
	}
}

func (s *OpenDALStore) Put(ctx context.Context, key string, data []byte) error {
	_, err := runFFI(ctx, "put", key, func() (struct{}, error) {
		return struct{}{}, s.op.Write(key, data)
	})
	return err
}

func (s *OpenDALStore) Get(ctx context.Context, key string) ([]byte, error) {
	return runFFI(ctx, "get", key, func() ([]byte, error) {
		return s.op.Read(key)
	})
}

func (s *OpenDALStore) Delete(ctx context.Context, key string) error {
	_, err := runFFI(ctx, "delete", key, func() (struct{}, error) {
		return struct{}{}, s.op.Delete(key)
	})
	return err
}

func (s *OpenDALStore) Exists(ctx context.Context, key string) (bool, error) {
	return runFFI(ctx, "exists", key, func() (bool, error) {
		if _, err := s.op.Stat(key); err != nil {
			return false, nil
		}
		return true, nil
	})
}

func (s *OpenDALStore) PublicURL(key string) string {
	parts := strings.Split(key, "/")
	for i, part := range parts {
		escaped := url.PathEscape(part)
		replacer := strings.NewReplacer(
			"+", "%2B",
			"&", "%26",
			"$", "%24",
			"@", "%40",
			"=", "%3D",
			";", "%3B",
			",", "%2C",
			":", "%3A",
		)
		parts[i] = replacer.Replace(escaped)
	}
	return s.baseURL + "/" + strings.Join(parts, "/")
}

func (s *OpenDALStore) ServeFile(w http.ResponseWriter, r *http.Request, key string) {
	if strings.HasSuffix(key, ".thumb.jpg") {
		exists, err := s.Exists(r.Context(), key)
		if err != nil {
			http.Error(w, "File not found", http.StatusNotFound)
			return
		}
		if !exists {
			s.serveGeneratedThumbnail(w, r, key)
			return
		}
	}

	if s.backend == "s3" {
		http.Redirect(w, r, s.PublicURL(key), http.StatusFound)
		return
	}

	data, err := s.Get(r.Context(), key)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	s.writeFile(w, r, key, data)
}

// serveGeneratedThumbnail generates a missing thumbnail on demand and serves it directly
// from memory, then persists it to storage asynchronously.
func (s *OpenDALStore) serveGeneratedThumbnail(w http.ResponseWriter, r *http.Request, thumbKey string) {
	origKey := strings.TrimSuffix(thumbKey, ".thumb.jpg")

	origBytes, err := s.Get(r.Context(), origKey)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	genCtx, cancel := context.WithTimeout(r.Context(), ThumbnailGenTimeout)
	thumbBytes, err := GenerateThumbnail(genCtx, origBytes, filepath.Base(origKey))
	cancel()
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	go func() {
		putCtx, cancel := context.WithTimeout(context.Background(), ffiOpTimeout)
		defer cancel()
		if err := s.Put(putCtx, thumbKey, thumbBytes); err != nil {
			slog.Warn("storage: failed to persist generated thumbnail", "key", thumbKey, "error", err)
		}
	}()

	s.writeFile(w, r, thumbKey, thumbBytes)
}

func (s *OpenDALStore) writeFile(w http.ResponseWriter, r *http.Request, key string, data []byte) {
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if strings.HasSuffix(key, ".thumb.jpg") || strings.HasPrefix(http.DetectContentType(data), "image/") || strings.HasPrefix(http.DetectContentType(data), "video/") {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, filepath.Base(key)))
	} else {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(key)))
	}
	if strings.HasSuffix(key, ".thumb.jpg") {
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Cache-Control", "public, max-age=31536000")
	}
	http.ServeContent(w, r, filepath.Base(key), time.Time{}, bytes.NewReader(data))
}

// UploadResult holds the result of processing an uploaded file.
type UploadResult struct {
	SHA256       string
	FilePath     string
	OriginalName string
	MimeType     string
	FileSize     int64
	IsNew        bool
}

// ProcessUpload reads the file, hashes it, stores it via OpenDAL, and returns metadata.
func ProcessUpload(ctx context.Context, store *OpenDALStore, filename string, reader io.Reader) (*UploadResult, error) {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".html", ".htm", ".svg", ".xhtml", ".js", ".exe", ".sh", ".bat", ".com", ".msi", ".vbs", ".scr":
		return nil, fmt.Errorf("file type %q is not permitted for security reasons (audit item 1.2)", ext)
	}

	hash, data, err := HashReader(reader)
	if err != nil {
		return nil, fmt.Errorf("hashing upload: %w", err)
	}

	storagePath := StoragePath(hash, filename)
	mimeType := http.DetectContentType(data)

	if strings.HasPrefix(mimeType, "text/html") || strings.HasPrefix(mimeType, "image/svg") || strings.HasPrefix(mimeType, "application/xhtml") {
		return nil, fmt.Errorf("detected MIME type %q is not permitted for security reasons", mimeType)
	}

	exists, err := store.Exists(ctx, storagePath)
	if err != nil {
		return nil, fmt.Errorf("checking existence: %w", err)
	}

	isNew := !exists
	if isNew {
		if err := store.Put(ctx, storagePath, data); err != nil {
			return nil, fmt.Errorf("storing file: %w", err)
		}
		genCtx, cancel := context.WithTimeout(ctx, ThumbnailGenTimeout)
		thumbBytes, thumbErr := GenerateThumbnail(genCtx, data, filename)
		cancel()
		if thumbErr == nil {
			_ = store.Put(ctx, storagePath+".thumb.jpg", thumbBytes)
		}
	}

	return &UploadResult{
		SHA256:       hash,
		FilePath:     storagePath,
		OriginalName: filename,
		MimeType:     mimeType,
		FileSize:     int64(len(data)),
		IsNew:        isNew,
	}, nil
}
