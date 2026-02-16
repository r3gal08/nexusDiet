import db from './db.js';

// Background service worker

chrome.runtime.onInstalled.addListener(() => {
    console.log("Nexus Diet extension installed.");
});

// Listener for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "DATA_COLLECTED") {
        console.log("Data collected:", request.data);

        // Persist to IndexedDB
        db.addVisit(request.data).catch(err => console.error("Failed to save visit:", err));

        // Still update local storage for quick access by popup (optional, but keep for now)
        chrome.storage.local.set({ lastPageData: request.data });
    }
});
