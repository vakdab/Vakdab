// Monochrome Orbital — керує заставкою VakDab без зміни існуючих маршрутів, тем або авторизації.
const entry = document.getElementById('vakdabEntry');

if (entry) {
    const progress = document.getElementById('vakdabEntryProgress');
    const percent = document.getElementById('vakdabEntryPercent');
    const status = document.getElementById('vakdabEntryStatus');
    const enterButton = document.getElementById('vakdabEntryEnter');
    const themeButton = document.getElementById('vakdabEntryTheme');
    const forceIntro = new URLSearchParams(window.location.search).get('intro') === '1';
    const seen = sessionStorage.getItem('vakdab-entry-seen') === '1';
    let leaving = false;

    function isDark() {
        return document.body.classList.contains('dark-mode') || localStorage.getItem('mono_anime_theme') === 'dark';
    }

    function syncTheme() {
        const dark = isDark();
        entry.dataset.theme = dark ? 'dark' : 'light';
        themeButton?.setAttribute('aria-label', dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему');
        const label = themeButton?.querySelector('.vakdab-entry__theme-label');
        const icon = themeButton?.querySelector('i');
        if (label) label.textContent = dark ? 'Темна' : 'Світла';
        if (icon) icon.className = dark ? 'fas fa-moon' : 'fas fa-sun';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#050507' : '#ffffff');
    }

    function closeEntry() {
        if (leaving) return;
        leaving = true;
        sessionStorage.setItem('vakdab-entry-seen', '1');
        entry.classList.add('is-leaving');
        document.body.classList.remove('vakdab-entry-open');
        window.setTimeout(() => entry.remove(), 440);
    }

    function setReady() {
        if (progress) progress.style.transform = 'scaleX(1)';
        if (percent) percent.textContent = '100%';
        if (status) status.textContent = 'Можна заходити';
        if (enterButton) {
            enterButton.innerHTML = '<span>Увійти</span><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>';
        }
    }

    if (seen && !forceIntro) {
        entry.remove();
    } else {
        document.body.classList.add('vakdab-entry-open');
        syncTheme();
        const observer = new MutationObserver(syncTheme);
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        requestAnimationFrame(() => entry.classList.add('is-visible'));
        window.setTimeout(setReady, 160);
        window.setTimeout(closeEntry, 2550);

        themeButton?.addEventListener('click', () => {
            const nextTheme = isDark() ? 'light' : 'dark';
            localStorage.setItem('mono_anime_theme', nextTheme);
            document.body.classList.toggle('dark-mode', nextTheme === 'dark');
            syncTheme();
        });
        enterButton?.addEventListener('click', closeEntry);
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' || event.key === 'Enter') closeEntry();
        });
    }
}
