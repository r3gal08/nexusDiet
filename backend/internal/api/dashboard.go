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

// VisitsResponse defines the JSON structure sent to the React dashboard.
// It includes the true total count of history and the most recent items.
type VisitsResponse struct {
	Total  int              `json:"total"`
	Visits []storage.Visit `json:"visits"`
}

// Contructor function that simply returns a pointer to a DashboardHandler struct
// NewDashboardHandler creates a new handler injected with the database store
func NewDashboardHandler(store *storage.Store) *DashboardHandler {
	return &DashboardHandler{store: store}
}

// GetRecentVisits returns a JSON object containing the total count and the 50 most recent visits.
func (h *DashboardHandler) GetRecentVisits(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Add CORS headers so the local React app (e.g. localhost:5173) can fetch this data.
	// Browsers have a security feature called CORS (Cross-Origin Resource Sharing). 
	// By default, a website running on localhost:5173 cannot make API requests to a 
	// server on localhost:3000. Without this header, Google Chrome will block the request.
	// Setting it to "*" tells the browser 'It's okay, let anyone request data from me'.
	// In production, you would restrict "*" to your actual Vercel/Netlify domain.
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Content-Type", "application/json")

	// Fetch total count
	total, err := h.store.GetTotalVisits(r.Context())
	if err != nil {
		log.Printf("[Dashboard API] Error counting visits: %v", err)
		http.Error(w, "Failed to load stats", http.StatusInternalServerError)
		return
	}

	// Fetch recent visits
	visits, err := h.store.GetRecentVisits(r.Context(), 50)
	if err != nil {
		log.Printf("[Dashboard API] Error fetching visits: %v", err)
		http.Error(w, "Failed to load visit history", http.StatusInternalServerError)
		return
	}

	// Package and send
	response := VisitsResponse{
		Total:  total,
		Visits: visits, 
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[Dashboard API] JSON encode error: %v", err)
	}
}
