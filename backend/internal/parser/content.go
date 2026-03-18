package parser

// ArticleResult holds the structured data extracted from a webpage.
// Extraction is now performed client-side by Readability.js in the browser extension.
type ArticleResult struct {
	Title          string // Clean article headline
	Byline         string // Article author/credit
	ContentSnippet string // Short display excerpt
	ContentClean   string // Full readable body text
	WordCount      int    // Computed from ContentClean
	SiteName       string // Source site name
	PublishedTime  string // ISO-8601 publication date
	Timestamp      string // ISO-8601 UTC capture time
}
