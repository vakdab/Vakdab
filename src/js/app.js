import { bootstrap } from './core/bootstrap.js?v=20260912-team-selector-v6';

try {
    if (globalThis.Telegram?.WebApp) {
        globalThis.Telegram.WebApp.ready();
        globalThis.Telegram.WebApp.expand();
    }
} catch (_) {}

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().catch(error => console.warn('[VakDab] app bootstrap:', error));

// Keep the wide-screen sidebar in sync with the existing hash router.
const syncDesktopSidebar = () => {
    const route = (window.location.hash.slice(1).split('?')[0] || 'main');
    document.querySelectorAll('.desktop-sidebar__link[href^="#"]').forEach(link => {
        const linkRoute = link.getAttribute('href').slice(1).split('?')[0];
        link.classList.toggle('is-active', linkRoute === route);
    });
};
window.addEventListener('hashchange', syncDesktopSidebar);
window.addEventListener('DOMContentLoaded', syncDesktopSidebar, { once: true });
syncDesktopSidebar();

const renderDesktopDashboard = () => {
    const calendar = document.getElementById('dashboardCalendar');
    const now = new Date();
    const locale = 'uk-UA';
    const dateLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
    const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(now);
    const timeLabel = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(now);
    const date = document.getElementById('desktopDashboardDate');
    const clock = document.getElementById('dashboardClock');
    const month = document.getElementById('dashboardMonthLabel');
    const today = document.getElementById('dashboardCalendarToday');
    if (date) date.textContent = dateLabel;
    if (clock) clock.textContent = timeLabel;
    if (month) month.textContent = monthLabel[0].toUpperCase() + monthLabel.slice(1);
    if (today) today.textContent = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(now);

    if (!calendar || calendar.dataset.rendered === `${now.getFullYear()}-${now.getMonth()}`) return;
    calendar.dataset.rendered = `${now.getFullYear()}-${now.getMonth()}`;
    const labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
    calendar.innerHTML = labels.map(label => `<div class="desktop-dashboard__calendar-label">${label}</div>`).join('');
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const previousMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const mondayIndex = (first.getDay() + 6) % 7;
    const totalCells = Math.ceil((mondayIndex + daysInMonth) / 7) * 7;
    for (let index = 0; index < totalCells; index += 1) {
        let day = index - mondayIndex + 1;
        let className = 'desktop-dashboard__calendar-day';
        if (day < 1) { day = previousMonthDays + day; className += ' is-muted'; }
        else if (day > daysInMonth) { day -= daysInMonth; className += ' is-muted'; }
        else if (day === now.getDate()) className += ' is-today';
        calendar.insertAdjacentHTML('beforeend', `<div class="${className}">${day}</div>`);
    }
};

const syncDesktopDashboardStats = () => {
    const cards = document.getElementById('dashboardCardCount');
    const sections = document.getElementById('dashboardSectionCount');
    if (cards) {
        const count = document.querySelectorAll('.home-catalog-card, #animeContainer .anime-card').length;
        cards.textContent = count ? String(count) : '—';
    }
    if (sections) {
        const count = document.querySelectorAll('#genreSectionsContainer .genre-section').length;
        sections.textContent = count ? String(count) : '—';
    }
};

renderDesktopDashboard();
setInterval(renderDesktopDashboard, 60_000);
const dashboardRoot = document.getElementById('appRoot');
if (dashboardRoot && 'MutationObserver' in window) {
    new MutationObserver(syncDesktopDashboardStats).observe(dashboardRoot, { childList: true, subtree: true });
}
syncDesktopDashboardStats();
