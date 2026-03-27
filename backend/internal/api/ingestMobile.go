package api

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"nexusdiet-proxy/internal/storage"
)

type MobilePayload struct {
	DeviceID   string `json:"device_id"`
	Summary    string `json:"summary"`
	ContextApp string `json:"context_app"`
	RawText    string `json:"raw_text"`
}

type MobileHandler struct {
	store *storage.Store
}

func NewMobileHandler(store *storage.Store) *MobileHandler {
	return &MobileHandler{store: store}
}

func (h *MobileHandler) Post(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload MobilePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Bad request body", http.StatusBadRequest)
		return
	}

	if payload.DeviceID == "" {
		http.Error(w, "Missing device ID", http.StatusBadRequest)
		return
	}

	// Persist to DB
	if err := h.store.InsertMobileSnippet(context.Background(), payload.DeviceID, payload.ContextApp, payload.Summary, payload.RawText); err != nil {
		log.Printf("[Snippet] DB insert failed: %v", err)
		http.Error(w, "Failed to store snippet", http.StatusInternalServerError)
		return
	}

	log.Printf("[Snippet] Stored snippet for app: %s", payload.ContextApp)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Snippet ingested successfully\n"))
}
