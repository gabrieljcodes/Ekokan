package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
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

	op, err := opendal.NewOperator(scheme, options)
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

	return &OpenDALStore{
		op:      op,
		backend: cfg.StorageBackend,
		baseURL: strings.TrimRight(baseURL, "/"),
	}, nil
}

func (s *OpenDALStore) Put(_ context.Context, key string, data []byte) error {
	return s.op.Write(key, data)
}

func (s *OpenDALStore) Get(_ context.Context, key string) ([]byte, error) {
	return s.op.Read(key)
}

func (s *OpenDALStore) Delete(_ context.Context, key string) error {
	return s.op.Delete(key)
}

func (s *OpenDALStore) Exists(_ context.Context, key string) (bool, error) {
	_, err := s.op.Stat(key)
	if err == nil {
		return true, nil
	}
	return false, nil
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
		if err == nil && !exists {
			origKey := strings.TrimSuffix(key, ".thumb.jpg")
			if origBytes, origErr := s.Get(r.Context(), origKey); origErr == nil {
				if thumbBytes, genErr := GenerateThumbnail(r.Context(), origBytes, filepath.Base(origKey)); genErr == nil {
					_ = s.Put(r.Context(), key, thumbBytes)
				}
			}
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
		if thumbBytes, err := GenerateThumbnail(ctx, data, filename); err == nil {
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
