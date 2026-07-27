package handler

import (
	"encoding/json"
	"net/http"

	"ekokan/internal/auth"
	"ekokan/internal/models"
	"ekokan/internal/repository"

	"github.com/go-chi/chi/v5"
)

type SettingsHandler struct {
	settings *repository.SettingsRepo
	users    *repository.UserRepo
}

func NewSettingsHandler(settings *repository.SettingsRepo, users *repository.UserRepo) *SettingsHandler {
	return &SettingsHandler{settings: settings, users: users}
}

func (h *SettingsHandler) GetSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.settings.GetSettings(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (h *SettingsHandler) UpdateSettings(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAdmin(r) {
		writeError(w, http.StatusForbidden, "only admins can update settings")
		return
	}

	var input models.AppSettings
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	s, err := h.settings.UpdateSettings(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (h *SettingsHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAdmin(r) {
		writeError(w, http.StatusForbidden, "only admins can list users")
		return
	}

	users, err := h.users.ListUsers(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": users})
}

func (h *SettingsHandler) SetUserRole(w http.ResponseWriter, r *http.Request) {
	if !auth.IsAdmin(r) {
		writeError(w, http.StatusForbidden, "only admins can alter user roles")
		return
	}

	username := chi.URLParam(r, "username")
	var body struct {
		Role string `json:"role"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Role == "" {
		writeError(w, http.StatusBadRequest, "invalid role")
		return
	}

	if err := h.users.SetRole(r.Context(), username, body.Role); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "role updated"})
}
