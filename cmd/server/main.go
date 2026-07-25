package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"ekokan/internal/config"
	"ekokan/internal/database"
	"ekokan/internal/handler"
	"ekokan/internal/repository"
	"ekokan/internal/storage"
)

func main() {
	slog.SetDefault(slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	slog.Info("config loaded",
		"port", cfg.Port,
		"storage", cfg.StorageBackend,
		"db", cfg.DatabaseURL[:20]+"...",
	)

	// Database
	ctx := context.Background()
	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()
	slog.Info("database connected")

	// Run migrations
	if err := database.RunMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// Storage
	store, err := storage.NewStore(cfg)
	if err != nil {
		slog.Error("failed to initialize storage", "error", err)
		os.Exit(1)
	}
	slog.Info("storage initialized", "backend", cfg.StorageBackend)

	// Repositories
	fileRepo := repository.NewFileRepo(pool, store)
	artistRepo := repository.NewArtistRepo(pool, store)
	postRepo := repository.NewPostRepo(pool, store)
	tagRepo := repository.NewTagRepo(pool)
	commentRepo := repository.NewCommentRepo(pool)

	// Router
	router := handler.NewRouter(handler.Deps{
		Store:    store,
		Files:    fileRepo,
		Artists:  artistRepo,
		Posts:    postRepo,
		Tags:    tagRepo,
		Comments:  commentRepo,
		StaticDir: cfg.StaticDir,
	}, cfg.CORSOrigins)

	// Server
	server := &http.Server{
		Addr:         cfg.Addr(),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-done
	slog.Info("shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("shutdown error", "error", err)
	}

	slog.Info("server stopped")
}
