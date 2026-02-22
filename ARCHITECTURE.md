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

## 2. Site Classification & Nutritional Scoring

To understand the "nutritional value" of the user's information diet, the app assigns a broad topic category (e.g., Technology, Sports, Politics) and a "Nutrition Score" (1-10) to each visited page.

**Decision**: Keyword-based Heuristics & Engagement Tracking.
-   **Categorization**: Pages are scored in a `classifier.js` module running in the background script. We weight keywords based on where they appear (Title vs Description vs Body).
-   **Nutritional Scoring**: To prevent rewarding "doomscrolling," the `calculateNutritionScore` formula factors in the assigned category (e.g. Science gets a bonus, Entertainment a penalty), the word count, *and* reading engagement metrics (`activeReadTimeMs` and `maxScrollPercent`). Points are only awarded for long-form reading if the user actually spent minimal time and scrolled through the article.
-   *Future AI Integration*: This function is designed to be easily swapped out with a local LLM or `Transformers.js` model running in-browser, without changing how the background script or database fundamentally operates.

## 3. Tech Stack
-   **Manifest V3**: Future-proof Chrome extension standard.
-   **Webpack**: Used to bundle modules (like `@mozilla/readability` and `classifier.js`) and output them to a `dist/` directory.
-   **Vanilla JS**: For UI elements like the Dashboard, we deliberately avoid heavy frameworks (React/Vue) to keep the extension blazingly fast and maintainable.

## 4. Data Schema (IndexedDB)

The `visits` object store holds a record of every page visit. The schema is implicit (NoSQL), but the structure returned by `content.js` and enriched by `background.js` is as follows:

| Field | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| **`url`** | `string` | `window.location` | The full URL of the visited page. |
| **`title`** | `string` | Readability / `document.title` | The clean article headline (preferred) or the raw page title. |
| **`category`** | `string` | `classifier.js` | The broad topic (e.g., "Technology", "Sports") matching the content. |
| **`nutritionScore`**| `number` | `classifier.js` | A calculated score (1-10) reflecting the healthiness of the content and the active reading engagement. |
| **`activeReadTimeMs`**| `number`| `content.js` | The milliseconds spent actively focused on the tab (timer stops when hidden). |
| **`maxScrollPercent`**| `number`| `content.js` | The maximum percentage (0-100) the user scrolled down the page. |
| **`contentClean`** | `string` | Readability / `body.innerText` | The **Meat**. The article text stripped of ads/nav. Used for future NLP. |
| **`contentSnippet`** | `string` | Readability / `substring` | A short excerpt (first few lines) for display in the UI history list. |
| **`wordCount`** | `number` | Calculated | Number of words in `contentClean`. Measuring the "nutritional value" of the visit. |
| **`favicon`** | `string` | DOM Scraping | URL to the site's favicon for UI context. |
| **`timestamp`** | `string` | `new Date()` | ISO string of when the data was collected. |
| **`h1s`, `h2s`, `h3s`** | `array` | DOM Scraping | Lists of headings. Provides the "Skeleton" structure of the page. |
| **`ogTitle`, `ogType`** | `string` | Meta Tags | Open Graph metadata (e.g. `type="article"` vs `type="video"`). |
| **`description`** | `string` | Meta Tags | The page's meta description. |

