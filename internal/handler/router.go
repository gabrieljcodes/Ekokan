package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ekokan/internal/auth"
	"ekokan/internal/docs"
	"ekokan/internal/repository"
	"ekokan/internal/storage"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Deps struct {
	Store          *storage.OpenDALStore
	Files          *repository.FileRepo
	Artists        *repository.ArtistRepo
	Posts          *repository.PostRepo
	Tags           *repository.TagRepo
	Comments       *repository.CommentRepo
	Users          *repository.UserRepo
	Favorites      *repository.FavoriteRepo
	Settings       *repository.SettingsRepo
	JWTSecret      string
	AllowPublicReg bool
	StaticDir      string
}

func NewRouter(deps Deps, corsOrigins string) *chi.Mux {
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   strings.Split(corsOrigins, ","),
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Handlers
	artistH := NewArtistHandler(deps.Artists, deps.Files, deps.Settings, deps.Store)
	postH := NewPostHandler(deps.Posts, deps.Files, deps.Artists, deps.Settings, deps.Store)
	tagH := NewTagHandler(deps.Tags, deps.Posts)
	commentH := NewCommentHandler(deps.Comments)
	authH := NewAuthHandler(deps.Users, deps.Favorites, deps.JWTSecret, deps.AllowPublicReg)
	favH := NewFavoriteHandler(deps.Favorites)
	settingsH := NewSettingsHandler(deps.Settings, deps.Users)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Global settings & OpenAPI JSON (Public / Optional Auth)
		r.Group(func(r chi.Router) {
			r.Use(auth.OptionalAuth(deps.JWTSecret))
			r.Get("/settings", settingsH.GetSettings)
			r.Get("/docs/openapi.json", docs.ServeOpenAPI)
		})

		// Auth
		r.Route("/auth", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret))
				r.Post("/register", authH.Register)
				r.Post("/login", authH.Login)
			})
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret))
				r.Get("/me", authH.GetMe)
			})
		})

		// User personal endpoints
		r.Route("/users", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret))
				r.Get("/me/favorites", favH.ListMyFavorites)
			})
		})

		// Artists
		r.Route("/artists", func(r chi.Router) {
			// Public catalog read-only
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret))
				r.Get("/", artistH.List)
				r.Get("/{slug}", artistH.GetBySlug)
				r.Get("/{slug}/posts", postH.ListByArtist)
			})
			// Protected creation and modifications
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret))
				r.Post("/", artistH.Create)
				r.Put("/{id}", artistH.Update)
				r.Delete("/{id}", artistH.Delete)
				r.Post("/{id}/avatar", artistH.UploadAvatar)
				r.Post("/{id}/banner", artistH.UploadBanner)
				r.Post("/{id}/favorite", favH.ToggleArtistFavorite)
			})
		})

		// Posts
		r.Route("/posts", func(r chi.Router) {
			// Public catalog read-only
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret))
				r.Get("/recent", postH.Recent)
				r.Get("/{id}", postH.GetByID)
				r.Get("/{id}/adjacent", postH.GetAdjacent)
				r.Get("/{id}/comments", commentH.ListByPost)
			})
			// Protected creation and interaction
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret))
				r.Post("/", postH.Create)
				r.Put("/{id}", postH.Update)
				r.Delete("/{id}", postH.Delete)
				r.Post("/{id}/favorite", favH.TogglePostFavorite)
				r.Post("/{id}/like", favH.TogglePostLike)

				// Media
				r.Post("/{id}/media", postH.UploadMedia)
				r.Delete("/{id}/media/{mediaId}", postH.RemoveMedia)
				r.Put("/{id}/media/reorder", postH.ReorderMedia)

				// Attachments
				r.Post("/{id}/attachments", postH.UploadAttachment)
				r.Delete("/{id}/attachments/{attId}", postH.RemoveAttachment)

				// Comments
				r.Post("/{id}/comments", commentH.Create)
				r.Delete("/{id}/comments/{commentId}", commentH.Delete)
			})
		})

		// Tags
		r.Route("/tags", func(r chi.Router) {
			// Public read-only
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret))
				r.Get("/", tagH.List)
				r.Get("/{slug}/posts", tagH.GetPosts)
			})
			// Protected creation and deletion
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret))
				r.Post("/", tagH.Create)
				r.Delete("/{id}", tagH.Delete)
			})
		})

		// Admin endpoints
		r.Route("/admin", func(r chi.Router) {
			r.Use(auth.RequireAdmin(deps.JWTSecret))
			r.Put("/settings", settingsH.UpdateSettings)
			r.Get("/users", settingsH.ListUsers)
			r.Put("/users/{username}/role", settingsH.SetUserRole)
		})
	})

	// Serve interactive Scalar OpenAPI Documentation UI
	r.Get("/docs", docs.ServeScalar)

	// Serve media files (local storage)
	r.Get("/media/*", func(w http.ResponseWriter, r *http.Request) {
		key := chi.URLParam(r, "*")
		deps.Store.ServeFile(w, r, key)
	})

	// Serve static SPA frontend
	if deps.StaticDir != "" {
		if info, err := os.Stat(deps.StaticDir); err == nil && info.IsDir() {
			staticFs := http.FileServer(http.Dir(deps.StaticDir))
			r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
				path := filepath.Join(deps.StaticDir, filepath.FromSlash(r.URL.Path))
				if _, err := os.Stat(path); os.IsNotExist(err) {
					// Fallback to index.html for SPA client routing
					http.ServeFile(w, r, filepath.Join(deps.StaticDir, "index.html"))
					return
				}
				staticFs.ServeHTTP(w, r)
			})
		}
	}

	return r
}
