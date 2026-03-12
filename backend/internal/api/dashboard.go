package api

import (
	"encoding/json"
	"log"
	"net/http"

	"nexusdiet-proxy/internal/storage"
)

// DashboardHandler handles requests for the React dashboard
type DashboardHandler struct {
	store *storage.Store
}

// NewDashboardHandler creates a new handler injected with the database store
func NewDashboardHandler(store *storage.Store) *DashboardHandler {
	return &DashboardHandler{store: store}
}

// GetRecentVisits returns a JSON list of the 50 most recent page visits.
// This is the primary REST endpoint for the React Dashboard MVP.
func (h *DashboardHandler) GetRecentVisits(w http.ResponseWriter, r *http.Request) {
	// 1. Ensure it's a GET request
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 2. Add CORS headers so the local React app (e.g. localhost:5173) can fetch this data.
	// Browsers have a security feature called CORS (Cross-Origin Resource Sharing). 
	// By default, a website running on localhost:5173 cannot make API requests to a 
	// server on localhost:3000. Without this header, Google Chrome will block the request.
	// Setting it to "*" tells the browser 'It's okay, let anyone request data from me'.
	// In production, you would restrict "*" to your actual Vercel/Netlify domain.
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Content-Type", "application/json") // We are returning JSON to React

	// 3. Fetch from Postgres
	visits, err := h.store.GetRecentVisits(r.Context(), 50)
	if err != nil {
		log.Printf("[Dashboard API] Error fetching visits: %v", err)
		http.Error(w, "Failed to load visit history", http.StatusInternalServerError)
		return
	}

	// 4. Send the JSON response to React
	if err := json.NewEncoder(w).Encode(visits); err != nil {
		log.Printf("[Dashboard API] JSON encode error: %v", err)
	}
}
