package main

import (
	"log"
	"net/http"
	"os"

	"nexusdiet-proxy/internal/api"
	"nexusdiet-proxy/internal/storage"
)

func main() {
	// 1. Connect to the database
	// Use environment variable for Docker/Cloud, fallback to localhost for dev
	dbConnStr := os.Getenv("DATABASE_URL")
	if dbConnStr == "" {
		dbConnStr = "postgres://nexus:nexus@localhost:5433/nexusdiet"
	}

	store, err := storage.NewStore(dbConnStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()	// Close the database connection when the program exits (guaranteed cleanup)

	log.Println("Connected to PostgreSQL")

	// 2. Initialize handlers with the DB store
	ingestHandler := api.NewIngestionHandler(store)
	dashHandler := api.NewDashboardHandler(store)

	// 3. Register routes
	http.HandleFunc("/ingest", ingestHandler.Post)
	http.HandleFunc("/api/ingest-frame", api.IngestFrame)
	http.HandleFunc("/api/visits", dashHandler.GetRecentVisits)

	// 4. Start server
	// TODO: Implement graceful shutdown (Bug 4 in review) to handle SIGINT/SIGTERM properly
	log.Println("Nexus Tracker Server listening on :3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
