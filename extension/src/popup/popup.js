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
        // Open the compiled dashboard bundled inside the extension package
        const dashboardUrl = chrome.runtime.getURL('dashboard/index.html');
        chrome.tabs.create({ url: dashboardUrl });
    });

    // 3. Auto-Send Toggle and Send Data Button
    const autoSendCheckbox = document.getElementById('auto-send-checkbox');
    const sendDataBtn = document.getElementById('send-data-btn');

    // Load initial state
    chrome.storage.local.get(['autoSend'], (result) => {
        // Default to false if not set
        const isAutoSend = result.autoSend || false;
        autoSendCheckbox.checked = isAutoSend;
        sendDataBtn.disabled = isAutoSend;
    });

    // Handle checkbox changes
    autoSendCheckbox.addEventListener('change', (e) => {
        const isAutoSend = e.target.checked;
        chrome.storage.local.set({ autoSend: isAutoSend });
        sendDataBtn.disabled = isAutoSend;
    });

    // Handle manual send button click
    sendDataBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                // Change button text briefly to show feedback
                const originalText = sendDataBtn.textContent;
                sendDataBtn.textContent = 'Sending...';
                sendDataBtn.disabled = true;

                chrome.tabs.sendMessage(tabs[0].id, { type: "FORCE_SEND_DATA" }, () => {
                    setTimeout(() => {
                        sendDataBtn.textContent = 'Sent!';
                        setTimeout(() => {
                            sendDataBtn.textContent = originalText;
                            sendDataBtn.disabled = false;
                        }, 1000);
                    }, 500);
                });
            }
        });
    });

    // 4. Server IP management
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
