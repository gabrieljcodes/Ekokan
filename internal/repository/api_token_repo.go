package repository

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"ekokan/internal/auth"
	"ekokan/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type tokenCacheEntry struct {
	claims      *auth.Claims
	cachedAt    time.Time
	tokenID     uuid.UUID
	lastUpdated time.Time // tracks when last_used_at was last written to DB
}

type ApiTokenRepo struct {
	pool  *pgxpool.Pool
	mu    sync.RWMutex
	cache map[string]tokenCacheEntry
}

func NewApiTokenRepo(pool *pgxpool.Pool) *ApiTokenRepo {
	return &ApiTokenRepo{
		pool:  pool,
		cache: make(map[string]tokenCacheEntry),
	}
}

func (r *ApiTokenRepo) Create(ctx context.Context, userID uuid.UUID, name string) (*models.ApiToken, error) {
	if strings.TrimSpace(name) == "" {
		name = "API Token"
	}
	rawBytes := make([]byte, 24)
	if _, err := rand.Read(rawBytes); err != nil {
		return nil, fmt.Errorf("generating randomness: %w", err)
	}
	rawToken := "eko_" + hex.EncodeToString(rawBytes)
	prefix := rawToken[:12] // e.g., "eko_12345678"
	hash := sha256.Sum256([]byte(rawToken))
	hashStr := hex.EncodeToString(hash[:])

	var t models.ApiToken
	err := r.pool.QueryRow(ctx, `
		INSERT INTO api_tokens (user_id, name, token_hash, token_prefix)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, name, token_prefix, created_at, last_used_at
	`, userID, name, hashStr, prefix).Scan(&t.ID, &t.UserID, &t.Name, &t.TokenPrefix, &t.CreatedAt, &t.LastUsedAt)
	if err != nil {
		return nil, fmt.Errorf("inserting api token: %w", err)
	}
	t.Token = rawToken // returned once on creation
	return &t, nil
}

func (r *ApiTokenRepo) ListByUserID(ctx context.Context, userID uuid.UUID) ([]models.ApiToken, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, name, token_prefix, created_at, last_used_at
		FROM api_tokens
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing api tokens: %w", err)
	}
	defer rows.Close()

	var tokens []models.ApiToken
	for rows.Next() {
		var t models.ApiToken
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.TokenPrefix, &t.CreatedAt, &t.LastUsedAt); err != nil {
			return nil, fmt.Errorf("scanning api token: %w", err)
		}
		tokens = append(tokens, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating api tokens: %w", err)
	}
	if tokens == nil {
		tokens = []models.ApiToken{}
	}
	return tokens, nil
}

func (r *ApiTokenRepo) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	query := `DELETE FROM api_tokens WHERE id = $1 AND user_id = $2`
	args := []any{id, userID}
	if isAdmin {
		query = `DELETE FROM api_tokens WHERE id = $1`
		args = []any{id}
	}
	tag, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("deleting api token: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return errors.New("api token not found or unauthorized")
	}

	r.mu.Lock()
	r.cache = make(map[string]tokenCacheEntry)
	r.mu.Unlock()

	return nil
}

func (r *ApiTokenRepo) ValidateApiToken(ctx context.Context, token string) (*auth.Claims, error) {
	if !strings.HasPrefix(token, "eko_") {
		return nil, errors.New("invalid token format")
	}
	hash := sha256.Sum256([]byte(token))
	hashStr := hex.EncodeToString(hash[:])

	r.mu.RLock()
	if entry, ok := r.cache[hashStr]; ok && time.Since(entry.cachedAt) < 5*time.Minute {
		r.mu.RUnlock()
		cached := *entry.claims
		return &cached, nil
	}
	r.mu.RUnlock()

	var claims auth.Claims
	var tokenID uuid.UUID
	var isActive bool
	err := r.pool.QueryRow(ctx, `
		SELECT t.id, u.id, u.username, u.role, u.is_active
		FROM api_tokens t
		JOIN users u ON t.user_id = u.id
		WHERE t.token_hash = $1
	`, hashStr).Scan(&tokenID, &claims.UserID, &claims.Username, &claims.Role, &isActive)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("invalid API token")
		}
		return nil, fmt.Errorf("validating api token: %w", err)
	}
	if !isActive {
		return nil, errors.New("user account is deactivated")
	}

	// Debounce last_used_at: update at most once per token per minute
	r.mu.Lock()
	entry := r.cache[hashStr]
	needsUsageUpdate := time.Since(entry.lastUpdated) > 1*time.Minute || entry.lastUpdated.IsZero()
	now := time.Now()
	r.cache[hashStr] = tokenCacheEntry{
		claims:      &claims,
		cachedAt:    now,
		tokenID:     tokenID,
		lastUpdated: entry.lastUpdated,
	}
	if needsUsageUpdate {
		// Mark updated before releasing lock to prevent concurrent goroutines
		updated := r.cache[hashStr]
		updated.lastUpdated = now
		r.cache[hashStr] = updated
	}
	r.mu.Unlock()

	if needsUsageUpdate {
		go func() {
			ctxTimeout, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			_, _ = r.pool.Exec(ctxTimeout, `UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1`, tokenID)
		}()
	}

	claims.ExpiresAt = time.Now().Add(365 * 24 * time.Hour).Unix()
	return &claims, nil
}
