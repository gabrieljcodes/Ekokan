package models

import (
	"time"

	"github.com/google/uuid"
)

type File struct {
	ID             uuid.UUID  `json:"id"`
	SHA256         string     `json:"sha256"`
	FilePath       string     `json:"file_path"`
	OriginalName   string     `json:"original_name"`
	MimeType       string     `json:"mime_type"`
	FileSize       int64      `json:"file_size"`
	Width          *int       `json:"width,omitempty"`
	Height         *int       `json:"height,omitempty"`
	DurationMs     *int       `json:"duration_ms,omitempty"`
	BlurHash       *string    `json:"blurhash,omitempty"`
	StorageBackend string     `json:"storage_backend"`
	RefCount       int        `json:"ref_count"`
	CreatedAt      time.Time  `json:"created_at"`
	URL            string     `json:"url,omitempty"` // computed, not stored
}

type User struct {
	ID           uuid.UUID  `json:"id"`
	Username     string     `json:"username"`
	Email        *string    `json:"email,omitempty"`
	PasswordHash *string    `json:"-"`
	DisplayName  *string    `json:"display_name,omitempty"`
	AvatarFileID *uuid.UUID `json:"avatar_file_id,omitempty"`
	Role         string     `json:"role"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type Artist struct {
	ID           uuid.UUID  `json:"id"`
	UserID       *uuid.UUID `json:"user_id,omitempty"`
	Name         string     `json:"name"`
	Slug         string     `json:"slug"`
	Bio          string     `json:"bio"`
	AvatarFileID *uuid.UUID `json:"avatar_file_id,omitempty"`
	BannerFileID *uuid.UUID `json:"banner_file_id,omitempty"`
	Links        map[string]string `json:"links"`
	PostCount    int        `json:"post_count"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`

	// Joined fields
	AvatarURL     string `json:"avatar_url,omitempty"`
	BannerURL     string `json:"banner_url,omitempty"`
	FavoriteCount int    `json:"favorite_count,omitempty"`
	IsFavorited   bool   `json:"is_favorited,omitempty"`
}

type Post struct {
	ID              uuid.UUID  `json:"id"`
	ArtistID        uuid.UUID  `json:"artist_id"`
	Title           string     `json:"title"`
	Slug            string     `json:"slug"`
	Content         string     `json:"content"`
	SourceURL       *string    `json:"source_url,omitempty"`
	PublishedAt     time.Time  `json:"published_at"`
	ImportedAt      *time.Time `json:"imported_at,omitempty"`
	MediaCount      int        `json:"media_count"`
	AttachmentCount int        `json:"attachment_count"`
	CommentCount    int        `json:"comment_count"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	// Joined fields
	Artist        *Artist          `json:"artist,omitempty"`
	Media         []PostMedia      `json:"media,omitempty"`
	Attachments   []PostAttachment `json:"attachments,omitempty"`
	Tags          []Tag            `json:"tags,omitempty"`
	FavoriteCount int              `json:"favorite_count,omitempty"`
	IsFavorited   bool             `json:"is_favorited,omitempty"`
}

type PostMedia struct {
	ID        uuid.UUID `json:"id"`
	PostID    uuid.UUID `json:"post_id"`
	FileID    uuid.UUID `json:"file_id"`
	SortOrder int       `json:"sort_order"`
	Caption   string    `json:"caption"`
	CreatedAt time.Time `json:"created_at"`

	// Joined
	File *File `json:"file,omitempty"`
}

type PostAttachment struct {
	ID          uuid.UUID `json:"id"`
	PostID      uuid.UUID `json:"post_id"`
	FileID      uuid.UUID `json:"file_id"`
	DisplayName *string   `json:"display_name,omitempty"`
	CreatedAt   time.Time `json:"created_at"`

	// Joined
	File *File `json:"file,omitempty"`
}

type Tag struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Category  string    `json:"category"`
	PostCount int       `json:"post_count"`
	CreatedAt time.Time `json:"created_at"`
}

type Comment struct {
	ID         uuid.UUID  `json:"id"`
	PostID     uuid.UUID  `json:"post_id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	ParentID   *uuid.UUID `json:"parent_id,omitempty"`
	AuthorName string     `json:"author_name"`
	Content    string     `json:"content"`
	IsEdited   bool       `json:"is_edited"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`

	// Nested & enriched fields
	AuthorRole *string   `json:"author_role,omitempty"`
	IsMember   bool      `json:"is_member,omitempty"`
	Replies    []Comment `json:"replies,omitempty"`
}

type Favorite struct {
	UserID    uuid.UUID `json:"user_id"`
	PostID    uuid.UUID `json:"post_id"`
	CreatedAt time.Time `json:"created_at"`
}

type ArtistFavorite struct {
	UserID    uuid.UUID `json:"user_id"`
	ArtistID  uuid.UUID `json:"artist_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Flag struct {
	ID         uuid.UUID  `json:"id"`
	UserID     *uuid.UUID `json:"user_id,omitempty"`
	PostID     uuid.UUID  `json:"post_id"`
	Reason     string     `json:"reason"`
	Status     string     `json:"status"`
	CreatedAt  time.Time  `json:"created_at"`
	ResolvedAt *time.Time `json:"resolved_at,omitempty"`
}

// Pagination helpers
type PaginationParams struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
}

func (p PaginationParams) Offset() int {
	if p.Page < 1 {
		p.Page = 1
	}
	return (p.Page - 1) * p.Limit()
}

func (p PaginationParams) Limit() int {
	if p.PerPage < 1 {
		return 25
	}
	if p.PerPage > 100 {
		return 100
	}
	return p.PerPage
}

type PaginatedResult[T any] struct {
	Data       []T `json:"data"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalPages int `json:"total_pages"`
}
