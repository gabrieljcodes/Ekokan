package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"ekokan/internal/auth"
	"ekokan/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	users          *repository.UserRepo
	favs           *repository.FavoriteRepo
	jwtSecret      string
	allowPublicReg bool
}

func NewAuthHandler(users *repository.UserRepo, favs *repository.FavoriteRepo, jwtSecret string, allowPublicReg bool) *AuthHandler {
	return &AuthHandler{
		users:          users,
		favs:           favs,
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

	writeJSON(w, http.StatusOK, map[string]any{
		"token":                token,
		"user":                 user,
		"favorited_post_ids":   favPosts,
		"favorited_artist_ids": favArtists,
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

	writeJSON(w, http.StatusOK, map[string]any{
		"user":                 user,
		"favorited_post_ids":   favPosts,
		"favorited_artist_ids": favArtists,
	})
}
