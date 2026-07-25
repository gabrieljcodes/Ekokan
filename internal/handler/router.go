package handler

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"ekokan/internal/auth"
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
	artistH := NewArtistHandler(deps.Artists, deps.Files, deps.Store)
	postH := NewPostHandler(deps.Posts, deps.Files, deps.Artists, deps.Store)
	tagH := NewTagHandler(deps.Tags, deps.Posts)
	commentH := NewCommentHandler(deps.Comments)
	authH := NewAuthHandler(deps.Users, deps.Favorites, deps.JWTSecret, deps.AllowPublicReg)
	favH := NewFavoriteHandler(deps.Favorites)

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(auth.OptionalAuth(deps.JWTSecret))

		// Auth
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)
			r.Get("/me", authH.GetMe)
		})

		// User personal gallery
		r.Get("/users/me/favorites", favH.ListMyFavorites)
		// Artists
		r.Route("/artists", func(r chi.Router) {
			r.Get("/", artistH.List)
			r.Post("/", artistH.Create)
			r.Get("/{slug}", artistH.GetBySlug)
			r.Put("/{id}", artistH.Update)
			r.Delete("/{id}", artistH.Delete)
			r.Post("/{id}/avatar", artistH.UploadAvatar)
			r.Post("/{id}/banner", artistH.UploadBanner)
			r.Get("/{slug}/posts", postH.ListByArtist)
			r.Post("/{id}/favorite", favH.ToggleArtistFavorite)
		})

		// Posts
		r.Route("/posts", func(r chi.Router) {
			r.Get("/recent", postH.Recent)
			r.Get("/{id}", postH.GetByID)
			r.Get("/{id}/adjacent", postH.GetAdjacent)
			r.Post("/", postH.Create)
			r.Put("/{id}", postH.Update)
			r.Delete("/{id}", postH.Delete)
			r.Post("/{id}/favorite", favH.TogglePostFavorite)

			// Media
			r.Post("/{id}/media", postH.UploadMedia)
			r.Delete("/{id}/media/{mediaId}", postH.RemoveMedia)
			r.Put("/{id}/media/reorder", postH.ReorderMedia)

			// Attachments
			r.Post("/{id}/attachments", postH.UploadAttachment)
			r.Delete("/{id}/attachments/{attId}", postH.RemoveAttachment)

			// Comments
			r.Get("/{id}/comments", commentH.ListByPost)
			r.Post("/{id}/comments", commentH.Create)
			r.Delete("/{id}/comments/{commentId}", commentH.Delete)
		})

		// Tags
		r.Route("/tags", func(r chi.Router) {
			r.Get("/", tagH.List)
			r.Post("/", tagH.Create)
			r.Delete("/{id}", tagH.Delete)
			r.Get("/{slug}/posts", tagH.GetPosts)
		})
	})

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
