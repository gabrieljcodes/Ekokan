package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"ekokan/internal/auth"
	"ekokan/internal/models"
	"ekokan/internal/repository"
	"ekokan/internal/storage"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	users          *repository.UserRepo
	favs           *repository.FavoriteRepo
	files          *repository.FileRepo
	comments       *repository.CommentRepo
	store          *storage.OpenDALStore
	jwtSecret      string
	allowPublicReg bool
}

func NewAuthHandler(users *repository.UserRepo, favs *repository.FavoriteRepo, files *repository.FileRepo, comments *repository.CommentRepo, store *storage.OpenDALStore, jwtSecret string, allowPublicReg bool) *AuthHandler {
	return &AuthHandler{
		users:          users,
		favs:           favs,
		files:          files,
		comments:       comments,
		store:          store,
		jwtSecret:      jwtSecret,
		allowPublicReg: allowPublicReg,
	}
}

type registerInput struct {
	Username    string  `json:"username"`
	Email       *string `json:"email"`
	Password    string  `json:"password"`
	DisplayName *string `json:"display_name"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if !h.allowPublicReg {
		writeError(w, http.StatusForbidden, "Public registration is currently disabled by administrator.")
		return
	}

	var input registerInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	input.Username = strings.TrimSpace(input.Username)
	if len(input.Username) < 3 {
		writeError(w, http.StatusBadRequest, "username must be at least 3 characters")
		return
	}
	if len(input.Password) < 6 {
		writeError(w, http.StatusBadRequest, "password must be at least 6 characters")
		return
	}

	existing, err := h.users.GetByUsername(r.Context(), input.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if existing != nil {
		writeError(w, http.StatusConflict, "username is already taken")
		return
	}

	hashBytes, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user, err := h.users.Create(r.Context(), repository.CreateUserInput{
		Username:     input.Username,
		Email:        input.Email,
		PasswordHash: string(hashBytes),
		DisplayName:  input.DisplayName,
		Role:         "user",
	})
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			writeError(w, http.StatusConflict, "username or email already in use")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	token, err := auth.GenerateToken(h.jwtSecret, user.ID, user.Username, user.Role, 30*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate authentication token")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"token":                token,
		"user":                 user,
		"favorited_post_ids":   []string{},
		"favorited_artist_ids": []string{},
		"liked_post_ids":       []string{},
		"excluded_tag_ids":     []string{},
	})
}

type loginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input loginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	user, err := h.users.GetByUsername(r.Context(), strings.TrimSpace(input.Username))
	if err != nil || user == nil || user.PasswordHash == nil {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(input.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	token, err := auth.GenerateToken(h.jwtSecret, user.ID, user.Username, user.Role, 30*24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	favPosts, _ := h.favs.ListUserFavPostIDs(r.Context(), user.ID)
	favArtists, _ := h.favs.ListUserFavArtistIDs(r.Context(), user.ID)
	likedPosts, _ := h.favs.ListUserLikedPostIDs(r.Context(), user.ID)
	excludedTags, _ := h.users.ListUserExcludedTagIDs(r.Context(), user.ID)

	writeJSON(w, http.StatusOK, map[string]any{
		"token":                token,
		"user":                 user,
		"favorited_post_ids":   favPosts,
		"favorited_artist_ids": favArtists,
		"liked_post_ids":       likedPosts,
		"excluded_tag_ids":     excludedTags,
	})
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusNotFound, "user profile not found")
		return
	}

	favPosts, _ := h.favs.ListUserFavPostIDs(r.Context(), user.ID)
	favArtists, _ := h.favs.ListUserFavArtistIDs(r.Context(), user.ID)
	likedPosts, _ := h.favs.ListUserLikedPostIDs(r.Context(), user.ID)
	excludedTags, _ := h.users.ListUserExcludedTagIDs(r.Context(), user.ID)

	writeJSON(w, http.StatusOK, map[string]any{
		"user":                 user,
		"favorited_post_ids":   favPosts,
		"favorited_artist_ids": favArtists,
		"liked_post_ids":       likedPosts,
		"excluded_tag_ids":     excludedTags,
	})
}

func (h *AuthHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10MB limit for avatar

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	result, err := storage.ProcessUpload(r.Context(), h.store, header.Filename, file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	fileModel := &models.File{
		SHA256:         result.SHA256,
		FilePath:       result.FilePath,
		OriginalName:   result.OriginalName,
		MimeType:       result.MimeType,
		FileSize:       result.FileSize,
		StorageBackend: "fs",
	}

	_, err = h.files.FindOrCreate(r.Context(), fileModel)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	err = h.users.UpdateAvatar(r.Context(), userID, fileModel.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update user avatar")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil || user == nil {
		writeError(w, http.StatusInternalServerError, "failed to load updated user")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

type excludedTagsRequest struct {
	TagIDs []string `json:"tag_ids"`
}

func (h *AuthHandler) SetExcludedTags(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req excludedTagsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json body")
		return
	}

	var uuids []uuid.UUID
	for _, idStr := range req.TagIDs {
		if id, err := uuid.Parse(idStr); err == nil {
			uuids = append(uuids, id)
		}
	}

	if err := h.users.SetUserExcludedTags(r.Context(), userID, uuids); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update excluded tags: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"success":          true,
		"excluded_tag_ids": req.TagIDs,
	})
}

func (h *AuthHandler) GetUserProfile(w http.ResponseWriter, r *http.Request) {
	username := chi.URLParam(r, "username")
	if strings.TrimSpace(username) == "" {
		writeError(w, http.StatusBadRequest, "username required")
		return
	}

	user, err := h.users.GetByUsername(r.Context(), username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query user profile: "+err.Error())
		return
	}
	if user == nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}

	// Sanitize sensitive fields for public profile display
	user.Email = nil
	user.PasswordHash = nil

	var comments []models.Comment
	if h.comments != nil {
		comments, err = h.comments.ListByUser(r.Context(), user.ID, 50)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list user comments: "+err.Error())
			return
		}
	}

	artists, err := h.favs.ListUserFavArtists(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list favorite artists: "+err.Error())
		return
	}
	posts, err := h.favs.ListUserFavPosts(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list favorite posts: "+err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":             user,
		"comments":         comments,
		"favorite_artists": artists,
		"favorite_posts":   posts,
	})
}
