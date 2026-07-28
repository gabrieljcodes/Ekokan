package handler

import (
	"encoding/json"
	"net/http"

	"ekokan/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type ApiTokenHandler struct {
	deps Deps
}

func NewApiTokenHandler(deps Deps) *ApiTokenHandler {
	return &ApiTokenHandler{deps: deps}
}

type CreateTokenReq struct {
	Name string `json:"name"`
}

func (h *ApiTokenHandler) CreateToken(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var req CreateTokenReq
	_ = json.NewDecoder(r.Body).Decode(&req)

	token, err := h.deps.ApiTokens.Create(r.Context(), userID, req.Name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate API token: "+err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, token)
}

func (h *ApiTokenHandler) ListTokens(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.GetUserID(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	tokens, err := h.deps.ApiTokens.ListByUserID(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list API tokens: "+err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"tokens": tokens})
}

func (h *ApiTokenHandler) DeleteToken(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid token ID")
		return
	}

	userID, _ := auth.GetUserID(r)
	isAdmin := auth.IsAdmin(r)

	if err := h.deps.ApiTokens.Delete(r.Context(), id, userID, isAdmin); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "API token revoked successfully"})
}
