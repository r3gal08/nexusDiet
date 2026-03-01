package ingestion

import (
	"encoding/json"
	"log"
	"net/http"

	"nexusdiet-proxy/internal/parser"
)

// WebhookPayload defines the expected JSON structure from mitmproxy
type WebhookPayload struct {
	URL  string `json:"url"`
	HTML string `json:"html"`
}

// Handler holds dependencies for ingestion logic
// Bit of a skelton for now, will eventually add things later like a logger or DB
type Handler struct{}

// NewHandler creates a new Ingestion handler
func NewHandler() *Handler {
	return &Handler{}
}

// Post handles POST requests from the bridge
// C++ brain note: h == this 
func (h *Handler) Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: // Restrict parsing to a maximum value. Memory exhaustion vulnerability exists here
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

	// Verification Output
	log.Printf("\n[Ingestion] Captured: %s", result.Title)
	log.Printf("[Ingestion] Word Count: %d\n", result.WordCount)

	// TODO: Store in DB (Note: we can use 'h' here as it is the pointer to the handler object)
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ingested successfully\n"))
}
