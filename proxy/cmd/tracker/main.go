package main

import (
	"log"
	"net/http"

	"nexusdiet-proxy/internal/ingestion"
)

func main() {
	// 1. Initialize logic
	ingest := ingestion.NewHandler()

	// 2. Register standard webhook route
	http.HandleFunc("/ingest", ingest.Post)

	// 3. Start server
	log.Println("Nexus Tracker Server listening on :3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
