import db from '../services/db.js';

document.addEventListener('DOMContentLoaded', () => {
    // Load stats
    db.getStats().then(stats => {
        document.getElementById('stats-pages').textContent = stats.pagesToday;
        document.getElementById('stats-words').textContent = stats.wordsToday.toLocaleString();
    }).catch(err => console.error("Failed to load stats:", err));

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_DATA" }, (response) => {
                // If there's no content script on the page (e.g. chrome:// tabs or new tabs), 
                // chrome.runtime.lastError will be set. We can ignore it and fallback.
                if (chrome.runtime.lastError || !response) {
                    checkStorage();
                } else {
                    updateUI(response);
                }
            });
        }
    });

    // TODO: add a check to ensure dashboard is running before opening it.
    document.getElementById('open-dashboard').addEventListener('click', () => {
        // TODO: Url should be exported from an env file somehow
        // Now opening the new standalone React dashboard instead of the internal one
        chrome.tabs.create({ url: 'http://localhost:5173' });
    });

    // Load backend toggle and IP state
    chrome.storage.local.get(['useBackendServer', 'backendIP'], (result) => {
        const toggle = document.getElementById('backend-toggle');
        const ipInput = document.getElementById('server-ip');
        const ipContainer = document.getElementById('server-url-container');

        toggle.checked = !!result.useBackendServer;
        ipInput.value = result.backendIP || 'localhost';
        ipContainer.style.display = toggle.checked ? 'flex' : 'none';
    });

    // Save toggle state on click
    document.getElementById('backend-toggle').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        chrome.storage.local.set({ useBackendServer: isChecked });
        document.getElementById('server-url-container').style.display = isChecked ? 'flex' : 'none';
    });

    // Save IP state on change
    document.getElementById('server-ip').addEventListener('input', (e) => {
        chrome.storage.local.set({ backendIP: e.target.value });
    });
});

function checkStorage() {
    chrome.storage.local.get(['lastPageData'], (result) => {
        if (result.lastPageData) {
            updateUI(result.lastPageData);
        }
    });
}

function updateUI(data) {
    document.getElementById('page-title').textContent = data.ogTitle || data.title || data.url;
    document.getElementById('word-count').textContent = data.wordCount;

    // Type
    if (data.ogType) {
        document.getElementById('type-container').style.display = 'block';
        document.getElementById('page-type').textContent = data.ogType;
    }

    // Keywords
    const keywordsList = document.getElementById('keywords-list');
    keywordsList.innerHTML = ''; // Clear previous
    if (data.keywords) {
        document.getElementById('keywords-container').style.display = 'block';
        data.keywords.split(',').forEach(keyword => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = keyword.trim();
            keywordsList.appendChild(span);
        });
    } else {
        document.getElementById('keywords-container').style.display = 'none';
    }

    // H1
    if (data.h1s && data.h1s.length > 0) {
        document.getElementById('h1-container').style.display = 'block';
        document.getElementById('h1-content').textContent = data.h1s[0];
    } else {
        document.getElementById('h1-container').style.display = 'none';
    }
}
