package parser

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	readability "github.com/go-shiori/go-readability"
)

// ArticleResult holds the data extracted from a webpage via go-shiori/go-readability.
type ArticleResult struct {
	Title          string // Clean article headline
	Description    string // Article excerpt
	ContentSnippet string // Short display excerpt; fallback to first 500 chars of ContentClean
	ContentClean   string // Full readable body text, stripped of nav/ads
	WordCount      int    // Computed from ContentClean
	SiteName       string // Article.SiteName
	Favicon        string // Article.Favicon
	Timestamp      string // ISO-8601 UTC capture time
}

// Extract transforms raw HTML into an ArticleResult using the Readability algorithm.
func Extract(targetURL string, rawHTML string) (*ArticleResult, error) {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL %q: %w", targetURL, err)
	}

	article, err := readability.FromReader(strings.NewReader(rawHTML), parsedURL)
	if err != nil {
		return nil, fmt.Errorf("readability parse failed for %s: %w", targetURL, err)
	}

	contentClean := strings.TrimSpace(article.TextContent)
	wordCount := len(strings.Fields(contentClean))

	// Use Readability's excerpt as the snippet; fall back to the first 500
	// characters of the clean text, matching content.js:
	//   contentSnippet = bodyText.substring(0, 500).replace(/\s+/g, ' ').trim()
	contentSnippet := article.Excerpt
	if contentSnippet == "" && len(contentClean) > 0 {
		end := len(contentClean)
		if end > 500 {
			end = 500
		}
		contentSnippet = strings.Join(strings.Fields(contentClean[:end]), " ")
	}

	return &ArticleResult{
		Title:          article.Title,
		Description:    article.Excerpt,
		ContentSnippet: contentSnippet,
		ContentClean:   contentClean,
		WordCount:      wordCount,
		SiteName:       article.SiteName,
		Favicon:        article.Favicon,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
	}, nil
}
