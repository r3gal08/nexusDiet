// Content script to read DOM information - simplified for server-side parsing
let hasSentData = false;

// Function to extract minimal data for server-side parsing
function extractPageData() {
    return {
        url: window.location.href,
        html: document.documentElement.outerHTML,
        title: document.title,
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
