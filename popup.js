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
    document.getElementById('page-title').textContent = data.title || data.url;
    document.getElementById('word-count').textContent = data.wordCount;
}
