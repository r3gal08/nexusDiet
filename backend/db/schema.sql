-- nexusDiet Proxy Schema
-- Stores every article visit captured by the mitmproxy bridge and parsed by Readability.

CREATE TABLE IF NOT EXISTS visits (
    id          SERIAL PRIMARY KEY,

    -- Source URL from the mitmproxy webhook payload
    url         TEXT NOT NULL,

    -- Readability-extracted fields (see internal/parser/content.go ArticleResult)
    title       TEXT,
    description TEXT,       -- Article excerpt
    snippet     TEXT,       -- Short display excerpt (~500 chars)
    content     TEXT,       -- Full clean body text (for future classification/NLP)
    word_count  INTEGER,
    site_name   TEXT,
    favicon     TEXT,
    category    TEXT DEFAULT 'Uncategorized',

    -- Capture time stored as a proper timezone-aware timestamp
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on time for efficient dashboard queries (e.g. "last 7 days")
CREATE INDEX IF NOT EXISTS idx_visits_captured_at ON visits(captured_at);

-- Index on URL to detect duplicate/revisited pages
CREATE INDEX IF NOT EXISTS idx_visits_url ON visits(url);
