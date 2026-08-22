import { openScheduleItemInPlayer } from './homeLegacy.js?v=20260822-catalog-genre-data-v61';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const countdownText = date => { const ms = Math.max(0, new Date(date).getTime() - Date.now()); const total = Math.floor(ms / 1000); const days = Math.floor(total / 86400); const hours = Math.floor((total % 86400) / 3600); const minutes = Math.floor((total % 3600) / 60); return days ? `через ${days} д ${hours} год` : hours ? `через ${hours} год ${minutes} хв` : `через ${minutes} хв`; };

        // ====================================================================
        //  РОЗКЛАД ВИХОДУ (дані з Mikai API)
        // ====================================================================
        const MIKAI_API_BASE = 'https://api.mikai.me/v1';
        const scheduleState = { dayOffset: 0, selectedOffset: 0, cache: {}, sourcePromise: null, loadingOffset: null, weekLoading: false, weekTimer: null };
        const WEEKDAY_SHORT_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const MIKAI_SCHEDULE_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        function scheduleDateForOffset(offset) {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            d.setDate(d.getDate() + offset);
            return d;
        }

        function formatScheduleApiDate(d) {
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
        }

        function formatScheduleDisplayDate(d) {
            const pad = n => String(n).padStart(2, '0');
            return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
        }

        async function fetchScheduleByOffset(offset) {
            if (scheduleState.cache[offset]) return scheduleState.cache[offset];
            if (!scheduleState.sourcePromise) {
                scheduleState.sourcePromise = fetch(`${MIKAI_API_BASE}/schedule`, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache'
                }).then(async resp => {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    const payload = await resp.json();
                    if (payload?.ok === false) throw new Error(payload.error?.message || 'Mikai API error');
                    return payload?.result || payload;
                }).catch(error => {
                    scheduleState.sourcePromise = null;
                    throw error;
                });
            }
            const schedule = await scheduleState.sourcePromise;
            const key = MIKAI_SCHEDULE_DAY_KEYS[scheduleDateForOffset(offset).getDay()];
            const data = Array.isArray(schedule?.[key]) ? schedule[key] : [];
            scheduleState.cache[offset] = data;
            return data;
        }

        function scheduleItemDate(item, offset) {
            const raw = item?.airing || item?.nextEpisodeAt || item?.airDate || item?.releaseDate || item?.releasedAt || item?.dateTime || item?.datetime;
            if (raw) {
                const normalized = String(raw).replace(' ', 'T');
                const d = new Date(normalized);
                if (!Number.isNaN(d.getTime())) return d;
            }
            const time = item?.time || item?.airTime || item?.broadcast?.time || item?.anime?.broadcast?.time;
            if (time && /^\d{1,2}:\d{2}/.test(String(time))) {
                const base = scheduleDateForOffset(offset);
                const [h, m] = String(time).split(':').map(Number);
                base.setHours(h, m, 0, 0);
                return base;
            }
            return null;
        }

        function scheduleCard(item, offset) {
            const a = item?.anime || {};
            const names = a.details?.names || {};
            const posterUid = a.media?.posterUid || '';
            const poster = posterUid ? `https://images.mikai.me/poster/small/${posterUid}.webp` : '';
            const title = names.name || names.nameNative || names.nameEnglish || 'Без назви';
            const titleEn = names.nameEnglish || names.nameNative || '';
            const date = scheduleItemDate(item, offset);
            const dateText = date ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date) : 'Час невідомий';
            const countdown = date && date.getTime() > Date.now() ? `<span class="schedule-countdown" data-time="${date.toISOString()}">${countdownText(date)}</span>` : '';
            return `<article class="schedule-item schedule-week-item" role="button" tabindex="0" aria-label="Відкрити ${escapeHtml(title)}" data-title="${escapeHtml(title)}" data-title-en="${escapeHtml(titleEn)}" data-slug="${escapeHtml(a.slug || '')}">
                <div class="schedule-item__poster"><img src="${escapeHtml(poster)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.style.opacity=0"></div>
                <div class="schedule-item__info"><div class="schedule-item__title">${escapeHtml(title)}</div><div class="schedule-item__ep">${item?.episode ? `Епізод ${escapeHtml(item.episode)}` : 'Наступний епізод'} · ${escapeHtml(dateText)}</div>${countdown}</div><i class="fas fa-chevron-right schedule-item__arrow"></i>
            </article>`;
        }

        async function loadScheduleWeek() {
            const content = document.getElementById('scheduleWeekContent');
            if (!content || scheduleState.weekLoading) return;
            scheduleState.weekLoading = true;
            content.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження розкладу…</div>';
            try {
                const results = await Promise.allSettled(Array.from({ length: 7 }, (_, i) => fetchScheduleByOffset(i)));
                const sections = results.map((result, offset) => {
                    const list = result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
                    const d = scheduleDateForOffset(offset);
                    const day = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' }).format(d);
                    return `<section class="schedule-week-day${offset === 0 ? ' is-today' : ''}" data-schedule-day-offset="${offset}" id="schedule-day-${offset}"><div class="schedule-week-day__title"><strong>${day}</strong><span>${offset === 0 ? 'Сьогодні' : formatScheduleDisplayDate(d)}</span></div><div class="schedule-week-list">${list.length ? list.map(item => scheduleCard(item, offset)).join('') : '<div class="schedule-day-empty">На цей день розкладу немає</div>'}</div></section>`;
                }).join('');
                content.innerHTML = sections || '<div class="loader">На найближчі дні розкладу немає</div>';
                setScheduleDay(scheduleState.selectedOffset);
                content.querySelectorAll('.schedule-week-item').forEach(el => {
                    const open = () => openScheduleItemInPlayer(el.dataset.title, el);
                    el.addEventListener('click', open);
                    el.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
                    });
                });
                if (scheduleState.weekTimer) clearInterval(scheduleState.weekTimer);
                scheduleState.weekTimer = setInterval(() => content.querySelectorAll('.schedule-countdown').forEach(el => { const d = new Date(el.dataset.time); el.textContent = countdownText(d); }), 60000);
            } catch (e) {
                console.error('Помилка завантаження розкладу Mikai:', e);
                const details = e?.message ? ` (${escapeHtml(e.message)})` : '';
                content.innerHTML = `<div class="loader">Не вдалося завантажити розклад${details}. <button class="btn-outline" type="button" onclick="loadScheduleWeek()">Повторити</button></div>`;
            }
            finally { scheduleState.weekLoading = false; }
        }
        function setScheduleDay(offset) {
            const content = document.getElementById('scheduleWeekContent');
            const tabs = document.querySelectorAll('.schedule-day-selector [data-schedule-offset]');
            const nextOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
            scheduleState.selectedOffset = nextOffset;
            content?.querySelectorAll('[data-schedule-day-offset]').forEach(section => {
                section.hidden = Number(section.dataset.scheduleDayOffset) !== nextOffset;
            });
            tabs.forEach(tab => {
                const active = Number(tab.dataset.scheduleOffset) === nextOffset;
                tab.classList.toggle('active', active);
                tab.setAttribute('aria-selected', String(active));
                tab.tabIndex = active ? 0 : -1;
            });
        }

        function renderScheduleDaySelector() {
            const today = new Date().getDay();
            const weekdays = [1, 2, 3, 4, 5, 6, 0];
            return `<nav class="schedule-day-selector" aria-label="Вибір дня розкладу" role="tablist">${weekdays.map(weekday => {
                const offset = (weekday - today + 7) % 7;
                const active = offset === 0;
                return `<button class="schedule-day-tab${active ? ' active' : ''}" type="button" role="tab" aria-selected="${active}" tabindex="${active ? '0' : '-1'}" aria-controls="schedule-day-${offset}" data-schedule-offset="${offset}"><span>${WEEKDAY_SHORT_UA[weekday]}</span></button>`;
            }).join('')}</nav>`;
        }

        window.loadScheduleWeek = loadScheduleWeek;

        export function renderSchedulePage() {
            const container = document.getElementById('schedulePageContainer');
            if (!container) return;
            container.innerHTML = `
                <section class="schedule-page-hero" aria-labelledby="schedulePageTitle">
                    <div class="schedule-page-hero__ambient" aria-hidden="true"></div>
                    <div class="schedule-page-hero__copy">
                        <span class="schedule-page-kicker"><i class="fas fa-calendar-days" aria-hidden="true"></i> Розклад онґоїнг-аніме</span>
                        <h2 id="schedulePageTitle">Розклад виходу серій</h2>
                        <p class="schedule-page-hint">Зверніть увагу, що це дата виходу на телебаченні в Японії, українські адаптації потребують певного часу.</p>
                    </div>
                    <div class="schedule-page-hero__character" aria-hidden="true">
                        <img src="src/assets/schedule/schedule-american-flag-girl.png" alt="" loading="eager" decoding="async">
                    </div>
                </section>
                ${renderScheduleDaySelector()}
                <div id="scheduleWeekContent" class="schedule-week-content"></div>
            `;
            document.querySelectorAll('.schedule-day-selector [data-schedule-offset]').forEach(tab => {
                tab.addEventListener('click', () => setScheduleDay(tab.dataset.scheduleOffset));
                tab.addEventListener('keydown', event => {
                    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                        event.preventDefault();
                        const tabs = [...document.querySelectorAll('.schedule-day-selector [data-schedule-offset]')];
                        const next = tabs[(tabs.indexOf(tab) + 1) % tabs.length];
                        next.focus();
                        setScheduleDay(next.dataset.scheduleOffset);
                    }
                    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                        event.preventDefault();
                        const tabs = [...document.querySelectorAll('.schedule-day-selector [data-schedule-offset]')];
                        const next = tabs[(tabs.indexOf(tab) - 1 + tabs.length) % tabs.length];
                        next.focus();
                        setScheduleDay(next.dataset.scheduleOffset);
                    }
                });
            });
            setScheduleDay(scheduleState.selectedOffset);
            loadScheduleWeek();
        }

        async function loadScheduleDayContent(offset) {
            const content = document.getElementById('scheduleDayContent');
            if (!content) return;
            scheduleState.loadingOffset = offset;
            content.innerHTML = '<div class="loader"><i class="fas fa-spinner fa-pulse"></i> Завантаження...</div>';
            try {
                const list = await fetchScheduleByOffset(offset);
                if (scheduleState.loadingOffset !== offset) return; // користувач вже перемкнув вкладку
                if (!list.length) {
                    content.innerHTML = '<div class="loader">На цей день розкладу немає</div>';
                    return;
                }
                content.innerHTML = list.map(item => {
                    const a = item.anime || {};
                    const poster = a.image?.preview ? `https://animeon.club/api/uploads/images/${a.image.preview}` : '';
                    const title = a.titleUa || a.titleEn || 'Без назви';
                    return `
                    <div class="schedule-item" data-title="${title.replace(/"/g, '&quot;')}" data-title-en="${(a.titleEn || '').replace(/"/g, '&quot;')}" data-slug="${(a.slug || '').replace(/"/g, '&quot;')}">
                        <div class="schedule-item__poster">
                            <img src="${poster}" alt="${title}" loading="lazy" onerror="this.style.opacity=0">
                        </div>
                        <div class="schedule-item__info">
                            <div class="schedule-item__title">${title}</div>
                            <div class="schedule-item__ep">${item.episode ? item.episode + ' серія' : ''}</div>
                        </div>
                        <i class="fas fa-chevron-right schedule-item__arrow"></i>
                    </div>`;
                }).join('');
                content.querySelectorAll('.schedule-item').forEach(el => {
                    el.addEventListener('click', () => {
                        openScheduleItemInPlayer(el.dataset.title, el);
                    });
                });
            } catch (err) {
                content.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> Помилка завантаження: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadScheduleDayContent(${offset})">Спробувати знову</button></div>`;
            }
        }
        window.loadScheduleDayContent = loadScheduleDayContent;

        // ====================================================================
