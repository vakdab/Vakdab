import {
    Auth, PROFILE_STICKER_SLOTS, Router, buildEffectOverlayHtml,
    escapeHtml, isGifUrl, openPlayerPage,
    profileMediaMarkup, renderAchievementsPanel, renderAuthPage,
    renderBookmarksPanel, renderHistoryPanel,
    setCurrentTab, showToast, syncLeftdockActive
} from '../../legacy/app-legacy.js?v=20260821-profile-thought-v31';
import { getProfile, saveProfile, getProfileStats, getAchievements } from './settingsLegacy.js?v=20260821-profile-thought-v31';
import { getFriendsList, getFollowingList, getSocialState, setFollowing } from '../../services/firebase/socialProfile.js?v=20260821-profile-thought-v31';

function bindProfileThought(container) {
    const trigger = container?.querySelector('#profileThoughtTrigger');
    const bubble = container?.querySelector('#profileThoughtBubble');
    const input = container?.querySelector('#profileThoughtInput');
    const count = container?.querySelector('#profileThoughtCount');
    const save = container?.querySelector('#profileThoughtSave');
    const close = container?.querySelector('#profileThoughtClose');
    const note = container?.querySelector('#profileThoughtNote');
    const noteText = container?.querySelector('#profileThoughtNoteText');
    if (!trigger || !bubble || !input || !save) return;

    const setNote = (text, animate = false) => {
        const value = String(text || '').trim();
        if (!note || !noteText) return;
        noteText.textContent = value;
        note.hidden = !value;
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
    save.addEventListener('click', () => {
        const profile = getProfile();
        profile.thought = input.value.trim().slice(0, 120);
        saveProfile(profile);
        trigger.classList.toggle('has-thought', Boolean(profile.thought));
        setNote(profile.thought, true);
        setOpen(false);
        showToast(profile.thought ? 'Думку збережено' : 'Думку видалено');
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
            const bannerFormatClass = profile.bannerFormat === 'wide' ? 'profile-banner--wide' : 'profile-banner--narrow';
            const bannerClass = (isGifBanner ? 'profile-banner is-gif' : 'profile-banner') + ` ${bannerFormatClass}` + bannerEffectClass;
            const avatarClass = isGifAvatar ? 'profile-avatar is-gif' : 'profile-avatar';
            const profileNickname = escapeHtml(profile.nickname);
            const profileHandle = escapeHtml('@' + profile.nickname.toLowerCase().replace(/\s/g, '_'));
            const profileBioText = escapeHtml(profile.bio);
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
                      <span class="avatar-placeholder" style="display:none;">${escapeHtml(profile.nickname.charAt(0).toUpperCase())}</span>
                    </div>
                    <button type="button" class="profile-thought-trigger${profile.thought ? ' has-thought' : ''}" id="profileThoughtTrigger" aria-label="Відкрити думку" aria-expanded="false" aria-controls="profileThoughtBubble" title="Думка">
                      <i class="fas fa-comment-dots" aria-hidden="true"></i>
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
                        <button type="button" id="profileThoughtSave">Зберегти</button>
                      </div>
                    </div>
                  </div>
                  <div class="profile-social-summary" aria-label="Соціальні показники">
                    <button type="button" class="profile-social-link profile-social-stat" id="profileFriendsStat" aria-label="Відкрити список друзів">
                      <span class="label">Друзі</span><strong class="num">—</strong>
                    </button>
                    <button type="button" class="profile-social-link profile-social-stat" id="profileFollowingStat" aria-label="Відкрити список підписок">
                      <span class="label">Слідкую</span><strong class="num">—</strong>
                    </button>
                  </div>
                </div>
                <div class="profile-nick-row">
                  <span class="profile-nick" id="profileNickText">${profileNickname}</span>
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
            <div class="profile-tabs" id="profileTabs">
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
            primeProfileMediaPlayback(container);
            bindProfileThought(container);
            container.querySelector('#profileFriendsStat')?.addEventListener('click', () => Router.goTo('friends'));
            container.querySelector('#profileFollowingStat')?.addEventListener('click', () => Router.goTo('following'));
            if (!isGuestMode && Auth._user?.uid) {
                getSocialState(Auth._user.uid, Auth._user.uid).then(social => {
                    const friends = container.querySelector('#profileFriendsStat .num');
                    const following = container.querySelector('#profileFollowingStat .num');
                    if (friends) friends.textContent = String(social.friends);
                    if (following) following.textContent = String(social.following);
                }).catch(error => {
                    console.warn('[VakDab] own social stats failed:', error);
                    container.querySelectorAll('.profile-social-stat .num').forEach(el => { el.textContent = '0'; });
                });
            } else {
                container.querySelectorAll('.profile-social-stat .num').forEach(el => { el.textContent = '0'; });
            }
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

function socialListProfileMarkup(profile) {
    const media = profile.avatarVideo || profile.avatar || '';
    const placeholder = escapeHtml((profile.nickname || 'К').charAt(0).toUpperCase());
    return `<div class="social-list-avatar">
        ${media ? profileMediaMarkup(media, 'social-list-avatar-media', `${profile.nickname} avatar`, profile.avatarVideo ? profile.avatarVideoSettings : null) : ''}
        <span class="social-list-avatar-placeholder" style="display:${media ? 'none' : 'flex'};">${placeholder}</span>
    </div>`;
}

function socialListCardMarkup(profile, { showUnfollow = false } = {}) {
    const nickname = escapeHtml(profile.nickname || 'Користувач');
    const handle = escapeHtml('@' + String(profile.nickname || 'user').toLowerCase().replace(/\\s/g, '_'));
    return `<article class="social-list-item" data-social-profile-uid="${escapeHtml(profile.uid)}" tabindex="0" role="link">
        ${socialListProfileMarkup(profile)}
        <div class="social-list-user">
            <strong class="social-list-name">${nickname}</strong>
            <span class="social-list-handle">${handle}</span>
            ${profile.bio ? `<span class="social-list-bio">${escapeHtml(profile.bio)}</span>` : ''}
        </div>
        ${showUnfollow ? `<button type="button" class="social-unfollow-btn" data-unfollow-uid="${escapeHtml(profile.uid)}">Перестати слідкувати</button>` : ''}
    </article>`;
}

function bindSocialListMedia(container) {
    primeProfileMediaPlayback(container);
    container.querySelectorAll('.social-list-avatar-media').forEach(media => {
        media.addEventListener('error', () => {
            media.style.display = 'none';
            const placeholder = media.parentElement?.querySelector('.social-list-avatar-placeholder');
            if (placeholder) placeholder.style.display = 'flex';
        });
    });
}

function socialListBackRoute(uid, viewerUid) {
    return uid && uid !== viewerUid ? { route: 'profile', params: { uid } } : { route: 'profile', params: {} };
}

async function renderSocialListPage({ uid, title, emptyText, loader, showUnfollow = false }) {
    const container = document.getElementById('profilePageContainer');
    const viewerUid = Auth.isAuthenticated() && !Auth.isGuest() ? String(Auth._user?.uid || '') : '';
    const targetUid = String(uid || viewerUid || '').trim();
    if (!container || !targetUid) {
        if (container) container.innerHTML = '<div class="profile-public-empty">Увійдіть в акаунт, щоб переглядати соціальні списки.</div>';
        return;
    }
    container.innerHTML = '<div class="loader" style="display:flex;align-items:center;justify-content:center;min-height:42vh;"><i class="fas fa-spinner fa-pulse" style="font-size:2rem;"></i></div>';
    try {
        let profiles = await loader(targetUid);
        const canUnfollow = showUnfollow && targetUid === viewerUid;
        const back = socialListBackRoute(targetUid, viewerUid);
        const renderList = (query = '') => {
            const normalizedQuery = String(query || '').trim().toLowerCase().replace(/^@+/, '');
            const visibleProfiles = profiles.filter(profile => {
                const nickname = String(profile.nickname || '').toLowerCase();
                const realName = String(profile.realName || '').toLowerCase();
                const bio = String(profile.bio || '').toLowerCase();
                const uid = String(profile.uid || '').toLowerCase();
                const handle = nickname.replace(/\s/g, '_');
                const haystack = `${nickname} ${realName} ${bio} ${uid} ${handle}`;
                return !normalizedQuery || haystack.includes(normalizedQuery);
            });
            const listHtml = visibleProfiles.length
                ? visibleProfiles.map(profile => socialListCardMarkup(profile, { showUnfollow: canUnfollow })).join('')
                : `<div class="social-list-empty">${normalizedQuery ? 'Нічого не знайдено за вашим запитом.' : emptyText}</div>`;
            container.querySelector('#socialListItems').innerHTML = listHtml;
            container.querySelector('#socialListCount').textContent = String(profiles.length);
            bindSocialListMedia(container);
            container.querySelectorAll('[data-social-profile-uid]').forEach(card => {
                const openProfile = () => Router.goTo('profile', { uid: card.dataset.socialProfileUid });
                card.addEventListener('click', event => {
                    if (event.target.closest('.social-unfollow-btn')) return;
                    openProfile();
                });
                card.addEventListener('keydown', event => {
                    if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('.social-unfollow-btn')) {
                        event.preventDefault();
                        openProfile();
                    }
                });
            });
            container.querySelectorAll('[data-unfollow-uid]').forEach(button => {
                button.addEventListener('click', async event => {
                    event.stopPropagation();
                    if (!viewerUid) {
                        showToast('Увійдіть в акаунт, щоб змінювати підписки');
                        return;
                    }
                    const target = String(button.dataset.unfollowUid || '');
                    button.disabled = true;
                    try {
                        await setFollowing(viewerUid, target, false);
                        profiles = profiles.filter(profile => profile.uid !== target);
                        renderList(container.querySelector('#socialListSearch')?.value || '');
                        showToast('Підписку скасовано');
                    } catch (error) {
                        console.error('[VakDab] social list unfollow failed:', error);
                        button.disabled = false;
                        showToast('Не вдалося скасувати підписку');
                    }
                });
            });
        };
        container.innerHTML = `<section class="social-list-page" aria-labelledby="socialListTitle">
            <div class="social-list-toolbar">
                <button type="button" class="social-list-back" id="socialListBack" aria-label="Назад">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div class="social-list-heading">
                    <h1 id="socialListTitle">${title}</h1>
                    <span><strong id="socialListCount">${profiles.length}</strong> користувачів</span>
                </div>
            </div>
            <label class="social-search-wrap" for="socialListSearch">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>
                <input id="socialListSearch" class="social-search-input" type="search" placeholder="Пошук користувача" autocomplete="off" />
            </label>
            <div class="social-list" id="socialListItems"></div>
        </section>`;
        container.querySelector('#socialListBack').addEventListener('click', () => Router.goTo(back.route, back.params));
        container.querySelector('#socialListSearch').addEventListener('input', event => renderList(event.target.value));
        renderList();
    } catch (error) {
        console.error('[VakDab] social list failed:', error);
        container.innerHTML = '<div class="profile-public-empty">Не вдалося завантажити список. Спробуйте ще раз.</div>';
    }
}

export function renderFriendsPage(uid = '') {
    return renderSocialListPage({
        uid,
        title: 'Друзі',
        emptyText: 'У вас ще немає взаємних підписок.',
        loader: getFriendsList
    });
}

export function renderFollowingPage(uid = '') {
    return renderSocialListPage({
        uid,
        title: 'Слідкую',
        emptyText: 'Ви ще ні за ким не слідкуєте.',
        loader: getFollowingList,
        showUnfollow: true
    });
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
        const { getPublicProfile, getSocialState, setFollowing } = await import('../../services/firebase/socialProfile.js?v=20260821-profile-thought-v31');
        const profile = await getPublicProfile(targetUid);
        if (!profile) {
            container.innerHTML = '<div class="profile-public-empty">Користувача не знайдено.</div>';
            return;
        }
        const viewerUid = Auth.isAuthenticated() ? String(Auth._user?.uid || '') : '';
        const social = await getSocialState(targetUid, viewerUid).catch(error => {
            console.warn('[VakDab] public social state failed:', error);
            return { friends: 0, following: 0, followers: 0, isFollowing: false };
        });
        const banner = profile.bannerVideo || profile.banner || '';
        const avatar = profile.avatarVideo || profile.avatar || '';
        const bannerClass = `profile-banner ${profile.bannerFormat === 'wide' ? 'profile-banner--wide' : 'profile-banner--narrow'}${profile.bannerEffect && profile.bannerEffect !== 'none' ? ` banner-effect-${escapeHtml(profile.bannerEffect)}` : ''}`;
        const avatarClass = `profile-avatar${isGifUrl(avatar) ? ' is-gif' : ''}`;
        const nickname = escapeHtml(profile.nickname);
        const handle = escapeHtml('@' + profile.nickname.toLowerCase().replace(/\\s/g, '_'));
        const canFollow = Boolean(viewerUid && viewerUid !== targetUid && !Auth.isGuest());
        const publicHistory = profile.hideHistory ? [] : profile.history;
        const publicBookmarks = profile.hideBookmarks ? [] : profile.bookmarks;
        const uniqueAnime = new Set(publicHistory.map(item => item?.animeId || item?.title).filter(Boolean));
        const publicAchievements = getAchievements(publicHistory, publicBookmarks, uniqueAnime.size, publicHistory.length, profile.watchTime, { xp: profile.xp, posts: 0, ratings: 0 });
        const historyTab = profile.hideHistory ? '' : `<button class="profile-tab active" data-tab="history">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          Історія
        </button>`;
        const bookmarksTab = profile.hideBookmarks ? '' : `<button class="profile-tab${profile.hideHistory ? ' active' : ''}" data-tab="bookmarks">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
          Закладки
        </button>`;
        const achievementsTab = `<button class="profile-tab${profile.hideHistory && profile.hideBookmarks ? ' active' : ''}" data-tab="achievements">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.04 2.6a1 1 0 0 1 1.92 0l1.7 5.18a1 1 0 0 0 .95.69h5.47a1 1 0 0 1 .59 1.8l-4.43 3.22a1 1 0 0 0-.36 1.12l1.7 5.18a1 1 0 0 1-1.54 1.12l-4.42-3.22a1 1 0 0 0-1.18 0l-4.42 3.22a1 1 0 0 1-1.54-1.12l1.7-5.18a1 1 0 0 0-.36-1.12L3.3 10.27a1 1 0 0 1 .59-1.8h5.47a1 1 0 0 0 .95-.69l1.7-5.18z"/></svg>
          Досягнення
        </button>`;
        const initialTab = profile.hideHistory ? (profile.hideBookmarks ? 'achievements' : 'bookmarks') : 'history';
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
                    <span class="avatar-placeholder" style="display:${avatar ? 'none' : 'flex'};">${escapeHtml(profile.nickname.charAt(0).toUpperCase())}</span>
                  </div>
                </div>
                <div class="profile-social-summary" aria-label="Соціальні показники">
                  ${canFollow && !social.isFollowing ? `<button type="button" class="profile-follow-icon" id="publicFollowBtn" data-following="0" aria-label="Підписатися на користувача" title="Підписатися">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H5.4A3.4 3.4 0 0 0 2 18.4V20M8.5 11.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM19 8v6M16 11h6"/></svg>
                  </button>` : ''}
                  <span class="profile-social-link"><span class="label">Друзі</span><strong class="num" id="publicFriendsCount">${social.friends}</strong></span>
                  <span class="profile-social-link"><span class="label">Слідкую</span><strong class="num" id="publicFollowingCount">${social.following}</strong></span>
                </div>
              </div>
              <div class="profile-nick-row"><span class="profile-nick">${nickname}</span></div>
              <div class="profile-meta"><span>${handle}</span></div>
              ${profile.bio ? `<div class="profile-bio-row"><div class="profile-bio${profile.bioBold ? ' is-bold' : ''}">${escapeHtml(profile.bio)}</div></div>` : ''}
            </div>
          </div>
          <div class="profile-tabs" id="publicProfileTabs">
            ${historyTab}${bookmarksTab}${achievementsTab}
          </div>
          <div id="publicProfilePanels">
            ${profile.hideHistory ? '' : `<div class="profile-panel${initialTab === 'history' ? ' active' : ''}" id="publicProfilePanel-history">${renderHistoryPanel(publicHistory)}</div>`}
            ${profile.hideBookmarks ? '' : `<div class="profile-panel${initialTab === 'bookmarks' ? ' active' : ''}" id="publicProfilePanel-bookmarks">${renderBookmarksPanel(publicBookmarks)}</div>`}
            <div class="profile-panel${initialTab === 'achievements' ? ' active' : ''}" id="publicProfilePanel-achievements">${renderAchievementsPanel(publicAchievements, profile.watchTime, publicHistory.length)}</div>
          </div>`;
        primeProfileMediaPlayback(container);
        container.querySelectorAll('#publicProfileTabs .profile-tab').forEach(tab => tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            container.querySelectorAll('#publicProfileTabs .profile-tab').forEach(item => item.classList.toggle('active', item === tab));
            container.querySelectorAll('#publicProfilePanels .profile-panel').forEach(panel => panel.classList.toggle('active', panel.id === `publicProfilePanel-${target}`));
        }));
        container.querySelector('#publicFollowBtn')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (!Auth.isAuthenticated() || Auth.isGuest() || !Auth._user?.uid) {
                showToast('Увійдіть в акаунт, щоб слідкувати за користувачами');
                return;
            }
            const nextValue = button.dataset.following !== '1';
            button.disabled = true;
            try {
                const nextSocial = await setFollowing(Auth._user.uid, targetUid, nextValue);
                button.dataset.following = nextValue ? '1' : '0';
                if (nextValue) {
                    // Після успішної підписки іконка більше не показується у чужому профілі.
                    button.remove();
                } else {
                    button.classList.remove('is-following');
                    button.setAttribute('aria-label', 'Підписатися на користувача');
                    button.setAttribute('title', 'Підписатися');
                }
                const friends = container.querySelector('#publicFriendsCount');
                const following = container.querySelector('#publicFollowingCount');
                if (friends) friends.textContent = String(nextSocial.friends);
                if (following) following.textContent = String(nextSocial.following);
                showToast(nextValue ? `Ви слідкуєте за ${profile.nickname}` : 'Підписку скасовано');
            } catch (error) {
                console.error('[VakDab] follow update failed:', error);
                showToast('Не вдалося оновити підписку');
            } finally {
                button.disabled = false;
            }
        });
    } catch (error) {
        console.error('[VakDab] public profile failed:', error);
        container.innerHTML = '<div class="profile-public-empty">Не вдалося завантажити профіль.</div>';
    }
}

        // ====================================================================
        //  СТОРІНКА АВТОРИЗАЦІЇ
        // ====================================================================
