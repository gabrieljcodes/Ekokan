package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// JSON response helpers

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
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

