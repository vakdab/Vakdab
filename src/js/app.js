import { bootstrap } from './core/bootstrap.js?v=20260903-home-filter-v1';

const telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
if (telegramStartParam === 'live' && window.location.hash.slice(1) !== 'live') window.location.hash = 'live';

bootstrap().then(module => {
    const trigger = document.getElementById('heroCategoriesTrigger');
    if (!trigger) return;
    trigger.addEventListener('click', () => {
        const dialog = document.getElementById('homeCatalogFilterDialog');
        const isOpen = Boolean(dialog);
        if (isOpen) {
            dialog.querySelector('[data-filter-close]')?.click();
            trigger.setAttribute('aria-expanded', 'false');
            return;
        }
        module.openHomeCatalogFilters?.(document);
        trigger.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(() => {
            document.getElementById('homeCatalogFilterDialog')?.querySelector('button, select, input')?.focus();
        });
    });
    document.addEventListener('click', event => {
        if (event.target.closest('#homeCatalogFilterDialog [data-filter-close]')) {
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
}).catch(error => console.warn('[VakDab] app bootstrap:', error));
