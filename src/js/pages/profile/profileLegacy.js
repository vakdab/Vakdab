import {
    Auth, PROFILE_STICKER_SLOTS, Router, buildEffectOverlayHtml,
    escapeHtml, isGifUrl, openPlayerPage,
    profileMediaMarkup, renderAuthPage,
    renderBookmarksPanel, renderHistoryPanel,
    setCurrentTab, showToast, syncLeftdockActive
} from '../../legacy/app-legacy.js?v=20260909-player-v5';
import { Storage } from '../../core/compat/storage.js?v=20260905-stickers-sync-v1';
import { renderStickerFaceByKey } from './stickersLegacy.js?v=20260905-stickers-sync-v1';
import { getProfile, saveProfile, getProfileStats, getProfileDisplayName, getProfileHandle } from '../settings/settingsLegacy.js?v=20260905-no-achievements-v1';

function primeProfileMediaPlayback(container) {
    if (!container) return;
    const playVideos = () => {
        container.querySelectorAll('video.is-animated-media').forEach(video => {
            video.muted = true;
            video.defaultMuted = true;
            video.setAttribute('muted', '');
            const attemptPlay = () => {
                const promise = video.play();
                if (promise && typeof promise.catch === 'function') promise.catch(() => {});
            };
            if (video.readyState >= 1) attemptPlay();
            else video.addEventListener('loadedmetadata', attemptPlay, { once: true });
            video.addEventListener('canplay', attemptPlay, { once: true });
        });
    };
    playVideos();
    if (!window.__vakdabProfileMediaPlaybackBound) {
        const resume = () => document.querySelectorAll('#profilePageContainer video.is-animated-media').forEach(video => {
            video.muted = true;
            video.play().catch(() => {});
        });
        document.addEventListener('visibilitychange', resume, { passive: true });
        window.addEventListener('pageshow', resume, { passive: true });
        document.addEventListener('pointerdown', resume, { passive: true, once: true });
        window.__vakdabProfileMediaPlaybackBound = true;
    }
}

if (!window.__vakdabProfileStickerRefreshBound) {
    window.__vakdabProfileStickerRefreshBound = true;
    window.addEventListener('vakdab:stickers-changed', () => {
        if (Router.currentRoute === 'profile' && document.getElementById('profilePageContainer')) renderProfilePage();
    });
}

export function renderProfilePage() {
            const container = document.getElementById('profilePageContainer');
            if (!container) return;
            if (!Auth.isAuthenticated() && !Auth.isGuest()) {
                renderAuthPage();
                return;
            }
            const isGuestMode = Auth.isGuest();
            const profile = getProfile();
            const stats = getProfileStats();
            // GIF detection — use isGifUrl helper
            const activeBanner = profile.bannerVideo || profile.banner || '';
            const activeAvatar = profile.avatarVideo || profile.avatar || '';
            const isGifBanner = isGifUrl(activeBanner);
            const isGifAvatar = isGifUrl(activeAvatar);
            const bannerEffectClass = (profile.bannerEffect && profile.bannerEffect !== 'none') ? ` banner-effect-${profile.bannerEffect}` : '';
            const decorationClass = (profile.avatarDecoration && profile.avatarDecoration !== 'none') ? ` avatar-decoration-${profile.avatarDecoration}` : '';
            const isWide = profile.bannerFormat === 'wide';
            const bannerFormatClass = isWide ? 'profile-banner--wide' : 'profile-banner--narrow';
            const wrapperFormatClass = isWide ? 'profile-wrapper--wide' : 'profile-wrapper--narrow';
            const bannerClass = (isGifBanner ? 'profile-banner is-gif' : 'profile-banner') + ` ${bannerFormatClass}` + bannerEffectClass;
            const avatarClass = isGifAvatar ? 'profile-avatar is-gif' : 'profile-avatar';
            const profileNickname = escapeHtml(getProfileDisplayName(profile));
            const profileHandle = escapeHtml(getProfileHandle(profile));
            const profileBioText = escapeHtml(profile.bio);
            const stickerData = Storage.getStickers();
            container.innerHTML = `
            <div class="profile-wrapper ${wrapperFormatClass}">
              <div class="${bannerClass}">
                ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, 'profile-banner-media', 'video banner', profile.bannerVideoSettings) : (profile.banner ? profileMediaMarkup(profile.banner, 'profile-banner-media', 'banner') : '')}
                ${profile.atmosphere && profile.atmosphere !== 'none' ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ''}
                ${profile.effect && profile.effect !== 'none' ? buildEffectOverlayHtml(profile.effect) : ''}
              </div>
              <div class="profile-info">
                <div class="profile-head-row">
                  <div class="profile-avatar-wrap${decorationClass}">
                    <div class="${avatarClass}">
                      ${profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, 'profile-avatar-media', 'video avatar', profile.avatarVideoSettings) : (profile.avatar ? profileMediaMarkup(profile.avatar, 'profile-avatar-media', 'avatar') : '')}
                      <span class="avatar-placeholder" style="display:${profile.avatarVideo || profile.avatar ? 'none' : 'flex'};">${escapeHtml(getProfileDisplayName(profile).charAt(0).toUpperCase())}</span>
                    </div>
                  </div>
                </div>
                <div class="profile-nick-row">
                  <span class="profile-nick" id="profileNickText">${profileNickname}</span>
                  ${stickerData.nickBadge ? `<span class="profile-nick-badge" title="Наліпка профілю" aria-label="Наліпка профілю">${renderStickerFaceByKey(stickerData, stickerData.nickBadge)}</span>` : ''}
                </div>
                <div class="profile-meta">
                  <span>${profileHandle}</span>
                </div>
                <div class="profile-bio-row">
                  <div class="profile-bio${profile.bioBold ? ' is-bold' : ''}" id="profileBioText">${profileBioText}</div>
                </div>
              </div>
            </div>
            <div class="profile-tabs" id="profileTabs">
              <button class="profile-tab active" data-tab="history">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                Історія
              </button>
              <button class="profile-tab" data-tab="bookmarks">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
                Закладки
              </button>

            </div>
            <div id="profilePanels">
              <div class="profile-panel active" id="profilePanel-history">
                ${renderHistoryPanel(stats.history)}
              </div>
              <div class="profile-panel" id="profilePanel-bookmarks">
                ${renderBookmarksPanel(stats.bookmarksList)}
              </div>
            </div>
          `;
            primeProfileMediaPlayback(container);
            document.querySelectorAll('#profilePageContainer .profile-avatar-media').forEach(media => {
                media.addEventListener('error', () => {
                    media.style.display = 'none';
                    const placeholder = media.parentElement?.querySelector('.avatar-placeholder');
                    if (placeholder) placeholder.style.display = 'flex';
                });
            });
            document.querySelectorAll('#profilePageContainer .profile-banner-media').forEach(media => {
                media.addEventListener('error', () => { media.style.display = 'none'; });
            });
            document.querySelectorAll('[data-profile-url]').forEach(card => {
                const openCard = () => {
                    const url = card.dataset.profileUrl;
                    if (url) openPlayerPage(url);
                };
                card.addEventListener('click', openCard);
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openCard();
                    }
                });
            });
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const target = this.dataset.tab;
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
                    this.classList.add('active');
                    document.getElementById('profilePanel-' + target).classList.add('active');
                });
            });
            const profileSlots = document.querySelectorAll('.profile-medal-slot');
            let selectedMedalIndex = null;
            let draggedMedalIndex = null;
            let touchDrag = null;
            let holdTimer = null;
            let suppressNextClick = false;
            const clearTouchDrag = () => {
                clearTimeout(holdTimer);
                holdTimer = null;
                document.querySelectorAll('.profile-medal-slot.is-touch-dragging,.profile-medal-slot.is-drag-over').forEach(el => el.classList.remove('is-touch-dragging','is-drag-over'));
                touchDrag = null;
            };
            const slotAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest('.profile-medal-slot');
            const dropTouchSticker = (event) => {
                clearTimeout(holdTimer);
                if (!touchDrag) return clearTouchDrag();
                const target = slotAtPoint(event.clientX, event.clientY);
                const to = target ? Number(target.dataset.medalIndex) : null;
                const from = touchDrag.from;
                if (to !== null && to !== from) {
                    suppressNextClick = true;
                    moveProfileMedal(from, to);
                }
                clearTouchDrag();
            };
            const moveProfileMedal = (from, to) => {
                if (from === to || from === null || to === null) return;
                const current = Storage.getStickers();
                const keys = (current.medals || []).slice(0, PROFILE_STICKER_SLOTS);
                if (!keys[from]) return;
                while (keys.length < PROFILE_STICKER_SLOTS) keys.push(null);
                const targetWasFilled = Boolean(keys[to]);
                [keys[from], keys[to]] = [keys[to], keys[from]];
                current.medals = keys.filter(Boolean).slice(0, PROFILE_STICKER_SLOTS);
                Storage.setStickers(current);
                renderProfilePage();
                showToast(targetWasFilled ? 'Наліпки замінено' : 'Наліпку переміщено');
            };
            profileSlots.forEach(slot => {
                slot.addEventListener('pointerdown', event => {
                    const index = Number(slot.dataset.medalIndex);
                    if (!slot.classList.contains('is-filled')) return;
                    holdTimer = setTimeout(() => {
                        touchDrag = { from: index };
                        slot.classList.add('is-touch-dragging');
                        try { slot.setPointerCapture(event.pointerId); } catch {}
                    }, 300);
                });
                slot.addEventListener('pointermove', event => {
                    if (!touchDrag) return;
                    const target = slotAtPoint(event.clientX, event.clientY);
                    document.querySelectorAll('.profile-medal-slot.is-drag-over').forEach(el => el.classList.remove('is-drag-over'));
                    if (target && target.dataset.medalIndex !== String(touchDrag.from)) target.classList.add('is-drag-over');
                });
                slot.addEventListener('pointerup', dropTouchSticker);
                slot.addEventListener('pointercancel', clearTouchDrag);
                slot.addEventListener('click', () => {
                    if (suppressNextClick) { suppressNextClick = false; return; }
                    const index = Number(slot.dataset.medalIndex);
                    if (!slot.classList.contains('is-filled')) {
                        Router.goTo('stickers');
                        return;
                    }
                    if (selectedMedalIndex === null) {
                        if (slot.classList.contains('is-filled')) {
                            selectedMedalIndex = index;
                            slot.classList.add('is-selected');
                        }
                        return;
                    }
                    moveProfileMedal(selectedMedalIndex, index);
                    selectedMedalIndex = null;
                });
                slot.addEventListener('dragstart', e => {
                    draggedMedalIndex = Number(slot.dataset.medalIndex);
                    e.dataTransfer.effectAllowed = 'move';
                    slot.classList.add('is-dragging');
                });
                slot.addEventListener('dragend', () => {
                    draggedMedalIndex = null;
                    slot.classList.remove('is-dragging');
                });
                slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('is-drag-over'); });
                slot.addEventListener('dragleave', () => slot.classList.remove('is-drag-over'));
                slot.addEventListener('drop', e => {
                    e.preventDefault();
                    slot.classList.remove('is-drag-over');
                    moveProfileMedal(draggedMedalIndex, Number(slot.dataset.medalIndex));
                });
            });

            // Guest mode: ховаємо sync кнопку
            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                const syncBtn = document.getElementById('profileSyncBtn');
                if (syncBtn) syncBtn.style.display = 'none';
            }
            syncLeftdockActive();
        }

export async function renderPublicProfilePage(uid) {
    const container = document.getElementById('profilePageContainer');
    const targetUid = String(uid || '').trim();
    if (!container || !targetUid) {
        if (container) container.innerHTML = '<div class="profile-public-empty">Профіль не знайдено.</div>';
        return;
    }
    container.innerHTML = '<div class="loader" style="display:flex;align-items:center;justify-content:center;min-height:42vh;"><i class="fas fa-spinner fa-pulse" style="font-size:2rem;"></i></div>';
    try {
        const { getPublicProfile } = await import('../../services/firebase/publicProfile.js?v=20260905-public-profile-v1');
        const isOwnPublicProfile = Boolean(Auth.isAuthenticated() && Auth._user?.uid && String(Auth._user.uid) === targetUid);
        let profile = null;
        try {
            profile = await getPublicProfile(targetUid);
        } catch (error) {
            if (!isOwnPublicProfile) throw error;
            console.warn('[VakDab] own public profile read failed, using local profile:', error);
        }
        if (!profile) {
            container.innerHTML = '<div class="profile-public-empty">Користувача не знайдено.</div>';
            return;
        }
        const banner = profile.bannerVideo || profile.banner || '';
        const avatar = profile.avatarVideo || profile.avatar || '';
        const isWide = profile.bannerFormat === 'wide';
        const publicBannerFormatClass = isWide ? 'profile-banner--wide' : 'profile-banner--narrow';
        const publicWrapperFormatClass = isWide ? 'profile-wrapper--wide' : 'profile-wrapper--narrow';
        const bannerClass = `profile-banner ${publicBannerFormatClass}${profile.bannerEffect && profile.bannerEffect !== 'none' ? ` banner-effect-${escapeHtml(profile.bannerEffect)}` : ''}`;
        const avatarClass = `profile-avatar${isGifUrl(avatar) ? ' is-gif' : ''}`;
        const nickname = escapeHtml(getProfileDisplayName(profile));
        const handle = escapeHtml(getProfileHandle(profile));
        const publicHistory = profile.hideHistory ? [] : profile.history;
        const publicBookmarks = profile.hideBookmarks ? [] : profile.bookmarks;
        const uniqueAnime = new Set(publicHistory.map(item => item?.animeId || item?.title).filter(Boolean));
        const historyTab = profile.hideHistory ? '' : `<button class="profile-tab active" data-tab="history">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          Історія
        </button>`;
        const bookmarksTab = profile.hideBookmarks ? '' : `<button class="profile-tab${profile.hideHistory ? ' active' : ''}" data-tab="bookmarks">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
          Закладки
        </button>`;
        const initialTab = profile.hideHistory ? 'bookmarks' : 'history';
        container.innerHTML = `
          <div class="profile-wrapper profile-public-wrapper ${publicWrapperFormatClass}">
            <div class="${bannerClass}">
              ${banner ? profileMediaMarkup(banner, 'profile-banner-media', 'profile banner', profile.bannerVideo ? profile.bannerVideoSettings : null) : ''}
              ${profile.atmosphere && profile.atmosphere !== 'none' ? `<div class="atmosphere-${escapeHtml(profile.atmosphere)}"></div>` : ''}
              ${profile.effect && profile.effect !== 'none' ? buildEffectOverlayHtml(profile.effect) : ''}
            </div>
            <div class="profile-info">
              <div class="profile-head-row">
                <div class="profile-avatar-wrap${profile.avatarDecoration && profile.avatarDecoration !== 'none' ? ` avatar-decoration-${escapeHtml(profile.avatarDecoration)}` : ''}">
                  <div class="${avatarClass}">
                    ${avatar ? profileMediaMarkup(avatar, 'profile-avatar-media', 'profile avatar', profile.avatarVideo ? profile.avatarVideoSettings : null) : ''}
                    <span class="avatar-placeholder" style="display:${avatar ? 'none' : 'flex'};">${escapeHtml(getProfileDisplayName(profile).charAt(0).toUpperCase())}</span>
                  </div>
                </div>
              </div>
              <div class="profile-nick-row"><span class="profile-nick">${nickname}</span></div>
              <div class="profile-meta"><span>${handle}</span></div>
              ${profile.bio ? `<div class="profile-bio-row"><div class="profile-bio${profile.bioBold ? ' is-bold' : ''}">${escapeHtml(profile.bio)}</div></div>` : ''}
            </div>
          </div>
          <div class="profile-tabs" id="publicProfileTabs">
            ${historyTab}${bookmarksTab}
          </div>
          <div id="publicProfilePanels">
            ${profile.hideHistory ? '' : `<div class="profile-panel${initialTab === 'history' ? ' active' : ''}" id="publicProfilePanel-history">${renderHistoryPanel(publicHistory)}</div>`}
            ${profile.hideBookmarks ? '' : `<div class="profile-panel${initialTab === 'bookmarks' ? ' active' : ''}" id="publicProfilePanel-bookmarks">${renderBookmarksPanel(publicBookmarks)}</div>`}
          </div>`;
        primeProfileMediaPlayback(container);
        container.querySelectorAll('#publicProfileTabs .profile-tab').forEach(tab => tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            container.querySelectorAll('#publicProfileTabs .profile-tab').forEach(item => item.classList.toggle('active', item === tab));
            container.querySelectorAll('#publicProfilePanels .profile-panel').forEach(panel => panel.classList.toggle('active', panel.id === `publicProfilePanel-${target}`));
        }));

    } catch (error) {
        console.error('[VakDab] public profile failed:', error);
        container.innerHTML = '<div class="profile-public-empty">Не вдалося завантажити профіль.</div>';
    }
}

        // ====================================================================
        //  СТОРІНКА АВТОРИЗАЦІЇ
        // ====================================================================
