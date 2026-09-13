import {
    Auth, Router, Storage, PROFILE_STICKER_SLOTS,
    renderProfilePage, renderSettingsPage, showToast, showToastProgress, syncLeftdockActive
} from '../../legacy/app-legacy.js';
import { escapeHtml } from '../../utils/string.js';
import { getProfile, saveProfile, getProfileDisplayName, stripNicknamePrefix } from '../../services/profile/profileStorage.js';
import {
    isVideoFile, CLOUDINARY_IMAGE_FILE_LIMIT,
    uploadVideoToCloudinary, uploadGifToCloudinary, uploadRawToCloudinary, uploadBlobToCloudinary,
    openImageEditor, removeStickerBackground
} from '../../utils/mediaUpload.js';

export function renderAuthPage() {
    const container = document.getElementById('profilePageContainer');
    if (!container) return;
    container.innerHTML = `
    <div class="auth-card">
      <div class="mark"></div>
      <h1 id="authTitle">Вхід до акаунта</h1>
      <p class="sub" id="authSub">Увійдіть за допомогою Google або вашої пошти.</p>

      <button class="google-btn" type="button" id="authGoogleBtn">
        <svg viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
          <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
        </svg>
        Продовжити через Google
      </button>

      <div class="divider">або через email</div>

      <div class="panel active" id="authPanel-login">
        <form id="authLoginForm" onsubmit="return false;">
          <div class="field">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" type="email" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="field">
            <label for="loginPass">Пароль</label>
            <input id="loginPass" type="password" placeholder="••••••••" required autocomplete="current-password">
          </div>
          <div class="row-between">
            <label class="remember"><input type="checkbox" id="loginRemember">Запам'ятати мене</label>
            <a href="#" onclick="showToast('Скидання пароля — звʼяжіться з підтримкою');return false;">Забули пароль?</a>
          </div>
          <div class="auth-error" id="authError"></div>
          <button class="submit-btn" type="submit" id="authLoginSubmit">Увійти</button>
        </form>
      </div>

      <button class="guest-btn" type="button" id="authGuestBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0"/>
          <circle cx="12" cy="8" r="4.5"/>
        </svg>
        Продовжити як гість
      </button>
    </div>
  `;

    document.getElementById('authLoginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const pass = document.getElementById('loginPass').value;
        const errorEl = document.getElementById('authError');
        const submitBtn = document.getElementById('authLoginSubmit');
        errorEl.textContent = '';
        if (!email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Вхід...';
        const result = await Auth.login(email, pass);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Увійти';
        if (!result.success) {
            errorEl.textContent = result.error || 'Помилка входу';
        } else {
            renderProfilePage();
        }
    });

    document.getElementById('authGoogleBtn').addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = 'Завантаження...';
        const result = await Auth.signInWithGoogle();
        this.disabled = false;
        this.innerHTML = `
      <svg viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
        <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      </svg>
      Продовжити через Google
    `;
        if (!result.success) {
            document.getElementById('authError').textContent = result.error || 'Помилка Google входу';
        } else {
            renderProfilePage();
        }
    });

    document.getElementById('authGuestBtn').addEventListener('click', () => {
        Auth.setGuest(true);
        showToast('Продовжуємо як гість');
        Router.showProfile();
    });

    syncLeftdockActive();
}

export function renderHistoryPanel(history) {
    if (!history || !history.length) {
        return `
      <div class="profile-empty">
        <i class="fas fa-history"></i>
        <p>Історія переглядів порожня</p>
      </div>
    `;
    }
    const animeHistory = [];
    const seenAnime = new Set();
    const watchedEpisodesByAnime = {};
    history.forEach((item, index) => {
        const key = item.url || item.title || `history-${index}`;
        if (Number(item.progress) >= 88) watchedEpisodesByAnime[key] = (watchedEpisodesByAnime[key] || 0) + 1;
        if (!seenAnime.has(key)) {
            seenAnime.add(key);
            animeHistory.push(item);
        }
    });
    let html = `
    <div class="profile-panel-header">
      <span class="profile-panel-title">Історія перегляду</span>
      <span class="profile-panel-count">${animeHistory.length} аніме</span>
    </div>
    <div class="profile-history-list">
  `;
    animeHistory.slice(0, 30).forEach(item => {
        const poster = item.poster || '';
        const rawTitle = item.title || 'Без назви';
        const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
        const ep = item.episode || '?';
        const season = item.season || '';
        const time = item.timestamp ? new Date(item.timestamp).toLocaleDateString('uk-UA') : 'невідомо';
        const progress = item.progress || 0;
        const animeKey = item.url || item.title || '';
        const watchedEpisodes = watchedEpisodesByAnime[animeKey] || 0;
        const currentEpisode = Math.max(1, Number(item.episodePosition) || Number(ep) || 1);
        const totalEpisodes = Math.max(currentEpisode, Number(item.totalEpisodes) || watchedEpisodes || currentEpisode);
        const animeProgress = Math.min(100, ((currentEpisode - 1 + Math.min(Number(progress), 100) / 100) / totalEpisodes) * 100);
        const progressPercent = Math.round(animeProgress);
        html += `
      <div class="profile-history-item" data-profile-url="${escapeHtml(item.url || '')}" role="button" tabindex="0">
        <div class="profile-thumb">
          ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
          <span class="profile-thumb-placeholder" style="${poster?'display:none;':''}">
            <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
          </span>
        </div>
        <div class="profile-h-info">
          <div class="profile-h-title">${escapeHtml(title)}</div>
          <div class="profile-h-sub">
            <span>${season ? `<b>Сезон ${escapeHtml(String(season))}</b>, ` : ''}<b>Серія ${escapeHtml(String(ep))}</b></span>
            <span class="dot"></span>
            <span>${escapeHtml(time)}</span>
          </div>
        </div>
        <div class="profile-h-progress">
          <span class="profile-h-watched-count">${progressPercent}%</span>
          <div class="profile-h-progress-fill" style="width:${animeProgress}%"></div>
        </div>
      </div>
    `;
    });
    html += `</div>`;
    return html;
}

export function renderBookmarksPanel(bookmarks) {
    if (!bookmarks || !bookmarks.length) {
        return `
      <div class="profile-empty">
        <i class="fas fa-bookmark"></i>
        <p>Немає збережених закладок</p>
      </div>
    `;
    }
    let html = `
    <div class="profile-panel-header">
      <span class="profile-panel-title">Закладки</span>
      <span class="profile-panel-count">${bookmarks.length}</span>
    </div>
    <div class="profile-bookmark-grid">
  `;
    bookmarks.slice(0, 30).forEach(item => {
        const poster = item.poster || '';
        const rawTitle = item.title || 'Без назви';
        const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
        const sub = item.episodes || '';
        html += `
      <div class="profile-bookmark-card" data-profile-url="${escapeHtml(item.url || '')}" role="button" tabindex="0">
        <div class="profile-bm-thumb">
          ${poster ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
          <span class="profile-bm-thumb-ph" style="${poster?'display:none;':''}">
            <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
          </span>
        </div>
        <div class="profile-bm-info">
          <div class="profile-bm-title">${escapeHtml(title)}</div>
          <div class="profile-bm-sub">${escapeHtml(sub || 'Збережено')}</div>
        </div>
      </div>
    `;
    });
    html += `</div>`;
    return html;
}

export function profileEditNick() {
    const nickEl = document.getElementById('profileNickText');
    if (!nickEl) return;
    const profile = getProfile();
    const current = getProfileDisplayName(profile);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.style.cssText =
        'font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:2px 8px;outline:none;width:180px;font-family:inherit;';
    if (document.body.classList.contains('dark-mode')) {
        input.style.background = '#1a1a1a';
        input.style.color = '#f7f7f7';
        input.style.borderColor = '#333';
    }
    nickEl.replaceWith(input);
    input.focus();
    input.select();
    const save = () => {
        const val = input.value.trim() || current;
        const span = document.createElement('span');
        span.className = 'profile-nick';
        span.id = 'profileNickText';
        span.textContent = val;
        input.replaceWith(span);
        profile.realName = stripNicknamePrefix(val);
        span.textContent = getProfileDisplayName(profile);
        saveProfile(profile);
        if (Router.currentRoute === 'profile') renderProfilePage();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { input.blur(); }
        if (e.key === 'Escape') { input.value = current; input.blur(); }
    });
}

export function profileEditBio() {
    const bioEl = document.getElementById('profileBioText');
    if (!bioEl) return;
    const current = bioEl.textContent;
    const textarea = document.createElement('textarea');
    textarea.value = current;
    textarea.style.cssText =
        'font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:6px 8px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;';
    if (document.body.classList.contains('dark-mode')) {
        textarea.style.background = '#1a1a1a';
        textarea.style.color = '#cfcfcf';
        textarea.style.borderColor = '#333';
    }
    bioEl.replaceWith(textarea);
    textarea.focus();
    textarea.select();
    const save = () => {
        const val = textarea.value.trim() || current;
        const div = document.createElement('div');
        div.className = 'profile-bio';
        div.id = 'profileBioText';
        div.textContent = val;
        textarea.replaceWith(div);
        const profile = getProfile();
        profile.bio = val;
        saveProfile(profile);
        if (Router.currentRoute === 'profile') renderProfilePage();
    };
    textarea.addEventListener('blur', save);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { textarea.value = current; textarea.blur(); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { textarea.blur(); }
    });
}

export function initProfileFileInputs() {
    const avatarInput = document.getElementById('avatarFileInput');
    if (avatarInput && !avatarInput.dataset.bound) {
        avatarInput.dataset.bound = 'true';
        avatarInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && (file.type === 'image/gif' || /\.gif$/i.test(file.name || ''));
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 50 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) {
                showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 50 МБ) — вибери коротший' : 'Файл занадто великий (максимум 15 МБ)'));
                e.target.value = '';
                return;
            }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null) => {
                showToast(mediaType === 'video' ? 'Завантаження відео-аватарки...' : (mediaType === 'gif' && blobOrFile?.size > CLOUDINARY_IMAGE_FILE_LIMIT ? 'Перетворення великого GIF аватарки у відео...' : (mediaType === 'gif' ? 'Завантаження GIF-аватарки...' : 'Завантаження аватарки...')));
                try {
                    const imageUrl = mediaType === 'video'
                        ? await uploadVideoToCloudinary(blobOrFile, 'avatar.mp4')
                        : (mediaType === 'gif' ? await uploadGifToCloudinary(blobOrFile, 'avatar.gif') : (raw ? await uploadRawToCloudinary(blobOrFile, 'avatar.gif') : await uploadBlobToCloudinary(blobOrFile, 'avatar.jpg')));
                    const profile = getProfile();
                    if (mediaType === 'video' || mediaType === 'gif') { profile.avatarVideo = imageUrl; profile.avatar = ''; profile.avatarVideoSettings = mediaSettings || null; }
                    else { profile.avatar = imageUrl; profile.avatarVideo = ''; profile.avatarVideoSettings = null; }
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Аватарку оновлено');
                } catch (err) {
                    console.error('Avatar upload error:', err);
                    showToast('Помилка завантаження аватарки: ' + (err.message || 'невідома помилка'));
                }
            };

            if (isVideo) {
                openImageEditor(file, 'avatar', (settings) => doUpload(file, true, 'video', settings));
            } else if (isGif) {
                openImageEditor(file, 'avatar', (settings) => doUpload(file, true, 'gif', settings));
            } else {
                openImageEditor(file, 'avatar', (blob) => doUpload(blob, false));
            }
            e.target.value = '';
        });
    }

    const stickerInput = document.getElementById('stickerFileInput');
    if (stickerInput && !stickerInput.dataset.bound) {
        stickerInput.dataset.bound = 'true';
        stickerInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            const maxSize = 8 * 1024 * 1024;
            if (file.size > maxSize) { showToast('Файл занадто великий (максимум 8 МБ)'); return; }
            openImageEditor(file, 'avatar', async (blob) => {
                showToastProgress('AI готує видалення фону…');
                try {
                    const processedBlob = await removeStickerBackground(blob);
                    showToast('Завантаження наліпки...');
                    const imageUrl = await uploadBlobToCloudinary(processedBlob, 'sticker.png');
                    const cur = Storage.getStickers();
                    const stickerId = 'sng_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const stickerKey = 'img:' + stickerId;
                    cur.singles.unshift({ id: stickerId, image: imageUrl, favorite: false, addedAt: Date.now() });
                    if (!Array.isArray(cur.medals)) cur.medals = [];
                    if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
                    if (!cur.colors) cur.colors = {};
                    if (!cur.colors[stickerKey]) cur.colors[stickerKey] = '#7c8494';
                    Storage.setStickers(cur);
                    showToast(cur.medals.includes(stickerKey) ? 'Наліпку додано в профіль' : 'Наліпку додано');
                    if (window.stickersUI) window.stickersUI.step = null;
                    if (Router.currentRoute === 'stickers') window.renderStickersPage?.();
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                } catch (err) {
                    console.error('Sticker upload error:', err);
                    showToast('Помилка завантаження наліпки: ' + (err.message || 'невідома помилка'));
                }
            });
        });
    }

    const bannerInput = document.getElementById('bannerFileInput');
    if (bannerInput && !bannerInput.dataset.bound) {
        bannerInput.dataset.bound = 'true';
        bannerInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const isVideo = isVideoFile(file);
            const isGif = !isVideo && (file.type === 'image/gif' || /\.gif$/i.test(file.name || ''));
            const maxSize = isVideo ? 50 * 1024 * 1024 : (isGif ? 50 * 1024 * 1024 : 15 * 1024 * 1024);
            if (file.size > maxSize) {
                showToast(isVideo ? 'Відео занадто велике (максимум 50 МБ)' : (isGif ? 'GIF занадто великий (максимум 50 МБ) — вибери коротший' : 'Файл занадто великий (максимум 15 МБ)'));
                e.target.value = '';
                return;
            }

            const doUpload = async (blobOrFile, raw, mediaType = 'image', mediaSettings = null, format = 'narrow') => {
                showToast(mediaType === 'video' ? 'Завантаження відео-банера...' : (mediaType === 'gif' && blobOrFile?.size > CLOUDINARY_IMAGE_FILE_LIMIT ? 'Перетворення великого GIF банера у відео...' : (mediaType === 'gif' ? 'Завантаження GIF-банера...' : 'Завантаження банера...')));
                try {
                    const imageUrl = mediaType === 'video'
                        ? await uploadVideoToCloudinary(blobOrFile, 'banner.mp4')
                        : (mediaType === 'gif' ? await uploadGifToCloudinary(blobOrFile, 'banner.gif') : (raw ? await uploadRawToCloudinary(blobOrFile, 'banner.gif') : await uploadBlobToCloudinary(blobOrFile, 'banner.jpg')));
                    const profile = getProfile();
                    if (mediaType === 'video' || mediaType === 'gif') { profile.bannerVideo = imageUrl; profile.banner = ''; profile.bannerVideoSettings = mediaSettings || null; }
                    else { profile.banner = imageUrl; profile.bannerVideo = ''; profile.bannerVideoSettings = null; }
                    profile.bannerFormat = mediaSettings?.bannerFormat === 'wide' || format === 'wide' ? 'wide' : 'narrow';
                    saveProfile(profile);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                    if (Router.currentRoute === 'settings') renderSettingsPage();
                    showToast('Банер оновлено');
                } catch (err) {
                    console.error('Banner upload error:', err);
                    showToast('Помилка завантаження банера: ' + (err.message || 'невідома помилка'));
                }
            };

            const currentProfile = getProfile();
            if (isVideo) {
                openImageEditor(file, 'banner', (settings) => doUpload(file, true, 'video', settings, settings?.bannerFormat), currentProfile.bannerFormat || 'narrow');
            } else if (isGif) {
                openImageEditor(file, 'banner', (settings) => doUpload(file, true, 'gif', settings, settings?.bannerFormat), currentProfile.bannerFormat || 'narrow');
            } else {
                openImageEditor(file, 'banner', (blob, editorState) => doUpload(blob, false, 'image', null, editorState?.bannerFormat));
            }
            e.target.value = '';
        });
    }
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileFileInputs, { once: true });
    } else {
        initProfileFileInputs();
    }
}
