package api

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

// TODO: Consider in the future creating some proper structures here so we can just have this simply be a POST method and adhere to the rest of our code...
// IngestFrame handles incoming screenshots from the mobile tracker
func IngestFrame(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit request size to 10MB to prevent memory issues
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		log.Printf("[Frame Ingest] Parse form failed: %v", err)
		http.Error(w, "Error parsing form", http.StatusBadRequest)
		return
	}

	sourceApp := r.FormValue("source_app")
	file, header, err := r.FormFile("screenshot")
	if err != nil {
		log.Printf("[Frame Ingest] Failed to get file: %v", err)
		http.Error(w, "Missing screenshot file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Initial "Sanity Check" logging
	log.Printf("\n[Frame Ingest] >>> Received Frame <<<")
	log.Printf("[Frame Ingest] Source App: %s", sourceApp)
	log.Printf("[Frame Ingest] Filename:   %s", header.Filename)
	log.Printf("[Frame Ingest] Size:       %.2f KB", float64(header.Size)/1024.0)

	// Save the screenshot to disk
	framesDir := "frames"
	if err := os.MkdirAll(framesDir, 0755); err != nil {
		log.Printf("[Frame Ingest] Failed to create frames dir: %v", err)
		http.Error(w, "Failed to save frame", http.StatusInternalServerError)
		return
	}

	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("%s_%s.jpg", timestamp, sourceApp)
	outPath := filepath.Join(framesDir, filename)

	outFile, err := os.Create(outPath)
	if err != nil {
		log.Printf("[Frame Ingest] Failed to create file: %v", err)
		http.Error(w, "Failed to save frame", http.StatusInternalServerError)
		return
	}
	defer outFile.Close()

	if _, err := io.Copy(outFile, file); err != nil {
		log.Printf("[Frame Ingest] Failed to write file: %v", err)
		http.Error(w, "Failed to save frame", http.StatusInternalServerError)
		return
	}

	log.Printf("[Frame Ingest] Saved to: %s", outPath)

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Frame received successfully")
}
