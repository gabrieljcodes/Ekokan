package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ekokan/internal/auth"
	"ekokan/internal/docs"
	"ekokan/internal/opengraph"
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
	ApiTokens      *repository.ApiTokenRepo
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
	// Security Headers Middleware (audit item 3.6)
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
			w.Header().Set("X-XSS-Protection", "0")
			next.ServeHTTP(w, r)
		})
	})
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
	commentH := NewCommentHandler(deps.Comments, deps.Posts, deps.Users)
	authH := NewAuthHandler(deps.Users, deps.Favorites, deps.Files, deps.Comments, deps.Store, deps.JWTSecret, deps.AllowPublicReg)
	favH := NewFavoriteHandler(deps.Favorites)
	settingsH := NewSettingsHandler(deps.Settings, deps.Users)
	tokenH := NewApiTokenHandler(deps)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Global settings & OpenAPI JSON (Public / Optional Auth)
		r.Group(func(r chi.Router) {
			r.Use(auth.OptionalAuth(deps.JWTSecret, deps.ApiTokens))
			r.Get("/settings", settingsH.GetSettings)
			r.Get("/docs/openapi.json", docs.ServeOpenAPI)
		})

		// Auth (with rate limiting - audit item 2.1)
		authLimiter := auth.NewRateLimiter(20, 5*time.Minute)
		r.Route("/auth", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(authLimiter.Middleware)
				r.Use(auth.OptionalAuth(deps.JWTSecret, deps.ApiTokens))
				r.Post("/register", authH.Register)
				r.Post("/login", authH.Login)
			})
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret, deps.ApiTokens))
				r.Get("/me", authH.GetMe)
			})
		})

		// User personal and profile endpoints
		r.Route("/users", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret, deps.ApiTokens))
				r.Get("/{username}/profile", authH.GetUserProfile)
			})
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret, deps.ApiTokens))
				r.Get("/me/favorites", favH.ListMyFavorites)
				r.Get("/me/api-tokens", tokenH.ListTokens)
				r.Post("/me/api-tokens", tokenH.CreateToken)
				r.Delete("/me/api-tokens/{id}", tokenH.DeleteToken)
				r.Post("/me/avatar", authH.UploadAvatar)
				r.Post("/me/excluded-tags", authH.SetExcludedTags)
			})
		})

		// Artists
		r.Route("/artists", func(r chi.Router) {
			// Public catalog read-only
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret, deps.ApiTokens))
				r.Get("/", artistH.List)
				r.Get("/{slug}", artistH.GetBySlug)
				r.Get("/{slug}/posts", postH.ListByArtist)
			})
			// Protected creation and modifications
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret, deps.ApiTokens))
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
				r.Use(auth.OptionalAuth(deps.JWTSecret, deps.ApiTokens))
				r.Get("/recent", postH.Recent)
				r.Get("/{id}", postH.GetByID)
				r.Get("/{id}/adjacent", postH.GetAdjacent)
				r.Get("/{id}/comments", commentH.ListByPost)
				r.Post("/{id}/comments", commentH.Create) // Audit item 3.3: support anonymous and optional auth comments
			})
			// Protected creation and interaction
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret, deps.ApiTokens))
				r.Post("/", postH.Create)
				r.Post("/mass-tag", postH.MassTag)
				r.Post("/mass-delete", postH.MassDelete)
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

				// Comments deletion requires authentication (owner/admin)
				r.Delete("/{id}/comments/{commentId}", commentH.Delete)
			})
		})

		// Tags
		r.Route("/tags", func(r chi.Router) {
			// Public read-only
			r.Group(func(r chi.Router) {
				r.Use(auth.OptionalAuth(deps.JWTSecret, deps.ApiTokens))
				r.Get("/", tagH.List)
				r.Get("/{slug}/posts", tagH.GetPosts)
			})
			// Protected creation
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAuth(deps.JWTSecret, deps.ApiTokens))
				r.Post("/", tagH.Create)
			})
			// Admin-only deletion (Audit item 3.1)
			r.Group(func(r chi.Router) {
				r.Use(auth.RequireAdmin(deps.JWTSecret, deps.ApiTokens))
				r.Delete("/{id}", tagH.Delete)
			})
		})

		// Admin endpoints
		r.Route("/admin", func(r chi.Router) {
			r.Use(auth.RequireAdmin(deps.JWTSecret, deps.ApiTokens))
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

	// Serve static SPA frontend with Native OpenGraph metadata injection
	if deps.StaticDir != "" {
		if info, err := os.Stat(deps.StaticDir); err == nil && info.IsDir() {
			staticFs := http.FileServer(http.Dir(deps.StaticDir))
			ogService := opengraph.NewService(deps.Artists, deps.Posts, deps.Store)

			r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
				cleanPath := strings.TrimSpace(r.URL.Path)
				indexPath := filepath.Join(deps.StaticDir, "index.html")

				// Direct hit on root home page or fallback HTML route
				if cleanPath == "/" || cleanPath == "" || strings.EqualFold(cleanPath, "/index.html") {
					ogService.ServeHTML(w, r, indexPath)
					return
				}

				path := filepath.Join(deps.StaticDir, filepath.FromSlash(cleanPath))
				info, err := os.Stat(path)
				if os.IsNotExist(err) || (err == nil && info.IsDir()) {
					// Fallback to OpenGraph-enhanced index.html for SPA client routing (artist, post profiles)
					ogService.ServeHTML(w, r, indexPath)
					return
				}
				staticFs.ServeHTTP(w, r)
			})
		}
	}

	return r
}
