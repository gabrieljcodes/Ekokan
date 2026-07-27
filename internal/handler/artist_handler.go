package handler

import (
	"encoding/json"
	"net/http"

	"ekokan/internal/auth"
	"ekokan/internal/models"
	"ekokan/internal/repository"
	"ekokan/internal/storage"

	"github.com/go-chi/chi/v5"
)

type ArtistHandler struct {
	repo     *repository.ArtistRepo
	files    *repository.FileRepo
	settings *repository.SettingsRepo
	store    *storage.OpenDALStore
}

func NewArtistHandler(repo *repository.ArtistRepo, files *repository.FileRepo, settings *repository.SettingsRepo, store *storage.OpenDALStore) *ArtistHandler {
	return &ArtistHandler{repo: repo, files: files, settings: settings, store: store}
}

func (h *ArtistHandler) List(w http.ResponseWriter, r *http.Request) {
	page, perPage := parsePageParams(r)
	search := r.URL.Query().Get("search")

	result, err := h.repo.List(r.Context(), models.PaginationParams{Page: page, PerPage: perPage}, search)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *ArtistHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	artist, err := h.repo.GetBySlug(r.Context(), slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if artist == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}
	writeJSON(w, http.StatusOK, artist)
}

func (h *ArtistHandler) Create(w http.ResponseWriter, r *http.Request) {
	if s, err := h.settings.GetSettings(r.Context()); err == nil && !s.AllowUserArtistCreation {
		if !auth.IsAdmin(r) {
			writeError(w, http.StatusForbidden, "artist profile creation is currently restricted to administrators")
			return
		}
	}

	var input repository.CreateArtistInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if input.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if input.Slug == "" {
		writeError(w, http.StatusBadRequest, "slug is required")
		return
	}
	if len(input.Name) > 100 || len(input.Slug) > 100 || len(input.Bio) > 10000 {
		writeError(w, http.StatusBadRequest, "input field exceeds maximum allowed length")
		return
	}

	if userID, ok := auth.GetUserID(r); ok {
		input.UserID = &userID
	}

	artist, err := h.repo.Create(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, artist)
}

func (h *ArtistHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}

	existing, err := h.repo.GetBySlug(r.Context(), id.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch artist")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}
	if !canModifyResource(r, existing.UserID) {
		writeError(w, http.StatusForbidden, "you do not have permission to modify this profile")
		return
	}

	var input repository.UpdateArtistInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if (input.Name != nil && len(*input.Name) > 100) || (input.Bio != nil && len(*input.Bio) > 10000) {
		writeError(w, http.StatusBadRequest, "field exceeds maximum allowed length")
		return
	}

	artist, err := h.repo.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if artist == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}
	writeJSON(w, http.StatusOK, artist)
}

func (h *ArtistHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}

	existing, err := h.repo.GetBySlug(r.Context(), id.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch artist")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}
	if !canModifyResource(r, existing.UserID) {
		writeError(w, http.StatusForbidden, "you do not have permission to delete this profile")
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ArtistHandler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}

	existing, err := h.repo.GetBySlug(r.Context(), id.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch artist")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}
	if !canModifyResource(r, existing.UserID) {
		writeError(w, http.StatusForbidden, "you do not have permission to modify this profile")
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

	artist, err := h.repo.Update(r.Context(), id, repository.UpdateArtistInput{
		AvatarFileID: &fileModel.ID,
	})
	if err != nil || artist == nil {
		writeError(w, http.StatusInternalServerError, "failed to update artist avatar")
		return
	}

	writeJSON(w, http.StatusOK, artist)
}

func (h *ArtistHandler) UploadBanner(w http.ResponseWriter, r *http.Request) {
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}

	existing, err := h.repo.GetBySlug(r.Context(), id.String())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to fetch artist")
		return
	}
	if existing == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}
	if !canModifyResource(r, existing.UserID) {
		writeError(w, http.StatusForbidden, "you do not have permission to modify this profile")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 10<<20) // 10MB limit for banner

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

	artist, err := h.repo.Update(r.Context(), id, repository.UpdateArtistInput{
		BannerFileID: &fileModel.ID,
	})
	if err != nil || artist == nil {
		writeError(w, http.StatusInternalServerError, "failed to update artist banner")
		return
	}

	writeJSON(w, http.StatusOK, artist)
}
