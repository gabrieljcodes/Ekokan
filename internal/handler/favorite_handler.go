package handler

import (
	"net/http"

	"ekokan/internal/auth"
	"ekokan/internal/repository"
)

type FavoriteHandler struct {
	favs *repository.FavoriteRepo
}

func NewFavoriteHandler(favs *repository.FavoriteRepo) *FavoriteHandler {
	return &FavoriteHandler{favs: favs}
}

func (h *FavoriteHandler) TogglePostFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "login required to bookmark posts")
		return
	}
	postID, ok := parseParamID(w, r, "id", "invalid post id")
	if !ok {
		return
	}

	favorited, err := h.favs.TogglePostFavorite(r.Context(), userID, postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"is_favorited": favorited})
}

func (h *FavoriteHandler) ToggleArtistFavorite(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "login required to favorite creators")
		return
	}
	artistID, ok := parseParamID(w, r, "id", "invalid artist id")
	if !ok {
		return
	}

	favorited, err := h.favs.ToggleArtistFavorite(r.Context(), userID, artistID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"is_favorited": favorited})
}

func (h *FavoriteHandler) ListMyFavorites(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	artists, err := h.favs.ListUserFavArtists(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	posts, err := h.favs.ListUserFavPosts(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"artists": artists,
		"posts":   posts,
	})
}
