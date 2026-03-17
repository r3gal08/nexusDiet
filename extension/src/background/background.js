// Background service worker

// Background service worker

chrome.runtime.onInstalled.addListener(() => {
    console.log("Nexus Diet extension installed.");
});

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "DATA_COLLECTED") {
        console.log("Data collected:", request.data);

        // Determine target IP or URL
        chrome.storage.local.get(['backendIP'], (result) => {
            let targetHost = result.backendIP || 'localhost';
            // Clean up any trailing slashes to properly format the endpoint path
            targetHost = targetHost.replace(/\/+$/, '');

            let endpoint = '';
            // Allow the user to specify http or https to cover both Caddy (HTTPS) and local testing (HTTP/3000)
            if (targetHost.startsWith('http://') || targetHost.startsWith('https://')) {
                endpoint = `${targetHost}/ingest`;
            } else {
                // Default to Caddy's secure port
                endpoint = `https://${targetHost}/ingest`;
            }

            // Send to Go Backend
            if (request.data.text && request.data.url) {
                fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: request.data.url,
                        title: request.data.title,
                        text: request.data.text,
                        snippet: request.data.snippet,
                        siteName: request.data.siteName,
                        byline: request.data.byline,
                        wordCount: request.data.wordCount
                    })
                }).then(() => {
                    // Update the lastPageData in local storage simply for popup display 
                    chrome.storage.local.set({ lastPageData: request.data });
                }).catch(err => {
                    console.error("Fetch failed entirely. Error name:", err.name);
                    console.error("Fetch error message:", err.message);
                    console.error("Endpoint attempted:", endpoint);
                });
            }
        });
    }
});
