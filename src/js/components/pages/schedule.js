import { openScheduleItemInPlayer } from './homeLegacy.js?v=20260821-social-v13';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const countdownText = date => { const ms = Math.max(0, new Date(date).getTime() - Date.now()); const total = Math.floor(ms / 1000); const days = Math.floor(total / 86400); const hours = Math.floor((total % 86400) / 3600); const minutes = Math.floor((total % 3600) / 60); return days ? `через ${days} д ${hours} год` : hours ? `через ${hours} год ${minutes} хв` : `через ${minutes} хв`; };

        // ====================================================================
        //  РОЗКЛАД ВИХОДУ (дані з Mikai API)
        // ====================================================================
        const MIKAI_API_BASE = 'https://api.mikai.me/v1';
        const scheduleState = { dayOffset: 0, cache: {}, sourcePromise: null, loadingOffset: null, weekLoading: false, weekTimer: null };
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
            return `<article class="schedule-item schedule-week-item" data-title="${escapeHtml(title)}" data-title-en="${escapeHtml(titleEn)}" data-slug="${escapeHtml(a.slug || '')}">
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
                    if (!list.length) return '';
                    const d = scheduleDateForOffset(offset);
                    const day = new Intl.DateTimeFormat('uk-UA', { weekday: 'long' }).format(d);
                    return `<section class="schedule-week-day${offset === 0 ? ' is-today' : ''}"><div class="schedule-week-day__title"><strong>${day}</strong><span>${offset === 0 ? 'Сьогодні' : formatScheduleDisplayDate(d)}</span></div><div class="schedule-week-list">${list.map(item => scheduleCard(item, offset)).join('')}</div></section>`;
                }).join('');
                content.innerHTML = sections || '<div class="loader">На найближчі дні розкладу немає</div>';
                content.querySelectorAll('.schedule-week-item').forEach(el => el.addEventListener('click', () => openScheduleItemInPlayer(el.dataset.title, el)));
                if (scheduleState.weekTimer) clearInterval(scheduleState.weekTimer);
                scheduleState.weekTimer = setInterval(() => content.querySelectorAll('.schedule-countdown').forEach(el => { const d = new Date(el.dataset.time); el.textContent = countdownText(d); }), 60000);
            } catch (e) {
                console.error('Помилка завантаження розкладу Mikai:', e);
                const details = e?.message ? ` (${escapeHtml(e.message)})` : '';
                content.innerHTML = `<div class="loader">Не вдалося завантажити розклад${details}. <button class="btn-outline" type="button" onclick="loadScheduleWeek()">Повторити</button></div>`;
            }
            finally { scheduleState.weekLoading = false; }
        }
        window.loadScheduleWeek = loadScheduleWeek;

        export function renderSchedulePage() {
            const container = document.getElementById('schedulePageContainer');
            if (!container) return;
            container.innerHTML = `
                <div class="genre-page-header"><h2>Розклад виходу</h2></div>
                <p class="schedule-page-hint">Актуальний розклад онґоїнг-аніме, згрупований за днями. Час показується лише коли його повертає джерело.</p>
                <div id="scheduleWeekContent" class="schedule-week-content"></div>
            `;
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
