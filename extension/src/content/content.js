// Content script — extracts readable article text locally via Readability.js
// Only clean text is sent to the backend; no raw HTML ever leaves the browser.
import { Readability } from '@mozilla/readability';

let hasSentData = false;

// Use Mozilla's Readability to extract the article from the live DOM.
// Returns a structured payload with only text fields — no HTML.
function extractPageData() {
    // Readability requires a cloned document (it mutates the DOM it receives)
    const docClone = document.cloneNode(true);
    const article = new Readability(docClone).parse();

    // If Readability can't find an article, fall back to basic text extraction
    const text = article?.textContent || document.body.innerText || '';
    const title = article?.title || document.title;
    const snippet = article?.excerpt || text.substring(0, 500).replace(/\s+/g, ' ').trim();
    const siteName = article?.siteName || '';
    const byline = article?.byline || '';
    const publishedTime = article?.publishedTime || '';
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    return {
        url: window.location.href,
        title,
        text,
        snippet,
        siteName,
        byline,
        publishedTime,
        wordCount,
        timestamp: new Date().toISOString()
    };
}

// Send data when the page is loaded (or when hidden/unloaded)
function sendData() {
    if (hasSentData) return;

    // TODO: Here we could do some initial filtering (like removing the dashboard page, etc)
    // We only send if the page has actual content (avoiding blank tabs etc)
    if (document.body && document.body.innerText.length > 100) {
        hasSentData = true;
        const pageData = extractPageData();
        chrome.runtime.sendMessage({ type: "DATA_COLLECTED", data: pageData });
    }
}

// Trigger points for ingestion
window.addEventListener('load', () => {
    // Wait a brief moment for dynamic content to settle
    setTimeout(sendData, 2000);
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        sendData();
    }
});

window.addEventListener('beforeunload', () => {
    sendData();
});

// Also listen for requests from popup to display the title
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PAGE_DATA") {
        sendResponse({
            title: document.title,
            url: window.location.href
        });
    }
});
