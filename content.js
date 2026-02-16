// Content script to read DOM information

function extractPageData() {
    const title = document.title;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const description = descriptionMeta ? descriptionMeta.getAttribute('content') : '';

    // Basic reading of text content length as a proxy for information density
    const bodyText = document.body.innerText;
    const wordCount = bodyText.trim().split(/\s+/).length;

    return {
        url: window.location.href,
        title,
        description,
        wordCount,
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
