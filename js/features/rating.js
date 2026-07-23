// ===== RATING / LEADERBOARD =====
// Оригінальні рядки: L8019-L8345

import { auth, db } from '../config/firebase.js';
import { doc, getDoc, setDoc, collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { Storage } from '../storage/storage.js';
import { calcTotalXP, getLevel, getXPProgress } from './xp-system.js';
import { getProfile } from '../pages/profile.js';

export function getUserRankInfo(episodes, watchHours) {
            if (watchHours >= 200) return { label: 'Легенда аніме',  color: 'var(--accent)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>' };
            if (watchHours >= 100) return { label: 'Майстер',        color: 'var(--text)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' };
            if (watchHours >= 50)  return { label: 'Ветеран',        color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>' };
            if (watchHours >= 20)  return { label: 'Досвідчений',    color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 0v10M4 7v10l8 4"/></svg>' };
            if (watchHours >= 5)   return { label: 'Початківець',    color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
            return                        { label: 'Новачок',        color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
        }

export function initRatingPage() {
            const wrap = document.getElementById('ratingPageContainer');
            if (!wrap || wrap.dataset.init) return;
            wrap.dataset.init = '1';

            wrap.innerHTML = `
                <div class="rg-main-tabs" id="rgMainTabs">
                    <button class="rg-main-tab active" data-panel="rating">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        Рейтинг
                    </button>
                    <button class="rg-main-tab" data-panel="community">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Суспільне
                    </button>
                </div>

                <div class="rg-tab-panel active" id="rgPanelRating">
                    <div id="rgMyStats"></div>
                    <div id="rgDailyTasks"></div>
                    <div id="rgAchievements"></div>
                    <div class="rg-lb-title">Глобальний рейтинг</div>
                    <div class="rg-sort-tabs" id="rgSortTabs">
                        <button class="rg-sort-tab active" data-sort="xp">За XP</button>
                        <button class="rg-sort-tab" data-sort="episodes">За серіями</button>
                        <button class="rg-sort-tab" data-sort="hours">За годинами</button>
                        <button class="rg-sort-tab" data-sort="bookmarks">За закладками</button>
                    </div>
                    <div id="rgLeaderboard">
                        <div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>
                    </div>
                </div>

                <div class="rg-tab-panel" id="rgPanelCommunity"></div>
            `;

            wrap.querySelectorAll('.rg-main-tab').forEach(btn => {
                btn.addEventListener('click', () => {
                    wrap.querySelectorAll('.rg-main-tab').forEach(b => b.classList.remove('active'));
                    wrap.querySelectorAll('.rg-tab-panel').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const id = 'rgPanel' + btn.dataset.panel.charAt(0).toUpperCase() + btn.dataset.panel.slice(1);
                    const panel = document.getElementById(id);
                    if (panel) panel.classList.add('active');

                    if (btn.dataset.panel === 'community') {
                        document.body.classList.add('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.add('hidden-nav');
                        window.initCommunity();
                        setTimeout(() => {
                            const msgs = document.getElementById('comMessages');
                            if (msgs) msgs.scrollTop = msgs.scrollHeight;
                        }, 500);
                    }
                    if (btn.dataset.panel === 'rating') {
                        document.body.classList.remove('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.remove('hidden-nav');
                        loadMyStats();
                        window._renderDailyTasks();
                        loadLeaderboard();
                    }
                });
            });

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
            window._renderDailyTasks();
            loadLeaderboard();
        }

export function loadMyStats() {
            const statsEl = document.getElementById('rgMyStats');
            const achEl   = document.getElementById('rgAchievements');
            if (!statsEl || !achEl) return;

            const profile    = getProfile();
            const history    = Storage.getHistory()   || [];
            const bookmarks  = Storage.getBookmarks() || [];
            const watchSec   = Storage.getWatchTime() || 0;
            const watchHours = Math.round(watchSec / 3600 * 10) / 10;
            const episodes   = history.length;
            const rankInfo   = getUserRankInfo(episodes, watchHours);
            const totalXP    = calcTotalXP();
            const xpLvl      = getLevel(totalXP);
            const achStats   = { episodes, watchTime: watchSec, bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            const earnedIds  = new Set(ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).map(a => a.id));
            const xpProg     = getXPProgress(totalXP);

            const avHtml = profile.avatar
                ? `<img src="${profile.avatar}" alt="">`
                : `<span>${(profile.nickname || '?')[0].toUpperCase()}</span>`;

            statsEl.innerHTML = `
                <div class="rg-my-stats">
                    <div class="rg-stats-top">
                        <div class="rg-stats-avatar">${avHtml}</div>
                        <div>
                            <div class="rg-stats-name">${profile.nickname || 'Гість'}</div>
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
                        <div class="rg-stat-cell"><div class="rg-stat-val">${watchHours}</div><div class="rg-stat-label">Годин</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${earnedIds.size}</div><div class="rg-stat-label">Досягнень</div></div>
                    </div>
                </div>`;

            achEl.innerHTML = `
                <div class="rg-achievements">
                    <div class="rg-section-label">Досягнення</div>
                    <div class="rg-ach-scroll">
                        ${ACHIEVEMENTS.map(a => `
                            <div class="rg-ach-item ${earnedIds.has(a.id) ? 'earned' : 'locked'}" title="${a.req}">
                                <span class="rg-ach-icon">${a.icon}</span>
                                <span class="rg-ach-name">${a.name}</span>
                                <span class="rg-ach-req">${a.req}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        let _lbSortKey = 'xp';
        let _lbUsersCache = [];

        const LB_SORT_CONFIG = {
            xp:        { unit: 'XP',    getVal: u => u.xp },
            episodes:  { unit: 'сер.',  getVal: u => u.episodes },
            hours:     { unit: 'год.',  getVal: u => u.hours },
            bookmarks: { unit: 'зак.',  getVal: u => u.bookmarks }
        };

export async function loadLeaderboard() {
            const lb = document.getElementById('rgLeaderboard');
            if (!lb) return;

            const spinner = `<div style="display:flex;justify-content:center;padding:24px;"><svg style="width:22px;height:22px;animation:spin 1s linear infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9"/></svg></div>`;
            lb.className = '';
            lb.innerHTML = spinner;

            const showFallback = (msg) => {
                const profile = getProfile();
                const xp = calcTotalXP();
                const lv = getLevel(xp);
                const av = profile.avatar ? `<img src="${profile.avatar}" alt="">` : `<span>${(profile.nickname||'?')[0].toUpperCase()}</span>`;
                lb.innerHTML = `
                    <div class="rg-lb-list">
                        <div class="rg-lb-item is-me">
                            <div class="rg-lb-num" style="color:var(--accent);font-weight:800;">#1</div>
                            <div class="rg-lb-avatar">${av}</div>
                            <div class="rg-lb-info">
                                <div class="rg-lb-name">${profile.nickname||'Ти'} <span style="font-size:9px;color:var(--accent);font-weight:700;">YOU</span></div>
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
            while (!window.Auth?._authResolved && waited < 4000) {
                await new Promise(res => setTimeout(res, 150));
                waited += 150;
            }
            // Гостям (справді неавторизованим) намагаємось видати анонімний Firebase-сеанс,
            // щоб рейтинг був доступний без входу
            if (!window.Auth?.isAuthenticated()) {
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

                const mapUsers = (snapshot) => {
                    let arr = [];
                    snapshot.forEach(d => {
                        const data = d.data();
                        arr.push({
                            uid: d.id,
                            name: data.profile?.nickname || data.profile?.name || 'Аніматор',
                            avatar: data.profile?.avatar || '',
                            episodes: Array.isArray(data.history) ? data.history.length : 0,
                            hours: Math.round((data.watchTime || 0) / 3600 * 10) / 10,
                            bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
                            xp: data.xp || 0,
                            level: data.level || getLevel(data.xp || 0)
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

export function renderLeaderboard(lb, users, sortKey) {
            sortKey = sortKey || _lbSortKey || 'xp';
            const cfg = LB_SORT_CONFIG[sortKey] || LB_SORT_CONFIG.xp;
            const sorted = [...users].sort((a, b) => cfg.getVal(b) - cfg.getVal(a));

            const myUid = window.Auth?.isAuthenticated() ? window.Auth?._user?.uid : null;
            let html = '';

            if (sorted.length >= 3) {
                const order  = [sorted[1], sorted[0], sorted[2]];
                const cls    = ['p2', 'p1', 'p3'];
                const crowns = ['\ud83e\udd48', '\ud83d\udc51', '\ud83e\udd49'];
                html += '<div class="rg-podium">';
                order.forEach((u, i) => {
                    const av = u.avatar ? `<img src="${u.avatar}" alt="">` : `<span>${u.name[0].toUpperCase()}</span>`;
                    html += `<div class="rg-podium-item ${cls[i]}" style="animation-delay:${i*0.08}s">
                        <div class="rg-podium-crown">${crowns[i]}</div>
                        <div class="rg-podium-avatar">${av}</div>
                        <div class="rg-podium-name">${u.name}</div>
                        <div class="rg-podium-score">${cfg.getVal(u)} ${cfg.unit}</div>
                        <div class="rg-podium-bar"></div>
                    </div>`;
                });
                html += '</div>';
            }

            html += '<div class="rg-lb-list">';
            sorted.slice(3).forEach((u, i) => {
                const isMe = u.uid === myUid;
                const av   = u.avatar ? `<img src="${u.avatar}" alt="">` : `<span>${u.name[0].toUpperCase()}</span>`;
                const ri   = getUserRankInfo(u.episodes, u.hours);
                html += `<div class="rg-lb-item ${isMe ? 'is-me' : ''}" style="animation-delay:${Math.min(i*0.02, 0.4)}s">
                    <div class="rg-lb-num">${i + 4}</div>
                    <div class="rg-lb-avatar">${av}</div>
                    <div class="rg-lb-info">
                        <div class="rg-lb-name">${u.name}${isMe ? ' <span style="font-size:9px;color:var(--accent);font-weight:700;">YOU</span>' : ''}</div>
                        <div class="rg-lb-rank" style="color:${ri.color}">Lv.${u.level} · ${ri.label}</div>
                    </div>
                    <div class="rg-lb-score">${cfg.getVal(u)} <span class="unit">${cfg.unit}</span></div>
                </div>`;
            });
            html += '</div>';
            lb.className = '';
            lb.innerHTML = html;
        }

        // ─────────────────────────────────────────────────
        //  Community Chat (Telegram-style)
        // ─────────────────────────────────────────────────
        let comUnsub = null;
        let comPostType = 'text';
        let comFilterType = 'text';
        let editingMsgId = null;
        let _comMsgsCache = [];
        let replyingTo = null;
        let _refreshComposeExtra = null;


export async function loadRatingPage() { initRatingPage(); }
export async function loadRatingList() { initRatingPage(); }

// Expose to window for cross-module access (circular dep resolution)
window.loadMyStats = loadMyStats;
