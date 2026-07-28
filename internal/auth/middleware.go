package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

type contextKey string

const claimsKey contextKey = "jwt_claims"

type ApiTokenValidator interface {
	ValidateApiToken(ctx context.Context, token string) (*Claims, error)
}

func validateTokenOrApi(ctx context.Context, secret, token string, validator ApiTokenValidator) (*Claims, error) {
	if strings.HasPrefix(token, "eko_") && validator != nil {
		return validator.ValidateApiToken(ctx, token)
	}
	return ValidateToken(secret, token)
}

func RequireAuth(secret string, validator ApiTokenValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearerToken(r)
			if token == "" {
				http.Error(w, `{"error":"unauthorized: missing token"}`, http.StatusUnauthorized)
				return
			}
			claims, err := validateTokenOrApi(r.Context(), secret, token, validator)
			if err != nil {
				http.Error(w, `{"error":"unauthorized: `+err.Error()+`"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireAdmin(secret string, validator ApiTokenValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearerToken(r)
			if token == "" {
				http.Error(w, `{"error":"unauthorized: missing token"}`, http.StatusUnauthorized)
				return
			}
			claims, err := validateTokenOrApi(r.Context(), secret, token, validator)
			if err != nil {
				http.Error(w, `{"error":"unauthorized: `+err.Error()+`"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			r = r.WithContext(ctx)
			if !IsAdmin(r) {
				http.Error(w, `{"error":"forbidden: admin token required"}`, http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func OptionalAuth(secret string, validator ApiTokenValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := extractBearerToken(r)
			if token != "" {
				if claims, err := validateTokenOrApi(r.Context(), secret, token, validator); err == nil {
					ctx := context.WithValue(r.Context(), claimsKey, claims)
					r = r.WithContext(ctx)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func GetClaims(r *http.Request) *Claims {
	claims, _ := r.Context().Value(claimsKey).(*Claims)
	return claims
}

func GetUserID(r *http.Request) (uuid.UUID, bool) {
	claims := GetClaims(r)
	if claims == nil || claims.UserID == uuid.Nil {
		return uuid.Nil, false
	}
	return claims.UserID, true
}

func extractBearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}
	parts := strings.Split(authHeader, " ")
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return parts[1]
	}
	return ""
}

func IsAdmin(r *http.Request) bool {
	claims := GetClaims(r)
	return claims != nil && (strings.EqualFold(claims.Role, "admin") || strings.EqualFold(claims.Role, "administrator"))
}

