import db from '../services/db.js';
import { categorizePage, calculateNutritionScore } from '../services/classifier.js';

// Background service worker

chrome.runtime.onInstalled.addListener(() => {
    console.log("Nexus Diet extension installed.");
});

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "DATA_COLLECTED") {
        console.log("Data collected:", request.data);

        // Check user preference for storage
        chrome.storage.local.get(['useBackendServer', 'backendIP'], (result) => {
            if (result.useBackendServer) {
                // Determine target IP or URL
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
                if (request.data.html && request.data.url) {
                    fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: request.data.url,
                            html: request.data.html
                        })
                    }).catch(err => {
                        console.error("Fetch failed entirely. Error name:", err.name);
                        console.error("Fetch error message:", err.message);
                        console.error("Endpoint attempted:", endpoint);
                    });
                }
            } else {
                // Default: Process data through categorizer, then save to IndexedDB
                categorizePage(request.data).then(category => {
                    const nutritionScore = calculateNutritionScore(request.data, category);

                    // Use the spread operator "..." to create a new object that includes all the properties from request.data, plus the new category and nutritionScore properties.
                    const enrichedData = { ...request.data, category, nutritionScore };

                    // Persist to IndexedDB
                    db.addVisit(enrichedData).catch(err => console.error("Failed to save visit:", err));

                    // Still update local storage for quick access by popup
                    chrome.storage.local.set({ lastPageData: enrichedData });
                }).catch(err => {
                    console.error("Classification failed:", err);
                    // Save anyway if classification fails
                    db.addVisit(request.data);
                });
            }
        });
    }
});
