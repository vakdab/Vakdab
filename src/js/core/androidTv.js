/**
 * Android TV & Remote Control Adaptation for VakDab
 * Provides 2D spatial D-pad navigation, remote control shortcuts,
 * video playback controls, and TV 10-foot layout enhancements.
 */

const STORAGE_KEY = 'vakdab_tv_mode';
let tvModeActive = false;
let initialized = false;

/**
 * Check if the current device is an Android TV / Smart TV / Set-top box.
 */
export function detectIsTvDevice() {
    const ua = navigator.userAgent || '';
    const tvPatterns = /Android.*TV|SmartTV|GoogleTV|AppleTV|HbbTV|AFTB|AFTT|CrKey|BRAVIA|MiTV|TV\s?Bro|Silk\/|NetCast|Tizen|Web0S|webOS|STB|SmartHub|TV/i;
    const isTvUa = tvPatterns.test(ua);
    const isStored = localStorage.getItem(STORAGE_KEY) === 'true';
    return isTvUa || isStored;
}

export function isTvMode() {
    return tvModeActive;
}

export function setTvMode(enable, notify = false) {
    tvModeActive = Boolean(enable);
    localStorage.setItem(STORAGE_KEY, tvModeActive ? 'true' : 'false');
    document.documentElement.classList.toggle('android-tv-mode', tvModeActive);
    document.body.classList.toggle('android-tv-mode', tvModeActive);

    window.dispatchEvent(new CustomEvent('vakdab:tv-mode-changed', {
        detail: { active: tvModeActive }
    }));

    if (notify && typeof window.showToast === 'function') {
        window.showToast(tvModeActive ? 'Режим Android TV увімкнено (пульт ДК)' : 'Режим Android TV вимкнено');
    }
}

export function toggleTvMode(notify = true) {
    setTvMode(!tvModeActive, notify);
    return tvModeActive;
}

/**
 * Spatial Navigation Candidates
 * Collects focusable elements in the current active context (modal or main page).
 */
function getFocusableCandidates() {
    // 1. If player modal is open, confine focus to the player modal
    const playerModal = document.getElementById('playerPageModal');
    const isPlayerOpen = playerModal && (
        playerModal.classList.contains('is-open') ||
        playerModal.style.display === 'block' ||
        document.body.classList.contains('player-page-open')
    );

    // 2. If menu popover is active, confine to it
    const menuOverlay = document.getElementById('menuPopoverOverlay');
    const isMenuOpen = menuOverlay && menuOverlay.classList.contains('active');

    // 3. If bottom sheet is open, confine to it
    const bsOverlay = document.getElementById('bottomSheetOverlay');
    const isSheetOpen = bsOverlay && bsOverlay.classList.contains('is-open');

    let root = document;
    if (isPlayerOpen) {
        root = playerModal;
    } else if (isMenuOpen) {
        root = menuOverlay;
    } else if (isSheetOpen) {
        root = bsOverlay;
    }

    const selectors = [
        '.anime-card',
        '.popular-card',
        '.home-catalog-card',
        '.bn-item',
        'button:not([disabled]):not([tabindex="-1"])',
        'a[href]:not([tabindex="-1"])',
        'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        '[tabindex="0"]:not([disabled])',
        '.hero-watch-btn',
        '.hero-fav-btn',
        '.hero-dot',
        '.quick-filter-btn',
        '.action-pill',
        '.player-preview-play',
        '.icon-btn',
        '.settings-toggle-btn',
        '.settings-option-item',
        '.episode-btn',
        '.voice-btn'
    ].join(',');

    const rawList = Array.from(root.querySelectorAll(selectors));

    return rawList.filter(el => {
        // Exclude hidden elements
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        if (el.closest('[style*="display: none"]')) return false;
        if (el.closest('.is-hidden') || el.closest('[hidden]')) return false;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        return true;
    });
}

/**
 * Focus an element with visual highlight and smooth scrolling
 */
function focusElement(el) {
    if (!el) return;
    document.querySelectorAll('.tv-focused').forEach(node => node.classList.remove('tv-focused'));
    el.classList.add('tv-focused');

    if (typeof el.focus === 'function') {
        el.focus({ preventScroll: true });
    }

    try {
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    } catch (_) {}
}

/**
 * Directional 2D Spatial Navigation
 */
function navigateDirection(direction) {
    if (!tvModeActive) {
        setTvMode(true, true);
    }

    const candidates = getFocusableCandidates();
    if (!candidates.length) return false;

    let current = document.activeElement;
    if (!current || current === document.body || !candidates.includes(current)) {
        // Find candidate closest to current viewport scroll or center
        const viewY = window.scrollY + window.innerHeight / 3;
        const viewX = window.innerWidth / 2;
        let best = candidates[0];
        let bestDist = Infinity;

        for (const el of candidates) {
            const rect = el.getBoundingClientRect();
            if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
                const dist = Math.hypot((rect.left + rect.width / 2) - viewX, (rect.top + rect.height / 2) - window.innerHeight / 2);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = el;
                }
            }
        }
        focusElement(best);
        return true;
    }

    const curRect = current.getBoundingClientRect();
    const curCenter = {
        x: curRect.left + curRect.width / 2,
        y: curRect.top + curRect.height / 2
    };

    let bestCandidate = null;
    let bestScore = Infinity;

    for (const cand of candidates) {
        if (cand === current) continue;
        const candRect = cand.getBoundingClientRect();
        const candCenter = {
            x: candRect.left + candRect.width / 2,
            y: candRect.top + candRect.height / 2
        };

        let isValid = false;
        let primaryDiff = 0;
        let secondaryDiff = 0;

        if (direction === 'right') {
            if (candCenter.x > curCenter.x + 3 || candRect.left >= curRect.right - 4) {
                isValid = true;
                primaryDiff = Math.max(1, candCenter.x - curCenter.x);
                secondaryDiff = Math.abs(candCenter.y - curCenter.y);
            }
        } else if (direction === 'left') {
            if (candCenter.x < curCenter.x - 3 || candRect.right <= curRect.left + 4) {
                isValid = true;
                primaryDiff = Math.max(1, curCenter.x - candCenter.x);
                secondaryDiff = Math.abs(candCenter.y - curCenter.y);
            }
        } else if (direction === 'down') {
            if (candCenter.y > curCenter.y + 3 || candRect.top >= curRect.bottom - 4) {
                isValid = true;
                primaryDiff = Math.max(1, candCenter.y - curCenter.y);
                secondaryDiff = Math.abs(candCenter.x - curCenter.x);
            }
        } else if (direction === 'up') {
            if (candCenter.y < curCenter.y - 3 || candRect.bottom <= curRect.top + 4) {
                isValid = true;
                primaryDiff = Math.max(1, curCenter.y - candCenter.y);
                secondaryDiff = Math.abs(candCenter.x - curCenter.x);
            }
        }

        if (!isValid) continue;

        // Weight perpendicular distance heavier to stay in row or column
        const score = primaryDiff + (secondaryDiff * 2.8);
        if (score < bestScore) {
            bestScore = score;
            bestCandidate = cand;
        }
    }

    if (bestCandidate) {
        focusElement(bestCandidate);
        return true;
    }

    // Edge of horizontal carousel handler
    const carousel = current.closest('.genre-carousel, .popular-list, .home-quick-filter, .home-catalog-grid');
    if (carousel) {
        if (direction === 'right') {
            carousel.scrollBy({ left: 320, behavior: 'smooth' });
            return true;
        } else if (direction === 'left') {
            carousel.scrollBy({ left: -320, behavior: 'smooth' });
            return true;
        }
    }

    return false;
}

/**
 * Handle Remote Control Back Button
 */
function handleBackKey(e) {
    // 1. Fullscreen video exit
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        e?.preventDefault?.();
        return true;
    }

    // 2. Close player modal
    const playerModal = document.getElementById('playerPageModal');
    if (playerModal && (playerModal.classList.contains('is-open') || playerModal.style.display === 'block')) {
        if (typeof window.closePlayerPage === 'function') {
            window.closePlayerPage();
        } else {
            document.getElementById('closePlayerPageBtn')?.click();
        }
        e?.preventDefault?.();
        return true;
    }

    // 3. Close popover menu or bottom sheet
    const menuOverlay = document.getElementById('menuPopoverOverlay');
    if (menuOverlay && menuOverlay.classList.contains('active')) {
        menuOverlay.classList.remove('active');
        e?.preventDefault?.();
        return true;
    }

    const bsOverlay = document.getElementById('bottomSheetOverlay');
    if (bsOverlay && bsOverlay.classList.contains('is-open')) {
        bsOverlay.classList.remove('is-open');
        e?.preventDefault?.();
        return true;
    }

    // 4. Return to main page if on another hash
    const currentHash = (window.location.hash || '').replace(/^#/, '').split('?')[0];
    if (currentHash && currentHash !== 'main') {
        if (window.history.length > 1) {
            window.history.back();
        } else if (window.VakDabRouter?.get()?.goTo) {
            window.VakDabRouter.get().goTo('main');
        } else {
            window.location.hash = 'main';
        }
        e?.preventDefault?.();
        return true;
    }

    // 5. If on main page and scrolled down, scroll up
    if (window.scrollY > 120) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        e?.preventDefault?.();
        return true;
    }

    return false;
}

/**
 * Video playback remote control actions
 */
function getActiveVideoElement() {
    const playerModal = document.getElementById('playerPageModal');
    if (!playerModal) return null;
    return playerModal.querySelector('video') || document.querySelector('#playerVideoContainer video');
}

function handleVideoPlaybackShortcut(action) {
    const video = getActiveVideoElement();
    if (!video) return false;

    if (action === 'playpause') {
        if (video.paused) {
            video.play().catch(() => {});
            window.showToast?.('▶ Грати');
        } else {
            video.pause();
            window.showToast?.('⏸ Пауза');
        }
        return true;
    }

    if (action === 'rewind') {
        video.currentTime = Math.max(0, video.currentTime - 10);
        window.showToast?.('⏪ -10с');
        return true;
    }

    if (action === 'forward') {
        const dur = video.duration || Infinity;
        video.currentTime = Math.min(dur, video.currentTime + 10);
        window.showToast?.('⏩ +10с');
        return true;
    }

    return false;
}

/**
 * Global Keyboard & D-Pad Listener
 */
function handleKeyDown(e) {
    const key = e.key;
    const code = e.keyCode || e.which;

    // Detect TV Back keys
    // Escape (27), Backspace (8 when not in input), Android TV Back (4), Samsung Return (10009), LG Back (461)
    const isBackKey = key === 'Escape' ||
        key === 'Back' ||
        key === 'BrowserBack' ||
        code === 27 ||
        code === 4 ||
        code === 10009 ||
        code === 461 ||
        (code === 8 && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA');

    if (isBackKey) {
        if (handleBackKey(e)) return;
    }

    // Media Keys
    if (key === 'MediaPlayPause' || code === 179) {
        if (handleVideoPlaybackShortcut('playpause')) {
            e.preventDefault();
            return;
        }
    }
    if (key === 'MediaRewind' || code === 227) {
        if (handleVideoPlaybackShortcut('rewind')) {
            e.preventDefault();
            return;
        }
    }
    if (key === 'MediaFastForward' || code === 228) {
        if (handleVideoPlaybackShortcut('forward')) {
            e.preventDefault();
            return;
        }
    }

    // If video is active and focused on video player area:
    const activeVideo = getActiveVideoElement();
    const isPlayerOpen = Boolean(activeVideo && document.getElementById('playerPageModal')?.classList.contains('is-open'));

    // D-Pad Arrow Keys
    const isUp = key === 'ArrowUp' || code === 38 || code === 19;
    const isDown = key === 'ArrowDown' || code === 40 || code === 20;
    const isLeft = key === 'ArrowLeft' || code === 37 || code === 21;
    const isRight = key === 'ArrowRight' || code === 39 || code === 22;

    if (isUp || isDown || isLeft || isRight) {
        // If user is currently focused on an input field, let native arrow keys work
        const inInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
        if (inInput) return;

        // If player is open and focus is on the video container, left/right can seek video
        const onVideoArea = document.activeElement?.closest('#playerVideoContainer, #playerPageVideo');
        if (isPlayerOpen && onVideoArea) {
            if (isLeft) {
                handleVideoPlaybackShortcut('rewind');
                e.preventDefault();
                return;
            }
            if (isRight) {
                handleVideoPlaybackShortcut('forward');
                e.preventDefault();
                return;
            }
        }

        const dir = isUp ? 'up' : isDown ? 'down' : isLeft ? 'left' : 'right';
        if (navigateDirection(dir)) {
            e.preventDefault();
        }
        return;
    }

    // Enter / OK button (13, 66, 23)
    const isEnter = key === 'Enter' || code === 13 || code === 66 || code === 23;
    if (isEnter) {
        const active = document.activeElement;
        if (active && active !== document.body) {
            // If on video area, toggle playback
            if (active.closest('#playerVideoContainer, #playerPageVideo')) {
                handleVideoPlaybackShortcut('playpause');
                e.preventDefault();
                return;
            }

            // Click non-button focusable elements
            if (!['BUTTON', 'A', 'INPUT', 'SELECT'].includes(active.tagName)) {
                active.click();
                e.preventDefault();
            }
        }
    }
}

/**
 * Initialize Android TV module
 */
export function initAndroidTv() {
    if (initialized) return;
    initialized = true;

    // Detect TV or prior setting
    if (detectIsTvDevice()) {
        setTvMode(true, false);
    }

    // Listen to keydown for D-pad navigation
    window.addEventListener('keydown', handleKeyDown, { passive: false });

    // Expose helpers globally for app and settings
    window.VakDabTv = {
        isTvMode,
        setTvMode,
        toggleTvMode,
        navigateDirection,
        handleBackKey
    };
}
