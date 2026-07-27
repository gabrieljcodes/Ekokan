package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port        int
	DatabaseURL string
	CORSOrigins string
	JWTSecret   string
	AllowPublicReg bool

	// Storage
	StorageBackend string // "fs" or "s3"

	// Local filesystem storage
	StorageFSRoot string

	// S3 storage
	S3Bucket    string
	S3Region    string
	S3Endpoint  string
	S3AccessKey string
	S3SecretKey string

	// Media serving
	MediaBaseURL string

	// Static SPA serving
	StaticDir string
}

func Load() (*Config, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if len(jwtSecret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must be explicitly set and have at least 32 characters (audit requirement 1.4)")
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" || corsOrigins == "*" {
		return nil, fmt.Errorf("CORS_ORIGINS must be explicitly configured without fallback '*' when AllowCredentials=true (audit requirement 2.2)")
	}

	cfg := &Config{
		Port:           getEnvInt("PORT", 8080),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/ekokan?sslmode=disable"),
		CORSOrigins:    corsOrigins,
		JWTSecret:      jwtSecret,
		AllowPublicReg: getEnvBool("ALLOW_PUBLIC_REGISTRATION", true),
		StorageBackend: getEnv("STORAGE_BACKEND", "fs"),
		StorageFSRoot:  getEnv("STORAGE_FS_ROOT", "./data/media"),
		S3Bucket:       getEnv("S3_BUCKET", ""),
		S3Region:       getEnv("S3_REGION", "us-east-1"),
		S3Endpoint:     getEnv("S3_ENDPOINT", ""),
		S3AccessKey:    getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey:    getEnv("S3_SECRET_KEY", ""),
		MediaBaseURL:   getEnv("MEDIA_BASE_URL", ""),
		StaticDir:      getEnv("STATIC_DIR", "./web/dist"),
	}

	if cfg.StorageBackend != "fs" && cfg.StorageBackend != "s3" {
		return nil, fmt.Errorf("invalid STORAGE_BACKEND: %q (must be 'fs' or 's3')", cfg.StorageBackend)
	}

	if cfg.StorageBackend == "s3" && cfg.S3Bucket == "" {
		return nil, fmt.Errorf("S3_BUCKET is required when STORAGE_BACKEND=s3")
	}

	if cfg.MediaBaseURL == "" {
		cfg.MediaBaseURL = fmt.Sprintf("http://localhost:%d/media", cfg.Port)
	}

	return cfg, nil
}

func (c *Config) Addr() string {
	return fmt.Sprintf(":%d", c.Port)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

