// ===== DAILY STATS / TASKS =====
// Оригінальні рядки: L7857-L8018

import { Storage } from '../storage/storage.js';

        // ====================================================================
        //  DAILY STATS / TASKS TRACKING
        // ====================================================================
export function _todayStr() {
            const d = new Date();
            return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
        }
export function _loadDailyState() {
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
export function _saveDailyState(st) {
            localStorage.setItem('vakdab_daily_state', JSON.stringify(st));
        }
export function _getTotalCounter(key) {
            try { return parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; }
        }
export function _incTotalCounter(key, by = 1) {
            const v = _getTotalCounter(key) + by;
            try { localStorage.setItem(key, String(v)); } catch {}
            return v;
        }
        const DailyStats = {
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
                    if (window.Auth?.isAuthenticated()) window.Auth?.syncUserData().catch(() => {});
                    showToast(`Завдання виконано! +${xpGain} XP`);
                    if (document.getElementById('rgDailyTasks')) _renderDailyTasks();
                    if (window.Router?.currentRoute === 'rating') loadMyStats();
                }
            }
        };

export function _renderDailyTasks() {
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

        const ACHIEVEMENTS = [
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
            { id: 'h1', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Перша година', req: '1 год', need: 3600, field: 'watchTime' },
            { id: 'h5', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '5 годин', req: '5 год', need: 18000, field: 'watchTime' },
            { id: 'h10', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '10 годин', req: '10 год', need: 36000, field: 'watchTime' },
            { id: 'h24', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Цілодобово', req: '24 год', need: 86400, field: 'watchTime' },
            { id: 'h50', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '50 годин', req: '50 год', need: 180000, field: 'watchTime' },
            { id: 'h100', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '100 годин', req: '100 год', need: 360000, field: 'watchTime' },
            { id: 'h200', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '200 годин', req: '200 год', need: 720000, field: 'watchTime' },
            { id: 'h500', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '500 годин', req: '500 год', need: 1800000, field: 'watchTime' },
            { id: 'h1000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: '1000 годин', req: '1000 год', need: 3600000, field: 'watchTime' },
            { id: 'h2000', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', name: 'Володар часу', req: '2000 год', need: 7200000, field: 'watchTime' },
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

