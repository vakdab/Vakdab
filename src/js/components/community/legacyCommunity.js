import { arrayRemove, arrayUnion, addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc } from '../../config/firebase.js';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../../config/constants.js?v=20260820-hikka-proxy-fix4';
import { db, initialized as firebaseInitialized } from '../../services/firebase/client.js';
import {
    ACHIEVEMENTS, Auth, DailyStats, Router, calcTotalXP, escapeHtml,
    getLevel, isGifUrl, openPlayerPage, profileMediaMarkup, showToast
} from '../../legacy/app-legacy.js?v=20260821-ranobe-no-all-age-black-v11';
import { getProfile } from '../pages/settingsLegacy.js?v=20260821-ranobe-no-all-age-black-v11';
import { loadHikkaDetail, searchHikka } from '../../services/catalog.js';

        function _renderReplyBanner() {
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

        function _setReplyTo(m) {
            replyingTo = { id: m.id, authorName: m.authorName || 'Аніматор', text: (m.text || (m.media?.length ? '📎 медіа' : (m.animeData ? '🎬 ' + m.animeData.title : (m.achData ? '🏆 ' + m.achData.name : '')))).slice(0, 100) };
            _renderReplyBanner();
            document.getElementById('comInput')?.focus();
        }

        function _uniqueCommunityAuthors() {
            const seen = new Map();
            _comMsgsCache.forEach(m => {
                if (m.authorName && !seen.has(m.authorName)) seen.set(m.authorName, m.authorPhoto || '');
            });
            return Array.from(seen.entries()).map(([name, photo]) => ({ name, photo }));
        }

        function _highlightMentions(escapedText) {
            const authors = _uniqueCommunityAuthors();
            if (!authors.length || !escapedText) return escapedText;
            const names = authors.map(a => a.name).sort((a, b) => b.length - a.length);
            const pattern = names.map(n => n.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&')).join('|');
            if (!pattern) return escapedText;
            const re = new RegExp('@(' + pattern + ')\\b', 'g');
            return escapedText.replace(re, '<span class="com-mention">@$1</span>');
        }

        function getMyEarnedAchievements() {
            const history   = Storage.getHistory()   || [];
            const bookmarks = Storage.getBookmarks() || [];
            const watchSec  = Storage.getWatchTime() || 0;
            const episodes  = history.length;
            const totalXP   = calcTotalXP();
            const xpLvl     = getLevel(totalXP);
            const achStats  = { episodes, watchMinutes: Math.floor(watchSec / 60), bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            return ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need);
        }

        let modernCommunityUnsub = null;
        let modernCommunityPosts = [];
        let modernCommunityFilter = 'all';
        let modernCommunityView = 'categories';
        let modernCommunityCategoryId = null;
        let modernCommunityTopicId = null;
        let modernCommunityComposerMode = 'text';
        let modernCommunityReplyTo = null;
        let modernCommunityMediaFiles = [];
        const MODERN_COMMUNITY_CATEGORIES = [
            { id: 'anime', icon: '◈', title: 'Аніме та манґа', description: 'Серії, персонажі, теорії та манґа', topics: [
                { id: 'episodes', title: 'Обговорення серій', description: 'Враження, спойлери та найкращі моменти' },
                { id: 'characters', title: 'Персонажі та теорії', description: 'Розбираємо героїв, сюжети й фанатські теорії' },
                { id: 'manga', title: 'Манґа та ранобе', description: 'Першоджерела, глави та екранізації' }
            ]},
            { id: 'season', icon: '✦', title: 'Сезон і новинки', description: 'Нові релізи, розклад і очікувані тайтли', topics: [
                { id: 'new-season', title: 'Новинки сезону', description: 'Що виходить зараз і що варто додати до списку' },
                { id: 'schedule', title: 'Розклад виходу', description: 'Дати серій, переноси та спільний перегляд' }
            ]},
            { id: 'recommendations', icon: '♡', title: 'Рекомендації', description: 'Знаходь наступне аніме для перегляду', topics: [
                { id: 'what-to-watch', title: 'Що подивитися?', description: 'Поради під настрій, жанр або вільний вечір' },
                { id: 'ratings', title: 'Оцінки та рейтинги', description: 'Ділимось враженнями й порівнюємо улюблені тайтли' }
            ]},
            { id: 'community', icon: '✧', title: 'Спільнота', description: 'Знайомства, питання та допомога', topics: [
                { id: 'introductions', title: 'Знайомства', description: 'Розкажи про себе та свої улюблені тайтли' },
                { id: 'help', title: 'Питання та допомога', description: 'Попроси пораду або допоможи іншому учаснику' }
            ]}
        ];
        function modernCommunityCategory(id) { return MODERN_COMMUNITY_CATEGORIES.find(item => item.id === id) || null; }
        function modernCommunityTopic(categoryId, topicId) { return modernCommunityCategory(categoryId)?.topics.find(item => item.id === topicId) || null; }
        function modernCommunityLegacyTopic(post) {
            const kind = post.communityCategory || (post.animeData ? 'recommend' : 'discussion');
            return kind === 'recommend' ? 'what-to-watch' : kind === 'question' ? 'help' : 'episodes';
        }
        function modernCommunityDate(value) {
            try {
                const date = value?.toDate ? value.toDate() : new Date(value || 0);
                if (!date || Number.isNaN(date.getTime()) || date.getTime() < 1000) return 'Щойно';
                const now = new Date();
                const sameDay = date.toDateString() === now.toDateString();
                if (sameDay) return date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
                const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
                if (date.toDateString() === yesterday.toDateString()) return `Вчора, ${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;
                return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
            } catch (_) { return 'Щойно'; }
        }
        const modernCommunityAuthorProfiles = new Map();
        let modernCommunityAuthorProfilesLoaded = false;

        function modernCommunityIdentity(post) {
            const remote = modernCommunityAuthorProfiles.get(post.uid) || {};
            return {
                nickname: post.authorName || remote.nickname || 'Аніме ентузіаст',
                avatar: post.authorPhoto || remote.avatar || '',
                avatarVideo: post.authorAvatarVideo || remote.avatarVideo || '',
                avatarVideoSettings: post.authorAvatarVideoSettings || remote.avatarVideoSettings || {}
            };
        }

        function modernCommunityAvatarMarkup(identity) {
            const active = identity.avatarVideo || identity.avatar || '';
            if (active) {
                const gifClass = isGifUrl(active) ? ' is-gif' : '';
                return profileMediaMarkup(active, `modern-community-avatar-media${gifClass}`, 'avatar', identity.avatarVideoSettings);
            }
            return `<span>${escapeHtml((identity.nickname || '?').slice(0, 1).toUpperCase())}</span>`;
        }

        function modernCommunityAuthor(post) {
            return modernCommunityAvatarMarkup(modernCommunityIdentity(post));
        }

        function modernCommunityAuthorName(post) {
            const identity = modernCommunityIdentity(post);
            return `<div class="modern-community-author-name"><b>${escapeHtml(identity.nickname)}</b></div>`;
        }

        async function loadModernCommunityAuthorProfiles(posts) {
            if (modernCommunityAuthorProfilesLoaded || !firebaseInitialized || !db) return;
            const uids = new Set((posts || []).map(post => post.uid).filter(Boolean));
            if (!uids.size) return;
            try {
                const { collection, getDocs, limit, query } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                const snapshot = await getDocs(query(collection(db, 'users'), limit(500)));
                snapshot.forEach(item => {
                    const data = item.data() || {};
                    const profile = data.profile || {};
                    modernCommunityAuthorProfiles.set(item.id, {
                        nickname: profile.nickname || profile.name || '',
                        avatar: profile.avatar || '',
                        avatarVideo: profile.avatarVideo || '',
                        avatarVideoSettings: profile.avatarVideoSettings || {}
                    });
                });
                modernCommunityAuthorProfilesLoaded = true;
                renderModernCommunityFeed();
            } catch (error) {
                console.warn('Community author profile enrichment failed:', error);
            }
        }
        function modernCommunityPostCard(post) {
            const kind = post.communityCategory || (post.animeData ? 'recommend' : 'discussion');
            const label = kind === 'recommend' ? 'Рекомендація' : kind === 'question' ? 'Питання' : 'Обговорення';
            const topic = modernCommunityTopic(post.communityCategoryId, post.communityTopicId);
            const topicLabel = topic?.title || modernCommunityTopic('anime', modernCommunityLegacyTopic(post))?.title || label;
            const anime = post.animeData?.title ? `<div class="modern-community-anime-card">${post.animeData.poster ? `<img src="${escapeHtml(post.animeData.poster)}" alt="" loading="lazy">` : `<span class="modern-community-anime-icon">◈</span>`}<div><small>Рекомендація аніме</small><b>${escapeHtml(post.animeData.title)}</b>${post.animeData.synopsis ? `<p>${escapeHtml(post.animeData.synopsis)}</p>` : ''}${post.animeData.url ? `<a href="${escapeHtml(post.animeData.url)}" target="_blank" rel="noopener">Відкрити тайтл ›</a>` : ''}</div></div>` : '';
            const media = Array.isArray(post.media) && post.media.length ? `<div class="modern-community-media-grid">${post.media.map(item => item.type === 'video' ? `<video src="${escapeHtml(item.url)}" controls preload="metadata"></video>` : `<img src="${escapeHtml(item.url)}" alt="Медіа публікації" loading="lazy">`).join('')}</div>` : '';
            const reply = post.replyTo?.text ? `<div class="modern-community-reply-quote"><b>Відповідь ${escapeHtml(post.replyTo.authorName || 'учаснику')}</b><span>${escapeHtml(post.replyTo.text)}</span></div>` : '';
            const text = post.text ? `<p>${escapeHtml(post.text).replace(/\n/g, '<br>')}</p>` : '';
            const reactions = Object.entries(post.reactions || {}).filter(([, uids]) => Array.isArray(uids) && uids.length).map(([emoji, uids]) => `<button type="button" class="modern-community-reaction${Auth.isAuthenticated() && uids.includes(Auth._user?.uid) ? ' is-mine' : ''}" data-community-action="reaction" data-emoji="${escapeHtml(emoji)}" data-post-id="${escapeHtml(post.id)}">${emoji} <span>${uids.length}</span></button>`).join('');
            const profileUid = String(post.uid || '').trim();
            const profileAttrs = profileUid ? ` data-community-profile-uid="${escapeHtml(profileUid)}" role="link" tabindex="0" title="Відкрити профіль"` : '';
            return `<article class="modern-community-post"><div class="modern-community-post-top"><div class="modern-community-avatar"${profileAttrs}>${modernCommunityAuthor(post)}</div><div class="modern-community-author"${profileAttrs}>${modernCommunityAuthorName(post)}<span>${modernCommunityDate(post.createdAt)}</span></div><span class="modern-community-tag">${escapeHtml(topicLabel)}</span></div>${reply}${text}${media}${anime}<div class="modern-community-post-actions"><button type="button" class="modern-community-action" data-community-action="reaction" data-emoji="♡" data-post-id="${escapeHtml(post.id)}">♡ Реакція</button><button type="button" class="modern-community-action" data-community-action="reply" data-post-id="${escapeHtml(post.id)}">↩ Відповісти</button>${reactions}</div></article>`;
        }
        function renderModernCommunityFeed() {
            const feed = document.getElementById('modernCommunityFeed');
            if (!feed) return;
            const posts = modernCommunityPosts.filter(post => {
                if (modernCommunityView !== 'group' || !modernCommunityTopicId) return true;
                return (post.communityTopicId || modernCommunityLegacyTopic(post)) === modernCommunityTopicId;
            });
            const count = document.getElementById('modernCommunityCount');
            if (count) count.textContent = `${posts.length} публікацій`;
            feed.innerHTML = posts.length ? posts.map(modernCommunityPostCard).join('') : `<div class="modern-community-empty"><div class="modern-community-empty-icon">✦</div><h3>Група ще чекає на першу розмову</h3><p>Створи перше повідомлення в цій темі та започаткуй обговорення.</p></div>`;
            feed.querySelectorAll('[data-community-profile-uid]').forEach(card => {
                const openProfile = () => Router.goTo('profile', { uid: card.dataset.communityProfileUid });
                card.addEventListener('click', openProfile);
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProfile(); }
                });
            });
            feed.querySelectorAll('[data-community-action="reply"]').forEach(btn => btn.addEventListener('click', () => { const post = modernCommunityPosts.find(item => item.id === btn.dataset.postId); if (!post) return; modernCommunityReplyTo = { id: post.id, authorName: post.authorName || 'учаснику', text: (post.text || post.animeData?.title || 'публікації').slice(0, 120) }; const banner = document.getElementById('modernCommunityReplyBanner'); if (banner) { banner.innerHTML = `<b>Відповідь ${escapeHtml(modernCommunityReplyTo.authorName)}</b><span>${escapeHtml(modernCommunityReplyTo.text)}</span><button type="button" data-community-cancel-reply>×</button>`; banner.hidden = false; } document.getElementById('modernCommunityComposer')?.focus(); }));
            feed.querySelectorAll('[data-community-action="reaction"]').forEach(btn => btn.addEventListener('click', async () => { if (!Auth.isAuthenticated() || !db) return showToast('Увійди, щоб реагувати на публікації'); const { updateDoc, doc, arrayUnion, arrayRemove } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js'); const post = modernCommunityPosts.find(item => item.id === btn.dataset.postId); if (!post) return; const emoji = btn.dataset.emoji || '♡'; const mine = Array.isArray(post.reactions?.[emoji]) && post.reactions[emoji].includes(Auth._user.uid); try { await updateDoc(doc(db, 'community_posts', post.id), { [`reactions.${emoji}`]: mine ? arrayRemove(Auth._user.uid) : arrayUnion(Auth._user.uid) }); } catch (error) { console.warn('Community reaction failed:', error); showToast('Не вдалося додати реакцію'); } }));
        }
        function renderModernCommunityNavigation() {
            const nav = document.getElementById('modernCommunityNav');
            const heading = document.getElementById('modernCommunityHeading');
            if (!nav || !heading) return;
            const category = modernCommunityCategory(modernCommunityCategoryId);
            const topic = modernCommunityTopic(modernCommunityCategoryId, modernCommunityTopicId);
            if (modernCommunityView === 'categories') {
                heading.innerHTML = `<div><span class="modern-community-eyebrow">EXPLORE COMMUNITY</span><h2>Категорії</h2><p>Обери напрям, щоб побачити тематичні групи.</p></div>`;
                nav.innerHTML = `<div class="modern-community-category-grid">${MODERN_COMMUNITY_CATEGORIES.map(item => `<button type="button" class="modern-community-category-card" data-community-category="${item.id}"><span class="modern-community-category-icon">${item.icon}</span><span><strong>${item.title}</strong><small>${item.description}</small><em>${item.topics.length} теми <b>›</b></em></span></button>`).join('')}</div>`;
            } else if (modernCommunityView === 'topics') {
                heading.innerHTML = `<div><button type="button" class="modern-community-back" data-community-view="categories">‹ Категорії</button><span class="modern-community-eyebrow">${category?.title || 'CATEGORY'}</span><h2>Теми</h2><p>${category?.description || 'Обери тему для переходу в групу.'}</p></div>`;
                nav.innerHTML = `<div class="modern-community-topic-list">${(category?.topics || []).map(item => `<button type="button" class="modern-community-topic-row" data-community-topic="${item.id}"><span class="modern-community-topic-number">#</span><span><strong>${item.title}</strong><small>${item.description}</small></span><b>›</b></button>`).join('')}</div>`;
            } else {
                heading.innerHTML = `<div><div class="modern-community-breadcrumb"><button type="button" data-community-view="categories">Категорії</button><span>›</span><button type="button" data-community-view="topics">${category?.title || 'Теми'}</button></div><span class="modern-community-eyebrow">TOPIC GROUP</span><h2>${topic?.title || 'Обговорення'}</h2><p>${topic?.description || 'Розмова учасників VakDab.'}</p></div>`;
                nav.innerHTML = `<div class="modern-community-group-banner"><span class="modern-community-group-icon">${category?.icon || '✦'}</span><div><strong>Група «${topic?.title || 'Обговорення'}»</strong><small>Публікації цієї теми зібрані в одній стрічці.</small></div><button type="button" class="modern-community-back" data-community-view="topics">‹ Усі теми</button></div>`;
            }
            renderModernCommunityFeed();
        }
        function initModernCommunity() {
            const panel = document.getElementById('rgPanelCommunity');
            if (!panel || panel.dataset.modernInit) return;
            panel.dataset.modernInit = '1';
            const user = Auth.isAuthenticated() ? Auth._user : null;
            const profile = getProfile();
            const topicOptions = MODERN_COMMUNITY_CATEGORIES.flatMap(category => category.topics.map(topic => `<option value="${category.id}:${topic.id}">${category.title} · ${topic.title}</option>`)).join('');
            panel.innerHTML = `<section class="modern-community-page"><div class="modern-community-hero"><div><span class="modern-community-eyebrow">VAKDAB COMMUNITY</span><h1>Місце, де аніме оживає в розмовах</h1><p>Обирай категорію, заходь у свою тему та спілкуйся в окремій групі без зайвого шуму.</p><button type="button" class="modern-community-categories-button" data-community-view="categories">⌘ Категорії <span>Переглянути всі розділи</span></button></div><div class="modern-community-hero-art"><span>✦</span><span>◈</span><span>✧</span></div></div>${user ? `<form class="modern-community-composer" id="modernCommunityForm"><div class="modern-community-avatar">${modernCommunityAvatarMarkup({ ...profile, nickname: profile.nickname || user.displayName || 'К', stickers: Storage.getStickers() })}</div><div class="modern-community-composer-main"><div id="modernCommunityReplyBanner" class="modern-community-reply-banner" hidden></div><textarea id="modernCommunityComposer" maxlength="1000" rows="2" placeholder="Поділись думкою у вибраній темі..."></textarea><div id="modernCommunityAnimeFields" class="modern-community-anime-fields" hidden><input id="modernCommunityAnimeTitle" type="text" maxlength="120" placeholder="Назва аніме"><input id="modernCommunityAnimeUrl" type="url" placeholder="Посилання на аніме (необов’язково)"><input id="modernCommunityAnimePoster" type="url" placeholder="URL постера (необов’язково)"></div><div id="modernCommunityMediaPreview" class="modern-community-media-preview"></div><div class="modern-community-composer-bottom"><select id="modernCommunityTopicSelect" aria-label="Тема публікації">${topicOptions}</select><div class="modern-community-composer-tools"><button type="button" class="modern-community-tool" data-community-mode="recommend">Рекомендувати аніме</button><label class="modern-community-tool">Фото/відео<input id="modernCommunityMediaInput" type="file" accept="image/*,video/*" multiple hidden></label><button type="submit">Опублікувати</button></div></div></div></form>` : `<div class="modern-community-login"><div><b>Приєднуйся до розмови</b><span>Увійди, щоб створювати публікації та зберігати улюблені обговорення.</span></div><button type="button" id="modernCommunityLogin">Увійти</button></div>`}<div id="modernCommunityHeading" class="modern-community-section-heading"></div><div id="modernCommunityNav"></div><div class="modern-community-feed-heading"><span class="modern-community-eyebrow">TOPIC FEED</span><span class="modern-community-count" id="modernCommunityCount">0 публікацій</span></div><div id="modernCommunityFeed" class="modern-community-feed"><div class="modern-community-empty"><div class="modern-community-empty-icon">◌</div><p>Завантажую стрічку...</p></div></div></section>`;
            renderModernCommunityNavigation();
            panel.addEventListener('click', event => {
                const categoryButton = event.target.closest('[data-community-category]');
                const topicButton = event.target.closest('[data-community-topic]');
                const viewButton = event.target.closest('[data-community-view]');
                if (categoryButton) { modernCommunityCategoryId = categoryButton.dataset.communityCategory; modernCommunityTopicId = null; modernCommunityView = 'topics'; renderModernCommunityNavigation(); }
                else if (topicButton) { modernCommunityTopicId = topicButton.dataset.communityTopic; modernCommunityView = 'group'; renderModernCommunityNavigation(); const select = document.getElementById('modernCommunityTopicSelect'); if (select) select.value = `${modernCommunityCategoryId}:${modernCommunityTopicId}`; }
                else if (viewButton) { const next = viewButton.dataset.communityView; modernCommunityView = next; if (next === 'categories') { modernCommunityCategoryId = null; modernCommunityTopicId = null; } if (next === 'topics') modernCommunityTopicId = null; renderModernCommunityNavigation(); }
            });
            document.getElementById('modernCommunityLogin')?.addEventListener('click', () => Router.goTo('profile'));
            document.querySelectorAll('[data-community-mode]').forEach(button => button.addEventListener('click', () => { modernCommunityComposerMode = modernCommunityComposerMode === 'recommend' ? 'text' : 'recommend'; const fields = document.getElementById('modernCommunityAnimeFields'); if (fields) fields.hidden = modernCommunityComposerMode !== 'recommend'; button.classList.toggle('is-active', modernCommunityComposerMode === 'recommend'); }));
            document.getElementById('modernCommunityMediaInput')?.addEventListener('change', event => { modernCommunityMediaFiles = Array.from(event.target.files || []).slice(0, 4); const preview = document.getElementById('modernCommunityMediaPreview'); if (preview) preview.innerHTML = modernCommunityMediaFiles.map(file => `<span>${file.type.startsWith('video/') ? 'Відео' : 'Фото'}: ${escapeHtml(file.name)}</span>`).join(''); });
            document.getElementById('modernCommunityReplyBanner')?.addEventListener('click', event => { if (event.target.closest('[data-community-cancel-reply]')) { modernCommunityReplyTo = null; event.currentTarget.hidden = true; event.currentTarget.innerHTML = ''; } });
            document.getElementById('modernCommunityForm')?.addEventListener('submit', async event => { event.preventDefault(); const textarea = document.getElementById('modernCommunityComposer'); const text = textarea?.value.trim(); const selected = document.getElementById('modernCommunityTopicSelect')?.value || 'anime:episodes'; const [communityCategoryId, communityTopicId] = selected.split(':'); const animeTitle = document.getElementById('modernCommunityAnimeTitle')?.value.trim(); const animeUrl = document.getElementById('modernCommunityAnimeUrl')?.value.trim(); const animePoster = document.getElementById('modernCommunityAnimePoster')?.value.trim(); if ((!text && !animeTitle && !modernCommunityMediaFiles.length) || !firebaseInitialized || !db) return showToast('Додай текст, рекомендацію або медіа'); const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true; try { const { addDoc, collection, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js'); const media = []; for (const file of modernCommunityMediaFiles) { const formData = new FormData(); formData.append('file', file); formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${file.type.startsWith('video/') ? 'video' : 'image'}/upload`, { method: 'POST', body: formData }); const result = await response.json(); if (result.secure_url) media.push({ url: result.secure_url, type: file.type.startsWith('video/') ? 'video' : 'image' }); } const data = { uid: user.uid, authorName: profile.nickname || user.displayName || 'Аніме ентузіаст', authorPhoto: profile.avatar || user.photoURL || '', authorAvatarVideo: profile.avatarVideo || '', authorAvatarVideoSettings: profile.avatarVideoSettings || {}, text, type: modernCommunityComposerMode === 'recommend' ? 'anime' : media.length ? 'media' : 'text', communityCategory: modernCommunityComposerMode === 'recommend' ? 'recommend' : 'discussion', communityCategoryId, communityTopicId, media, createdAt: serverTimestamp() }; if (animeTitle) data.animeData = { title: animeTitle, url: animeUrl, poster: animePoster, synopsis: '' }; if (modernCommunityReplyTo) data.replyTo = { id: modernCommunityReplyTo.id, authorName: modernCommunityReplyTo.authorName, text: modernCommunityReplyTo.text }; await addDoc(collection(db, 'community_posts'), data); textarea.value = ''; modernCommunityMediaFiles = []; modernCommunityReplyTo = null; modernCommunityComposerMode = 'text'; document.getElementById('modernCommunityMediaInput').value = ''; document.getElementById('modernCommunityMediaPreview').innerHTML = ''; document.getElementById('modernCommunityAnimeFields').hidden = true; document.getElementById('modernCommunityAnimeTitle').value = ''; document.getElementById('modernCommunityAnimeUrl').value = ''; document.getElementById('modernCommunityAnimePoster').value = ''; document.getElementById('modernCommunityReplyBanner').hidden = true; showToast('Публікацію додано'); } catch (error) { console.error('Modern community post failed:', error); showToast('Не вдалося опублікувати'); } finally { button.disabled = false; } });
            if (modernCommunityUnsub) modernCommunityUnsub();
            try { const q = query(collection(db, 'community_posts'), limit(60)); modernCommunityUnsub = onSnapshot(q, snapshot => { modernCommunityPosts = snapshot.docs.map(item => ({ id: item.id, ...item.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)); renderModernCommunityFeed(); void loadModernCommunityAuthorProfiles(modernCommunityPosts); }, () => { const feed = document.getElementById('modernCommunityFeed'); if (feed) feed.innerHTML = `<div class="modern-community-empty"><div class="modern-community-empty-icon">✦</div><h3>Спільнота тільки починається</h3><p>Поки тут тихо. Увійди та створи перше обговорення про своє улюблене аніме.</p></div>`; }); } catch (error) { console.warn('Modern community subscription failed:', error); renderModernCommunityFeed(); }
        }
        export function initCommunity() {
            initModernCommunity();
            return;
            const panel = document.getElementById('rgPanelCommunity');
            if (!panel || panel.dataset.init) return;
            panel.dataset.init = '1';

            const user    = Auth.isAuthenticated() ? Auth._user : null;
            const profile = getProfile();
            const gifCls = isGifUrl(profile.avatar) ? ' class="is-gif"' : '';
            const avHtml  = profile.avatar
                ? `<img src="${profile.avatar}" alt=""${gifCls}>`
                : `<span>${(profile.nickname || '?')[0].toUpperCase()}</span>`;

            const tabMeta = {
                text:  { placeholder: 'Написати в спільний чат...' },
                anime: { placeholder: '' },
                ach:   { placeholder: 'Короткий коментар (необов\'язково)...' }
            };

            panel.innerHTML = `
                <div class="com-chat-wrap">
                    <div class="com-chat-header" id="comChatHeader" title="Інформація про групу">
                        <div class="com-chat-header-icon">💬</div>
                        <div class="com-chat-header-info">
                            <div class="com-chat-header-title">VakDab</div>
                            <div class="com-chat-header-sub"><span class="com-chat-header-dot"></span>Живе спілкування фанатів аніме</div>
                        </div>
                        <div class="com-chat-header-chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg></div>
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

            document.getElementById('comChatHeader')?.addEventListener('click', () => openGroupInfo(user));
            _ensureGroupSettings(user).then(() => _subscribeGroupSettings());
            _subscribeMyMembership(user);
            _subscribeGroupMembers();
        }

        function _setupCompose(user) {
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

            function updateInputVisibility() {
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

            function refreshExtra() {
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
                                    const list = await searchHikka(q, 1);
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
                                                const detail = await loadHikkaDetail(item.url);
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

            function doSend() {
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

        function _renderMediaPreview(media, container) {
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

        async function _sendMessage(user, extra, onSent) {
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

            if (myMemberCache.banned) { showToast('Вас заблоковано в цій групі'); return; }
            if (groupSettingsCache.accessMode === 'admins' && !isPrivilegedRole(myMemberCache.role)) {
                showToast('У цій групі писати можуть лише адміни'); return;
            }

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
                    authorAvatarVideo: p.avatarVideo || '',
                    authorAvatarVideoSettings: p.avatarVideoSettings || {},
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

        function _renderComMessages(currentUser) {
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

                const identity = {
                    nickname: m.authorName || 'Аніматор',
                    avatar: m.authorPhoto || '',
                    avatarVideo: m.authorAvatarVideo || '',
                    avatarVideoSettings: m.authorAvatarVideoSettings || {}
                };
                const activeAvatar = identity.avatarVideo || identity.avatar;
                const av = activeAvatar
                    ? profileMediaMarkup(activeAvatar, `com-msg-avatar-media${isGifUrl(activeAvatar) ? ' is-gif' : ''}`, 'avatar', identity.avatarVideoSettings)
                    : `<span>${(identity.nickname || '?')[0].toUpperCase()}</span>`;
                const nameHtml = `<span>${escapeHtml(identity.nickname)}</span>`;
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
                        <div class="com-msg-name">${nameHtml}</div>
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

        async function _toggleReaction(msgId, emoji, currentUser) {
            if (!currentUser) { showToast('Увійдіть, щоб реагувати'); return; }
            const m = _comMsgsCache.find(x => x.id === msgId);
            const already = !!(m?.reactions?.[emoji] || []).includes(currentUser.uid);
            try {
                await updateDoc(doc(db, 'community_posts', msgId), {
                    [`reactions.${emoji}`]: already ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
                });
            } catch (e) { showToast('Помилка: ' + e.message); }
        }

        function _closeMsgContextMenu() {
            document.getElementById('comCtxOverlay')?.remove();
            document.querySelector('.com-ctx-menu')?.remove();
        }

        function _showMsgContextMenu(m, currentUser, x, y) {
            _closeMsgContextMenu();
            const isMe = currentUser && m.uid === currentUser.uid;
            const canModerate = isMe || isPrivilegedRole(myMemberCache.role);
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
                    ${canModerate ? `<button type="button" class="com-ctx-action com-ctx-danger" data-action="delete">
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

        // ====================================================================
        //  GROUP MODULE — Telegram-2026-style group management for the
        //  Dumbka/VakDab community. Firestore-backed:
        //   groupSettings/dumbka  { name, description, avatar, accessMode, ownerId }
        //   users/{uid}.role      'owner' | 'admin' | 'member'
        //   users/{uid}.banned    true/false (blocked from posting)
        // ====================================================================
        const GROUP_DOC_ID = 'dumbka';
        let groupSettingsCache = { name: 'VakDab', description: 'Живе спілкування фанатів аніме', avatar: '💬', accessMode: 'all', ownerId: '' };
        let myMemberCache = { role: 'member', banned: false };
        let groupMembersCache = [];
        let groupUnsub = null, membersUnsub = null, myMemberUnsub = null;

        function isPrivilegedRole(role) { return role === 'owner' || role === 'admin'; }

        async function _ensureGroupSettings(currentUser) {
            try {
                const ref = doc(db, 'groupSettings', GROUP_DOC_ID);
                const snap = await getDoc(ref);
                if (!snap.exists()) {
                    await setDoc(ref, {
                        name: 'VakDab',
                        description: 'Живе спілкування фанатів аніме',
                        avatar: '💬',
                        accessMode: 'all',
                        ownerId: currentUser ? currentUser.uid : '',
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    });
                    if (currentUser) {
                        await setDoc(doc(db, 'users', currentUser.uid), { role: 'owner' }, { merge: true });
                    }
                }
            } catch (e) { console.warn('Group settings init failed:', e); }
        }

        function _subscribeGroupSettings() {
            if (groupUnsub) { groupUnsub(); groupUnsub = null; }
            groupUnsub = onSnapshot(doc(db, 'groupSettings', GROUP_DOC_ID), snap => {
                if (snap.exists()) {
                    groupSettingsCache = Object.assign({}, groupSettingsCache, snap.data());
                    _updateGroupHeaderUI();
                }
            });
        }

        function _subscribeMyMembership(currentUser) {
            if (myMemberUnsub) { myMemberUnsub(); myMemberUnsub = null; }
            if (!currentUser) { myMemberCache = { role: 'member', banned: false }; return; }
            myMemberUnsub = onSnapshot(doc(db, 'users', currentUser.uid), snap => {
                const d = snap.exists() ? snap.data() : {};
                myMemberCache = { role: d.role || 'member', banned: !!d.banned };
            });
        }

        function _subscribeGroupMembers() {
            if (membersUnsub) { membersUnsub(); membersUnsub = null; }
            const q = query(collection(db, 'users'), limit(500));
            membersUnsub = onSnapshot(q, snap => {
                groupMembersCache = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        uid: d.id,
                        name: data.profile?.nickname || data.profile?.name || 'Аніматор',
                        avatar: data.profile?.avatar || '',
                        role: data.role || 'member',
                        banned: !!data.banned
                    };
                });
                const btn = document.getElementById('grpMembersBtn');
                if (btn) { const c = btn.querySelector('.grp-action-row-count'); if (c) c.textContent = groupMembersCache.length; }
            });
        }

        function _updateGroupHeaderUI() {
            const titleEl = document.querySelector('.com-chat-header-title');
            const subEl = document.querySelector('.com-chat-header-sub');
            const iconEl = document.querySelector('.com-chat-header-icon');
            if (titleEl) titleEl.textContent = groupSettingsCache.name || 'VakDab';
            if (subEl) subEl.innerHTML = `<span class="com-chat-header-dot"></span>${escapeHtml(groupSettingsCache.description || '')}`;
            if (iconEl) {
                if (groupSettingsCache.avatar && groupSettingsCache.avatar.startsWith('http')) {
                    const gifCls = isGifUrl(groupSettingsCache.avatar) ? ' class="is-gif"' : '';
                    iconEl.innerHTML = `<img src="${groupSettingsCache.avatar}" alt=""${gifCls} style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    iconEl.textContent = groupSettingsCache.avatar || '💬';
                }
            }
        }

        function _closeGroupSheets() {
            document.getElementById('grpInfoOverlay')?.remove();
            document.getElementById('grpEditOverlay')?.remove();
            document.getElementById('grpMembersOverlay')?.remove();
            document.querySelector('.grp-member-ctx')?.remove();
        }

        function openGroupInfo(currentUser) {
            _closeGroupSheets();
            const privileged = isPrivilegedRole(myMemberCache.role);
            const overlay = document.createElement('div');
            overlay.className = 'grp-sheet-overlay';
            overlay.id = 'grpInfoOverlay';
            const grpGifCls = (groupSettingsCache.avatar && groupSettingsCache.avatar.startsWith('http') && isGifUrl(groupSettingsCache.avatar)) ? ' class="is-gif"' : '';
            const avatarHtml = (groupSettingsCache.avatar && groupSettingsCache.avatar.startsWith('http'))
                ? `<img src="${groupSettingsCache.avatar}" alt=""${grpGifCls}>`
                : `<span>${groupSettingsCache.avatar || '💬'}</span>`;

            overlay.innerHTML = `
                <div class="grp-sheet" id="grpInfoSheet">
                    <div class="grp-sheet-handle"></div>
                    <div class="grp-info-header">
                        <div class="grp-info-avatar">${avatarHtml}${privileged ? `<button class="grp-avatar-edit" id="grpAvatarEditBtn" title="Змінити аватар"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></button>` : ''}</div>
                        <div class="grp-info-name" id="grpInfoName">${escapeHtml(groupSettingsCache.name || 'VakDab')}</div>
                        <div class="grp-info-desc" id="grpInfoDesc">${escapeHtml(groupSettingsCache.description || '')}</div>
                        <div class="grp-info-stats">${groupMembersCache.length || 0} учасників</div>
                    </div>
                    ${privileged ? `<button class="grp-action-row" id="grpEditBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        <span>Редагувати групу</span>
                    </button>` : ''}
                    <button class="grp-action-row" id="grpMembersBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>Учасники</span>
                        <span class="grp-action-row-count">${groupMembersCache.length || 0}</span>
                    </button>
                    ${privileged ? `
                    <div class="grp-access-section">
                        <div class="grp-access-title">Хто може писати</div>
                        <div class="grp-access-toggle" id="grpAccessToggle">
                            <button class="grp-access-opt${groupSettingsCache.accessMode !== 'admins' ? ' active' : ''}" data-mode="all">Всі учасники</button>
                            <button class="grp-access-opt${groupSettingsCache.accessMode === 'admins' ? ' active' : ''}" data-mode="admins">Тільки адміни</button>
                        </div>
                    </div>` : ''}
                </div>`;
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('open'));
            overlay.addEventListener('click', e => { if (e.target === overlay) _closeGroupSheets(); });

            document.getElementById('grpEditBtn')?.addEventListener('click', () => _openEditGroupModal());
            document.getElementById('grpAvatarEditBtn')?.addEventListener('click', () => _openEditGroupModal());
            document.getElementById('grpMembersBtn')?.addEventListener('click', () => _openMembersList(currentUser));
            overlay.querySelectorAll('.grp-access-opt').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const mode = btn.dataset.mode;
                    if (mode === groupSettingsCache.accessMode) return;
                    try {
                        await updateDoc(doc(db, 'groupSettings', GROUP_DOC_ID), { accessMode: mode, updatedAt: serverTimestamp() });
                        showToast(mode === 'admins' ? 'Тепер писати можуть лише адміни' : 'Писати можуть усі учасники');
                    } catch (e) { showToast('Помилка: ' + e.message); }
                });
            });
        }

        function _openEditGroupModal() {
            const overlay = document.createElement('div');
            overlay.className = 'grp-sheet-overlay open';
            overlay.id = 'grpEditOverlay';
            const currentEmoji = (groupSettingsCache.avatar || '').startsWith('http') ? '💬' : (groupSettingsCache.avatar || '💬');
            overlay.innerHTML = `
                <div class="grp-sheet" id="grpEditSheet">
                    <div class="grp-sheet-handle"></div>
                    <div class="grp-edit-title">Редагувати групу</div>
                    <label class="grp-field-label">Назва групи</label>
                    <input type="text" class="grp-field-input" id="grpEditName" maxlength="60" value="${escapeHtml(groupSettingsCache.name || '')}">
                    <label class="grp-field-label">Опис</label>
                    <textarea class="grp-field-input" id="grpEditDesc" maxlength="160" rows="2">${escapeHtml(groupSettingsCache.description || '')}</textarea>
                    <label class="grp-field-label">Емодзі-іконка групи</label>
                    <input type="text" class="grp-field-input" id="grpEditAvatar" maxlength="4" value="${escapeHtml(currentEmoji)}">
                    <div class="grp-edit-actions">
                        <button class="grp-btn-secondary" id="grpEditCancel">Скасувати</button>
                        <button class="grp-btn-primary" id="grpEditSave">Зберегти</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            document.getElementById('grpEditCancel').addEventListener('click', () => overlay.remove());
            document.getElementById('grpEditSave').addEventListener('click', async () => {
                const name = document.getElementById('grpEditName').value.trim() || 'VakDab';
                const desc = document.getElementById('grpEditDesc').value.trim();
                const avatar = document.getElementById('grpEditAvatar').value.trim() || '💬';
                try {
                    await updateDoc(doc(db, 'groupSettings', GROUP_DOC_ID), { name, description: desc, avatar, updatedAt: serverTimestamp() });
                    showToast('Групу оновлено');
                    overlay.remove();
                    _closeGroupSheets();
                } catch (e) { showToast('Помилка: ' + e.message); }
            });
        }

        function _openMembersList(currentUser) {
            const overlay = document.createElement('div');
            overlay.className = 'grp-sheet-overlay open';
            overlay.id = 'grpMembersOverlay';
            const privileged = isPrivilegedRole(myMemberCache.role);
            const rolesOrder = { owner: 0, admin: 1, member: 2 };
            const sorted = [...groupMembersCache].sort((a, b) => (rolesOrder[a.role] ?? 2) - (rolesOrder[b.role] ?? 2) || a.name.localeCompare(b.name));
            const roleBadge = r => r === 'owner' ? '<span class="grp-role-badge owner">👑 Власник</span>' : r === 'admin' ? '<span class="grp-role-badge admin">⭐ Адмін</span>' : '';

            overlay.innerHTML = `
                <div class="grp-sheet grp-sheet-tall" id="grpMembersSheet">
                    <div class="grp-sheet-handle"></div>
                    <div class="grp-edit-title">Учасники · ${sorted.length}</div>
                    <div class="grp-members-list">
                        ${sorted.map(m => {
                            const memGifCls = isGifUrl(m.avatar) ? ' class="is-gif"' : '';
                            return `
                            <div class="grp-member-row" data-uid="${m.uid}">
                                <div class="grp-member-avatar">${m.avatar ? `<img src="${m.avatar}" alt=""${memGifCls}>` : `<span>${escapeHtml((m.name || '?')[0].toUpperCase())}</span>`}</div>
                                <div class="grp-member-info">
                                    <div class="grp-member-name">${escapeHtml(m.name)}${m.banned ? ' <span class="grp-banned-tag">заблок.</span>' : ''}</div>
                                    ${roleBadge(m.role)}
                                </div>
                                ${(privileged && m.uid !== currentUser?.uid && m.role !== 'owner') ? `<button class="grp-member-menu-btn" data-uid="${m.uid}">⋮</button>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            overlay.querySelectorAll('.grp-member-menu-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const uid = btn.dataset.uid;
                    const m = groupMembersCache.find(x => x.uid === uid);
                    if (m) _showMemberActionMenu(m, currentUser, btn);
                });
            });
        }

        function _showMemberActionMenu(member, currentUser, anchorBtn) {
            document.querySelector('.grp-member-ctx')?.remove();
            const isOwnerMe = myMemberCache.role === 'owner';
            const menu = document.createElement('div');
            menu.className = 'grp-member-ctx';
            const isAdmin = member.role === 'admin';
            menu.innerHTML = `
                ${isOwnerMe ? `<button data-action="${isAdmin ? 'demote' : 'promote'}">${isAdmin ? 'Зняти адміна' : 'Призначити адміном'}</button>` : ''}
                <button data-action="${member.banned ? 'unban' : 'ban'}" class="grp-ctx-danger">${member.banned ? 'Розблокувати' : 'Заблокувати'}</button>`;
            document.body.appendChild(menu);
            const rect = anchorBtn.getBoundingClientRect();
            let top = rect.bottom + 6;
            let left = rect.right - 180;
            left = Math.max(10, Math.min(left, window.innerWidth - 190));
            top = Math.min(top, window.innerHeight - 100);
            menu.style.top = top + 'px';
            menu.style.left = left + 'px';
            requestAnimationFrame(() => menu.classList.add('show'));

            const closeMenu = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu, true); } };
            setTimeout(() => document.addEventListener('click', closeMenu, true), 0);

            menu.querySelectorAll('button[data-action]').forEach(b => {
                b.addEventListener('click', async () => {
                    const action = b.dataset.action;
                    try {
                        if (action === 'promote') await updateDoc(doc(db, 'users', member.uid), { role: 'admin' });
                        if (action === 'demote') await updateDoc(doc(db, 'users', member.uid), { role: 'member' });
                        if (action === 'ban') await updateDoc(doc(db, 'users', member.uid), { banned: true });
                        if (action === 'unban') await updateDoc(doc(db, 'users', member.uid), { banned: false });
                        showToast('Готово');
                    } catch (e) { showToast('Помилка: ' + e.message); }
                    menu.remove();
                });
            });
        }

        function _subscribeToChat(currentUser) {
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
