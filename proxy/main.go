package main


// TODO: Use https://codeberg.org/readeck/go-readability/src/branch/v2 (this is deprecated..)


import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-shiori/go-readability"
)

// WebhookPayload defines the expected JSON structure from mitmproxy
type WebhookPayload struct {
	URL  string `json:"url"`
	HTML string `json:"html"`
}

func ingestHandler(w http.ResponseWriter, r *http.Request) {
	// Enforce POST requests
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Decode the incoming JSON payload
	var payload WebhookPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Bad request body", http.StatusBadRequest)
		return
	}

	if payload.HTML == "" || payload.URL == "" {
		http.Error(w, "Missing URL or HTML", http.StatusBadRequest)
		return
	}

	// go-readability requires a parsed *url.URL for resolving relative links
	parsedURL, err := url.Parse(payload.URL)
	if err != nil {
		http.Error(w, "Invalid URL format", http.StatusBadRequest)
		return
	}

	// Parse the HTML string directly using an io.Reader wrapper
	article, err := readability.FromReader(strings.NewReader(payload.HTML), parsedURL)
	if err != nil {
		log.Printf("[ERROR] Parsing failed for %s: %v", payload.URL, err)
		http.Error(w, "Failed to parse article", http.StatusInternalServerError)
		return
	}

	// Verification Output
	log.Printf("\n[SUCCESS] Captured: %s", article.Title)
	wordCount := len(strings.Fields(article.TextContent))
	log.Printf("Word Count: %d\n", wordCount)

	// TODO: Route `article.TextContent` to local LLM or database

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Ingested successfully\n"))
}

func main() {
	http.HandleFunc("/ingest", ingestHandler)
	
	log.Println("PIOS Ingestion Server listening on :3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}