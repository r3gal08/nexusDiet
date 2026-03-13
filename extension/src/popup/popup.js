document.addEventListener('DOMContentLoaded', () => {
    // The previous implementation loaded reading stats (words/pages today) from 
    // the local IndexedDB using 'db.getStats()'. 
    // TODO: We need to recreate these endpoints on the Go API and fetch them here instead.
    document.getElementById('stats-pages').textContent = "Server Only";
    document.getElementById('stats-words').textContent = "Server Only";

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

    // Load backend IP state
    chrome.storage.local.get(['backendIP'], (result) => {
        const ipInput = document.getElementById('server-ip');
        const ipContainer = document.getElementById('server-url-container');

        ipInput.value = result.backendIP || 'localhost';
        // Always show IP input since backend is now permanently required
        ipContainer.style.display = 'flex'; 

        // Hide the checkbox UI toggle if it exists since we no longer support local-only
        const toggle = document.getElementById('backend-toggle');
        if (toggle) {
            toggle.disabled = true;
            toggle.checked = true;
        }
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
