package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"nexusdiet-proxy/internal/classifier"
	"nexusdiet-proxy/internal/parser"
	"nexusdiet-proxy/internal/storage"
)

// WebhookPayload defines the expected JSON structure from the browser extension.
type WebhookPayload struct {
	URL       string `json:"url"`
	Title     string `json:"title"`
	Text      string `json:"text"`
	Snippet   string `json:"snippet"`
	SiteName  string `json:"siteName"`
	Byline    string `json:"byline"`
	WordCount int    `json:"wordCount"`
}

// IngestionHandler holds dependencies for ingestion logic
type IngestionHandler struct {
	store *storage.Store
}

// NewIngestionHandler creates a new Ingestion handler with a database store
func NewIngestionHandler(store *storage.Store) *IngestionHandler {
	return &IngestionHandler{store: store}
}

// TODO: Input sanitation with blue monday or something similar
// Post handles POST requests from the bridge
// C++ brain note: h == "this"
func (h *IngestionHandler) Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Restrict request body size (e.g. via http.MaxBytesReader) to prevent memory exhaustion
	var payload WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Bad request body", http.StatusBadRequest)
		return
	}

	if payload.Text == "" || payload.URL == "" {
		http.Error(w, "Missing URL or text content", http.StatusBadRequest)
		return
	}

	// Build the ArticleResult directly from the pre-extracted payload.
	// The extension already ran Readability.js, so no server-side parsing is needed.
	contentClean := strings.TrimSpace(payload.Text)
	wordCount := payload.WordCount
	if wordCount == 0 {
		wordCount = len(strings.Fields(contentClean))
	}

	result := &parser.ArticleResult{
		Title:          payload.Title,
		Description:    payload.Snippet,
		ContentSnippet: payload.Snippet,
		ContentClean:   contentClean,
		WordCount:      wordCount,
		SiteName:       payload.SiteName,
		Timestamp:      time.Now().UTC().Format(time.RFC3339),
	}

	// Skip persisting empty or non-article payloads
	if result.WordCount == 0 {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Skipped empty article\n"))
		return
	}

	// Verification Output. TODO: Verify everything is getting received.
	log.Printf("\n[Ingestion] Captured:   %s", result.Title)
	log.Printf("[Ingestion] Site:       %s", result.SiteName)
	log.Printf("[Ingestion] Word Count: %d", result.WordCount)
	log.Printf("[Ingestion] Snippet:    %s\n", result.ContentSnippet)

	// Run the classification heuristic
	category := classifier.Categorize(result.Title, "", result.Description, result.ContentClean)
	log.Printf("[Classifier] Determined Category: %s", category)

	// Persist to database
	if err := h.store.InsertVisit(context.Background(), payload.URL, result, category); err != nil {
		log.Printf("[Ingestion] DB insert failed: %v", err)
		http.Error(w, "Failed to store visit", http.StatusInternalServerError)
		return
	}

	log.Printf("[Ingestion] Stored visit for: %s", payload.URL)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ingested successfully\n"))
}
