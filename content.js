// Content script to read DOM information

function extractPageData() {
    const title = document.title;

    // Meta tags
    const getMeta = (name) => {
        const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
        return element ? element.getAttribute('content') : null;
    };

    const description = getMeta('description') || getMeta('og:description') || '';
    const keywords = getMeta('keywords');
    const ogTitle = getMeta('og:title');
    const ogType = getMeta('og:type');
    const ogSiteName = getMeta('og:site_name');

    // Headings
    const getHeadings = (tag) => Array.from(document.querySelectorAll(tag)).map(h => h.innerText.trim()).filter(t => t.length > 0);
    const h1s = getHeadings('h1');
    const h2s = getHeadings('h2');
    const h3s = getHeadings('h3');

    // Basic reading of text content length as a proxy for information density
    const bodyText = document.body.innerText;
    const wordCount = bodyText.trim().split(/\s+/).length;
    const contentSnippet = bodyText.substring(0, 500).replace(/\s+/g, ' ').trim();

    return {
        url: window.location.href,
        title,
        ogTitle,
        description,
        keywords,
        ogType,
        ogSiteName,
        h1s,
        h2s: h2s.slice(0, 5), // Limit to first 5 H2s to save space/bandwidth if needed
        h3s: h3s.slice(0, 5),
        wordCount,
        contentSnippet,
        timestamp: new Date().toISOString()
    };
}

// Send data to background/popup
const pageData = extractPageData();
chrome.runtime.sendMessage({ type: "DATA_COLLECTED", data: pageData });

// Also listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PAGE_DATA") {
        sendResponse(extractPageData());
    }
});
