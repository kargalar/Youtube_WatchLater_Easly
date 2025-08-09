// YouTube Watch Later Extension Popup Script (Simplified)

// Initialize popup when loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('YouTube Watch Later popup loaded (Simplified)');

    // Set up help button
    const helpButton = document.querySelector('.help-button');
    if (helpButton) {
        helpButton.addEventListener('click', openHelpPage);
    }

    // Show current status
    displayStatus();
});

// Display current extension status
function displayStatus() {
    console.log('Displaying extension status (Auto mode only)');

    // Update status display
    const statusTitle = document.querySelector('.status-title');
    const statusDescription = document.querySelector('.status-description');

    if (statusTitle) {
        statusTitle.textContent = '🚀 Auto Mode Enabled';
    }

    if (statusDescription) {
        statusDescription.textContent = 'Right-click videos — they\'ll be added to Watch Later or removed from playlists automatically.';
    }
}

// Open help page
function openHelpPage() {
    try {
        chrome.tabs.create({
            url: chrome.runtime.getURL('help.html')
        });
        window.close();
    } catch (error) {
        console.error('Could not open help page:', error);
    }
}

console.log('YouTube Watch Later popup script loaded (Simplified Version)');
