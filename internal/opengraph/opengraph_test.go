package opengraph

import (
	"net/http"
	"net/url"
	"strings"
	"testing"
)

func TestCleanText(t *testing.T) {
	raw := "   Hello \r\n World \n This is a long piece of creator description that should get cleanly clipped if it exceeds the prescribed maximum character count.   "
	cleaned := cleanText(raw, 35)
	expected := "Hello    World    This is a long pi…"
	if cleaned != expected {
		t.Errorf("expected %q, got %q", expected, cleaned)
	}
}

func TestRouteMatching(t *testing.T) {
	artistParts := []string{"artist", "58020585"}
	if !isArtistRoute(artistParts) {
		t.Errorf("expected %v to be matched as artist route", artistParts)
	}
	if isPostRoute(artistParts) {
		t.Errorf("did not expect %v to be matched as post route", artistParts)
	}

	postParts := []string{"artist", "58020585", "post", "ad1a2244-5b58-4a27-910f-22cb4634fb14"}
	if !isPostRoute(postParts) {
		t.Errorf("expected %v to be matched as post route", postParts)
	}

	newPostParts := []string{"artist", "58020585", "post", "new"}
	// It should trigger post routing, where uuid parsing fails and falls back cleanly to home/default metadata
	if !isPostRoute(newPostParts) {
		t.Errorf("expected post/new route to route to post checker for safe fallback")
	}
}

func TestMakeAbsoluteURL(t *testing.T) {
	svc := &Service{}
	req := &http.Request{
		Host:   "ekokan.pousada.space",
		Header: make(http.Header),
		URL:    &url.URL{Path: "/artist/58020585"},
	}
	req.Header.Set("X-Forwarded-Proto", "https")

	res := svc.makeAbsoluteURL(req, "/media/avatar.jpg")
	expected := "https://ekokan.pousada.space/media/avatar.jpg"
	if res != expected {
		t.Errorf("expected %q, got %q", expected, res)
	}

	resS3 := svc.makeAbsoluteURL(req, "https://s3.amazonaws.com/ekokan/banner.png")
	if resS3 != "https://s3.amazonaws.com/ekokan/banner.png" {
		t.Errorf("expected unchanged absolute URL, got %q", resS3)
	}
}

func TestBuildTags(t *testing.T) {
	meta := &OGMeta{
		Title:       "Sample Post by Creator | Ekokan",
		Description: "📁 2 downloadable attachments • 🖼️ 3 gallery file(s)",
		URL:         "https://ekokan.pousada.space/artist/123/post/456",
		Images:      []string{"https://ekokan.pousada.space/media/thumb.jpg"},
		Type:        "article",
		SiteName:    "Ekokan Creator Archive",
		TwitterCard: "summary_large_image",
	}

	tags := meta.BuildTags()
	if !strings.Contains(tags, "<meta property=\"og:title\" content=\"Sample Post by Creator | Ekokan\" />") {
		t.Errorf("missing title in tags: %s", tags)
	}
	if !strings.Contains(tags, "<meta name=\"twitter:card\" content=\"summary_large_image\" />") {
		t.Errorf("missing twitter card in tags: %s", tags)
	}
	if !strings.Contains(tags, "<meta property=\"og:image\" content=\"https://ekokan.pousada.space/media/thumb.jpg\" />") {
		t.Errorf("missing og:image in tags: %s", tags)
	}
}
