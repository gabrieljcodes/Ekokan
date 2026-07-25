package handler

import (
	"encoding/json"
	"net/http"

	"ekokan/internal/models"
	"ekokan/internal/repository"

	"github.com/go-chi/chi/v5"
)

type TagHandler struct {
	tags  *repository.TagRepo
	posts *repository.PostRepo
}

func NewTagHandler(tags *repository.TagRepo, posts *repository.PostRepo) *TagHandler {
	return &TagHandler{tags: tags, posts: posts}
}

func (h *TagHandler) List(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	tags, err := h.tags.List(r.Context(), category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

func (h *TagHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	tag, err := h.tags.GetBySlug(r.Context(), slug)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if tag == nil {
		writeError(w, http.StatusNotFound, "tag not found")
		return
	}

	page, perPage := parsePageParams(r)
	result, err := h.posts.ListByTag(r.Context(), tag.ID, models.PaginationParams{Page: page, PerPage: perPage})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *TagHandler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Category string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if body.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	tag, err := h.tags.FindOrCreate(r.Context(), body.Name, body.Category)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, tag)
}

func (h *TagHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseParamID(w, r, "id")
	if !ok {
		return
	}

	if err := h.tags.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// Comment handlers

type CommentHandler struct {
	comments *repository.CommentRepo
}

func NewCommentHandler(comments *repository.CommentRepo) *CommentHandler {
	return &CommentHandler{comments: comments}
}

func (h *CommentHandler) ListByPost(w http.ResponseWriter, r *http.Request) {
	postID, ok := parseParamID(w, r, "id", "invalid post id")
	if !ok {
		return
	}

	comments, err := h.comments.ListByPost(r.Context(), postID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, comments)
}

func (h *CommentHandler) Create(w http.ResponseWriter, r *http.Request) {
	postID, ok := parseParamID(w, r, "id", "invalid post id")
	if !ok {
		return
	}

	var input repository.CreateCommentInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	input.PostID = postID

	if input.Content == "" {
		writeError(w, http.StatusBadRequest, "content is required")
		return
	}

	comment, err := h.comments.Create(r.Context(), input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, comment)
}

func (h *CommentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseParamID(w, r, "commentId", "invalid comment id")
	if !ok {
		return
	}

	if err := h.comments.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
