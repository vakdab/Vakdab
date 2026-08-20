// Monochrome Orbital — керує заставкою VakDab без зміни існуючих маршрутів, тем або авторизації.
const entry = document.getElementById('vakdabEntry');

if (entry) {
    const progress = document.getElementById('vakdabEntryProgress');
    const percent = document.getElementById('vakdabEntryPercent');
    const status = document.getElementById('vakdabEntryStatus');
    const forceIntro = new URLSearchParams(window.location.search).get('intro') === '1';
    const seen = sessionStorage.getItem('vakdab-entry-seen') === '1';
    let leaving = false;
    let loadingTimer;

    function isDark() {
        return document.body.classList.contains('dark-mode') || localStorage.getItem('mono_anime_theme') === 'dark';
    }

    function syncTheme() {
        const dark = isDark();
        entry.dataset.theme = dark ? 'dark' : 'light';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#050507' : '#ffffff');
    }

    function closeEntry() {
        if (leaving) return;
        leaving = true;
        window.clearInterval(loadingTimer);
        sessionStorage.setItem('vakdab-entry-seen', '1');
        entry.classList.add('is-leaving');
        document.body.classList.remove('vakdab-entry-open');
        window.setTimeout(() => entry.remove(), 440);
    }

    function updateProgress(value) {
        if (progress) progress.style.transform = `scaleX(${value / 100})`;
        if (percent) percent.textContent = `${value}%`;
        if (status) status.textContent = value < 100 ? 'Налаштовуємо твій простір' : 'Можна заходити';
    }

    if (seen && !forceIntro) {
        entry.remove();
    } else {
        document.body.classList.add('vakdab-entry-open');
        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        requestAnimationFrame(() => entry.classList.add('is-visible'));
        const loadingDuration = 5000;
        const startedAt = performance.now();
        loadingTimer = window.setInterval(() => {
            const value = Math.min(100, Math.round(((performance.now() - startedAt) / loadingDuration) * 100));
            updateProgress(value);
        }, 80);
        window.setTimeout(closeEntry, 5500);
    }
}
