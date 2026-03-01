package parser

import (
	"log"
	"net/url"
	"strings"

	"github.com/go-shiori/go-readability"
)

// ArticleResult wraps the title and content of a parsed webpage.
type ArticleResult struct {
	Title     string
	Content   string
	WordCount int
}

// Extract transforms raw HTML into a clean article structure.
func Extract(targetURL string, html string) (*ArticleResult, error) {
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, err
	}

	article, err := readability.FromReader(strings.NewReader(html), parsedURL)
	if err != nil {
		log.Printf("[ERROR] Parsing failed for %s: %v", targetURL, err)
		return nil, err
	}

	wordCount := len(strings.Fields(article.TextContent))

	return &ArticleResult{
		Title:     article.Title,
		Content:   article.TextContent,
		WordCount: wordCount,
	}, nil
}
