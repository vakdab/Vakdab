/**
 * VakDab — Unified Loading Skeleton System.
 * Generates semantic, structure-accurate skeleton placeholders matching real site components.
 */

/**
 * Returns HTML string for anime poster card skeletons.
 * Used in catalog, search, genre, and main category views.
 * @param {number} count Number of skeleton cards to render (default: 8)
 * @returns {string}
 */
export function renderAnimeCardSkeleton(count = 8) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
        <div class="site-skeleton-card anime-card skeleton-card" aria-hidden="true">
            <div class="site-skeleton-card__poster skeleton"></div>
            <div class="site-skeleton-card__info">
                <div class="site-skeleton-card__line site-skeleton-card__line--title skeleton"></div>
                <div class="site-skeleton-card__line site-skeleton-card__line--sub skeleton"></div>
            </div>
        </div>`;
    }
    return html;
}

/**
 * Returns HTML string for circular popular recommendations card skeletons.
 * Used on the homepage recommendation feed.
 * @param {number} count Number of cards (default: 6)
 * @returns {string}
 */
export function renderPopularCardSkeleton(count = 6) {
    let cards = '';
    for (let i = 0; i < count; i++) {
        cards += `
        <div class="popular-card skeleton-popular-card" aria-hidden="true">
            <div class="popular-card__poster-wrap">
                <div class="popular-card__poster skeleton"></div>
            </div>
            <div class="popular-card__title skeleton-text skeleton" style="width: 78%; margin: 8px auto 6px; height: 14px;"></div>
            <div class="popular-card__episodes skeleton-text skeleton" style="width: 48%; margin: 0 auto; height: 11px;"></div>
        </div>`;
    }
    return `
    <div class="popular-section popular-section--skeleton" aria-label="Завантаження рекомендацій">
        <div class="popular-section__header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div class="skeleton" style="width: 160px; height: 22px; border-radius: 6px;"></div>
            <div class="skeleton" style="width: 80px; height: 28px; border-radius: 50px;"></div>
        </div>
        <div class="popular-list popular-list--home popular-list--skeleton">
            ${cards}
        </div>
    </div>`;
}

/**
 * Returns HTML string for schedule day/week skeletons.
 * @param {boolean} isWeek True for weekly grouped schedule, false for single day
 * @param {number} itemCount Number of item skeletons
 * @returns {string}
 */
export function renderScheduleSkeleton(isWeek = true, itemCount = 4) {
    let items = '';
    for (let i = 0; i < itemCount; i++) {
        items += `
        <div class="schedule-item skeleton-schedule-item" aria-hidden="true">
            <div class="schedule-item__poster skeleton"></div>
            <div class="schedule-item__info">
                <div class="skeleton" style="width: 65%; height: 15px; margin-bottom: 7px; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 42%; height: 11px; margin-bottom: 5px; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 28%; height: 10px; border-radius: 4px;"></div>
            </div>
            <div class="skeleton" style="width: 14px; height: 14px; border-radius: 50%; margin-left: auto; opacity: 0.4;"></div>
        </div>`;
    }

    if (!isWeek) {
        return `<div class="schedule-list skeleton-schedule-list" aria-label="Завантаження розкладу">${items}</div>`;
    }

    // Weekly grouped schedule with 3 preview day cards
    let days = '';
    for (let d = 0; d < 3; d++) {
        days += `
        <section class="schedule-week-day skeleton-schedule-week-day" aria-hidden="true">
            <div class="schedule-week-day__title" style="display:flex; justify-content:space-between; margin-bottom:12px;">
                <div class="skeleton" style="width: 90px; height: 18px; border-radius: 5px;"></div>
                <div class="skeleton" style="width: 65px; height: 14px; border-radius: 5px;"></div>
            </div>
            <div class="schedule-week-list">
                ${items}
            </div>
        </section>`;
    }
    return `<div class="schedule-week-content skeleton-schedule-week" aria-label="Завантаження розкладу">${days}</div>`;
}

/**
 * Returns HTML string for rating and leaderboard skeletons.
 * Includes user stats skeleton card, podium top 3, and ranking list rows.
 * @returns {string}
 */
export function renderLeaderboardSkeleton() {
    // 3 podium positions: 2nd (left), 1st (center, tallest), 3rd (right)
    const podiumHtml = `
    <div class="rg-podium skeleton-rg-podium" aria-hidden="true">
        <div class="rg-podium-item rg-podium-2 skeleton-podium-col">
            <div class="skeleton skeleton-circle" style="width: 58px; height: 58px; margin: 0 auto 10px;"></div>
            <div class="skeleton" style="width: 70px; height: 13px; margin: 0 auto 6px; border-radius: 4px;"></div>
            <div class="skeleton" style="width: 45px; height: 10px; margin: 0 auto 12px; border-radius: 4px;"></div>
            <div class="skeleton skeleton-podium-pillar" style="height: 72px; width: 100%; border-radius: 12px 12px 0 0;"></div>
        </div>
        <div class="rg-podium-item rg-podium-1 skeleton-podium-col is-gold">
            <div class="skeleton skeleton-circle" style="width: 72px; height: 72px; margin: 0 auto 10px;"></div>
            <div class="skeleton" style="width: 84px; height: 15px; margin: 0 auto 6px; border-radius: 4px;"></div>
            <div class="skeleton" style="width: 52px; height: 11px; margin: 0 auto 12px; border-radius: 4px;"></div>
            <div class="skeleton skeleton-podium-pillar" style="height: 100px; width: 100%; border-radius: 14px 14px 0 0;"></div>
        </div>
        <div class="rg-podium-item rg-podium-3 skeleton-podium-col">
            <div class="skeleton skeleton-circle" style="width: 54px; height: 54px; margin: 0 auto 10px;"></div>
            <div class="skeleton" style="width: 65px; height: 13px; margin: 0 auto 6px; border-radius: 4px;"></div>
            <div class="skeleton" style="width: 40px; height: 10px; margin: 0 auto 12px; border-radius: 4px;"></div>
            <div class="skeleton skeleton-podium-pillar" style="height: 56px; width: 100%; border-radius: 12px 12px 0 0;"></div>
        </div>
    </div>`;

    // Leaderboard table rows
    let rowsHtml = '';
    for (let i = 4; i <= 9; i++) {
        rowsHtml += `
        <div class="rg-user-row skeleton-rg-row" aria-hidden="true">
            <div class="skeleton" style="width: 22px; height: 16px; border-radius: 4px; margin-right: 12px;"></div>
            <div class="skeleton skeleton-circle" style="width: 38px; height: 38px; margin-right: 12px;"></div>
            <div style="flex: 1; min-width: 0;">
                <div class="skeleton" style="width: 45%; height: 14px; margin-bottom: 6px; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 28%; height: 10px; border-radius: 3px;"></div>
            </div>
            <div class="skeleton" style="width: 60px; height: 22px; border-radius: 50px;"></div>
        </div>`;
    }

    return `
    <div class="skeleton-leaderboard-wrap" aria-label="Завантаження рейтингу">
        ${podiumHtml}
        <div class="rg-leaderboard-list skeleton-leaderboard-list">
            ${rowsHtml}
        </div>
    </div>`;
}

/**
 * Returns HTML string for rating user stats card skeleton.
 * @returns {string}
 */
export function renderRatingStatsSkeleton() {
    return `
    <div class="rg-my-stats skeleton-my-stats" aria-hidden="true">
        <div class="rg-stats-top" style="display:flex; align-items:center; gap:14px; margin-bottom:14px;">
            <div class="skeleton skeleton-circle" style="width: 52px; height: 52px;"></div>
            <div style="flex:1;">
                <div class="skeleton" style="width: 48%; height: 16px; margin-bottom: 7px; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 32%; height: 12px; border-radius: 50px;"></div>
            </div>
        </div>
        <div style="margin: 12px 0 8px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <div class="skeleton" style="width: 45px; height: 10px; border-radius: 3px;"></div>
                <div class="skeleton" style="width: 80px; height: 10px; border-radius: 3px;"></div>
            </div>
            <div class="skeleton" style="height: 6px; border-radius: 3px; width: 100%;"></div>
        </div>
        <div class="rg-stats-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px;">
            <div class="skeleton" style="height: 54px; border-radius: 12px;"></div>
            <div class="skeleton" style="height: 54px; border-radius: 12px;"></div>
        </div>
    </div>`;
}

/**
 * Returns HTML string for profile (own or public) page skeleton.
 * @returns {string}
 */
export function renderProfileSkeleton() {
    let cards = '';
    for (let i = 0; i < 4; i++) {
        cards += `
        <div class="site-skeleton-card anime-card skeleton-card" aria-hidden="true">
            <div class="site-skeleton-card__poster skeleton"></div>
            <div class="site-skeleton-card__info" style="margin-top:8px;">
                <div class="site-skeleton-card__line skeleton" style="width: 72%; height: 12px;"></div>
            </div>
        </div>`;
    }

    return `
    <div class="profile-wrapper skeleton-profile-wrapper" aria-label="Завантаження профілю">
        <div class="profile-banner skeleton-profile-banner skeleton"></div>
        <div class="profile-info skeleton-profile-info">
            <div class="profile-head-row" style="margin-top: -46px; margin-bottom: 12px;">
                <div class="skeleton skeleton-circle skeleton-profile-avatar" style="width: 92px; height: 92px; border: 4px solid var(--surface, #141416);"></div>
            </div>
            <div class="skeleton" style="width: 180px; height: 22px; border-radius: 6px; margin-bottom: 8px;"></div>
            <div class="skeleton" style="width: 110px; height: 13px; border-radius: 4px; margin-bottom: 14px;"></div>
            <div class="skeleton" style="width: min(85%, 340px); height: 12px; border-radius: 4px; margin-bottom: 6px;"></div>
            <div class="skeleton" style="width: min(60%, 240px); height: 12px; border-radius: 4px; margin-bottom: 18px;"></div>
        </div>
        <div class="profile-tabs skeleton-profile-tabs" style="display:flex; gap:10px; margin-top:14px; margin-bottom:18px;">
            <div class="skeleton" style="width: 100px; height: 38px; border-radius: 50px;"></div>
            <div class="skeleton" style="width: 110px; height: 38px; border-radius: 50px;"></div>
        </div>
        <div class="site-skeleton-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
            ${cards}
        </div>
    </div>`;
}

/**
 * Returns HTML string for live streaming page skeleton.
 * @returns {string}
 */
export function renderLiveSkeleton() {
    return `
    <section class="anime-live-page anime-live-page--skeleton" aria-label="Завантаження ефіру">
        <div class="anime-live-topbar" style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div class="skeleton" style="width: 36px; height: 36px; border-radius: 50%;"></div>
                <div>
                    <div class="skeleton" style="width: 90px; height: 11px; margin-bottom: 6px; border-radius: 3px;"></div>
                    <div class="skeleton" style="width: 150px; height: 20px; border-radius: 5px;"></div>
                </div>
            </div>
            <div class="skeleton" style="width: 95px; height: 28px; border-radius: 50px;"></div>
        </div>
        <div class="anime-live-layout" style="display:grid; gap:18px;">
            <div class="anime-live-main">
                <div class="skeleton anime-live-video-skeleton" style="aspect-ratio: 16/9; border-radius: 16px; width: 100%; position:relative;">
                    <div class="skeleton skeleton-circle" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:64px; height:64px; opacity:0.35;"></div>
                </div>
                <div class="skeleton-live-meta" style="margin-top:16px; padding:16px; border-radius:16px; background:var(--surface);">
                    <div class="skeleton" style="width: 60%; height: 18px; margin-bottom: 10px; border-radius: 4px;"></div>
                    <div class="skeleton" style="width: 35%; height: 13px; border-radius: 4px;"></div>
                </div>
            </div>
        </div>
    </section>`;
}

/**
 * Returns HTML string for stickers page skeleton.
 * @returns {string}
 */
export function renderStickersSkeleton() {
    let cells = '';
    for (let i = 0; i < 12; i++) {
        cells += `<div class="skeleton" style="aspect-ratio: 1/1; border-radius: 14px;"></div>`;
    }
    return `
    <div class="stickers-page-skeleton" style="padding: clamp(14px, 3vw, 24px); max-width: 900px; margin: 0 auto;" aria-label="Завантаження наліпок">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
            <div class="skeleton" style="width: 180px; height: 26px; border-radius: 6px;"></div>
            <div class="skeleton" style="width: 120px; height: 36px; border-radius: 50px;"></div>
        </div>
        <div style="display:flex; gap:10px; margin-bottom:22px;">
            <div class="skeleton" style="width: 90px; height: 34px; border-radius: 50px;"></div>
            <div class="skeleton" style="width: 110px; height: 34px; border-radius: 50px;"></div>
            <div class="skeleton" style="width: 100px; height: 34px; border-radius: 50px;"></div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 12px;">
            ${cells}
        </div>
    </div>`;
}

/**
 * Returns HTML string for player info skeleton.
 * @returns {string}
 */
export function renderPlayerInfoSkeleton() {
    return `
    <div class="site-loading-skeleton site-loading-skeleton--player-info" role="status" aria-label="Завантаження деталей">
        <div class="site-skeleton__block" style="height: 14px; width: 45%; margin-bottom: 8px;"></div>
        <div class="site-skeleton__block" style="height: 18px; width: 75%; margin-bottom: 16px;"></div>
        <div class="site-skeleton__block" style="height: 14px; width: 40%; margin-bottom: 8px;"></div>
        <div class="site-skeleton__block" style="height: 18px; width: 60%; margin-bottom: 16px;"></div>
        <div class="site-skeleton__block" style="height: 14px; width: 50%; margin-bottom: 8px;"></div>
        <div class="site-skeleton__block" style="height: 18px; width: 70%; margin-bottom: 16px;"></div>
        <div class="site-skeleton__block" style="height: 14px; width: 35%; margin-bottom: 8px;"></div>
        <div class="site-skeleton__block" style="height: 18px; width: 55%;"></div>
    </div>`;
}

/**
 * Injects skeleton HTML into a container element or selector, setting accessibility attributes.
 * @param {HTMLElement|string} target Element or query selector
 * @param {'catalog'|'animeGrid'|'popular'|'schedule'|'scheduleDay'|'leaderboard'|'ratingStats'|'profile'|'live'|'stickers'|'playerInfo'} type Skeleton type
 * @param {number} [count] Optional count parameter
 */
export function showSkeleton(target, type = 'animeGrid', count) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.setAttribute('aria-busy', 'true');

    let html = '';
    switch (type) {
        case 'catalog':
        case 'animeGrid':
            html = renderAnimeCardSkeleton(count || 8);
            break;
        case 'popular':
            html = renderPopularCardSkeleton(count || 6);
            break;
        case 'schedule':
            html = renderScheduleSkeleton(true, count || 3);
            break;
        case 'scheduleDay':
            html = renderScheduleSkeleton(false, count || 5);
            break;
        case 'leaderboard':
            html = renderLeaderboardSkeleton();
            break;
        case 'ratingStats':
            html = renderRatingStatsSkeleton();
            break;
        case 'profile':
            html = renderProfileSkeleton();
            break;
        case 'live':
            html = renderLiveSkeleton();
            break;
        case 'stickers':
            html = renderStickersSkeleton();
            break;
        case 'playerInfo':
            html = renderPlayerInfoSkeleton();
            break;
        default:
            html = renderAnimeCardSkeleton(count || 8);
            break;
    }

    el.innerHTML = html;
}

/**
 * Removes loading state from a container element.
 * @param {HTMLElement|string} target
 */
export function hideSkeleton(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) {
        el.removeAttribute('aria-busy');
    }
}
