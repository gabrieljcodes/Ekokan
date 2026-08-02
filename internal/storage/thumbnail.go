package storage

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	_ "golang.org/x/image/webp"
	xdraw "golang.org/x/image/draw"
)

// GenerateThumbnail creates a lightweight JPEG thumbnail (max dimension 450px)
// from image data (JPEG/PNG/GIF/WebP) or video files (MP4/WebM/etc via ffmpeg).
// Concurrency is bounded by ffiSem in storage.go which gates all OpenDAL I/O.
func GenerateThumbnail(ctx context.Context, data []byte, filename string) ([]byte, error) {
	ext := strings.ToLower(filepath.Ext(filename))

	// Determine if file is a known video format
	if isVideoExtension(ext) {
		return generateVideoThumbnail(ctx, data)
	}

	if thumb, err := generateImageThumbnail(data); err == nil {
		return thumb, nil
	}

	// Avoid invoking ffmpeg on archive, audio, document, or project files
	if isUnsupportedThumbnailExtension(ext) {
		return nil, fmt.Errorf("thumbnail generation not supported for file extension: %s", ext)
	}

	// Fall back to ffmpeg for other potential media formats
	return generateVideoThumbnail(ctx, data)
}

func isUnsupportedThumbnailExtension(ext string) bool {
	switch ext {
	case ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".exe", ".bin",
		".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md",
		".mp3", ".wav", ".flac", ".ogg", ".aac", ".m4a", ".wma",
		".psd", ".clip", ".ai", ".cs", ".py", ".cpp", ".c", ".go", ".js", ".html", ".css", ".json", ".xml", ".yaml", ".yml":
		return true
	}
	return false
}

func isVideoExtension(ext string) bool {
	switch ext {
	case ".mp4", ".webm", ".mkv", ".mov", ".avi", ".flv", ".wmv", ".m4v", ".3gp":
		return true
	}
	return false
}

func generateImageThumbnail(data []byte) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decoding image: %w", err)
	}

	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width <= 0 || height <= 0 {
		return nil, fmt.Errorf("invalid image dimensions")
	}

	maxDim := 450
	newW := width
	newH := height

	if width > maxDim || height > maxDim {
		if width > height {
			newW = maxDim
			newH = int(float64(height) * (float64(maxDim) / float64(width)))
		} else {
			newH = maxDim
			newW = int(float64(width) * (float64(maxDim) / float64(height)))
		}
		if newW < 1 {
			newW = 1
		}
		if newH < 1 {
			newH = 1
		}
	}

	dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
	// Fill background with neutral dark gray (#202020) to handle transparent PNGs/GIFs cleanly in JPEG format
	draw.Draw(dst, dst.Rect, &image.Uniform{C: color.RGBA{32, 32, 32, 255}}, image.Point{}, draw.Src)

	xdraw.CatmullRom.Scale(dst, dst.Rect, img, img.Bounds(), draw.Over, nil)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: 85}); err != nil {
		return nil, fmt.Errorf("encoding thumbnail to jpeg: %w", err)
	}
	return buf.Bytes(), nil
}

func generateVideoThumbnail(ctx context.Context, data []byte) ([]byte, error) {
	// Create a temporary input file for ffmpeg
	tmpFile, err := os.CreateTemp("", "eko-vid-*.tmp")
	if err != nil {
		return nil, fmt.Errorf("creating temp file for ffmpeg: %w", err)
	}
	tmpPath := tmpFile.Name()
	defer os.Remove(tmpPath)

	if _, err := tmpFile.Write(data); err != nil {
		tmpFile.Close()
		return nil, fmt.Errorf("writing data to temp file: %w", err)
	}
	tmpFile.Close()

	// 1st attempt: try intelligent thumbnail filter to avoid black frames
	cmd := exec.CommandContext(ctx, "ffmpeg", "-y", "-i", tmpPath, "-vf", "thumbnail,scale=450:-2:flags=lanczos", "-vframes", "1", "-f", "image2", "-c:v", "mjpeg", "-q:v", "3", "-")
	var outBuf bytes.Buffer
	var errBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &errBuf

	if err := cmd.Run(); err != nil || outBuf.Len() == 0 {
		// 2nd attempt fallback: simple first-frame extraction if thumbnail filter failed on short clip
		outBuf.Reset()
		errBuf.Reset()
		fallbackCmd := exec.CommandContext(ctx, "ffmpeg", "-y", "-i", tmpPath, "-vf", "scale=450:-2:flags=lanczos", "-vframes", "1", "-f", "image2", "-c:v", "mjpeg", "-q:v", "3", "-")
		fallbackCmd.Stdout = &outBuf
		fallbackCmd.Stderr = &errBuf
		if err := fallbackCmd.Run(); err != nil || outBuf.Len() == 0 {
			return nil, fmt.Errorf("ffmpeg thumbnail extraction failed: %s", errBuf.String())
		}
	}

	return outBuf.Bytes(), nil
}
