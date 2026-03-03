package main

import (
	"log"
	"net/http"

	"nexusdiet-proxy/internal/ingestion"
	"nexusdiet-proxy/internal/storage"
)

// Connection string for the local PostgreSQL container.
// TODO: Move to an environment variable before production use.
const dbConnStr = "postgres://nexus:nexus@localhost:5433/nexusdiet"

func main() {
	// 1. Connect to the database
	store, err := storage.NewStore(dbConnStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()	// Close the database connection when the program exits (guaranteed cleanup)

	log.Println("Connected to PostgreSQL")

	// 2. Initialize ingestion handler with the DB store
	ingest := ingestion.NewHandler(store)

	// 3. Register standard webhook route
	http.HandleFunc("/ingest", ingest.Post)

	// 4. Start server
	// TODO: Implement graceful shutdown (Bug 4 in review) to handle SIGINT/SIGTERM properly
	log.Println("Nexus Tracker Server listening on :3000")
	if err := http.ListenAndServe(":3000", nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
