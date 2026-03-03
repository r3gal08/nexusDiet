package ingestion

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"nexusdiet-proxy/internal/parser"
	"nexusdiet-proxy/internal/storage"
)

// WebhookPayload defines the expected JSON structure from mitmproxy
type WebhookPayload struct {
	URL  string `json:"url"`
	HTML string `json:"html"`
}

// Handler holds dependencies for ingestion logic
type Handler struct {
	store *storage.Store
}

// NewHandler creates a new Ingestion handler with a database store
func NewHandler(store *storage.Store) *Handler {
	return &Handler{store: store}
}

// Post handles POST requests from the bridge
// C++ brain note: h == "this"
func (h *Handler) Post(w http.ResponseWriter, r *http.Request) {
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

	if payload.HTML == "" || payload.URL == "" {
		http.Error(w, "Missing URL or HTML", http.StatusBadRequest)
		return
	}

	// Extract the readable content
	result, err := parser.Extract(payload.URL, payload.HTML)
	if err != nil {
		http.Error(w, "Failed to parse article", http.StatusInternalServerError)
		return
	}

	// Skip persisting empty or non-article payloads
	if result.WordCount == 0 {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Skipped empty article\n"))
		return
	}
	
	// Verification Output
	log.Printf("\n[Ingestion] Captured:   %s", result.Title)
	log.Printf("[Ingestion] Site:       %s", result.SiteName)
	log.Printf("[Ingestion] Word Count: %d", result.WordCount)
	log.Printf("[Ingestion] Snippet:    %s\n", result.ContentSnippet)

	// Persist to database
	if err := h.store.InsertVisit(context.Background(), payload.URL, result); err != nil {
		log.Printf("[Ingestion] DB insert failed: %v", err)
		http.Error(w, "Failed to store visit", http.StatusInternalServerError)
		return
	}

	log.Printf("[Ingestion] Stored visit for: %s", payload.URL)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ingested successfully\n"))
}
