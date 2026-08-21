import { Auth } from '../../core/compat/auth.js?v=20260821-filter-cards-v4';
import { Router } from '../../core/compat/router.js?v=20260821-filter-cards-v4';
import { Storage } from '../../core/compat/storage.js?v=20260821-filter-cards-v4';
import { db, auth, initialized as firebaseInitialized } from '../../services/firebase/client.js';
import { collection, limit, onSnapshot, query, signInAnonymously } from '../../config/firebase.js';

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

function ratingNameMarkup(profile, suffix = '') {
    return `<span class="rg-profile-name-row"><span>${escapeRatingHtml(profile.nickname || 'Гість')}</span>${suffix}</span>`;
}

function getProfile() {
    const profile = Storage.getProfile() || {};
    return {
        nickname: typeof profile.nickname === 'string' && profile.nickname.trim() ? profile.nickname.trim() : 'Гість',
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
        function _getDailyXPBonus() {
            try { return parseInt(localStorage.getItem('vakdab_daily_xp_total') || '0', 10) || 0; }
            catch { return 0; }
        }
        function _addDailyXPBonus(amount) {
            const cur = _getDailyXPBonus();
            const next = cur + amount;
            try { localStorage.setItem('vakdab_daily_xp_total', String(next)); } catch {}
            return next;
        }
        const XP_RULES = Object.freeze({ episode: 25, minute: 1, bookmark: 15, achievement: 75 });
        export function calculateBaseXP({ episodes = 0, watchSeconds = 0, bookmarks = 0, posts = 0, ratings = 0 } = {}) {
            const safeEpisodes = Math.max(0, Math.floor(Number(episodes) || 0));
            const watchMinutes = Math.max(0, Math.floor((Number(watchSeconds) || 0) / 60));
            const safeBookmarks = Math.max(0, Math.floor(Number(bookmarks) || 0));
            const safePosts = Math.max(0, Math.floor(Number(posts) || 0));
            const safeRatings = Math.max(0, Math.floor(Number(ratings) || 0));
            const baseXP = safeEpisodes * XP_RULES.episode + watchMinutes * XP_RULES.minute + safeBookmarks * XP_RULES.bookmark;
            let totalXP = baseXP;
            for (let pass = 0; pass < ACHIEVEMENTS.length + 2; pass++) {
                const achStats = { episodes: safeEpisodes, watchMinutes, bookmarks: safeBookmarks, xp: totalXP, level: getLevel(totalXP), posts: safePosts, ratings: safeRatings };
                const earnedCount = ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).length;
                const nextXP = baseXP + earnedCount * XP_RULES.achievement;
                if (nextXP === totalXP) break;
                totalXP = nextXP;
            }
            return totalXP;
        }
        export function calcTotalXP() {
            const history = Storage.getHistory() || [];
            const bookmarks = Storage.getBookmarks() || [];
            return calculateBaseXP({ episodes: history.length, watchSeconds: Storage.getWatchTime() || 0, bookmarks: bookmarks.length, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() }) + _getDailyXPBonus();
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

        const DAILY_TASK_POOL = [
            { id: 'dt1', field: 'episodesToday', target: 1, xp: 35, desc: 'Перегляньте 1 серію сьогодні' },
            { id: 'dt2', field: 'episodesToday', target: 2, xp: 50, desc: 'Подивіться 2 серії за день' },
            { id: 'dt3', field: 'episodesToday', target: 3, xp: 65, desc: 'Перегляньте 3 серії аніме' },
            { id: 'dt4', field: 'episodesToday', target: 4, xp: 80, desc: 'Марафон: 4 серії' },
            { id: 'dt5', field: 'episodesToday', target: 5, xp: 95, desc: 'Погляньте 5 серій' },
            { id: 'dt6', field: 'episodesToday', target: 6, xp: 110, desc: 'Продовжте перегляд: 6 серії' },
            { id: 'dt7', field: 'episodesToday', target: 7, xp: 125, desc: 'Наздожени тиждень: 7 серій' },
            { id: 'dt8', field: 'episodesToday', target: 8, xp: 140, desc: 'Занурся в аніме: 8 серій' },
            { id: 'dt9', field: 'episodesToday', target: 10, xp: 170, desc: 'Подвійна серія: 10 серії' },
            { id: 'dt10', field: 'episodesToday', target: 12, xp: 200, desc: 'Марафонець: 12 серій' },
            { id: 'dt11', field: 'episodesToday', target: 15, xp: 245, desc: 'Легенда дня: 15 серій' },
            { id: 'dt12', field: 'minutesToday', target: 10, xp: 23, desc: 'Дивіться аніме 10 хвилин' },
            { id: 'dt13', field: 'minutesToday', target: 15, xp: 27, desc: 'Проведіть за переглядом 15 хв' },
            { id: 'dt14', field: 'minutesToday', target: 20, xp: 31, desc: 'Насолоджуйтесь переглядом 20 хвилин' },
            { id: 'dt15', field: 'minutesToday', target: 30, xp: 39, desc: 'Півгодини аніме: 30 хв' },
            { id: 'dt16', field: 'minutesToday', target: 45, xp: 51, desc: 'Занурся на 45 хвилин' },
            { id: 'dt17', field: 'minutesToday', target: 60, xp: 63, desc: 'Годинка аніме: 60 хвилин' },
            { id: 'dt18', field: 'minutesToday', target: 75, xp: 75, desc: 'Довгий перегляд: 75 хвилин' },
            { id: 'dt19', field: 'minutesToday', target: 90, xp: 87, desc: 'Вечір аніме: 90 хвилин' },
            { id: 'dt20', field: 'minutesToday', target: 120, xp: 111, desc: 'Марафон часу: 120 хвилин' },
            { id: 'dt21', field: 'minutesToday', target: 150, xp: 135, desc: 'Справжній фанат: 150 хвилин' },
            { id: 'dt22', field: 'minutesToday', target: 180, xp: 159, desc: 'Аніме-день: 180 хвилин' },
            { id: 'dt23', field: 'bookmarksToday', target: 1, xp: 25, desc: 'Додайте 1 аніме в закладки' },
            { id: 'dt24', field: 'bookmarksToday', target: 2, xp: 35, desc: 'Збережіть 2 тайтли на потім' },
            { id: 'dt25', field: 'bookmarksToday', target: 3, xp: 45, desc: 'Поповніть закладки: 3 аніме' },
            { id: 'dt26', field: 'bookmarksToday', target: 4, xp: 55, desc: 'Знайдіть і збережіть 4 аніме' },
            { id: 'dt27', field: 'bookmarksToday', target: 5, xp: 65, desc: 'Складіть список: 5 закладок' },
            { id: 'dt28', field: 'bookmarksToday', target: 6, xp: 75, desc: 'Розширте бібліотеку: 6 закладок' },
            { id: 'dt29', field: 'bookmarksToday', target: 8, xp: 95, desc: 'Плануй перегляд: 8 закладок' },
            { id: 'dt30', field: 'bookmarksToday', target: 10, xp: 115, desc: 'Колекціонер: 10 закладок' },
            { id: 'dt31', field: 'postsToday', target: 1, xp: 32, desc: 'Напишіть 1 повідомлення в спільноті' },
            { id: 'dt32', field: 'postsToday', target: 2, xp: 44, desc: 'Поділіться думкою 2 раз(и)' },
            { id: 'dt33', field: 'postsToday', target: 3, xp: 56, desc: 'Будьте активні: 3 пост(и)' },
            { id: 'dt34', field: 'postsToday', target: 4, xp: 68, desc: 'Спілкуйтесь: 4 повідомлення' },
            { id: 'dt35', field: 'postsToday', target: 5, xp: 80, desc: 'Розкажіть про аніме: 5 пост(и)' },
            { id: 'dt36', field: 'postsToday', target: 6, xp: 92, desc: 'Станьте частиною спільноти: 6 пост(и)' },
            { id: 'dt37', field: 'postsToday', target: 8, xp: 116, desc: 'Голос спільноти: 8 повідомлення' },
            { id: 'dt38', field: 'postsToday', target: 10, xp: 140, desc: 'Активіст дня: 10 пост(и)' },
            { id: 'dt39', field: 'likesToday', target: 1, xp: 20, desc: 'Оцініть 1 аніме' },
            { id: 'dt40', field: 'likesToday', target: 2, xp: 28, desc: 'Постав лайк 2 тайтлам' },
            { id: 'dt41', field: 'likesToday', target: 3, xp: 36, desc: 'Поділись враженням: 3 оцінки' },
            { id: 'dt42', field: 'likesToday', target: 4, xp: 44, desc: 'Оціни перегляди: 4 аніме' },
            { id: 'dt43', field: 'likesToday', target: 5, xp: 52, desc: 'Критик дня: 5 оцінки' },
            { id: 'dt44', field: 'likesToday', target: 6, xp: 60, desc: 'Твоя думка важлива: 6 оцінки' },
            { id: 'dt45', field: 'likesToday', target: 8, xp: 76, desc: 'Рейтинг спільноти: 8 оцінки' },
            { id: 'dt46', field: 'likesToday', target: 10, xp: 92, desc: 'Знавець аніме: 10 оцінок' },
            { id: 'dt47', field: 'searchesToday', target: 1, xp: 17, desc: 'Знайдіть 1 аніме через пошук' },
            { id: 'dt48', field: 'searchesToday', target: 2, xp: 24, desc: 'Скористайтесь пошуком 2 раз(и)' },
            { id: 'dt49', field: 'searchesToday', target: 3, xp: 31, desc: 'Досліджуй каталог: 3 пошуки' },
            { id: 'dt50', field: 'searchesToday', target: 4, xp: 38, desc: 'Шукай нове: 4 запити' },
            { id: 'dt51', field: 'searchesToday', target: 5, xp: 45, desc: 'Знайди перлину: 5 пошуки' },
            { id: 'dt52', field: 'searchesToday', target: 6, xp: 52, desc: 'Розширюй горизонти: 6 пошуків' },
            { id: 'dt53', field: 'searchesToday', target: 8, xp: 66, desc: 'Дослідник дня: 8 пошуків' },
            { id: 'dt54', field: 'searchesToday', target: 10, xp: 80, desc: 'Мисливець за аніме: 10 пошуків' },
            { id: 'dt55', field: 'uniqueAnimeToday', target: 1, xp: 32, desc: 'Відкрийте 1 різних аніме' },
            { id: 'dt56', field: 'uniqueAnimeToday', target: 2, xp: 44, desc: 'Погляньте на 2 нових тайтли' },
            { id: 'dt57', field: 'uniqueAnimeToday', target: 3, xp: 56, desc: 'Дослідіть 3 різних аніме' },
            { id: 'dt58', field: 'uniqueAnimeToday', target: 4, xp: 68, desc: 'Спробуйте 4 нові тайтли' },
            { id: 'dt59', field: 'uniqueAnimeToday', target: 5, xp: 80, desc: 'Розширте кругозір: 5 аніме' },
            { id: 'dt60', field: 'uniqueAnimeToday', target: 6, xp: 92, desc: 'Різноманітність: 6 тайтли' },
            { id: 'dt61', field: 'uniqueAnimeToday', target: 8, xp: 116, desc: 'Гурман аніме: 8 тайтлів' },
            { id: 'dt62', field: 'uniqueAnimeToday', target: 10, xp: 140, desc: 'Колекція вражень: 10 тайтлів' },
            { id: 'dt63', field: 'uniqueAnimeToday', target: 15, xp: 200, desc: 'Всеїдний глядач: 15 тайтлів' },
            { id: 'dt64', field: 'loginToday', target: 1, xp: 10, desc: 'Заходь у застосунок сьогодні' },
            { id: 'dt65', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії' },
            { id: 'dt66', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій' },
            { id: 'dt67', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин' },
            { id: 'dt68', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв' },
            { id: 'dt69', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок' },
            { id: 'dt70', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень' },
            { id: 'dt71', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок' },
            { id: 'dt72', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків' },
            { id: 'dt73', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів' },
            { id: 'dt74', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії' },
            { id: 'dt75', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #2' },
            { id: 'dt76', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #2' },
            { id: 'dt77', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #2' },
            { id: 'dt78', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #2' },
            { id: 'dt79', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #2' },
            { id: 'dt80', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #2' },
            { id: 'dt81', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #2' },
            { id: 'dt82', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #2' },
            { id: 'dt83', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #2' },
            { id: 'dt84', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #2' },
            { id: 'dt85', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #3' },
            { id: 'dt86', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #3' },
            { id: 'dt87', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #3' },
            { id: 'dt88', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #3' },
            { id: 'dt89', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #3' },
            { id: 'dt90', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #3' },
            { id: 'dt91', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #3' },
            { id: 'dt92', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #3' },
            { id: 'dt93', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #3' },
            { id: 'dt94', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #3' },
            { id: 'dt95', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #4' },
            { id: 'dt96', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #4' },
            { id: 'dt97', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #4' },
            { id: 'dt98', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #4' },
            { id: 'dt99', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #4' },
            { id: 'dt100', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #4' },
            { id: 'dt101', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #4' },
        ];

        // ====================================================================
        //  DAILY STATS / TASKS TRACKING
        // ====================================================================
        function _todayStr() {
            const d = new Date();
            return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        }
        function _loadDailyState() {
            let st;
            try { st = JSON.parse(localStorage.getItem('vakdab_daily_state') || 'null'); } catch { st = null; }
            const today = _todayStr();
            if (!st || st.date !== today) {
                // Новий день — новий випадковий набір з 10 завдань, стата обнуляється
                const pool = [...DAILY_TASK_POOL];
                for (let i = pool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [pool[i], pool[j]] = [pool[j], pool[i]];
                }
                st = {
                    date: today,
                    taskIds: pool.slice(0, 10).map(t => t.id),
                    stats: { episodesToday: 0, minutesToday: 0, bookmarksToday: 0, postsToday: 0, likesToday: 0, searchesToday: 0, uniqueAnime: [] },
                    completed: []
                };
                localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
            }
            return st;
        }
        function _saveDailyState(st) {
            localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
        }
        function _getTotalCounter(key) {
            try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
        }
        function _incTotalCounter(key, by = 1) {
            const v = _getTotalCounter(key) + by;
            try { localStorage.setItem(key, String(v)); } catch {}
            return v;
        }
        export const DailyStats = {
            increment(field, amount = 1) {
                const st = _loadDailyState();
                st.stats[field] = (st.stats[field] || 0) + amount;
                _saveDailyState(st);
                this._checkCompletion(st);
            },
            addUniqueAnime(animeUrl) {
                if (!animeUrl) return;
                const st = _loadDailyState();
                if (!Array.isArray(st.stats.uniqueAnime)) st.stats.uniqueAnime = [];
                if (!st.stats.uniqueAnime.includes(animeUrl)) st.stats.uniqueAnime.push(animeUrl);
                st.stats.uniqueAnimeToday = st.stats.uniqueAnime.length;
                _saveDailyState(st);
                this._checkCompletion(st);
            },
            getTotalPosts() { return _getTotalCounter('vakdab_total_posts'); },
            addTotalPost() { return _incTotalCounter('vakdab_total_posts'); },
            getTotalRatings() { return _getTotalCounter('vakdab_total_ratings'); },
            addTotalRating() { return _incTotalCounter('vakdab_total_ratings'); },
            _checkCompletion(st) {
                let earned = 0, xpGain = 0;
                DAILY_TASK_POOL.forEach(t => {
                    if (!st.taskIds.includes(t.id)) return;
                    if (st.completed.includes(t.id)) return;
                    const val = st.stats[t.field] || 0;
                    if (val >= t.target) {
                        st.completed.push(t.id);
                        xpGain += t.xp;
                        earned++;
                    }
                });
                if (earned > 0) {
                    _saveDailyState(st);
                    _addDailyXPBonus(xpGain);
                    if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                    showToast(`Завдання виконано! +${xpGain} XP`);
                    if (document.getElementById('rgDailyTasks')) _renderDailyTasks();
                    if (Router.currentRoute === 'rating') loadMyStats();
                }
            }
        };

        function _renderDailyTasks() {
            const el = document.getElementById('rgDailyTasks');
            if (!el) return;
            const st = _loadDailyState();
            const tasks = DAILY_TASK_POOL.filter(t => st.taskIds.includes(t.id));
            const rows = tasks.map(t => {
                const val  = st.stats[t.field] || 0;
                const done = st.completed.includes(t.id);
                const pct  = Math.min(100, Math.round((val / t.target) * 100));
                return `<div class="dt-item ${done ? 'done' : ''}">
                    <div class="dt-check">${done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
                    <div class="dt-body">
                        <div class="dt-desc">${t.desc}</div>
                        <div class="dt-bar-wrap"><div class="dt-bar" style="width:${pct}%"></div></div>
                        <div class="dt-meta"><span>${Math.min(val, t.target)}/${t.target}</span><span class="dt-xp">+${t.xp} XP</span></div>
                    </div>
                </div>`;
            }).join('');
            const doneCount = tasks.filter(t => st.completed.includes(t.id)).length;
            el.innerHTML = `
                <div class="rg-daily-wrap">
                    <div class="rg-daily-header">
                        <span>Щоденні завдання</span>
                        <span class="rg-daily-count">${doneCount}/${tasks.length}</span>
                    </div>
                    <div class="dt-list">${rows}</div>
                </div>`;
        }

        export const ACHIEVEMENTS = [
            { id: 'ep1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Перший перегляд', req: '1 сер.', need: 1, field: 'episodes' },
            { id: 'ep5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Розігрів', req: '5 сер.', need: 5, field: 'episodes' },
            { id: 'ep10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '10 серій', req: '10 сер.', need: 10, field: 'episodes' },
            { id: 'ep25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Уже втягнувся', req: '25 сер.', need: 25, field: 'episodes' },
            { id: 'ep50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '50 серій', req: '50 сер.', need: 50, field: 'episodes' },
            { id: 'ep100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '100 серій', req: '100 сер.', need: 100, field: 'episodes' },
            { id: 'ep250', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Справжній фанат', req: '250 сер.', need: 250, field: 'episodes' },
            { id: 'ep500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: '500 серій', req: '500 сер.', need: 500, field: 'episodes' },
            { id: 'ep1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Легенда серій', req: '1000 сер.', need: 1000, field: 'episodes' },
            { id: 'ep2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', name: 'Аніме-безсмертний', req: '2000 сер.', need: 2000, field: 'episodes' },
            { id: 'h1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Перша хвилина', req: '1 хв', need: 1, field: 'watchMinutes' },
            { id: 'h5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '5 хвилин', req: '5 хв', need: 5, field: 'watchMinutes' },
            { id: 'h10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '10 хвилин', req: '10 хв', need: 10, field: 'watchMinutes' },
            { id: 'h24', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '24 хвилини', req: '24 хв', need: 24, field: 'watchMinutes' },
            { id: 'h50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '50 хвилин', req: '50 хв', need: 50, field: 'watchMinutes' },
            { id: 'h100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '100 хвилин', req: '100 хв', need: 100, field: 'watchMinutes' },
            { id: 'h200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '200 хвилин', req: '200 хв', need: 200, field: 'watchMinutes' },
            { id: 'h500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '500 хвилин', req: '500 хв', need: 500, field: 'watchMinutes' },
            { id: 'h1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '1000 хвилин', req: '1000 хв', need: 1000, field: 'watchMinutes' },
            { id: 'h2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Володар часу', req: '2000 хв', need: 2000, field: 'watchMinutes' },
            { id: 'bm1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Перша закладка', req: '1 зак.', need: 1, field: 'bookmarks' },
            { id: 'bm5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '5 закладок', req: '5 зак.', need: 5, field: 'bookmarks' },
            { id: 'bm10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '10 закладок', req: '10 зак.', need: 10, field: 'bookmarks' },
            { id: 'bm20', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '20 закладок', req: '20 зак.', need: 20, field: 'bookmarks' },
            { id: 'bm50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: '50 закладок', req: '50 зак.', need: 50, field: 'bookmarks' },
            { id: 'bm100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Колекціонер', req: '100 зак.', need: 100, field: 'bookmarks' },
            { id: 'bm200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>', name: 'Бібліотекар аніме', req: '200 зак.', need: 200, field: 'bookmarks' },
            { id: 'xp100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Перші кроки', req: '100 XP', need: 100, field: 'xp' },
            { id: 'xp500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Досвідчений', req: '500 XP', need: 500, field: 'xp' },
            { id: 'xp1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Про', req: '1000 XP', need: 1000, field: 'xp' },
            { id: 'xp2500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Майстер XP', req: '2500 XP', need: 2500, field: 'xp' },
            { id: 'xp5000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Елітний гравець', req: '5000 XP', need: 5000, field: 'xp' },
            { id: 'xp10000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>', name: 'Легенда платформи', req: '10000 XP', need: 10000, field: 'xp' },
            { id: 'lvl5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '5 рівень', req: 'Lv.5', need: 5, field: 'level' },
            { id: 'lvl10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '10 рівень', req: 'Lv.10', need: 10, field: 'level' },
            { id: 'lvl20', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '20 рівень', req: 'Lv.20', need: 20, field: 'level' },
            { id: 'lvl30', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: '30 рівень', req: 'Lv.30', need: 30, field: 'level' },
            { id: 'lvl50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>', name: 'Максимальний рівень', req: 'Lv.50', need: 50, field: 'level' },
            { id: 'post1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Перший пост', req: '1 пост.', need: 1, field: 'posts' },
            { id: 'post10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Активний учасник', req: '10 пост.', need: 10, field: 'posts' },
            { id: 'post25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Голос спільноти', req: '25 пост.', need: 25, field: 'posts' },
            { id: 'post50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Душа компанії', req: '50 пост.', need: 50, field: 'posts' },
            { id: 'post100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', name: 'Легенда чату', req: '100 пост.', need: 100, field: 'posts' },
            { id: 'like1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Перша оцінка', req: '1 оцін.', need: 1, field: 'ratings' },
            { id: 'like10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Критик', req: '10 оцін.', need: 10, field: 'ratings' },
            { id: 'like25', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Знавець смаку', req: '25 оцін.', need: 25, field: 'ratings' },
            { id: 'like50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Головний рецензент', req: '50 оцін.', need: 50, field: 'ratings' },
            { id: 'like100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>', name: 'Оракул рейтингів', req: '100 оцін.', need: 100, field: 'ratings' },
        ]

        export function getUserRankInfo(episodes, watchMinutes) {
            if (watchMinutes >= 2000) return { label: 'Легенда аніме',  color: 'var(--accent)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>' };
            if (watchMinutes >= 1000) return { label: 'Майстер',        color: 'var(--text)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' };
            if (watchMinutes >= 500)  return { label: 'Ветеран',        color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>' };
            if (watchMinutes >= 200)  return { label: 'Досвідчений',    color: 'var(--text-secondary)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 0v10M4 7v10l8 4"/></svg>' };
            if (watchMinutes >= 60)   return { label: 'Початківець',    color: 'var(--text-muted)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
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
                        Спільнота
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
                        <button class="rg-sort-tab" data-sort="minutes">За хвилинами</button>
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
                        import('../community/legacyCommunity.js?v=20260821-filter-cards-v4')
                            .then(({ initCommunity }) => {
                                initCommunity();
                                setTimeout(() => {
                                    const msgs = document.getElementById('comMessages');
                                    if (msgs) msgs.scrollTop = msgs.scrollHeight;
                                }, 500);
                            })
                            .catch(error => {
                                console.warn('Community initialization failed:', error);
                                const panel = document.getElementById('rgPanelCommunity');
                                if (panel) panel.innerHTML = '<div class="modern-community-empty"><div class="modern-community-empty-icon">✦</div><h3>Спільнота тимчасово недоступна</h3><p>Спробуйте оновити сторінку ще раз.</p></div>';
                            });
                    }
                    if (btn.dataset.panel === 'rating') {
                        document.body.classList.remove('community-active');
                        const nav = document.getElementById('bottomNav');
                        if (nav) nav.classList.remove('hidden-nav');
                        loadMyStats();
                        _renderDailyTasks();
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
            _renderDailyTasks();
            loadLeaderboard();
        }

        function loadMyStats() {
            const statsEl = document.getElementById('rgMyStats');
            const achEl   = document.getElementById('rgAchievements');
            if (!statsEl || !achEl) return;

            const profile    = getProfile();
            const history    = Storage.getHistory()   || [];
            const bookmarks  = Storage.getBookmarks() || [];
            const watchSec   = Storage.getWatchTime() || 0;
            const watchMinutes = Math.floor(watchSec / 60);
            const episodes   = history.length;
            const rankInfo   = getUserRankInfo(episodes, watchMinutes);
            const totalXP    = calcTotalXP();
            const xpLvl      = getLevel(totalXP);
            const achStats   = { episodes, watchMinutes, bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            const earnedIds  = new Set(ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).map(a => a.id));
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
                        <div class="rg-stat-cell"><div class="rg-stat-val">${earnedIds.size}</div><div class="rg-stat-label">Досягнень</div></div>
                    </div>
                    <div class="rg-xp-rules">XP: 25 за серію · 1 за хвилину · 15 за закладку · 75 за досягнення</div>
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

        const TOP_BADGES = Object.freeze({ p1: 'src/assets/rating/top-1.png', p2: 'src/assets/rating/top-2.png', p3: 'src/assets/rating/top-3.png' });
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

                const mapUsers = (snapshot) => {
                    let arr = [];
                    snapshot.forEach(d => {
                        const data = d.data();
                        arr.push({
                            uid: d.id,
                            nickname: data.profile?.nickname || data.profile?.name || 'Аніматор',
                            avatar: data.profile?.avatar || '',
                            avatarVideo: data.profile?.avatarVideo || '',
                            avatarVideoSettings: data.profile?.avatarVideoSettings || {},
                            stickers: data.stickers || {},
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
                        <img class="rg-podium-badge" src="${TOP_BADGES[cls[i]]}" alt="Топ ${cls[i] === 'p1' ? '1' : cls[i] === 'p2' ? '2' : '3'}" loading="lazy">
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
