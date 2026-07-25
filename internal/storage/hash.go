package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"path"
	"strings"
)

// HashReader reads all bytes and returns the SHA-256 hex digest along with the data.
func HashBytes(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

// HashReader computes SHA-256 of an io.Reader, returning the hash and all read bytes.
func HashReader(r io.Reader) (string, []byte, error) {
	h := sha256.New()
	data, err := io.ReadAll(io.TeeReader(r, h))
	if err != nil {
		return "", nil, fmt.Errorf("reading for hash: %w", err)
	}
	return hex.EncodeToString(h.Sum(nil)), data, nil
}

// StoragePath generates a content-addressable path:
//
//	{hash[0:2]}/{hash[2:4]}/{hash}_{sanitized_name}
func StoragePath(hash, originalName string) string {
	safe := sanitizeFilename(originalName)
	return path.Join(hash[:2], hash[2:4], hash+"_"+safe)
}

func sanitizeFilename(name string) string {
	// Keep only the basename, replace problematic chars
	name = path.Base(name)
	replacer := strings.NewReplacer(
		" ", "_",
		"\\", "_",
		"/", "_",
		":", "_",
		"*", "_",
		"?", "_",
		"\"", "_",
		"<", "_",
		">", "_",
		"|", "_",
	)
	return replacer.Replace(name)
}
