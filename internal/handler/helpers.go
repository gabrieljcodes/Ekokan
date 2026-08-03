package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"

	"ekokan/internal/auth"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// JSON response helpers

func writeJSON(w http.ResponseWriter, status int, data any) {
	b, err := json.Marshal(data)
	if err != nil {
		slog.Error("failed to marshal JSON response", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal json encoding error"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", strconv.Itoa(len(b)))
	w.WriteHeader(status)
	w.Write(b)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	if status >= 500 {
		slog.Error("internal server error encountered", "status", status, "detail", msg)
		msg = "internal server error"
	}
	writeJSON(w, status, map[string]string{"error": msg})
}

func canModifyResource(r *http.Request, resourceUserID *uuid.UUID) bool {
	if auth.IsAdmin(r) {
		return true
	}
	userID, ok := auth.GetUserID(r)
	if !ok {
		return false
	}
	return resourceUserID != nil && *resourceUserID == userID
}

func parsePageParams(r *http.Request) (page, perPage int) {
	page, _ = strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ = strconv.Atoi(r.URL.Query().Get("per_page"))
	if perPage < 1 {
		perPage = 25
	}
	return
}

func parseParamID(w http.ResponseWriter, r *http.Request, param string, errMsg ...string) (uuid.UUID, bool) {
	idStr := chi.URLParam(r, param)
	id, err := uuid.Parse(idStr)
	if err != nil {
		msg := "invalid id"
		if len(errMsg) > 0 && errMsg[0] != "" {
			msg = errMsg[0]
		} else if param != "id" {
			msg = "invalid " + param
		}
		writeError(w, http.StatusBadRequest, msg)
		return uuid.Nil, false
	}
	return id, true
}

