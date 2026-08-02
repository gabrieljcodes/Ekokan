package opengraph

import (
	"context"
	"fmt"
	"html"
	"log/slog"
	"net/http"
	"os"
	"regexp"
	"strings"
	"unicode/utf8"

	"ekokan/internal/repository"
	"ekokan/internal/storage"

	"github.com/google/uuid"
)

var (
	reTitle       = regexp.MustCompile(`(?i)<title>[^<]*</title>`)
	reDescription = regexp.MustCompile(`(?i)<meta\s+[^>]*name=["']description["'][^>]*>`)
	reHeadEnd     = regexp.MustCompile(`(?i)</head>`)
)

type Service struct {
	artists *repository.ArtistRepo
	posts   *repository.PostRepo
	store   *storage.OpenDALStore
}

func NewService(artists *repository.ArtistRepo, posts *repository.PostRepo, store *storage.OpenDALStore) *Service {
	return &Service{
		artists: artists,
		posts:   posts,
		store:   store,
	}
}

type OGMeta struct {
	Title       string
	Description string
	URL         string
	Images      []string
	Type        string
	SiteName    string
	TwitterCard string
}

func (m *OGMeta) BuildTags() string {
	var sb strings.Builder
	sb.WriteString("\n    <!-- Ekokan Native OpenGraph Service -->\n")
	sb.WriteString(fmt.Sprintf("    <title>%s</title>\n", html.EscapeString(m.Title)))
	sb.WriteString(fmt.Sprintf("    <meta name=\"description\" content=\"%s\" />\n", html.EscapeString(m.Description)))
	sb.WriteString(fmt.Sprintf("    <meta property=\"og:title\" content=\"%s\" />\n", html.EscapeString(m.Title)))
	sb.WriteString(fmt.Sprintf("    <meta property=\"og:description\" content=\"%s\" />\n", html.EscapeString(m.Description)))
	sb.WriteString(fmt.Sprintf("    <meta property=\"og:type\" content=\"%s\" />\n", html.EscapeString(m.Type)))
	if m.URL != "" {
		sb.WriteString(fmt.Sprintf("    <meta property=\"og:url\" content=\"%s\" />\n", html.EscapeString(m.URL)))
	}
	if m.SiteName != "" {
		sb.WriteString(fmt.Sprintf("    <meta property=\"og:site_name\" content=\"%s\" />\n", html.EscapeString(m.SiteName)))
	}
	for _, img := range m.Images {
		if img != "" {
			sb.WriteString(fmt.Sprintf("    <meta property=\"og:image\" content=\"%s\" />\n", html.EscapeString(img)))
			sb.WriteString("    <meta property=\"og:image:alt\" content=\"Ekokan digital media preview\" />\n")
		}
	}
	card := m.TwitterCard
	if card == "" {
		card = "summary_large_image"
	}
	sb.WriteString(fmt.Sprintf("    <meta name=\"twitter:card\" content=\"%s\" />\n", html.EscapeString(card)))
	sb.WriteString(fmt.Sprintf("    <meta name=\"twitter:title\" content=\"%s\" />\n", html.EscapeString(m.Title)))
	sb.WriteString(fmt.Sprintf("    <meta name=\"twitter:description\" content=\"%s\" />\n", html.EscapeString(m.Description)))
	if len(m.Images) > 0 && m.Images[0] != "" {
		sb.WriteString(fmt.Sprintf("    <meta name=\"twitter:image\" content=\"%s\" />\n", html.EscapeString(m.Images[0])))
	}
	sb.WriteString("    <!-- End Ekokan OpenGraph -->\n")
	return sb.String()
}

// ServeHTML inspects the incoming SPA route path, generates rich OpenGraph tags by querying
// local repository catalog metadata, injects them into the base index.html, and sends the stream.
func (s *Service) ServeHTML(w http.ResponseWriter, r *http.Request, indexPath string) {
	rawBytes, err := os.ReadFile(indexPath)
	if err != nil {
		slog.Error("opengraph: unable to read base index.html template from static dir", "path", indexPath, "error", err)
		http.Error(w, "500 Internal Server Error: static SPA index.html bundle not found", http.StatusInternalServerError)
		return
	}

	meta := s.resolveMetadata(r)
	tags := meta.BuildTags()

	content := string(rawBytes)
	content = reTitle.ReplaceAllString(content, "")
	content = reDescription.ReplaceAllString(content, "")

	if reHeadEnd.MatchString(content) {
		content = reHeadEnd.ReplaceAllString(content, tags+"</head>")
	} else {
		content = tags + content
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Write([]byte(content))
}

func (s *Service) resolveMetadata(r *http.Request) *OGMeta {
	ctx := r.Context()
	path := strings.Trim(r.URL.Path, "/")
	parts := strings.Split(path, "/")

	// Default / Home metadata
	defaultMeta := &OGMeta{
		Title:       "Ekokan — Self-Hosted Dedicated Creator Archive",
		Description: "High-fidelity digital catalog preserving original artwork, illustrations, multimedia creations, and high-resolution downloadable releases from independent creators.",
		URL:         s.makeAbsoluteURL(r, r.URL.Path),
		Images:      []string{s.makeAbsoluteURL(r, "/ekokan_logo.svg")},
		Type:        "website",
		SiteName:    "Ekokan Creator Archive",
		TwitterCard: "summary",
	}

	if len(parts) == 0 || (len(parts) == 1 && (parts[0] == "" || strings.EqualFold(parts[0], "index.html"))) {
		return defaultMeta
	}

	// Case 1: Post route (/artist/:artistSlug/post/:postId or /posts/:id)
	if isPostRoute(parts) {
		meta, err := s.buildPostMeta(ctx, r, parts)
		if err == nil && meta != nil {
			return meta
		}
	}

	// Case 2: Artist Profile route (/artist/:slug or /artists/:slug)
	if isArtistRoute(parts) {
		meta, err := s.buildArtistMeta(ctx, r, parts[1])
		if err == nil && meta != nil {
			return meta
		}
	}

	return defaultMeta
}

func isPostRoute(parts []string) bool {
	if len(parts) >= 4 && (strings.EqualFold(parts[0], "artist") || strings.EqualFold(parts[0], "artists")) && strings.EqualFold(parts[2], "post") {
		return true
	}
	if len(parts) >= 2 && strings.EqualFold(parts[0], "posts") && !strings.EqualFold(parts[1], "new") {
		return true
	}
	return false
}

func isArtistRoute(parts []string) bool {
	if len(parts) >= 2 && (strings.EqualFold(parts[0], "artist") || strings.EqualFold(parts[0], "artists")) && !strings.EqualFold(parts[1], "new") {
		return true
	}
	return false
}

func (s *Service) buildArtistMeta(ctx context.Context, r *http.Request, slug string) (*OGMeta, error) {
	artist, err := s.artists.GetBySlug(ctx, slug)
	if err != nil || artist == nil {
		return nil, err
	}

	var images []string
	if artist.BannerURL != "" {
		images = append(images, s.makeAbsoluteURL(r, artist.BannerURL))
	}
	if artist.AvatarURL != "" {
		images = append(images, s.makeAbsoluteURL(r, artist.AvatarURL))
	}
	if len(images) == 0 {
		images = append(images, s.makeAbsoluteURL(r, "/ekokan_logo.svg"))
	}

	description := cleanText(artist.Bio, 220)
	if description == "" {
		if artist.PostCount == 1 {
			description = fmt.Sprintf("Explore %s's official creator catalog with 1 archived original release on Ekokan.", artist.Name)
		} else {
			description = fmt.Sprintf("Explore %s's official creator catalog with %d archived original releases on Ekokan.", artist.Name, artist.PostCount)
		}
	}

	return &OGMeta{
		Title:       fmt.Sprintf("%s — Ekokan Creator Profile", artist.Name),
		Description: description,
		URL:         s.makeAbsoluteURL(r, r.URL.Path),
		Images:      images,
		Type:        "profile",
		SiteName:    "Ekokan Creator Archive",
		TwitterCard: "summary_large_image",
	}, nil
}

func (s *Service) buildPostMeta(ctx context.Context, r *http.Request, parts []string) (*OGMeta, error) {
	var postIDStr string
	if strings.EqualFold(parts[0], "artist") || strings.EqualFold(parts[0], "artists") {
		postIDStr = parts[3]
	} else {
		postIDStr = parts[1]
	}

	id, err := uuid.Parse(postIDStr)
	if err != nil {
		return nil, err
	}

	post, err := s.posts.GetByID(ctx, id)
	if err != nil || post == nil {
		return nil, fmt.Errorf("post not found or inaccessible")
	}

	artist, _ := s.posts.LoadArtistForPost(ctx, post.ArtistID)
	artistName := "Creator Archive"
	if artist != nil && artist.Name != "" {
		artistName = artist.Name
	}

	title := post.Title
	if strings.TrimSpace(title) != "" {
		title = fmt.Sprintf("%s — by %s | Ekokan", title, artistName)
	} else {
		title = fmt.Sprintf("Original Release by %s | Ekokan", artistName)
	}

	// Format description: attachments count + thumbnail preview representation
	var descBullets []string
	attCount := len(post.Attachments)
	if attCount == 1 {
		descBullets = append(descBullets, "📁 1 downloadable attachment")
	} else {
		descBullets = append(descBullets, fmt.Sprintf("📁 %d downloadable attachments", attCount))
	}

	if len(post.Media) > 0 {
		descBullets = append(descBullets, fmt.Sprintf("🖼️ %d gallery file(s)", len(post.Media)))
	}
	prefix := strings.Join(descBullets, " • ")

	var desc string
	if cleanContent := cleanText(post.Content, 160); cleanContent != "" {
		desc = prefix + " — " + cleanContent
	} else {
		desc = fmt.Sprintf("%s in %s's archived release on Ekokan.", prefix, artistName)
	}

	// Extract primary thumbnail of the post
	var images []string
	for _, m := range post.Media {
		if m.File != nil {
			img := m.File.ThumbnailURL
			if img == "" {
				img = m.File.URL
			}
			if img != "" {
				images = append(images, s.makeAbsoluteURL(r, img))
			}
		}
	}

	// Fallback to attachment images or creator branding if media array lacked thumbnails
	if len(images) == 0 {
		for _, att := range post.Attachments {
			if att.File != nil && (att.File.ThumbnailURL != "" || att.File.URL != "") {
				img := att.File.ThumbnailURL
				if img == "" {
					img = att.File.URL
				}
				images = append(images, s.makeAbsoluteURL(r, img))
				break
			}
		}
	}
	if len(images) == 0 && artist != nil {
		if artist.BannerURL != "" {
			images = append(images, s.makeAbsoluteURL(r, artist.BannerURL))
		} else if artist.AvatarURL != "" {
			images = append(images, s.makeAbsoluteURL(r, artist.AvatarURL))
		}
	}
	if len(images) == 0 {
		images = append(images, s.makeAbsoluteURL(r, "/ekokan_logo.svg"))
	}

	return &OGMeta{
		Title:       title,
		Description: desc,
		URL:         s.makeAbsoluteURL(r, r.URL.Path),
		Images:      images,
		Type:        "article",
		SiteName:    "Ekokan Creator Archive",
		TwitterCard: "summary_large_image",
	}, nil
}

func (s *Service) makeAbsoluteURL(r *http.Request, rawURL string) string {
	if rawURL == "" {
		return ""
	}
	if strings.HasPrefix(rawURL, "http://") || strings.HasPrefix(rawURL, "https://") {
		return rawURL
	}
	if strings.HasPrefix(rawURL, "//") {
		scheme := "https"
		if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
			scheme = proto
		} else if r.TLS == nil {
			scheme = "http"
		}
		return scheme + ":" + rawURL
	}

	scheme := r.Header.Get("X-Forwarded-Proto")
	if scheme == "" {
		if r.TLS != nil {
			scheme = "https"
		} else {
			scheme = "http"
		}
	}

	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Header.Get("X-Forwarded-Server")
	}
	if host == "" {
		host = r.Host
	}

	if strings.HasPrefix(rawURL, "/") {
		return fmt.Sprintf("%s://%s%s", scheme, host, rawURL)
	}
	return fmt.Sprintf("%s://%s/%s", scheme, host, rawURL)
}

func cleanText(s string, maxChars int) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	// Replace linebreaks and excess tabs with spaces
	s = strings.ReplaceAll(s, "\r\n", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")

	if utf8.RuneCountInString(s) <= maxChars {
		return s
	}
	runes := []rune(s)
	return string(runes[:maxChars-1]) + "…"
}
