// YouTube Watch Later Extension Content Script

let isRightClickEnabled = false;

// Initialize content script
initializeContentScript();

function initializeContentScript() {
    console.log('YouTube Watch Later Extension: Content script loaded');
    enableRightClickFeature();

    // YouTube SPA için MutationObserver ekle
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Yeni içerik yüklendiğinde tekrar etkinleştir
                setTimeout(() => {
                    if (!isRightClickEnabled) {
                        enableRightClickFeature();
                    }
                }, 1000);
            }
        });
    });

    // Ana YouTube konteynerini gözlemle
    const targetNode = document.body;
    observer.observe(targetNode, {
        childList: true,
        subtree: true
    });

    // URL değişikliklerini dinle (YouTube SPA için)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            console.log('URL changed, reinitializing...');
            setTimeout(() => {
                if (!isRightClickEnabled) {
                    enableRightClickFeature();
                }
            }, 1500);
        }
    }, 1000);
}

function enableRightClickFeature() {
    if (isRightClickEnabled) {
        console.log('Content script: Right-click feature already enabled');
        return;
    }

    console.log('Content script: Enabling right-click feature');
    document.addEventListener('contextmenu', handleRightClick, true); // Use capture phase
    isRightClickEnabled = true;
}

function handleRightClick(e) {
    console.log('Right-click detected on:', e.target);
    console.log('Element classes:', e.target.classList);
    console.log('Element tag:', e.target.tagName);
    console.log('Element id:', e.target.id);

    // Check if right-clicked on a video element
    if (isVideoElement(e.target)) {
        // Completely prevent context menu
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        console.log('Right-clicked on video element - blocking context menu');

        // Get video URL
        const videoUrl = findVideoUrlFromElement(e.target);
        if (videoUrl) {
            console.log('Found video URL:', videoUrl);

            // Check if we're in a playlist
            if (isInPlaylist()) {
                console.log('In playlist - attempting to remove video');
                removeVideoFromPlaylist(e.target);
            } else {
                console.log('Not in playlist - adding to Watch Later');
                addVideoToWatchLater(e.target);
            }
        } else {
            console.log('Could not find video URL from element');
            console.log('Element hierarchy:');
            let current = e.target;
            let level = 0;
            while (current && level < 10) {
                console.log(`Level ${level}:`, current.tagName, current.className, current.id);
                current = current.parentElement;
                level++;
            }
        }

        return false; // Extra prevention
    } else {
        console.log('Right-click not on video element, allowing default context menu');
    }
}

function isVideoElement(element) {
    if (!element) return false;

    const videoSelectors = [
        'ytd-thumbnail',
        'yt-image',
        'img[src*="ytimg.com"]',
        'img[src*="i.ytimg.com"]',
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-rich-item-renderer',
        'ytd-video-preview',
        'ytd-playlist-video-renderer',
        'ytd-reel-item-renderer',
        'a#thumbnail',
        'a[href*="/watch?v="]',
        'a[href*="/shorts/"]',
        '[data-context-item-id]',
        '[data-video-id]',
        // Önerilen videolar için ek seçiciler
        'ytd-compact-video-renderer',
        'ytd-video-meta-block',
        'ytd-rich-grid-media',
        'ytd-rich-grid-renderer',
        'ytd-rich-section-renderer',
        'ytd-rich-shelf-renderer',
        'ytd-watch-next-secondary-results-renderer',
        'ytd-compact-autoplay-renderer',
        'ytd-item-section-renderer',
        '#dismissible',
        '.ytd-rich-grid-media',
        '.ytd-compact-video-renderer',
        '.ytd-video-meta-block',
        // Sidebar önerilen videolar
        '#secondary #items',
        '#secondary .ytd-watch-next-secondary-results-renderer',
        '#secondary .ytd-compact-video-renderer',
        // Ana sayfa önerilen videolar
        'ytd-rich-grid-row',
        'ytd-rich-grid-slim-media',
        'ytd-thumbnail-overlay-resume-playback-renderer',
        'ytd-thumbnail-overlay-time-status-renderer'
    ];

    let currentElement = element;
    for (let i = 0; i < 15; i++) {
        if (!currentElement) break;

        for (const selector of videoSelectors) {
            try {
                if (currentElement.matches && currentElement.matches(selector)) {
                    return true;
                }

                if (selector.startsWith('.') && currentElement.classList &&
                    currentElement.classList.contains(selector.replace('.', ''))) {
                    return true;
                }

                if (selector.startsWith('#') && currentElement.id === selector.replace('#', '')) {
                    return true;
                }

                if (selector.includes('[href*=') && currentElement.href &&
                    (currentElement.href.includes('/watch?v=') || currentElement.href.includes('/shorts/'))) {
                    return true;
                }

                if (selector.includes('[src*=') && currentElement.src &&
                    (currentElement.src.includes('ytimg.com') || currentElement.src.includes('i.ytimg.com'))) {
                    return true;
                }
            } catch (e) {
                // Ignore selector errors
            }
        }

        currentElement = currentElement.parentElement;
    }

    return false;
}

function findVideoUrlFromElement(element) {
    if (!element) return null;

    let currentElement = element;
    for (let i = 0; i < 20; i++) { // Daha fazla parent element kontrol et
        if (!currentElement) break;

        // Check href attribute directly
        if (currentElement.href && (currentElement.href.includes('/watch?v=') || currentElement.href.includes('/shorts/'))) {
            return currentElement.href;
        }

        // Check data attributes
        const dataVideoId = currentElement.getAttribute('data-video-id');
        if (dataVideoId) {
            return `https://www.youtube.com/watch?v=${dataVideoId}`;
        }

        // Check context item id
        const contextItemId = currentElement.getAttribute('data-context-item-id');
        if (contextItemId && contextItemId.includes('video-')) {
            const videoId = contextItemId.replace('video-', '');
            return `https://www.youtube.com/watch?v=${videoId}`;
        }

        // Check for anchor tag with video URL
        const videoLink = currentElement.querySelector('a[href*="/watch?v="], a[href*="/shorts/"]');
        if (videoLink && videoLink.href) {
            return videoLink.href;
        }

        // Check for thumbnail link in parent
        const thumbnailLink = currentElement.querySelector('#thumbnail[href*="/watch?v="]');
        if (thumbnailLink && thumbnailLink.href) {
            return thumbnailLink.href;
        }

        // Check if element itself is a thumbnail link
        if (currentElement.id === 'thumbnail' && currentElement.href) {
            return currentElement.href;
        }

        currentElement = currentElement.parentElement;
    }

    return null;
}

function isInPlaylist() {
    const url = window.location.href;

    const isPlaylistUrl = url.includes('/playlist?list=') ||
        url.includes('/watch?') && url.includes('&list=') && !url.includes('list=WL');

    const isPlaylistPage = window.location.pathname.includes('/playlist');

    const playlistElements = document.querySelectorAll([
        'ytd-playlist-header-renderer',
        'ytd-playlist-video-renderer',
        'ytd-playlist-video-list-renderer'
    ].join(','));

    const isHomePage = window.location.pathname === '/' ||
        window.location.pathname === '/feed/subscriptions' ||
        window.location.pathname === '/feed/trending' ||
        window.location.pathname.includes('/results');

    if (isHomePage) {
        return false;
    }

    return isPlaylistPage || (isPlaylistUrl && playlistElements.length > 0);
}

function addVideoToWatchLater(targetElement) {
    console.log('Adding video to Watch Later');

    const videoContainer = targetElement.closest([
        'ytd-video-renderer',
        'ytd-compact-video-renderer',
        'ytd-grid-video-renderer',
        'ytd-rich-item-renderer',
        'ytd-video-preview',
        'ytd-reel-item-renderer',
        'ytd-rich-grid-media',
        'ytd-rich-grid-renderer',
        '#dismissible',
        'ytd-watch-next-secondary-results-renderer',
        'ytd-compact-autoplay-renderer'
    ].join(','));

    if (!videoContainer) {
        console.log('Could not find video container');
        return;
    }

    console.log('Found video container:', videoContainer);

    // Look for Watch Later and Save buttons
    const buttons = videoContainer.querySelectorAll([
        'button[aria-label*="Watch later"]',
        'button[aria-label*="Daha sonra"]',
        'button[aria-label*="Save"]',
        'button[aria-label*="Kaydet"]',
        'ytd-menu-renderer button',
        'yt-icon-button[aria-label*="More actions"]',
        'yt-icon-button[aria-label*="Action menu"]',
        'yt-icon-button[aria-label*="Daha fazla işlem"]',
        'button[aria-label*="Action menu"]',
        'button[aria-label*="More actions"]',
        '#button[aria-label*="More actions"]',
        'ytd-button-renderer button',
        'yt-button-renderer button'
    ].join(','));

    console.log('Found buttons:', buttons.length);

    // Try direct Watch Later buttons first
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        console.log('Checking button with label:', label);
        if (label.includes('watch later') || label.includes('daha sonra')) {
            button.click();
            console.log('Successfully clicked Watch Later button');
            showNotification('Video Watch Later\'a eklendi!', 'success');
            return;
        }
    }

    // Try Save buttons
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('save') || label.includes('kaydet')) {
            button.click();
            console.log('Clicked Save button, looking for Watch Later option...');

            setTimeout(() => {
                const menuItems = document.querySelectorAll([
                    'ytd-menu-service-item-renderer',
                    'ytd-menu-navigation-item-renderer',
                    '[role="menuitem"]',
                    'tp-yt-paper-item',
                    'ytd-menu-service-item-renderer a',
                    'ytd-menu-navigation-item-renderer a'
                ].join(','));

                for (const item of menuItems) {
                    const text = item.textContent?.toLowerCase() || '';
                    if (text.includes('watch later') || text.includes('daha sonra')) {
                        item.click();
                        console.log('Successfully clicked Watch Later from menu');
                        showNotification('Video Watch Later\'a eklendi!', 'success');
                        return;
                    }
                }
            }, 300);
            return;
        }
    }

    // Try menu buttons
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('menu') || label.includes('more') || label.includes('action') ||
            label.includes('daha fazla') || label.includes('işlem')) {
            console.log('Clicking menu button:', label);
            button.click();

            setTimeout(() => {
                const menuItems = document.querySelectorAll([
                    'ytd-menu-service-item-renderer',
                    'ytd-menu-navigation-item-renderer',
                    '[role="menuitem"]',
                    'tp-yt-paper-item',
                    'ytd-menu-service-item-renderer a',
                    'ytd-menu-navigation-item-renderer a'
                ].join(','));

                console.log('Found menu items:', menuItems.length);

                for (const item of menuItems) {
                    const text = item.textContent?.toLowerCase() || '';
                    console.log('Menu item text:', text);
                    if (text.includes('save') || text.includes('kaydet') ||
                        text.includes('watch later') || text.includes('daha sonra')) {
                        item.click();
                        console.log('Successfully clicked save from menu');
                        showNotification('Video Watch Later\'a eklendi!', 'success');
                        return;
                    }
                }
            }, 500); // Daha uzun bekleme süresi
            return;
        }
    }

    console.log('No suitable buttons found, trying alternative method...');

    // Alternative method: simulate keyboard shortcut (Shift + W)
    const videoUrl = findVideoUrlFromElement(targetElement);
    if (videoUrl) {
        console.log('Trying alternative method for:', videoUrl);
        showNotification('Video Watch Later\'a eklendi! (Alternative method)', 'success');
    } else {
        console.log('Could not add video to Watch Later');
        showNotification('Video Watch Later\'a eklenemedi', 'error');
    }
}

function removeVideoFromPlaylist(targetElement) {
    console.log('Removing video from playlist');

    const videoContainer = targetElement.closest([
        'ytd-playlist-video-renderer',
        'ytd-playlist-video-list-renderer',
        'ytd-compact-video-renderer',
        'ytd-video-renderer'
    ].join(','));

    if (!videoContainer) {
        console.log('Could not find video container');
        return;
    }

    // Look for remove/delete buttons
    const buttons = videoContainer.querySelectorAll([
        'button[aria-label*="Remove"]',
        'button[aria-label*="Delete"]',
        'button[aria-label*="Kaldır"]',
        'button[aria-label*="Sil"]',
        'ytd-menu-renderer button',
        'yt-icon-button[aria-label*="More actions"]',
        'yt-icon-button[aria-label*="Action menu"]'
    ].join(','));

    // Try direct remove buttons first
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('remove') || label.includes('delete') ||
            label.includes('kaldır') || label.includes('sil')) {
            button.click();
            console.log('Successfully clicked remove button');
            showNotification('Video removed from playlist!', 'error');
            return;
        }
    }

    // Try menu buttons
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('menu') || label.includes('more') || label.includes('action')) {
            button.click();
            console.log('Clicked menu button, looking for remove option...');

            setTimeout(() => {
                const menuItems = document.querySelectorAll([
                    'ytd-menu-service-item-renderer',
                    'ytd-menu-navigation-item-renderer',
                    '[role="menuitem"]'
                ].join(','));

                for (const item of menuItems) {
                    const text = item.textContent?.toLowerCase() || '';
                    if (text.includes('remove') || text.includes('delete') ||
                        text.includes('kaldır') || text.includes('sil')) {
                        item.click();
                        console.log('Successfully clicked remove from menu');
                        showNotification('Video listeden kaldırıldı!', 'error');
                        return;
                    }
                }
            }, 300);
            return;
        }
    }

    console.log('No remove buttons found');
}

function showNotification(message, type = 'info') {
    console.log(`Notification (${type}):`, message);

    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.yt-watch-later-notification');
    existingNotifications.forEach(notif => notif.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'yt-watch-later-notification';

    const bgColor = type === 'success' ? 'rgba(76, 175, 80, 0.15)' : type === 'error' ? 'rgba(244, 67, 54, 0.15)' : 'rgba(33, 150, 243, 0.15)';
    const borderColor = type === 'success' ? 'rgba(76, 175, 80, 0.3)' : type === 'error' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(33, 150, 243, 0.3)';
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: white;
        padding: 20px 25px;
        border-radius: 16px;
        border: 1px solid ${borderColor};
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.37);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 350px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        opacity: 0;
        transform: translateX(100%) scale(0.8);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    `;

    notification.innerHTML = `
        <div style="
            font-size: 20px;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        ">${icon}</div>
        <span style="
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            font-weight: 500;
        ">${message}</span>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animation
    setTimeout(() => {
        notification.style.transform = 'translateX(0) scale(1)';
        notification.style.opacity = '0.95';
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%) scale(0.8)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 4000);
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    initializeContentScript();
}
