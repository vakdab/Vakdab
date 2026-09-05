import { Auth } from '../../core/compat/auth.js?v=20260824-settings-redesign-v1';
import { Router } from '../../core/compat/router.js?v=20260903-rating-names-v1';
import { Storage } from '../../core/compat/storage.js?v=20260905-stickers-sync-v1';
import { db, auth, initialized as firebaseInitialized } from '../../services/firebase/client.js';
import { collection, limit, onSnapshot, query, signInAnonymously } from '../../config/firebase.js';
import { renderStickerFaceByKey } from '../../pages/profile/stickersLegacy.js?v=20260905-stickers-sync-v1';

function escapeRatingHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function isVideoUrl(url) {
    return typeof url === 'string' && (/\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url));
}

function ratingProfileMediaMarkup(profile, className) {
    const url = profile.avatarVideo || profile.avatar || '';
    if (!url) return `<span>${escapeRatingHtml((profile.nickname || '?').slice(0, 1).toUpperCase())}</span>`;
    const safeUrl = escapeRatingHtml(url);
    if (isVideoUrl(url)) return `<video class="${className}" src="${safeUrl}" autoplay muted loop playsinline preload="metadata" aria-label="Аватарка"></video>`;
    const gifClass = isGifUrl(url) ? ' is-gif' : '';
    return `<img class="${className}${gifClass}" src="${safeUrl}" alt="" loading="lazy">`;
}

function ratingNickBadgeMarkup(profile) {
    // Наліпка профілю (nickBadge) біля імені — видима всім у рейтингу.
    const stickers = profile?.stickers;
    if (!stickers || !stickers.nickBadge) return '';
    try {
        const visual = renderStickerFaceByKey(stickers, stickers.nickBadge);
        return visual ? `<span class="rg-nick-badge" title="Наліпка профілю" aria-label="Наліпка профілю">${visual}</span>` : '';
    } catch (e) { return ''; }
}

function ratingNameMarkup(profile, suffix = '') {
    // У рейтингу показуємо ім'я, а не @нікнейм. Нік — лише запасний варіант
    // для старих профілів, у яких ім'я ще не збережене.
    const displayName = profile.realName || profile.name || profile.fullName || profile.nickname || 'Гість';
    return `<span class="rg-profile-name-row"><span>${escapeRatingHtml(displayName).replace(/^@+/, '')}</span>${ratingNickBadgeMarkup(profile)}${suffix}</span>`;
}

function getProfile() {
    const profile = Storage.getProfile() || {};
    return {
        realName: typeof profile.realName === 'string' && profile.realName.trim() ? profile.realName.trim() : '',
        name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : '',
        fullName: typeof profile.fullName === 'string' && profile.fullName.trim() ? profile.fullName.trim() : '',
        nickname: typeof profile.nickname === 'string' && profile.nickname.trim() ? profile.nickname.trim() : 'Гість',
        stickers: Storage.getStickers() || {},
        avatar: typeof profile.avatar === 'string' ? profile.avatar : '',
        avatarVideo: typeof profile.avatarVideo === 'string' ? profile.avatarVideo : '',
        avatarVideoSettings: profile.avatarVideoSettings || {}
    };
}

function isGifUrl(url) {
    if (typeof url !== 'string' || !url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.gif') || lower.includes('.gif?') || lower.includes('.gif/');
}

        // ====================================================================
        //  XP / LEVEL SYSTEM
        // ====================================================================
        export function calculateBaseXP({ episodes = 0, watchSeconds = 0, bookmarks = 0 } = {}) {
            const safeEpisodes = Math.max(0, Math.floor(Number(episodes) || 0));
            const watchMinutes = Math.max(0, Math.floor((Number(watchSeconds) || 0) / 60));
            const safeBookmarks = Math.max(0, Math.floor(Number(bookmarks) || 0));
            return safeEpisodes * 25 + watchMinutes + safeBookmarks * 15;
        }
        export function calcTotalXP() {
            const history = Storage.getHistory() || [];
            const bookmarks = Storage.getBookmarks() || [];
            return calculateBaseXP({ episodes: history.length, watchSeconds: Storage.getWatchTime() || 0, bookmarks: bookmarks.length });
        }
        export function getLevel(xp) {
            return Math.floor(Math.sqrt(xp / 50)) + 1;
        }
        export function getXPForLevel(level) {
            return Math.pow(level - 1, 2) * 50;
        }
        export function getXPProgress(xp) {
            const level = getLevel(xp);
            const currentLevelXP = getXPForLevel(level);
            const nextLevelXP = getXPForLevel(level + 1);
            const into = xp - currentLevelXP;
            const needed = nextLevelXP - currentLevelXP;
            return { level, pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100, into, needed };
        }

        export function initRatingPage() {
            const wrap = document.getElementById('ratingPageContainer');
            if (!wrap || wrap.dataset.init) return;
            wrap.dataset.init = '1';

            wrap.innerHTML = `
                <div class="rg-tab-panel active" id="rgPanelRating">
                    <div id="rgMyStats"></div>
                                        <div class="rg-lb-title">Глобальний рейтинг</div>
                    <div class="rg-sort-tabs" id="rgSortTabs">
                        <button class="rg-sort-tab active" data-sort="xp">За XP</button>
                        <button class="rg-sort-tab" data-sort="episodes">За серіями</button>
                        <button class="rg-sort-tab" data-sort="minutes">За хвилинами</button>
                        <button class="rg-sort-tab" data-sort="bookmarks">За закладками</button>
                    </div>
                    <div id="rgLeaderboard">
                        <div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>
                    </div>
                </div>

            `;

            wrap.querySelectorAll('.rg-sort-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (btn.classList.contains('active')) return;
                    wrap.querySelectorAll('.rg-sort-tab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    _lbSortKey = btn.dataset.sort;
                    const lb = document.getElementById('rgLeaderboard');
                    if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
                });
            });

            loadMyStats();
            loadLeaderboard();
            if (!window.__vakdabRatingStickerRefreshBound) {
                window.__vakdabRatingStickerRefreshBound = true;
                window.addEventListener('vakdab:stickers-changed', () => {
                    if (Router.currentRoute !== 'rating') return;
                    loadMyStats();
                    const lb = document.getElementById('rgLeaderboard');
                    if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
                });
            }
        }

        function loadMyStats() {
            const statsEl = document.getElementById('rgMyStats');
            if (!statsEl) return;

            const profile    = getProfile();
            const history    = Storage.getHistory()   || [];
            const bookmarks  = Storage.getBookmarks() || [];
            const watchSec   = Storage.getWatchTime() || 0;
            const watchMinutes = Math.floor(watchSec / 60);
            const episodes   = history.length;
            const rankInfo   = getUserRankInfo(episodes, watchMinutes);
            const totalXP    = calcTotalXP();
            const xpLvl      = getLevel(totalXP);
            const xpProg     = getXPProgress(totalXP);

            const avHtml = ratingProfileMediaMarkup(profile, 'rg-stats-avatar-media');

            statsEl.innerHTML = `
                <div class="rg-my-stats">
                    <div class="rg-stats-top">
                        <div class="rg-stats-avatar">${avHtml}</div>
                        <div>
                            <div class="rg-stats-name">${ratingNameMarkup(profile)}</div>
                            <div class="rg-stats-rank-badge" style="background:var(--accent);color:var(--accent-text);">${rankInfo.icon || ''}${rankInfo.label} · Lv.${xpProg.level}</div>
                        </div>
                    </div>
                    <div class="rg-xp-bar-wrap" style="margin:10px 0 4px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                            <span>${totalXP} XP</span><span>Lv.${xpProg.level + 1} за ${xpProg.needed - xpProg.into} XP</span>
                        </div>
                        <div style="height:6px;border-radius:3px;background:var(--border,rgba(128,128,128,.2));overflow:hidden;">
                            <div style="height:100%;width:${xpProg.pct}%;background:var(--accent);border-radius:3px;transition:width .3s;"></div>
                        </div>
                    </div>
                    <div class="rg-stats-grid">
                        <div class="rg-stat-cell"><div class="rg-stat-val">${episodes}</div><div class="rg-stat-label">Серій</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${watchMinutes}</div><div class="rg-stat-label">Хвилин</div></div>
                                            </div>
                    <div class="rg-xp-rules">XP: 25 за серію · 1 за хвилину · 15 за закладку</div>
                </div>`;

        }

        let _lbSortKey = 'xp';
        let _lbUsersCache = [];

        const TOP_BADGES = Object.freeze({ p1: './app/assets/rating/top-1.png', p2: './app/assets/rating/top-2.png', p3: './app/assets/rating/top-3.png' });
        const LB_SORT_CONFIG = {
            xp:        { unit: 'XP',    getVal: u => u.xp },
            episodes:  { unit: 'сер.',  getVal: u => u.episodes },
            minutes:   { unit: 'хв',    getVal: u => u.minutes },
            bookmarks: { unit: 'зак.',  getVal: u => u.bookmarks }
        };

        async function loadLeaderboard() {
            const lb = document.getElementById('rgLeaderboard');
            if (!lb) return;

            const spinner = `<div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
            lb.className = '';
            lb.innerHTML = spinner;

            const showFallback = (msg) => {
                const profile = getProfile();
                const xp = calcTotalXP();
                const lv = getLevel(xp);
                const av = ratingProfileMediaMarkup(profile, 'rg-lb-avatar-media');
                lb.innerHTML = `
                    <div class="rg-lb-list">
                        <div class="rg-lb-item is-me">
                            <div class="rg-lb-num" style="color:var(--accent);font-weight:800;">#1</div>
                            <div class="rg-lb-avatar">${av}</div>
                            <div class="rg-lb-info">
                                <div class="rg-lb-name">${ratingNameMarkup(profile, '<span class="rg-you-badge">YOU</span>')}</div>
                                <div class="rg-lb-rank">Lv.${lv}</div>
                            </div>
                            <div class="rg-lb-score">${xp} <span class="unit">XP</span></div>
                        </div>
                    </div>
                    <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px;">${msg}</p>`;
            };

            // Чекаємо ініціалізацію Firebase (до 6 сек), не блокуючи інший код
            let waited = 0;
            while ((!firebaseInitialized || !db) && waited < 6000) {
                await new Promise(res => setTimeout(res, 250));
                waited += 250;
            }

            if (!firebaseInitialized || !db) {
                showFallback('Firebase недоступний. Перевірте з\'єднання.');
                return;
            }
            // КРИТИЧНО: чекаємо поки Firebase РЕАЛЬНО визначить сесію (_authResolved),
            // інакше вже залогінений через Google юзер на мить виглядає як "не автентифікований"
            // (onAuthStateChanged ще не встиг відпрацювати) і потрапляє у гостьову гілку нижче.
            waited = 0;
            while (!Auth._authResolved && waited < 4000) {
                await new Promise(res => setTimeout(res, 150));
                waited += 150;
            }
            // Гостям (справді неавторизованим) намагаємось видати анонімний Firebase-сеанс,
            // щоб рейтинг був доступний без входу
            if (!Auth.isAuthenticated()) {
                try {
                    await signInAnonymously(auth);
                } catch (e) {
                    console.warn('Anonymous sign-in failed:', e.code);
                    showFallback('Глобальний рейтинг тимчасово доступний лише для авторизованих. Увійдіть через Google.');
                    return;
                }
            }

            try {
                const { collection, query, limit, getDocs, onSnapshot } =
                    await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                // Без orderBy — не потребує Firestore composite index. Сортуємо на клієнті.
                const q = query(collection(db, 'users'), limit(500));
                const tp = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000));
                const snap = await Promise.race([getDocs(q), tp]);

                const thisUid = Auth.isAuthenticated() ? Auth._user?.uid : null;
                const mapUsers = (snapshot) => {
                    let arr = [];
                    snapshot.forEach(d => {
                        const data = d.data();
                        arr.push({
                            uid: d.id,
                            realName: data.profile?.realName || '',
                            name: data.profile?.name || data.profile?.fullName || data.displayName || data.name || '',
                            fullName: data.profile?.fullName || '',
                            nickname: data.profile?.nickname || 'Аніматор',
                            avatar: data.profile?.avatar || '',
                            avatarVideo: data.profile?.avatarVideo || '',
                            avatarVideoSettings: data.profile?.avatarVideoSettings || {},
                            // Поки Firebase snapshot доганяє локальний запис, не показуємо власну стару наліпку.
                            stickers: (thisUid && d.id === thisUid) ? Storage.getStickers() : (data.stickers || {}),
                            episodes: Array.isArray(data.history) ? data.history.length : 0,
                            minutes: Math.floor((data.watchTime || 0) / 60),
                            bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
                            xp: calculateBaseXP({ episodes: Array.isArray(data.history) ? data.history.length : 0, watchSeconds: data.watchTime || 0, bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }),
                            level: getLevel(calculateBaseXP({ episodes: Array.isArray(data.history) ? data.history.length : 0, watchSeconds: data.watchTime || 0, bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }))
                        });
                    });
                    return arr;
                };

                let users = mapUsers(snap);
                if (!users.length) {
                    showFallback('Рейтинг з\'явиться після реєстрації користувачів.');
                    return;
                }
                _lbUsersCache = users;
                renderLeaderboard(lb, users, _lbSortKey);

                if (window._lbUnsub) { window._lbUnsub(); window._lbUnsub = null; }
                window._lbUnsub = onSnapshot(q, (snap2) => {
                    const u = mapUsers(snap2);
                    if (u.length) {
                        _lbUsersCache = u;
                        renderLeaderboard(lb, u, _lbSortKey);
                    }
                }, (err) => console.warn('LB snapshot error:', err));

            } catch(e) {
                console.warn('loadLeaderboard error:', e.message);
                showFallback('Помилка завантаження: ' + e.message);
            }
        }

        function renderLeaderboard(lb, users, sortKey) {
            sortKey = sortKey || _lbSortKey || 'xp';
            const cfg = LB_SORT_CONFIG[sortKey] || LB_SORT_CONFIG.xp;
            const sorted = [...users].sort((a, b) => cfg.getVal(b) - cfg.getVal(a));

            const myUid = Auth.isAuthenticated() ? Auth._user?.uid : null;
            let html = '';

            if (sorted.length >= 3) {
                const order  = [sorted[1], sorted[0], sorted[2]];
                const cls    = ['p2', 'p1', 'p3'];
                html += '<div class="rg-podium">';
                order.forEach((u, i) => {
                    const av = ratingProfileMediaMarkup(u, 'rg-podium-avatar-media');
                    const podiumProfileAttrs = u.uid ? ` data-profile-uid="${escapeRatingHtml(u.uid)}" role="link" tabindex="0" title="Відкрити профіль"` : '';
                    html += `<div class="rg-podium-item ${cls[i]}"${podiumProfileAttrs} style="animation-delay:${i*0.08}s">
                        <img class="rg-podium-badge" src="${TOP_BADGES[cls[i]]}" alt="" aria-hidden="true" loading="lazy">
                        <div class="rg-podium-avatar">${av}</div>
                        <div class="rg-podium-name">${ratingNameMarkup(u)}</div>
                        <div class="rg-podium-score">${cfg.getVal(u)} ${cfg.unit}</div>
                        <div class="rg-podium-bar"></div>
                    </div>`;
                });
                html += '</div>';
            }

            html += '<div class="rg-lb-list">';
            sorted.slice(3).forEach((u, i) => {
                const isMe = u.uid === myUid;
                const av   = ratingProfileMediaMarkup(u, 'rg-lb-avatar-media');
                const ri   = getUserRankInfo(u.episodes, u.minutes);
                const listProfileAttrs = u.uid ? ` data-profile-uid="${escapeRatingHtml(u.uid)}" role="link" tabindex="0" title="Відкрити профіль"` : '';
                html += `<div class="rg-lb-item ${isMe ? 'is-me' : ''}"${listProfileAttrs} style="animation-delay:${Math.min(i*0.02, 0.4)}s">
                    <div class="rg-lb-num">${i + 4}</div>
                    <div class="rg-lb-avatar">${av}</div>
                    <div class="rg-lb-info">
                        <div class="rg-lb-name">${ratingNameMarkup(u, isMe ? '<span class="rg-you-badge">YOU</span>' : '')}</div>
                        <div class="rg-lb-rank" style="color:${ri.color}">Lv.${u.level} · ${ri.label}</div>
                    </div>
                    <div class="rg-lb-score">${cfg.getVal(u)} <span class="unit">${cfg.unit}</span></div>
                </div>`;
            });
            html += '</div>';
            lb.className = '';
            lb.innerHTML = html;
            lb.querySelectorAll('[data-profile-uid]').forEach(card => {
                const openProfile = () => Router.goTo('profile', { uid: card.dataset.profileUid });
                card.addEventListener('click', openProfile);
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openProfile(); }
                });
            });
        }

        export async function loadRatingPage() { initRatingPage(); }
        export async function loadRatingList() { initRatingPage(); }
