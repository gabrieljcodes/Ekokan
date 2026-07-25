package handler

import (
	"encoding/json"
	"net/http"

	"ekokan/internal/models"
	"ekokan/internal/repository"
	"ekokan/internal/storage"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type PostHandler struct {
	posts  *repository.PostRepo
	files  *repository.FileRepo
	artists *repository.ArtistRepo
	store  storage.Store
}

func NewPostHandler(posts *repository.PostRepo, files *repository.FileRepo, artists *repository.ArtistRepo, store storage.Store) *PostHandler {
	return &PostHandler{posts: posts, files: files, artists: artists, store: store}
}

func (h *PostHandler) ListByArtist(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	artist, err := h.artists.GetBySlug(r.Context(), slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if artist == nil {
		writeError(w, http.StatusNotFound, "artist not found")
		return
	}

	page, perPage := parsePageParams(r)
	result, err := h.posts.ListByArtist(r.Context(), artist.ID, models.PaginationParams{Page: page, PerPage: perPage})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *PostHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	post, err := h.posts.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		writeError(w, http.StatusNotFound, "post not found")
		return
	}

	// Load artist data
	post.Artist, _ = h.posts.LoadArtistForPost(r.Context(), post.ArtistID)

	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) GetAdjacent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	post, err := h.posts.GetByID(r.Context(), id)
	if err != nil || post == nil {
		writeError(w, http.StatusNotFound, "post not found")
		return
	}

	prev, next, _ := h.posts.GetAdjacentPosts(r.Context(), id, post.ArtistID, post.PublishedAt)
	writeJSON(w, http.StatusOK, map[string]any{
		"previous": prev,
		"next":     next,
	})
}

func (h *PostHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input repository.CreatePostInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if input.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if input.ArtistID == uuid.Nil {
		writeError(w, http.StatusBadRequest, "artist_id is required")
		return
	}
	if input.Slug == "" {
		writeError(w, http.StatusBadRequest, "slug is required")
		return
	}

	post, err := h.posts.Create(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, post)
}

func (h *PostHandler) Update(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var input repository.UpdatePostInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	post, err := h.posts.Update(r.Context(), id, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		writeError(w, http.StatusNotFound, "post not found")
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.posts.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Clean up orphaned files
	go func() {
		_, _ = h.files.DeleteOrphaned(r.Context())
	}()

	w.WriteHeader(http.StatusNoContent)
}

func (h *PostHandler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	// Max 100MB
	r.Body = http.MaxBytesReader(w, r.Body, 100<<20)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

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

	caption := r.FormValue("caption")
	media, err := h.posts.AddMedia(r.Context(), postID, fileModel.ID, 0, caption)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Attach file info
	media.File = fileModel
	media.File.URL = h.store.PublicURL(fileModel.FilePath)

	writeJSON(w, http.StatusCreated, media)
}

func (h *PostHandler) RemoveMedia(w http.ResponseWriter, r *http.Request) {
	mediaIDStr := chi.URLParam(r, "mediaId")
	mediaID, err := uuid.Parse(mediaIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid media id")
		return
	}

	if err := h.posts.RemoveMedia(r.Context(), mediaID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PostHandler) ReorderMedia(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	var body struct {
		MediaIDs []uuid.UUID `json:"media_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	if err := h.posts.ReorderMedia(r.Context(), postID, body.MediaIDs); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PostHandler) UploadAttachment(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	postID, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid post id")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 100<<20)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

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

	displayName := r.FormValue("display_name")
	att, err := h.posts.AddAttachment(r.Context(), postID, fileModel.ID, displayName)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	att.File = fileModel
	att.File.URL = h.store.PublicURL(fileModel.FilePath)

	writeJSON(w, http.StatusCreated, att)
}

func (h *PostHandler) RemoveAttachment(w http.ResponseWriter, r *http.Request) {
	attIDStr := chi.URLParam(r, "attId")
	attID, err := uuid.Parse(attIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid attachment id")
		return
	}

	if err := h.posts.RemoveAttachment(r.Context(), attID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *PostHandler) Recent(w http.ResponseWriter, r *http.Request) {
	page, perPage := parsePageParams(r)
	result, err := h.posts.Recent(r.Context(), models.PaginationParams{Page: page, PerPage: perPage})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}
