# Nexus Diet - Architecture & Design Decisions

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

### Privacy-First Storage (IndexedDB)
**Decision**: All data is stored locally in the browser's IndexedDB.

**Reasoning**:
-   **Privacy**: User browsing history is sensitive. It should not leave the device.
-   **Capacity**: IndexedDB handles large amounts of text data much better than `chrome.storage.local`.

## 2. Tech Stack
-   **Manifest V3**: Future-proof Chrome extension standard.
-   **Vanilla JS**: No build steps (Webpack/Parcel) for now to keep the contribution barrier low and the project simple.

## 3. Data Schema (IndexedDB)

The `visits` object store holds a record of every page visit. The schema is implicit (NoSQL), but the structure returned by `content.js` is as follows:

| Field | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| **`url`** | `string` | `window.location` | The full URL of the visited page. |
| **`title`** | `string` | Readability / `document.title` | The clean article headline (preferred) or the raw page title. |
| **`contentClean`** | `string` | Readability / `body.innerText` | The **Meat**. The article text stripped of ads/nav. Used for future NLP. |
| **`contentSnippet`** | `string` | Readability / `substring` | A short excerpt (first few lines) for display in the UI history list. |
| **`wordCount`** | `number` | Calculated | Number of words in `contentClean`. Measuring the "nutritional value" of the visit. |
| **`favicon`** | `string` | DOM Scraping | URL to the site's favicon for UI context. |
| **`timestamp`** | `string` | `new Date()` | ISO string of when the data was collected. |
| **`h1s`, `h2s`, `h3s`** | `array` | DOM Scraping | Lists of headings. Provides the "Skeleton" structure of the page. |
| **`ogTitle`, `ogType`** | `string` | Meta Tags | Open Graph metadata (e.g. `type="article"` vs `type="video"`). |
| **`description`** | `string` | Meta Tags | The page's meta description. |

