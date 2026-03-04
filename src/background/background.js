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
                // Determine target IP
                const targetHost = result.backendIP || 'localhost';
                const endpoint = `http://${targetHost}:3000/ingest`;

                // Send to Go Backend
                if (request.data.html && request.data.url) {
                    fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: request.data.url,
                            html: request.data.html
                        })
                    }).catch(err => console.error("Failed to push to Go backend:", err));
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
