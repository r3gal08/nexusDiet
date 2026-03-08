package storage

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"nexusdiet-proxy/internal/parser"
)

// Store wraps a PostgreSQL connection pool.
// Using pgxpool allows the handler to safely share one pool across
// concurrent requests without managing connections manually.
type Store struct {
	pool *pgxpool.Pool
}

// NewStore connects to PostgreSQL and verifies the connection with a ping.
// connStr should be a standard DSN, e.g.:
//
//	"postgres://nexus:nexus@localhost:5432/nexusdiet"
func NewStore(connStr string) (*Store, error) {
	pool, err := pgxpool.New(context.Background(), connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Verify the connection is actually reachable at startup
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return &Store{pool: pool}, nil
}

// Close releases all connections in the pool. Should be deferred in main.
func (s *Store) Close() {
	s.pool.Close()
}

// TODO: Give this a bit deeper of a review
// InsertVisit persists a parsed article visit to the visits table.
// url is sourced from the mitmproxy webhook payload; result is from the parser.
func (s *Store) InsertVisit(ctx context.Context, url string, result *parser.ArticleResult) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO visits (url, title, description, snippet, content, word_count, site_name, favicon)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		url,
		result.Title,
		result.Description,
		result.ContentSnippet,
		result.ContentClean,
		result.WordCount,
		result.SiteName,
		result.Favicon,
	)
	if err != nil {
		return fmt.Errorf("InsertVisit failed for %s: %w", url, err)
	}
	return nil
}
