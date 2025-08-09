// YouTube Watch Later Extension Content Script

let isRightClickEnabled = false;

// Initialize content script
initializeContentScript();

function initializeContentScript() {
    console.log('YouTube Watch Later Extension: Content script loaded');
    // Expose a flag so background can detect we are loaded
    try { window.ytWatchLaterExtensionLoaded = true; } catch (e) { }
    enableRightClickFeature();
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
    console.log('Element tag:', e.target.tagName);
    console.log('Element class:', e.target.className);
    console.log('Element id:', e.target.id);
    console.log('Current URL:', window.location.href);

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
                console.log('In playlist - will try to remove; if not possible, fall back to Watch Later');
                removeVideoFromPlaylist(e.target);
            } else {
                console.log('Not in playlist - adding to Watch Later');
                addVideoToWatchLater(e.target);
            }
        } else {
            console.log('Could not find video URL from element');
        }

        return false; // Extra prevention
    } else {
        console.log('Right-click not on video element, allowing default context menu');
    }
}

function isVideoElement(element) {
    if (!element) return false;

    const currentUrl = window.location.href;
    const isVideoPage = currentUrl.includes('/watch?v=');
    const isChannelPage = /\/(?:@|channel\/|c\/|user\/)/.test(window.location.pathname) ||
        (window.location.pathname === '/browse' && /videos|shorts|streams/.test(new URLSearchParams(location.search).get('view') || ''));
    const isHomePage = window.location.pathname === '/' ||
        window.location.pathname === '/feed/subscriptions' ||
        window.location.pathname === '/feed/trending' ||
        window.location.pathname.includes('/results');

    // Ana sayfa ve kanal sayfalarında sadece güvenli elementler: thumbnail, img, yt-image
    if (isHomePage || isChannelPage) {
        const safeTags = [
            'YTD-THUMBNAIL',
            'IMG',
            'YT-IMAGE',
            'YTD-RICH-GRID-MEDIA',
            'YTD-RICH-ITEM-RENDERER',
            'YTD-VIDEO-RENDERER',
            'YTD-GRID-VIDEO-RENDERER'
        ];
        if (safeTags.includes(element.tagName)) {
            return true;
        }
        // data-context-item-id veya data-video-id attribute'u olanlar
        if (element.hasAttribute && (element.hasAttribute('data-context-item-id') || element.hasAttribute('data-video-id'))) {
            return true;
        }
        // Link veya başlık gibi diğer elementlerde asla engelleme
        return false;
    }

    // Video sayfasında eski mantık devam
    let videoSelectors = [
        'ytd-thumbnail',
        'ytd-rich-grid-media',
        'ytd-rich-item-renderer',
        'ytd-grid-video-renderer',
        'yt-image',
        'img[src*="ytimg.com"]',
        'img[src*="i.ytimg.com"]',
        'ytd-compact-video-renderer',
        'ytd-video-secondary-info-renderer',
        'ytd-watch-next-secondary-results-renderer',
        'ytd-item-section-renderer',
        '#secondary #contents ytd-compact-video-renderer',
        '#secondary ytd-compact-video-renderer',
        '#related #contents ytd-compact-video-renderer',
        '#related ytd-compact-video-renderer',
        'a#thumbnail',
        'a[href*="/watch?v="]',
        'a[href*="/shorts/"]',
        '[data-context-item-id]',
        '[data-video-id]'
    ];

    let currentElement = element;
    for (let i = 0; i < 10; i++) {
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
                if (selector.includes('[src*=') && currentElement.src &&
                    (currentElement.src.includes('ytimg.com') || currentElement.src.includes('i.ytimg.com'))) {
                    return true;
                }
                if (selector.includes('[data-') && currentElement.hasAttribute) {
                    const attr = selector.match(/\[([^=]+)=/)?.[1];
                    if (attr && currentElement.hasAttribute(attr)) {
                        return true;
                    }
                }
                if (selector.includes('[href*=') && currentElement.href &&
                    (currentElement.href.includes('/watch?v=') || currentElement.href.includes('/shorts/'))) {
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
    for (let i = 0; i < 15; i++) {
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

        // Check for anchor tag with video URL
        const videoLink = currentElement.querySelector('a[href*="/watch?v="], a[href*="/shorts/"]');
        if (videoLink && videoLink.href) {
            return videoLink.href;
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

    // Sayfa türüne göre container seçicilerini belirle
    const currentUrl = window.location.href;
    const isVideoPage = currentUrl.includes('/watch?v=');
    const isChannelPage = /\/(?:@|channel\/|c\/|user\/)/.test(window.location.pathname);
    const isHomePage = window.location.pathname === '/' ||
        window.location.pathname === '/feed/subscriptions' ||
        window.location.pathname === '/feed/trending' ||
        window.location.pathname.includes('/results');

    let containerSelectors = [];

    if (isVideoPage) {
        // Video sayfasında önerilen videolar için
        containerSelectors = [
            'ytd-compact-video-renderer',
            'ytd-video-secondary-info-renderer',
            'ytd-watch-next-secondary-results-renderer',
            'ytd-item-section-renderer',
            '#secondary ytd-compact-video-renderer',
            '#related ytd-compact-video-renderer'
        ];
    } else {
        // Ana sayfa, kanal, arama vs. için basit container seçiciler
        containerSelectors = [
            'ytd-video-renderer',
            'ytd-compact-video-renderer',
            'ytd-grid-video-renderer',
            'ytd-rich-item-renderer',
            'ytd-rich-grid-media',
            'ytd-reel-item-renderer',
            'ytd-playlist-video-renderer'
        ];
    }

    console.log('Using container selectors for', isVideoPage ? 'video page' : (isChannelPage ? 'channel page' : (isHomePage ? 'home/search' : 'other')));

    let videoContainer = targetElement.closest(containerSelectors.join(','));

    // Ana sayfada container bulunamazsa, daha geniş ara
    if (!videoContainer && isHomePage) {
        console.log('No container found on home page, searching more broadly');

        let current = targetElement;
        for (let i = 0; i < 8; i++) {
            if (!current) break;

            // Video URL'si içeren bir container ara
            if (current.querySelector && current.querySelector('a[href*="/watch?v="]')) {
                videoContainer = current;
                console.log('Found container with video link');
                break;
            }

            current = current.parentElement;
        }
    }

    if (!videoContainer) {
        console.log('Could not find video container');
        return;
    }

    // Ana sayfa için basit button seçiciler
    let buttonSelectors = [];

    if (isHomePage || isChannelPage) {
        buttonSelectors = [
            'button[aria-label*="Watch later"]',
            'button[aria-label*="Daha sonra"]',
            'button[aria-label*="Save"]',
            'button[aria-label*="Kaydet"]',
            'ytd-menu-renderer button',
            'button[aria-label*="Action menu"]',
            'button[aria-label*="More actions"]'
        ];
    } else {
        buttonSelectors = [
            'button[aria-label*="Watch later"]',
            'button[aria-label*="Daha sonra"]',
            'button[aria-label*="Save"]',
            'button[aria-label*="Kaydet"]',
            'ytd-menu-renderer button',
            'yt-icon-button[aria-label*="More actions"]',
            'yt-icon-button[aria-label*="Action menu"]',
            'button[aria-label*="Add to queue"]',
            'button[aria-label*="Sıraya ekle"]',
            '#button[aria-label*="More"]',
            'ytd-menu-renderer #button',
            'yt-icon-button#button',
            '[role="button"]'
        ];
    }

    // 1) Önce thumbnail üzerindeki Watch Later overlay butonunu dene (navigasyon yapmaz)
    if (tryClickOverlayWatchLater(videoContainer)) {
        console.log('Clicked overlay Watch Later toggle');
        showNotification('Added to Watch Later!', 'success');
        return;
    }

    // 2) Look for Watch Later and Save buttons
    const buttons = videoContainer.querySelectorAll(buttonSelectors.join(','));

    console.log('Found buttons:', buttons.length);

    // Butonları logla
    buttons.forEach((btn, index) => {
        const label = btn.getAttribute('aria-label') || btn.textContent || 'No label';
        console.log(`Button ${index}: ${label}`);
    });

    // 3) Try direct Watch Later buttons first
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('watch later') || label.includes('daha sonra')) {
            button.click();
            console.log('Successfully clicked Watch Later button');
            showNotification('Added to Watch Later!', 'success');
            return;
        }
    }

    // 4) Try Save buttons
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('save') || label.includes('kaydet')) {
            button.click();
            console.log('Clicked Save button, looking for Watch Later option...');

            setTimeout(() => {
                if (clickWatchLaterInOpenUIMenus()) {
                    console.log('Successfully clicked Watch Later after Save');
                    showNotification('Added to Watch Later!', 'success');
                    return;
                }
                console.log('Could not find Watch Later in menu after Save');
            }, 300);
            return;
        }
    }

    // Try menu buttons
    for (const button of buttons) {
        const label = button.getAttribute('aria-label')?.toLowerCase() || '';
        if (label.includes('menu') || label.includes('more') || label.includes('action')) {
            button.click();
            console.log('Clicked menu button, looking for save option...');

            setTimeout(() => {
                // First try direct Watch Later in the overflow menu (checkbox item in dialog preferred)
                if (clickWatchLaterInOpenUIMenus()) {
                    console.log('Successfully clicked Watch Later from overflow menu');
                    showNotification('Added to Watch Later!', 'success');
                    return;
                }
                // If not present, try Save option which opens the Add to dialog
                const saveItem = Array.from(document.querySelectorAll('ytd-menu-service-item-renderer,[role="menuitem"]'))
                    .find(el => (el.textContent || '').toLowerCase().includes('save') || (el.textContent || '').toLowerCase().includes('kaydet'));
                if (saveItem) {
                    saveItem.click();
                    setTimeout(() => {
                        if (clickWatchLaterInOpenUIMenus()) {
                            console.log('Clicked Watch Later from add-to dialog');
                            showNotification('Added to Watch Later!', 'success');
                        } else {
                            console.log('Could not find Watch Later in add-to dialog');
                        }
                    }, 300);
                }
            }, 300);
            return;
        }
    }

    console.log('No suitable buttons found');
}

// Clicks any visible "Watch later / Daha sonra" option in currently open menus or dialogs
function clickWatchLaterInOpenUIMenus() {
    // Prefer explicit WL option in the Add to dialog (checkbox entry), avoid navigation items
    // 1) Newer dialog entries with list id
    const wlById = document.querySelector('[data-list-id="WL"], ytd-playlist-add-to-option-renderer[playlist-id="WL"]');
    if (wlById) {
        const checkbox = wlById.querySelector('tp-yt-paper-checkbox, ytd-checkbox-renderer, #checkbox, button') || wlById;
        checkbox.click();
        return true;
    }

    // 2) Generic checkbox items that mention Watch later (within dialogs only)
    const dialogRoots = document.querySelectorAll('ytd-add-to-playlist-renderer, ytd-playlist-add-to-dialog-renderer, tp-yt-paper-dialog');
    for (const root of dialogRoots) {
        const candidates = root.querySelectorAll('tp-yt-paper-checkbox, ytd-checkbox-renderer, ytd-playlist-add-to-option-renderer, tp-yt-paper-item, yt-formatted-string');
        for (const el of candidates) {
            const text = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase();
            if (text.includes('watch later') || text.includes('daha sonra')) {
                const clickable = el.querySelector('tp-yt-paper-checkbox, ytd-checkbox-renderer, #checkbox, button') || el;
                clickable.click();
                return true;
            }
        }
    }

    // 3) Overflow menu: service items that perform actions (avoid navigation items that open WL page)
    const serviceItems = document.querySelectorAll('ytd-menu-service-item-renderer,[role="menuitem"]');
    for (const item of serviceItems) {
        const text = (item.textContent || item.getAttribute('aria-label') || '').toLowerCase();
        if (text.includes('watch later') || text.includes('daha sonra')) {
            // Ensure it's not a link to /playlist?list=WL
            const anchor = item.closest('a');
            if (anchor && /list=WL/.test(anchor.href || '')) {
                continue; // skip navigation to WL
            }
            (item.querySelector('button, tp-yt-paper-item') || item).click();
            return true;
        }
    }
    return false;
}

// Try to click the overlay watch later toggle on thumbnails to avoid navigation
function tryClickOverlayWatchLater(container) {
    if (!container) return false;
    // Common overlay renderer for Watch Later on thumbnails
    const overlayBtn = container.querySelector('ytd-thumbnail-overlay-toggle-button-renderer #button, ytd-thumbnail-overlay-toggle-button-renderer button');
    if (overlayBtn) {
        overlayBtn.click();
        return true;
    }
    return false;
}

function removeVideoFromPlaylist(targetElement) {
    console.log('Removing video from playlist (with fallback to Watch Later if not removable)');

    const videoContainer = targetElement.closest([
        'ytd-playlist-video-renderer',
        'ytd-playlist-video-list-renderer',
        'ytd-compact-video-renderer',
        'ytd-video-renderer'
    ].join(','));

    if (!videoContainer) {
        console.log('Could not find video container');
        // Fallback: try add to watch later (e.g., someone else\'s playlist layout)
        addVideoToWatchLater(targetElement);
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
                        showNotification('Video removed from playlist!', 'error');
                        return;
                    }
                }
                // If remove option not found, assume not own playlist -> try Add to Watch Later instead
                console.log('No remove option in menu; falling back to Add to Watch Later');
                // Close menu if open by pressing Escape
                try { document.activeElement?.blur(); } catch (e) { }
                addVideoToWatchLater(targetElement);
            }, 300);
            return;
        }
    }

    console.log('No remove buttons found; falling back to Add to Watch Later');
    addVideoToWatchLater(targetElement);
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
