document.addEventListener('DOMContentLoaded', () => {
    // Try to get data from the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_DATA" }, (response) => {
                if (chrome.runtime.lastError) {
                    document.getElementById('page-title').textContent = "Error communicating with page.";
                    console.error(chrome.runtime.lastError);
                } else if (response) {
                    updateUI(response);
                } else {
                    // Fallback to storage if content script didn't respond immediately (page might check storage)
                    checkStorage();
                }
            });
        }
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
