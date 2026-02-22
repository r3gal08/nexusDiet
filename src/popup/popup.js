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

    document.getElementById('open-dashboard').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
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
