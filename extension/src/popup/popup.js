document.addEventListener('DOMContentLoaded', () => {
    // 1. Get current tab information from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_DATA" }, (response) => {
                // Handle cases where content script is missing (e.g., chrome:// tabs)
                if (chrome.runtime.lastError || !response) {
                    checkLastCaptured();
                } else {
                    updateUI(response);
                }
            });
        }
    });

    // 2. Dashboard Button
    document.getElementById('open-dashboard').addEventListener('click', () => {
        // React dashboard default dev port
        chrome.tabs.create({ url: 'http://localhost:5173' });
    });

    // 3. Server IP management
    chrome.storage.local.get(['backendIP'], (result) => {
        const ipInput = document.getElementById('server-ip');
        ipInput.value = result.backendIP || 'localhost';
    });

    document.getElementById('server-ip').addEventListener('input', (e) => {
        chrome.storage.local.set({ backendIP: e.target.value.trim() });
    });
});

// Fallback to show the last caught page if current tab isn't scannable
function checkLastCaptured() {
    chrome.storage.local.get(['lastPageData'], (result) => {
        if (result.lastPageData) {
            updateUI(result.lastPageData);
        } else {
            document.getElementById('page-title').textContent = "No page active";
        }
    });
}

function updateUI(data) {
    if (data && data.title) {
        document.getElementById('page-title').textContent = data.title;
    }
}
