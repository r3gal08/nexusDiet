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

    // Use Readability to parse the document
    // We clone the document because Readability mutates the DOM
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone);
    const article = reader.parse();

    let contentSnippet, contentClean;
    const bodyText = document.body.innerText;

    if (article) {
        contentSnippet = article.excerpt;
        contentClean = article.textContent;
    } else {
        // Fallback to raw text
        contentSnippet = bodyText.substring(0, 500).replace(/\s+/g, ' ').trim();
        contentClean = bodyText;
    }

    // Favicon
    let favicon = '';
    const linkRelIcon = document.querySelector("link[rel~='icon']");
    if (linkRelIcon) {
        favicon = linkRelIcon.href;
    } else {
        favicon = `${window.location.origin}/favicon.ico`;
    }

    return {
        url: window.location.href,
        title: article ? article.title : title, // Readability title might be cleaner
        ogTitle,
        description: article ? article.excerpt : description,
        keywords,
        ogType,
        ogSiteName,
        h1s,
        h2s: h2s.slice(0, 5),
        h2s: h2s.slice(0, 5),
        h3s: h3s.slice(0, 5),
        wordCount: contentClean.trim().split(/\s+/).length,
        contentSnippet,
        contentClean, // Full text content
        favicon,
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
