// Content script to read DOM information
import { Readability } from '@mozilla/readability';

let activeReadTimeMs = 0;
let maxScrollPercent = 0;
let hasSentData = false;

// Track active reading time
setInterval(() => {
    if (!document.hidden) {
        activeReadTimeMs += 1000;
        checkAndSendData();
    }
}, 1000);

// Track scroll depth
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;

    if (scrollPercent > maxScrollPercent) {
        maxScrollPercent = scrollPercent;
    }

    // Throttle the check so we aren't sending thousands of messages on a quick scroll
    if (Math.random() > 0.9) {
        checkAndSendData();
    }
});

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
        h3s: h3s.slice(0, 5),
        wordCount: contentClean.trim().split(/\s+/).length,
        contentSnippet,
        contentClean, // Full text content
        favicon,
        activeReadTimeMs,
        maxScrollPercent: Math.min(Math.round(maxScrollPercent), 100),
        timestamp: new Date().toISOString()
    };
}

// Send data only when we think they've engaged, or when they leave
function checkAndSendData() {
    if (hasSentData) return;

    // Minimum engagement threshold: 5 seconds AND scrolled at least 10%
    // If the page is too short to scroll, maxScrollPercent might be NaN or 0, so fallback to just time if scrollHeight is small
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const canScroll = docHeight > winHeight * 1.2;

    if (activeReadTimeMs >= 5000 && (!canScroll || maxScrollPercent >= 10)) {
        sendData();
    }
}

function sendData() {
    if (hasSentData) return;
    hasSentData = true;
    const pageData = extractPageData();
    chrome.runtime.sendMessage({ type: "DATA_COLLECTED", data: pageData });
}

// Also send when they leave the tab/page
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        sendData();
    }
});
window.addEventListener('beforeunload', () => {
    sendData();
});

// Also listen for requests from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PAGE_DATA") {
        sendResponse(extractPageData());
    }
});
