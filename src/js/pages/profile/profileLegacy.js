import {
    Auth, PROFILE_STICKER_SLOTS, Router, buildEffectOverlayHtml,
    escapeHtml, isGifUrl, openPlayerPage,
    profileMediaMarkup, renderAuthPage,
    renderBookmarksPanel, renderHistoryPanel,
    setCurrentTab, showToast, syncLeftdockActive
} from '../../legacy/app-legacy.js?v=20260905-stickers-sync-v1';
import { Storage } from '../../core/compat/storage.js?v=20260905-stickers-sync-v1';
import { renderStickerFaceByKey } from './stickersLegacy.js?v=20260905-stickers-sync-v1';
import { getProfile, saveProfile, getProfileStats, getProfileDisplayName, getProfileHandle } from '../settings/settingsLegacy.js?v=20260905-no-achievements-v1';

function thoughtSizeClass(text) {
    const length = String(text || '').trim().length;
    if (length <= 18) return 'is-short';
    if (length <= 58) return 'is-medium';
    return 'is-long';
}

function bindProfileThought(container) {
    const trigger = container?.querySelector('#profileThoughtTrigger');
    const bubble = container?.querySelector('#profileThoughtBubble');
    const input = container?.querySelector('#profileThoughtInput');
    const count = container?.querySelector('#profileThoughtCount');
    const save = container?.querySelector('#profileThoughtSave');
    const remove = container?.querySelector('#profileThoughtRemove');
    const close = container?.querySelector('#profileThoughtClose');
    const note = container?.querySelector('#profileThoughtNote');
    const noteText = container?.querySelector('#profileThoughtNoteText');
    if (!trigger || !bubble || !input || !save) return;

    const setNote = (text, animate = false) => {
        const value = String(text || '').trim();
        if (!note || !noteText) return;
        noteText.textContent = value;
        note.hidden = !value;
        note.classList.remove('is-short', 'is-medium', 'is-long');
        if (value) note.classList.add(thoughtSizeClass(value));
        note.classList.toggle('is-visible', Boolean(value));
        if (animate && value) {
            note.classList.remove('is-popping');
            requestAnimationFrame(() => note.classList.add('is-popping'));
        }
    };
    const setOpen = (open) => {
        bubble.hidden = !open;
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        trigger.classList.toggle('is-open', open);
        if (open) {
            requestAnimationFrame(() => {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            });
        }
    };
    const updateCount = () => {
        if (count) count.textContent = `${input.value.length}/120`;
    };

    updateCount();
    setNote(input.value, false);
    const scheduleThoughtExpiry = () => {
        const snapshot = getProfile();
        const createdAt = Number(snapshot.thoughtAt || 0);
        const expiresAt = Number(snapshot.thoughtExpiresAt || (createdAt + (4 * 60 * 60 * 1000)) || 0);
        if (!snapshot.thought || !createdAt || !expiresAt) return;
        const remaining = Math.max(0, expiresAt - Date.now());
        window.setTimeout(() => {
            const latest = getProfile();
            if (!latest.thought || Number(latest.thoughtAt || 0) !== createdAt) return;
            latest.thought = '';
            latest.thoughtAt = 0;
            latest.thoughtExpiresAt = 0;
            saveProfile(latest);
            input.value = '';
            updateCount();
            trigger.classList.remove('has-thought');
            setNote('', false);
            setOpen(false);
            showToast('Термін дії думки завершився');
        }, remaining);
    };
    scheduleThoughtExpiry();
    trigger.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(bubble.hidden);
    });
    note?.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(true);
    });
    close?.addEventListener('click', () => setOpen(false));
    input.addEventListener('input', updateCount);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') save.click();
    });
    const persistThought = (value) => {
        const profile = getProfile();
        profile.thought = String(value || '').trim().slice(0, 120);
        profile.thoughtAt = profile.thought ? Date.now() : 0;
        profile.thoughtExpiresAt = profile.thought ? profile.thoughtAt + (4 * 60 * 60 * 1000) : 0;
        saveProfile(profile);
        trigger.classList.toggle('has-thought', Boolean(profile.thought));
        setNote(profile.thought, Boolean(profile.thought));
        return profile;
    };
    const syncThoughtNow = async () => {
        if (!Auth.isAuthenticated()) return { ok: false, error: 'not-authenticated' };
        try {
            return await Auth.syncUserData({ scope: 'profile' });
        } catch (error) {
            console.warn('[VakDab] thought profile sync failed:', error);
            return { ok: false, error: error?.message || 'sync-failed' };
        }
    };
    save.addEventListener('click', async () => {
        const profile = persistThought(input.value);
        if (profile.thought) scheduleThoughtExpiry();
        setOpen(false);
        const result = await syncThoughtNow();
        if (profile.thought && result.ok) showToast('Думку опубліковано на 4 години');
        else if (profile.thought) showToast('Думку збережено лише на цьому пристрої — не вдалося опублікувати');
        else showToast('Думку видалено');
    });
    remove?.addEventListener('click', async () => {
        input.value = '';
        updateCount();
        persistThought('');
        setOpen(false);
        await syncThoughtNow();
        showToast('Думку видалено');
    });
    document.addEventListener('click', (event) => {
        if (!bubble.hidden && !bubble.contains(event.target) && !trigger.contains(event.target)) setOpen(false);
    }, { once: false });
}

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
            const THOUGHT_TTL_MS = 4 * 60 * 60 * 1000;
            if (profile.thought) {
                const thoughtAt = Number(profile.thoughtAt || 0);
                const thoughtExpiresAt = Number(profile.thoughtExpiresAt || 0);
                if (!thoughtAt || !thoughtExpiresAt) {
                    profile.thoughtAt = Date.now();
                    profile.thoughtExpiresAt = profile.thoughtAt + THOUGHT_TTL_MS;
                    saveProfile(profile);
                } else if (Date.now() >= thoughtExpiresAt) {
                    profile.thought = '';
                    profile.thoughtAt = 0;
                    profile.thoughtExpiresAt = 0;
                    saveProfile(profile);
                }
            }
            const stats = getProfileStats();
            // GIF detection — use isGifUrl helper
            const activeBanner = profile.bannerVideo || profile.banner || '';
            const activeAvatar = profile.avatarVideo || profile.avatar || '';
            const isGifBanner = isGifUrl(activeBanner);
            const isGifAvatar = isGifUrl(activeAvatar);
            const bannerEffectClass = (profile.bannerEffect && profile.bannerEffect !== 'none') ? ` banner-effect-${profile.bannerEffect}` : '';
            const decorationClass = (profile.avatarDecoration && profile.avatarDecoration !== 'none') ? ` avatar-decoration-${profile.avatarDecoration}` : '';
            const bannerFormatClass = profile.bannerFormat === 'wide' ? 'profile-banner--wide' : 'profile-banner--narrow';
            const bannerClass = (isGifBanner ? 'profile-banner is-gif' : 'profile-banner') + ` ${bannerFormatClass}` + bannerEffectClass;
            const avatarClass = isGifAvatar ? 'profile-avatar is-gif' : 'profile-avatar';
            const profileNickname = escapeHtml(getProfileDisplayName(profile));
            const profileHandle = escapeHtml(getProfileHandle(profile));
            const profileBioText = escapeHtml(profile.bio);
            const stickerData = Storage.getStickers();
            container.innerHTML = `
            <div class="profile-wrapper">
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
                    <button type="button" class="profile-thought-trigger${profile.thought ? ' has-thought' : ''}" id="profileThoughtTrigger" aria-label="Відкрити думку" aria-expanded="false" aria-controls="profileThoughtBubble" title="Додати думку">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 5.5h13a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6.2l-3.8 3v-3H5.5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M8 11.2h.01M12 11.2h.01M16 11.2h.01"/></svg>
                    </button>
                    <div class="profile-thought-note${profile.thought ? ' is-visible' : ''}" id="profileThoughtNote"${profile.thought ? '' : ' hidden'} role="status" aria-live="polite">
                      <span class="profile-thought-note__dot" aria-hidden="true"></span>
                      <span id="profileThoughtNoteText">${escapeHtml(profile.thought || '')}</span>
                    </div>
                    <div class="profile-thought-bubble" id="profileThoughtBubble" hidden>
                      <div class="profile-thought-bubble__head">
                        <strong>Думка</strong>
                        <button type="button" id="profileThoughtClose" class="profile-thought-bubble__close" aria-label="Закрити думку">×</button>
                      </div>
                      <textarea id="profileThoughtInput" maxlength="120" placeholder="Що у тебе в думках?">${escapeHtml(profile.thought || '')}</textarea>
                      <div class="profile-thought-bubble__foot">
                        <span id="profileThoughtCount">0/120</span>
                        <div class="profile-thought-bubble__actions">
                          <button type="button" id="profileThoughtRemove" class="profile-thought-remove">Видалити</button>
                          <button type="button" id="profileThoughtSave">Зберегти</button>
                        </div>
                      </div>
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
            bindProfileThought(container);
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
        if (isOwnPublicProfile) {
            const localProfile = getProfile();
            const localExpiresAt = Number(localProfile.thoughtExpiresAt || 0);
            if (localProfile.thought && localExpiresAt > Date.now()) {
                profile = { ...(profile || {}), thought: localProfile.thought, thoughtAt: localProfile.thoughtAt, thoughtExpiresAt: localExpiresAt };
            }
        }
        if (!profile) {
            container.innerHTML = '<div class="profile-public-empty">Користувача не знайдено.</div>';
            return;
        }
        const banner = profile.bannerVideo || profile.banner || '';
        const avatar = profile.avatarVideo || profile.avatar || '';
        const publicThought = String(profile.thought || '').trim();
        const publicThoughtExpiresAt = Number(profile.thoughtExpiresAt || 0);
        const hasPublicThought = Boolean(publicThought && publicThoughtExpiresAt > Date.now());
        const publicThoughtClass = hasPublicThought ? ` ${thoughtSizeClass(publicThought)}` : '';
        const bannerClass = `profile-banner ${profile.bannerFormat === 'wide' ? 'profile-banner--wide' : 'profile-banner--narrow'}${profile.bannerEffect && profile.bannerEffect !== 'none' ? ` banner-effect-${escapeHtml(profile.bannerEffect)}` : ''}`;
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
          <div class="profile-wrapper profile-public-wrapper">
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
                  ${hasPublicThought ? `<div class="profile-thought-note profile-thought-note--public is-visible${publicThoughtClass}" id="profileThoughtNote" role="status" aria-live="polite"><span class="profile-thought-note__dot" aria-hidden="true"></span><span id="profileThoughtNoteText">${escapeHtml(publicThought)}</span></div>` : ''}
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
        if (hasPublicThought) {
            const publicThoughtNode = container.querySelector('#profileThoughtNote');
            const remainingThoughtMs = Math.max(0, publicThoughtExpiresAt - Date.now());
            window.setTimeout(() => {
                if (publicThoughtNode?.isConnected) publicThoughtNode.remove();
            }, remainingThoughtMs);
        }
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
