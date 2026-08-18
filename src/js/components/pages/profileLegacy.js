import {
    Auth, PROFILE_STICKER_SLOTS, Router, Storage, buildEffectOverlayHtml,
    escapeHtml, isGifUrl, openPlayerPage,
    profileMediaMarkup, renderAchievementsPanel, renderAuthPage,
    renderBookmarksPanel, renderHistoryPanel, renderStickerFaceByKey,
    setCurrentTab, showToast, syncLeftdockActive
} from '../../legacy/app-legacy.js';
import { getProfile, getProfileStats } from './settingsLegacy.js';

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
            const tabsStyleClass = (profile.tabStyle && profile.tabStyle !== 'underline' && profile.tabStyle !== 'none') ? ` profile-tabs--${profile.tabStyle}` : '';
            const bannerClass = (isGifBanner ? 'profile-banner is-gif' : 'profile-banner') + bannerEffectClass;
            const avatarClass = isGifAvatar ? 'profile-avatar is-gif' : 'profile-avatar';
            const profileNickname = escapeHtml(profile.nickname);
            const profileHandle = escapeHtml('@' + profile.nickname.toLowerCase().replace(/\s/g, '_'));
            const profileBioText = escapeHtml(profile.bio);
            const stickerData = Storage.getStickers();
            container.innerHTML = `
            <div class="profile-wrapper">
              <div class="${bannerClass}">
                ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, 'profile-banner-media', 'video banner', profile.bannerVideoSettings) : (profile.banner ? `<img class="profile-banner-media" src="${escapeHtml(profile.banner)}" alt="banner" onerror="this.style.display='none'">` : '')}
                ${profile.atmosphere && profile.atmosphere !== 'none' ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ''}
                ${profile.effect && profile.effect !== 'none' ? buildEffectOverlayHtml(profile.effect) : ''}
                <div class="profile-banner-overlay"></div>
              </div>
              <div class="profile-info">
                <div class="profile-avatar-wrap${decorationClass}">
                  <div class="${avatarClass}">
                    ${profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, 'profile-avatar-media', 'video avatar', profile.avatarVideoSettings) : (profile.avatar ? `<img class="profile-avatar-media" src="${escapeHtml(profile.avatar)}" alt="avatar" onerror="this.style.display='none'; this.parentElement.querySelector('.avatar-placeholder').style.display='flex'">` : '')}
                    <span class="avatar-placeholder" style="display:none;">${escapeHtml(profile.nickname.charAt(0).toUpperCase())}</span>
                  </div>
                </div>
                <div class="profile-nick-row">
                  <span class="profile-nick" id="profileNickText">${profileNickname}</span>
                  ${stickerData.nickBadge !== null ? `<span class="profile-nick-badge" title="Наліпка профілю">${renderStickerFaceByKey(stickerData, stickerData.nickBadge)}</span>` : ''}
                </div>
                <div class="profile-meta">
                  <span>${profileHandle}</span>
                </div>
                <div class="profile-bio-row">
                  <div class="profile-bio${profile.bioBold ? ' is-bold' : ''}" id="profileBioText">${profileBioText}</div>
                </div>
                <div class="profile-stats">
                  <div class="profile-stat-pill">
                    <div class="num">${stats.viewed}</div>
                    <div class="label">Переглянуто</div>
                  </div>
                  <div class="profile-stat-pill">
                    <div class="num">${stats.bookmarks}</div>
                    <div class="label">Закладки</div>
                  </div>
                  <div class="profile-stat-pill">
                    <div class="num">${stats.achievements}</div>
                    <div class="label">Досягнень</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="profile-tabs${tabsStyleClass}" id="profileTabs">
              <button class="profile-tab active" data-tab="history">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                Історія
              </button>
              <button class="profile-tab" data-tab="bookmarks">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
                Закладки
              </button>
              <button class="profile-tab" data-tab="achievements">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.04 2.6a1 1 0 0 1 1.92 0l1.7 5.18a1 1 0 0 0 .95.69h5.47a1 1 0 0 1 .59 1.8l-4.43 3.22a1 1 0 0 0-.36 1.12l1.7 5.18a1 1 0 0 1-1.54 1.12l-4.42-3.22a1 1 0 0 0-1.18 0l-4.42 3.22a1 1 0 0 1-1.54-1.12l1.7-5.18a1 1 0 0 0-.36-1.12L3.3 10.27a1 1 0 0 1 .59-1.8h5.47a1 1 0 0 0 .95-.69l1.7-5.18z"/></svg>
                Досягнення
              </button>
            </div>
            <div id="profilePanels">
              <div class="profile-panel active" id="profilePanel-history">
                ${renderHistoryPanel(stats.history)}
              </div>
              <div class="profile-panel" id="profilePanel-bookmarks">
                ${renderBookmarksPanel(stats.bookmarksList)}
              </div>
              <div class="profile-panel" id="profilePanel-achievements">
                ${renderAchievementsPanel(stats.achievementsList, stats.totalWatchTime, stats.historyCount)}
              </div>
            </div>
          `;
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

        // ====================================================================
        //  СТОРІНКА АВТОРИЗАЦІЇ
        // ====================================================================
