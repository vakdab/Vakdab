// ===== COMMUNITY CHAT =====
// Оригінальні рядки: L8346-L9108

import { auth, db } from '../config/firebase.js';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { Storage } from '../storage/storage.js';
import { escapeHtml } from '../utils/helpers.js';
import { getMyEarnedAchievements } from './achievements.js';

        export function _renderReplyBanner() {
            const wrap = document.getElementById('comReplyBannerWrap');
            if (!wrap) return;
            if (!replyingTo) { wrap.innerHTML = ''; return; }
            wrap.innerHTML = `
                <div class="com-reply-banner">
                    <div class="com-reply-banner-bar"></div>
                    <div class="com-reply-banner-info">
                        <b>Відповідь ${escapeHtml(replyingTo.authorName || 'Аніматор')}</b>
                        <span>${escapeHtml(replyingTo.text || 'медіа-повідомлення')}</span>
                    </div>
                    <button type="button" class="com-reply-cancel" id="comReplyCancelBtn">&times;</button>
                </div>`;
            document.getElementById('comReplyCancelBtn')?.addEventListener('click', () => {
                replyingTo = null;
                _renderReplyBanner();
            });
        }

        export function _setReplyTo(m) {
            replyingTo = { id: m.id, authorName: m.authorName || 'Аніматор', text: (m.text || (m.media?.length ? '📎 медіа' : (m.animeData ? '🎬 ' + m.animeData.title : (m.achData ? '🏆 ' + m.achData.name : '')))).slice(0, 100) };
            _renderReplyBanner();
            document.getElementById('comInput')?.focus();
        }

        export function _uniqueCommunityAuthors() {
            const seen = new Map();
            _comMsgsCache.forEach(m => {
                if (m.authorName && !seen.has(m.authorName)) seen.set(m.authorName, m.authorPhoto || '');
            });
            return Array.from(seen.entries()).map(([name, photo]) => ({ name, photo }));
        }

        export function _highlightMentions(escapedText) {
            const authors = _uniqueCommunityAuthors();
            if (!authors.length || !escapedText) return escapedText;
            const names = authors.map(a => a.name).sort((a, b) => b.length - a.length);
            const pattern = names.map(n => n.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')).join('|');
            if (!pattern) return escapedText;
            const re = new RegExp('@(' + pattern + ')\\b', 'g');
            return escapedText.replace(re, '<span class="com-mention">@$1</span>');
        }

        export function getMyEarnedAchievements() {
            const history   = Storage.getHistory()   || [];
            const bookmarks = Storage.getBookmarks() || [];
            const watchSec  = Storage.getWatchTime() || 0;
            const episodes  = history.length;
            const totalXP   = calcTotalXP();
            const xpLvl     = getLevel(totalXP);
            const achStats  = { episodes, watchTime: watchSec, bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            return ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need);
        }

        export function initCommunity() {
            const panel = document.getElementById('rgPanelCommunity');
            if (!panel || panel.dataset.init) return;
            panel.dataset.init = '1';

            const user    = Auth.isAuthenticated() ? Auth._user : null;
            const profile = getProfile();
            const avHtml  = profile.avatar
                ? `<img src="${profile.avatar}" alt="">`
                : `<span>${(profile.nickname || '?')[0].toUpperCase()}</span>`;

            const tabMeta = {
                text:  { placeholder: 'Написати в спільний чат...' },
                anime: { placeholder: '' },
                ach:   { placeholder: 'Короткий коментар (необов\'язково)...' }
            };

            panel.innerHTML = `
                <div class="com-chat-wrap">
                    <div class="com-chat-header">
                        <div class="com-chat-header-icon">💬</div>
                        <div class="com-chat-header-info">
                            <div class="com-chat-header-title">VakDab</div>
                            <div class="com-chat-header-sub"><span class="com-chat-header-dot"></span>Живе спілкування фанатів аніме</div>
                        </div>
                    </div>
                    <div class="com-filter-tabs" id="comFilterTabs">
                        <button class="com-filter-tab active" data-type="text">Думка</button>
                        <button class="com-filter-tab" data-type="anime">Рекомендація</button>
                        <button class="com-filter-tab" data-type="ach">Досягнення</button>
                    </div>
                    <div class="com-messages" id="comMessages">
                        <div class="com-feed-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <p>Завантаження...</p>
                        </div>
                    </div>

                    ${user ? `
                    <div class="com-compose-extra" id="comComposeExtra"></div>
                    <div id="comReplyBannerWrap"></div>
                    <div class="com-input-wrap" style="position:relative;">
                        <div id="comMentionDropdown"></div>
                        <input type="file" id="comMediaInput" accept="image/*,video/*" style="display:none" multiple>
                        <div class="com-msg-avatar" style="flex-shrink:0;margin-bottom:5px;">${avHtml}</div>
                        <div class="com-input-box">
                            <button class="com-attach-btn" id="comAttachBtn" title="Додати фото/відео">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                            </button>
                            <textarea id="comInput" placeholder="Написати в спільний чат..." maxlength="500" rows="1"></textarea>
                        </div>
                        <button class="com-send-btn" id="comSendBtn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </div>
                    <div class="com-media-preview" id="comMediaPreview"></div>
                    ` : `
                    <div class="com-login-wall">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>
                        <p>Увійдіть в акаунт, щоб бачити повідомлення та писати в спільноті</p>
                        <button onclick="Router.goTo('profile')">Увійти</button>
                    </div>
                    `}
                </div>
            `;

            panel.querySelectorAll('.com-filter-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('active')) return;
                    panel.querySelectorAll('.com-filter-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    comFilterType = btn.dataset.type;
                    comPostType = btn.dataset.type;
                    replyingTo = null;
                    _renderReplyBanner();
                    _renderComMessages(user);
                    if (_refreshComposeExtra) _refreshComposeExtra();
                });
            });

            if (user) _setupCompose(user);
            _subscribeToChat(user);
        }

        export function _setupCompose(user) {
            const inp        = document.getElementById('comInput');
            const sendBtn    = document.getElementById('comSendBtn');
            const attachBtn  = document.getElementById('comAttachBtn');
            const mediaInput = document.getElementById('comMediaInput');
            const mediaPreview = document.getElementById('comMediaPreview');
            const extraBox   = document.getElementById('comComposeExtra');
            const mentionBox = document.getElementById('comMentionDropdown');

            if (!inp || !sendBtn) return;

            let pendingMedia = [];
            let pendingAnime = null;
            let pendingAchievement = null;
            let animeSearchTimer = null;

            export function updateInputVisibility() {
                if (comPostType === 'anime') {
                    inp.style.display = 'none';
                    if (attachBtn) attachBtn.style.display = 'none';
                } else {
                    inp.style.display = '';
                    if (attachBtn) attachBtn.style.display = comPostType === 'text' ? '' : 'none';
                    const ph = { text: 'Написати в спільний чат...', ach: 'Короткий коментар (необов\'язково)...' };
                    inp.placeholder = ph[comPostType] || ph.text;
                }
            }

            export function refreshExtra() {
                updateInputVisibility();
                if (!extraBox) return;
                if (comPostType === 'anime') {
                    if (pendingAnime) {
                        extraBox.innerHTML = `
                            <div class="com-anime-selected">
                                <img src="${pendingAnime.poster || ''}" alt="" onerror="this.style.display='none'">
                                <div class="com-anime-selected-info">
                                    <div class="com-anime-selected-title">${escapeHtml(pendingAnime.title)}</div>
                                    <div class="com-anime-selected-desc">${escapeHtml(pendingAnime.synopsis || 'Опис відсутній')}</div>
                                </div>
                                <button class="com-anime-clear" id="comAnimeClear" title="Прибрати">&times;</button>
                            </div>`;
                        document.getElementById('comAnimeClear')?.addEventListener('click', () => {
                            pendingAnime = null;
                            refreshExtra();
                        });
                    } else {
                        extraBox.innerHTML = `
                            <div class="com-anime-search">
                                <input type="text" id="comAnimeSearchInput" placeholder="Введи назву аніме, щоб знайти і порекомендувати...">
                                <div class="com-anime-results" id="comAnimeResults"></div>
                            </div>`;
                        const searchInp = document.getElementById('comAnimeSearchInput');
                        const resultsBox = document.getElementById('comAnimeResults');
                        searchInp?.addEventListener('input', () => {
                            clearTimeout(animeSearchTimer);
                            const q = searchInp.value.trim();
                            if (q.length < 2) { resultsBox.innerHTML = ''; return; }
                            animeSearchTimer = setTimeout(async () => {
                                resultsBox.innerHTML = `<div style="display:flex;justify-content:center;padding:10px;"><svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
                                try {
                                    const list = await searchAnimeua(q, 1);
                                    if (!list || !list.length) {
                                        resultsBox.innerHTML = `<p style="font-size:11.5px;color:var(--text-muted);text-align:center;padding:6px 0;">Нічого не знайдено</p>`;
                                        return;
                                    }
                                    resultsBox.innerHTML = list.slice(0, 6).map((item, i) => `
                                        <div class="com-anime-result-item" data-idx="${i}">
                                            <img src="${item.images?.jpg?.large_image_url || ''}" alt="" onerror="this.style.display='none'">
                                            <span>${escapeHtml(item.title || 'Без назви')}</span>
                                        </div>`).join('');
                                    resultsBox.querySelectorAll('.com-anime-result-item').forEach((el, i) => {
                                        el.addEventListener('click', async () => {
                                            const item = list[i];
                                            resultsBox.innerHTML = `<div style="display:flex;justify-content:center;padding:10px;"><svg style="width:16px;height:16px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
                                            let synopsis = '', poster = item.images?.jpg?.large_image_url || '';
                                            try {
                                                const detail = await loadAnimeuaDetail(item.url);
                                                synopsis = (detail.synopsis || '').trim();
                                                poster = detail.images?.jpg?.large_image_url || poster;
                                            } catch (e) { console.warn('Не вдалося завантажити опис аніме:', e.message); }
                                            pendingAnime = { title: item.title, url: item.url, poster, synopsis: synopsis.slice(0, 300) };
                                            refreshExtra();
                                        });
                                    });
                                } catch (e) {
                                    resultsBox.innerHTML = `<p style="font-size:11.5px;color:var(--text-muted);text-align:center;padding:6px 0;">Помилка пошуку</p>`;
                                }
                            }, 400);
                        });
                    }
                } else if (comPostType === 'ach') {
                    if (pendingAchievement) {
                        extraBox.innerHTML = `
                            <div class="com-ach-selected">
                                <span class="com-ach-selected-icon">${pendingAchievement.icon}</span>
                                <div class="com-ach-selected-info">
                                    <div class="com-ach-selected-name">${escapeHtml(pendingAchievement.name)}</div>
                                    <div class="com-ach-selected-req">${escapeHtml(pendingAchievement.req)}</div>
                                </div>
                                <button class="com-ach-clear" id="comAchClear" title="Прибрати">&times;</button>
                            </div>`;
                        document.getElementById('comAchClear')?.addEventListener('click', () => {
                            pendingAchievement = null;
                            refreshExtra();
                        });
                    } else {
                        const myEarned = getMyEarnedAchievements();
                        extraBox.innerHTML = `
                            <div class="com-ach-picker">
                                <div class="com-ach-grid" id="comAchGrid">
                                    ${myEarned.length ? myEarned.map(a => `
                                        <button class="com-ach-opt" type="button" data-id="${a.id}">
                                            <span class="com-ach-opt-icon">${a.icon}</span>
                                            <span class="com-ach-opt-name">${escapeHtml(a.name)}</span>
                                        </button>`).join('') : `<p class="com-ach-empty">У тебе поки немає досягнень для поширення</p>`}
                                </div>
                            </div>`;
                        extraBox.querySelectorAll('.com-ach-opt').forEach(btn => {
                            btn.addEventListener('click', () => {
                                const a = myEarned.find(x => x.id === btn.dataset.id);
                                if (!a) return;
                                pendingAchievement = { id: a.id, name: a.name, req: a.req, icon: a.icon };
                                refreshExtra();
                            });
                        });
                    }
                } else {
                    extraBox.innerHTML = '';
                }
            }

            export function doSend() {
                if (comPostType === 'anime' && !pendingAnime) {
                    showToast('Спочатку обери аніме для рекомендації');
                    return;
                }
                _sendMessage(user, { media: pendingMedia, anime: pendingAnime, achievement: pendingAchievement, replyTo: replyingTo }, () => {
                    pendingMedia.length = 0;
                    pendingAnime = null;
                    pendingAchievement = null;
                    replyingTo = null;
                    _renderReplyBanner();
                    _renderMediaPreview(pendingMedia, mediaPreview);
                    refreshExtra();
                });
            }

            inp.addEventListener('input', () => {
                inp.style.height = 'auto';
                inp.style.height = Math.min(inp.scrollHeight, 110) + 'px';

                if (!mentionBox) return;
                const val = inp.value;
                const caret = inp.selectionStart;
                const upToCaret = val.slice(0, caret);
                const match = upToCaret.match(/@([\wа-яіїєА-ЯІЇЄ]*)$/);
                if (!match) { mentionBox.innerHTML = ''; return; }
                const q = match[1].toLowerCase();
                const authors = _uniqueCommunityAuthors().filter(a => a.name.toLowerCase().includes(q));
                if (!authors.length) { mentionBox.innerHTML = ''; return; }
                mentionBox.innerHTML = `<div class="com-mention-dropdown">${authors.slice(0, 6).map(a => `
                    <div class="com-mention-opt" data-name="${escapeHtml(a.name)}">${a.photo ? `<img src="${a.photo}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;" alt="">` : ''}${escapeHtml(a.name)}</div>
                `).join('')}</div>`;
                mentionBox.querySelectorAll('.com-mention-opt').forEach(opt => {
                    opt.addEventListener('click', () => {
                        const name = opt.dataset.name;
                        inp.value = upToCaret.replace(/@[\wа-яіїєА-ЯІЇЄ]*$/, '@' + name + ' ') + val.slice(caret);
                        mentionBox.innerHTML = '';
                        inp.focus();
                    });
                });
            });

            document.addEventListener('click', (e) => {
                if (mentionBox && !mentionBox.contains(e.target) && e.target !== inp) mentionBox.innerHTML = '';
            });

            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
            });

            if (attachBtn && mediaInput) {
                attachBtn.addEventListener('click', () => mediaInput.click());
                mediaInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(f => {
                        if (f.size > 10 * 1024 * 1024) { showToast('Файл занадто великий (макс 10МБ)'); return; }
                        pendingMedia.push(f);
                    });
                    _renderMediaPreview(pendingMedia, mediaPreview);
                    e.target.value = '';
                });
            }

            sendBtn.addEventListener('click', doSend);

            _refreshComposeExtra = refreshExtra;
            refreshExtra();
        }

        export function _renderMediaPreview(media, container) {
            if (!container) return;
            if (!media.length) { container.classList.remove('active'); container.innerHTML = ''; return; }
            container.classList.add('active');
            container.innerHTML = media.map((f, i) => {
                const url = URL.createObjectURL(f);
                const isVideo = f.type.startsWith('video/');
                return `<div class="com-media-thumb">
                    ${isVideo ? `<video src="${url}" muted></video>` : `<img src="${url}" alt="">`}
                    <button class="com-media-remove" onclick="this.parentElement.parentElement._removeIdx=${i}; this.dispatchEvent(new CustomEvent('remove'))" >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>`;
            }).join('');
            container.querySelectorAll('.com-media-remove').forEach((btn, i) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    media.splice(i, 1);
                    _renderMediaPreview(media, container);
                });
            });
        }

        export async function _sendMessage(user, extra, onSent) {
            const inp     = document.getElementById('comInput');
            const sendBtn = document.getElementById('comSendBtn');
            if (!inp) return;
            extra = extra || {};
            const pendingMedia = extra.media || [];
            const pendingAnime = comPostType === 'anime' ? extra.anime : null;
            const pendingAchievement = comPostType === 'ach' ? extra.achievement : null;
            const text = inp.value.trim();

            const hasSomethingToSend = !!text || pendingMedia.length > 0 || !!pendingAnime || !!pendingAchievement;
            if (!hasSomethingToSend) return;

            sendBtn.disabled = true;
            try {
                if (!firebaseInitialized || !db) throw new Error('Firebase недоступний');
                const { addDoc, collection, serverTimestamp } =
                    await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                const p = getProfile();
                const msgData = {
                    text,
                    type: comPostType || 'text',
                    uid: user.uid,
                    authorName: p.nickname || user.displayName || user.email?.split('@')[0] || 'Аніматор',
                    authorPhoto: p.avatar || user.photoURL || '',
                    watermark: (p.nickname || user.displayName || user.email?.split('@')[0] || 'VakDab'),
                    createdAt: serverTimestamp()
                };

                if (extra.replyTo) {
                    msgData.replyTo = {
                        id: extra.replyTo.id || '',
                        authorName: extra.replyTo.authorName || 'Аніматор',
                        text: (extra.replyTo.text || '').slice(0, 100)
                    };
                }

                if (pendingAnime) {
                    msgData.animeData = {
                        title: pendingAnime.title || '',
                        url: pendingAnime.url || '',
                        poster: pendingAnime.poster || '',
                        synopsis: (pendingAnime.synopsis || '').slice(0, 300)
                    };
                }
                if (pendingAchievement) {
                    msgData.achData = {
                        id: pendingAchievement.id || '',
                        name: pendingAchievement.name || '',
                        req: pendingAchievement.req || '',
                        icon: pendingAchievement.icon || ''
                    };
                }

                if (pendingMedia && pendingMedia.length > 0) {
                    msgData.media = [];
                    for (const f of pendingMedia) {
                        try {
                            const formData = new FormData();
                            formData.append('file', f);
                            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
                            const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${f.type.startsWith('video/') ? 'video' : 'image'}/upload`, {
                                method: 'POST', body: formData
                            });
                            const result = await resp.json();
                            if (result.secure_url) {
                                msgData.media.push({ url: result.secure_url, type: f.type.startsWith('video/') ? 'video' : 'image' });
                            }
                        } catch(e) { console.error('Media upload failed:', e); }
                    }
                }

                await addDoc(collection(db, 'community_posts'), msgData);
                DailyStats.increment('postsToday', 1);
                DailyStats.addTotalPost();
                inp.value = '';
                inp.style.height = 'auto';
                comPostType = 'text';
                const inp2 = document.getElementById('comInput');
                if (inp2) inp2.placeholder = 'Написати в спільноті...';
                if (onSent) onSent();
            } catch(e) {
                showToast('Помилка: ' + e.message);
            } finally {
                sendBtn.disabled = false;
            }
        }

        const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🔥'];
        const COM_TYPE_ICONS = {
            anime: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
            ach:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
        };
        const COM_TYPE_LABELS = { anime: 'Рекомендація', ach: 'Досягнення' };

        export function _renderComMessages(currentUser) {
            const box = document.getElementById('comMessages');
            if (!box) return;
            const filtered = comFilterType === 'text'
                ? _comMsgsCache
                : _comMsgsCache.filter(m => (m.type || 'text') === comFilterType);

            if (!filtered.length) {
                const emptyLabels = { text: 'Ще немає повідомлень у спільному чаті. Напиши першим!', anime: 'Ще немає рекомендацій. Поділись улюбленим аніме!', ach: 'Ще немає досягнень у стрічці. Поділись своїм!' };
                box.innerHTML = `<div class="com-feed-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <p>${emptyLabels[comFilterType] || emptyLabels.text}</p>
                </div>`;
                return;
            }

            const myUid = currentUser ? currentUser.uid : null;
            let lastDate = null;
            let html = '';
            filtered.forEach(m => {
                const date = m.createdAt?.toDate ? m.createdAt.toDate() : null;
                const isMe = currentUser && m.uid === currentUser.uid;

                if (date) {
                    const dayStr = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
                    if (dayStr !== lastDate) {
                        lastDate = dayStr;
                        html += `<div class="com-date-sep"><span class="com-date-sep-text">${dayStr}</span></div>`;
                    }
                }

                const av = m.authorPhoto
                    ? `<img src="${m.authorPhoto}" alt="" onerror="this.style.display='none'">`
                    : `<span>${(m.authorName || '?')[0].toUpperCase()}</span>`;
                const timeStr = date ? date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) : '';
                const typeTag = m.type && COM_TYPE_LABELS[m.type]
                    ? `<div class="com-msg-type">${COM_TYPE_ICONS[m.type] || ''}${COM_TYPE_LABELS[m.type]}</div>`
                    : '';

                let mediaHtml = '';
                if (m.media && Array.isArray(m.media) && m.media.length > 0) {
                    mediaHtml = m.media.map(md => {
                        if (md.type === 'video') {
                            return `<div class="com-msg-media"><video src="${md.url}" controls playsinline></video></div>`;
                        }
                        return `<div class="com-msg-media"><img src="${md.url}" alt="" loading="lazy"></div>`;
                    }).join('');
                }

                let animeCardHtml = '';
                if (m.animeData && m.animeData.title) {
                    const ad = m.animeData;
                    animeCardHtml = `<div class="com-anime-card" data-url="${escapeHtml(ad.url || '')}">
                        <img src="${ad.poster || ''}" alt="" onerror="this.style.display='none'">
                        <div class="com-anime-card-info">
                            <div class="com-anime-card-title">${escapeHtml(ad.title)}</div>
                            ${ad.synopsis ? `<div class="com-anime-card-desc">${escapeHtml(ad.synopsis)}</div>` : ''}
                            <div class="com-anime-card-cta">Дізнатись більше →</div>
                        </div>
                    </div>`;
                }

                let achCardHtml = '';
                if (m.achData && m.achData.name) {
                    const ad = m.achData;
                    achCardHtml = `<div class="com-ach-card">
                        <span class="com-ach-card-icon">${ad.icon || ''}</span>
                        <div>
                            <div class="com-ach-card-name">${escapeHtml(ad.name)}</div>
                            <div class="com-ach-card-req">${escapeHtml(ad.req || '')}</div>
                        </div>
                    </div>`;
                }

                let replyQuoteHtml = '';
                if (m.replyTo && m.replyTo.text) {
                    replyQuoteHtml = `<div class="com-msg-reply-quote">
                        <span class="com-msg-reply-name">${escapeHtml(m.replyTo.authorName || 'Аніматор')}</span>
                        <span class="com-msg-reply-text">${escapeHtml(m.replyTo.text)}</span>
                    </div>`;
                }

                const watermark = m.watermark
                    ? `<div class="com-msg-watermark">${escapeHtml(m.watermark)}</div>`
                    : '';

                const editedTag = m.edited ? `<span class="com-msg-edited-tag">змінено</span>` : '';

                let bodyHtml;
                if (editingMsgId === m.id) {
                    bodyHtml = `<div class="com-msg-edit-box">
                        <textarea class="com-msg-edit-input">${escapeHtml(m.text || '')}</textarea>
                        <div class="com-msg-edit-actions">
                            <button type="button" class="com-msg-edit-cancel">Скасувати</button>
                            <button type="button" class="com-msg-edit-save">Зберегти</button>
                        </div>
                    </div>`;
                } else {
                    const textHtml = m.text ? `<div class="com-msg-text">${_highlightMentions(escapeHtml(m.text))}</div>` : '';
                    bodyHtml = `${typeTag}${replyQuoteHtml}${mediaHtml}${animeCardHtml}${achCardHtml}${textHtml}`;
                }

                let reactionsHtml = '';
                if (m.reactions) {
                    const pills = Object.entries(m.reactions)
                        .filter(([, uids]) => Array.isArray(uids) && uids.length > 0)
                        .map(([emoji, uids]) => {
                            const mine = myUid && uids.includes(myUid);
                            return `<button type="button" class="com-reaction-pill${mine ? ' mine-reacted' : ''}" data-emoji="${emoji}">${emoji}<span class="cnt">${uids.length}</span></button>`;
                        }).join('');
                    if (pills) reactionsHtml = `<div class="com-msg-reactions">${pills}</div>`;
                }

                html += `<div class="com-msg ${isMe ? 'mine' : ''}" data-id="${m.id}">
                    <div class="com-msg-avatar">${av}</div>
                    <div class="com-msg-col">
                        <div class="com-msg-name">${m.authorName || 'Аніматор'}</div>
                        <div class="com-msg-bubble">
                            ${bodyHtml}
                        </div>
                        ${reactionsHtml}
                        ${watermark}
                        <div class="com-msg-time">${timeStr}${editedTag}</div>
                    </div>
                </div>`;
            });

            const wasAtBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
            box.innerHTML = html;
            if (wasAtBottom) box.scrollTop = box.scrollHeight;

            box.querySelectorAll('.com-anime-card').forEach(card => {
                card.addEventListener('click', () => {
                    const url = card.dataset.url;
                    if (url) openPlayerPage(url);
                });
            });

            box.querySelectorAll('.com-reaction-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    const msgEl = pill.closest('.com-msg');
                    if (msgEl) _toggleReaction(msgEl.dataset.id, pill.dataset.emoji, currentUser);
                });
            });

            box.querySelectorAll('.com-msg-bubble').forEach(bubble => {
                let pressTimer = null;
                let startX = 0, startY = 0;
                const clearPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
                bubble.addEventListener('pointerdown', (e) => {
                    if (e.target.closest('.com-msg-edit-box') || e.target.closest('.com-anime-card')) return;
                    startX = e.clientX; startY = e.clientY;
                    clearPress();
                    pressTimer = setTimeout(() => {
                        const msgEl = bubble.closest('.com-msg');
                        const id = msgEl?.dataset.id;
                        const m = _comMsgsCache.find(x => x.id === id);
                        if (m) _showMsgContextMenu(m, currentUser, e.clientX, e.clientY);
                    }, 450);
                });
                bubble.addEventListener('pointermove', (e) => {
                    if (pressTimer && (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10)) clearPress();
                });
                ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => bubble.addEventListener(ev, clearPress));
                bubble.addEventListener('contextmenu', (e) => {
                    if (e.target.closest('.com-msg-edit-box') || e.target.closest('.com-anime-card')) return;
                    e.preventDefault();
                    const msgEl = bubble.closest('.com-msg');
                    const id = msgEl?.dataset.id;
                    const m = _comMsgsCache.find(x => x.id === id);
                    if (m) _showMsgContextMenu(m, currentUser, e.clientX, e.clientY);
                });
            });

            box.querySelectorAll('.com-msg-edit-cancel').forEach(btn => {
                btn.addEventListener('click', () => {
                    editingMsgId = null;
                    _renderComMessages(currentUser);
                });
            });
            box.querySelectorAll('.com-msg-edit-save').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const msgEl = btn.closest('.com-msg');
                    const id = msgEl?.dataset.id;
                    const ta = msgEl?.querySelector('.com-msg-edit-input');
                    const newText = ta ? ta.value.trim() : '';
                    if (!newText) { showToast('Повідомлення не може бути порожнім'); return; }
                    try {
                        await updateDoc(doc(db, 'community_posts', id), {
                            text: newText, edited: true, editedAt: serverTimestamp()
                        });
                        editingMsgId = null;
                    } catch (err) { showToast('Помилка редагування: ' + err.message); }
                });
            });
        }

        export async function _toggleReaction(msgId, emoji, currentUser) {
            if (!currentUser) { showToast('Увійдіть, щоб реагувати'); return; }
            const m = _comMsgsCache.find(x => x.id === msgId);
            const already = !!(m?.reactions?.[emoji] || []).includes(currentUser.uid);
            try {
                await updateDoc(doc(db, 'community_posts', msgId), {
                    [`reactions.${emoji}`]: already ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
                });
            } catch (e) { showToast('Помилка: ' + e.message); }
        }

        export function _closeMsgContextMenu() {
            document.getElementById('comCtxOverlay')?.remove();
            document.querySelector('.com-ctx-menu')?.remove();
        }

        export function _showMsgContextMenu(m, currentUser, x, y) {
            _closeMsgContextMenu();
            const isMe = currentUser && m.uid === currentUser.uid;
            const overlay = document.createElement('div');
            overlay.className = 'com-ctx-overlay';
            overlay.id = 'comCtxOverlay';
            const menu = document.createElement('div');
            menu.className = 'com-ctx-menu';
            menu.innerHTML = `
                <div class="com-ctx-emojis">
                    ${REACTION_EMOJIS.map(em => `<button type="button" class="com-ctx-emoji-btn" data-emoji="${em}">${em}</button>`).join('')}
                </div>
                <div class="com-ctx-actions">
                    <button type="button" class="com-ctx-action" data-action="reply">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                        Відповісти
                    </button>
                    ${isMe ? `<button type="button" class="com-ctx-action" data-action="edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        Редагувати
                    </button>` : ''}
                    ${isMe ? `<button type="button" class="com-ctx-action com-ctx-danger" data-action="delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Видалити
                    </button>` : ''}
                </div>`;
            document.body.appendChild(overlay);
            document.body.appendChild(menu);

            requestAnimationFrame(() => {
                const rect = menu.getBoundingClientRect();
                let left = x - rect.width / 2;
                let top = y - rect.height - 12;
                left = Math.max(10, Math.min(left, window.innerWidth - rect.width - 10));
                if (top < 10) top = y + 12;
                top = Math.max(10, Math.min(top, window.innerHeight - rect.height - 10));
                menu.style.left = left + 'px';
                menu.style.top = top + 'px';
                menu.classList.add('show');
            });

            overlay.addEventListener('click', _closeMsgContextMenu);
            menu.querySelectorAll('.com-ctx-emoji-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    await _toggleReaction(m.id, btn.dataset.emoji, currentUser);
                    _closeMsgContextMenu();
                });
            });
            menu.querySelector('[data-action="reply"]')?.addEventListener('click', () => {
                _setReplyTo(m);
                _closeMsgContextMenu();
            });
            menu.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
                editingMsgId = m.id;
                _renderComMessages(currentUser);
                _closeMsgContextMenu();
            });
            menu.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
                _closeMsgContextMenu();
                if (!confirm('Видалити це повідомлення?')) return;
                try { await deleteDoc(doc(db, 'community_posts', m.id)); } catch (e) { showToast('Помилка: ' + e.message); }
            });
        }

        export function _subscribeToChat(currentUser) {
            const box = document.getElementById('comMessages');
            if (!box) return;
            if (comUnsub) { comUnsub(); comUnsub = null; }

            try {
                if (!firebaseInitialized || !db) throw new Error('no db');
                import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js').then(({ collection, query, orderBy, limit, onSnapshot }) => {
                    const q = query(collection(db, 'community_posts'), orderBy('createdAt', 'asc'), limit(80));
                    comUnsub = onSnapshot(q, snap => {
                        _comMsgsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        _renderComMessages(currentUser);
                    }, () => {
                        box.innerHTML = `<div class="com-feed-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/></svg><p>Не вдалося завантажити чат</p></div>`;
                    });
                });
            } catch(e) {
                if (box) box.innerHTML = `<div class="com-feed-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/></svg><p>Спільнота недоступна без підключення</p></div>`;
            }
        }

        export async function loadRatingPage() { initRatingPage(); }
        export async function loadRatingList() { initRatingPage(); }

        export function escapeHtml(str) {
            return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
        }


