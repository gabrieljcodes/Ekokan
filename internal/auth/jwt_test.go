package auth

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestGenerateAndValidateToken(t *testing.T) {
	secret := "test-secret"
	userID := uuid.New()
	username := "creator_test"
	role := "user"

	token, err := GenerateToken(secret, userID, username, role, time.Hour)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	claims, err := ValidateToken(secret, token)
	if err != nil {
		t.Fatalf("expected token to be valid, got err: %v", err)
	}
	if claims.UserID != userID || claims.Username != username || claims.Role != role {
		t.Errorf("claims mismatch: %+v", claims)
	}

	// Test invalid signature
	_, err = ValidateToken("wrong-secret", token)
	if err == nil {
		t.Errorf("expected error for wrong secret, got nil")
	}

	// Test expired token
	expiredToken, _ := GenerateToken(secret, userID, username, role, -time.Minute)
	_, err = ValidateToken(secret, expiredToken)
	if err == nil {
		t.Errorf("expected error for expired token, got nil")
	}
}
