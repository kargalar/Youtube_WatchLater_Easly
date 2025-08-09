// YouTube Watch Later Extension Background Script (Simplified)

// Initialize extension when installed
chrome.runtime.onInstalled.addListener((details) => {
    console.log('YouTube Watch Later Extension installed/updated');

    if (details.reason === 'install') {
        console.log('Extension installed for the first time');
        showWelcomeNotification();
    } else if (details.reason === 'update') {
        console.log('Extension updated to version:', chrome.runtime.getManifest().version);
    }
});

// Show welcome notification
function showWelcomeNotification() {
    try {
        chrome.notifications.create({
            type: 'basic',
            title: 'YouTube Watch Later',
            message: 'Extension installed successfully! Right-click videos on YouTube to use it.'
        });
    } catch (error) {
        console.log('Could not show notification:', error);
    }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // Check if we're on YouTube
    if (tab.url && tab.url.includes('youtube.com')) {
        // Open popup (this is handled automatically by manifest)
        console.log('Extension icon clicked on YouTube');
    } else {
        // Not on YouTube, open YouTube in new tab
        chrome.tabs.create({
            url: 'https://www.youtube.com'
        });
    }
});

// Basic message handling (simplified)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);

    // Handle any basic messages from content script
    if (request.action === 'log') {
        console.log('Content script log:', request.message);
        sendResponse({ success: true });
    }

    // Always send a response to avoid port closing errors
    if (sendResponse) {
        sendResponse({ success: true });
    }

    return true; // Keep message channel open
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act when page is completely loaded
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
        console.log('YouTube page loaded:', tab.url);

        // Inject content script if needed (backup)
        try {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: checkContentScriptLoaded
            });
        } catch (error) {
            console.log('Could not check content script:', error);
        }
    }
});

// Function to check if content script is loaded
function checkContentScriptLoaded() {
    // This function runs in the page context
    if (typeof window.ytWatchLaterExtensionLoaded === 'undefined') {
        console.log('Content script not detected, may need manual reload');
    }
}

// Keep service worker alive
setInterval(() => {
    console.log('Background script keepalive ping');
}, 30000);

// Log startup
console.log('YouTube Watch Later Extension background script started (Simplified Version)');
