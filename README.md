# Nexus Diet - Information Dashboard Architecture

This document records the key architectural choices and the reasoning behind them.

## 1. Data Collection Strategy

### Content Extraction via Readability.js
To accurately track the user's "information diet," we must separate the signal (actual content) from the noise (boilerplate, ads, navigation).

**Decision**: We use a **Hybrid Approach**:
1.  **`Readability.js`**: For the "Meat" (Main Body Text, Title, Excerpt).
2.  **Native DOM Scraping**: For the "Skeleton" (Headings, Metadata, OG Tags).

**Reasoning**:
-   **Readability is Aggressive**: It strips away *everything* it thinks is not the main article. Sometimes that includes useful context like:
    -   **Subtitles/Headings**: It might flatten the hierarchy.
    -   **Metadata**: It ignores `<meta>` tags (keywords, site name, type).
    -   **Images/Video**: While it keeps some, it might strip others that are relevant to "media diet."
-   **Fallback Safety**: If Readability fails (e.g., on a React Single Page App that loads content dynamically), native scraping ensures we still get *something* (title, URL, raw text).

### Centralized Data Storage (PostgreSQL)
**Decision**: Data is pushed from the extension and stored in a centralized PostgreSQL database via the Go backend.

**Reasoning**:
-   **Cross-Device Access**: Allows users to view their diet history across multiple browser instances or mobile platforms.
-   **Advanced Analysis**: Enables heavier processing (like the categorization engine) and future deep-learning analysis that would be too resource-intensive for the browser background worker.
-   **Privacy Choice**: While the default is local network storage (self-hosted), it simplifies the extension by making it a stateless tracker rather than a local database manager.
-   **Stateless Extension**: Removing IndexedDB from the extension significantly improves performance and reduces complex sync logic.

## 2. Backend Architecture (Go)

The `tracker` service is a Go-based REST API that handles data ingestion and persistence.

-   **Ingestion Endpoint**: `POST /ingest` receives raw HTML and metadata from the extension.
-   **Server-Side Parsing**: Uses `go-readability` (a port of Mozilla's algorithm) to extract clean content server-side. This ensures consistency between browser-stored and server-stored data.
-   **Concurrency**: Built using Go's standard `net/http` and `pgx/v5` for high-performance, concurrent database access.

## 3. Site Classification & Nutritional Scoring

To understand the "nutritional value" of the user's information diet, the app assigns a broad topic category (e.g., Technology, Sports, Politics) and a "Nutrition Score" (1-10) to each visited page.

**Decision**: Keyword-based Heuristics & Engagement Tracking.
-   **Categorization**: Pages are scored in the Go `classifier` package during ingestion. We weight keywords based on where they appear (Title vs Description vs Body).
-   **Nutritional Scoring**: *Deferred for Future Work*. We plan to calculate "Nutrition Score" (1-10) factoring in the assigned category (e.g. Science gets a bonus, Entertainment a penalty), the word count, *and* reading engagement metrics (`activeReadTimeMs` and `maxScrollPercent`).
-   *Future AI Integration*: This function is designed to be easily swapped out with a local LLM or `Transformers.js` model running in-browser, without changing how the background script or database fundamentally operates.

## 4. Tech Stack

### Extension (The Tracker)
-   **Manifest V3**: Future-proof Chrome extension standard.
-   **Webpack**: Used to bundle modules (like `@mozilla/readability`).
-   **Vanilla JS**: Lightweight tracking scripts focused purely on ingestion. No local storage or processing logic is kept in the extension.

### Dashboard (The UI)
-   **React + Vite**: A modern standalone web application for visualizing the user information diet.
-   **Decoupled Architecture**: Hosted independently from the extension, querying the Go Backend as the single source of truth.

### Backend & Infrastructure
-   **Go**: High-performance backend service handling ingestion, classification, and API requests.
-   **PostgreSQL**: Relational database for persistent storage.
-   **Docker & Docker Compose**: Containerized deployment for easy setup.
-   **Caddy**: Secure reverse proxy and TLS provider (internal and external IPs).

## 5. Deployment Architecture

```mermaid
graph TD
    Ext["Chrome Extension (Tracker)"] -- "HTTPS (POST /ingest)" --> Caddy["Caddy (Reverse Proxy)"]
    ReactApp["React Dashboard (Vite)"] -- "HTTPS (GET /api/visits)" --> Caddy
    Caddy -- "HTTP (:3000)" --> Tracker["Go Tracker Service"]
    Tracker -- "SQL" --> DB["PostgreSQL"]
    
    subgraph "Docker Environment"
        Tracker
        DB
    end
```

## 6. Data Schema

The system uses a unified data model, whether stored in IndexedDB (extension) or PostgreSQL (backend).

### PostgreSQL Schema (`visits` table)

| Field | Type | Description |
| :--- | :--- | :--- |
| **`id`** | `SERIAL` | Primary Key. |
| **`url`** | `TEXT` | The full URL of the visited page. |
| **`title`** | `TEXT` | The clean article headline. |
| **`description`** | `TEXT` | Meta description or excerpt. |
| **`snippet`** | `TEXT` | Short excerpt for UI display. |
| **`content`** | `TEXT` | Full readable body text. |
| **`word_count`** | `INTEGER` | Computed length of the article. |
| **`site_name`** | `TEXT` | Source site name (e.g., "The Verge"). |
| **`favicon`** | `TEXT` | URL to the site's favicon. |
| **`category`** | `TEXT` | The identified topic (Tech, Science, etc.). |
| **`captured_at`** | `TIMESTAMPTZ` | Record creation time in UTC. |


