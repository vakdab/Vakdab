import { fetchHikkaMain, fetchHikkaTop100, loadHikkaDetail } from '../../services/catalog.js';
import { DailyStats, Storage, openPlayerPage, showToast } from '../../legacy/app-legacy.js?v=20260821-mode-filters-v3';

        let heroItems = [],
            heroPool = [],
            heroSeenUrls = new Set(),
            heroCurrentIndex = 0,
            heroRotationTimer = null,
            heroJustSwiped = false;

        export async function buildHeroBanner() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper) return;

            // Паралельно завантажуємо обидва джерела — не чекаємо одне на одне
            const [topResult, mainResult] = await Promise.allSettled([
                fetchHikkaTop100(),
                fetchHikkaMain(1)
            ]);

            const topAnime = topResult.status === 'fulfilled' ? (topResult.value || []) : [];
            const ordinaryAnime = mainResult.status === 'fulfilled' ? (mainResult.value || []) : [];

            heroPool = [...topAnime, ...ordinaryAnime]
                .filter(item => item?.url && item.images?.jpg?.large_image_url)
                .filter((item, index, list) => list.findIndex(other => other.url === item.url) === index);
            heroSeenUrls = new Set();
            heroItems = takeHeroBatch();

            if (heroItems.length === 0) {
                console.warn('Hero: no items loaded');
                wrapper.style.display = 'none';
                return;
            }
            if (Router.currentRoute !== 'main') {
                wrapper.style.display = 'none';
                return;
            }

            wrapper.style.display = 'block';
            heroCurrentIndex = 0;
            initHeroSwipe();

            // Показуємо перший слайд ОДРАЗУ з тим що є, не чекаємо деталей
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();

            // Деталі завантажуємо у фоні — оновимо слайд коли прийдуть
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]);
            }).catch(() => {});

            // Preload деталі наступного слайду у фоні
            if (heroItems.length > 1) {
                loadHeroItemDetails(1).catch(() => {});
            }
        }

        function takeHeroBatch() {
            const available = heroPool.filter(item => item?.url && !heroSeenUrls.has(item.url));
            const batch = [...available].sort(() => Math.random() - 0.5).slice(0, 8);
            batch.forEach(item => heroSeenUrls.add(item.url));
            return batch;
        }

        async function loadNextHeroBatch() {
            stopHeroRotation();
            let nextBatch = takeHeroBatch();
            if (nextBatch.length < 8 && heroSeenUrls.size >= heroPool.length) {
                heroSeenUrls = new Set();
                nextBatch = takeHeroBatch();
            }
            if (!nextBatch.length) return;
            heroItems = nextBatch;
            heroCurrentIndex = 0;
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]);
            }).catch(() => {});
            if (heroItems.length > 1) loadHeroItemDetails(1).catch(() => {});
        }

        async function loadHeroItemDetails(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            const item = heroItems[idx];
            if (item.detailsLoaded) return;
            // Timeout 6с щоб не зависати якщо сайт відповідає повільно
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
            try {
                const detail = await Promise.race([loadHikkaDetail(item.url), timeoutPromise]);
                item.genres = detail.genres || [];
                item.totalEpisodes = detail.totalEpisodes || 0;
                item.synopsis = detail.synopsis || '';
                item.year = detail.year || item.year || '';
                item.detailsLoaded = true;
                item.rating = (7 + Math.random() * 2.5).toFixed(1);
            } catch (e) {
                console.warn('Hero details fallback:', item.title, e.message);
                item.genres = item.genres || ['Аніме'];
                item.totalEpisodes = item.totalEpisodes || 0;
                item.synopsis = item.synopsis || 'Натисніть «Дивитися», щоб перейти до перегляду.';
                item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
                item.detailsLoaded = true;
            }
        }

        function escapeHeroText(value) {
            return String(value ?? '').replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[char]));
        }

        function cleanHeroSynopsis(value) {
            return String(value ?? '')
                .replace(/<[^>]*>/g, ' ')
                .replace(/[\r\n\t]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        // Улюблене на слайдах героя — той самий локальний список закладок, що й
        // на картках каталогу та в плеєрі (Storage.getBookmarks/setBookmarks).
        function isHeroItemBookmarked(url) {
            if (!url) return false;
            return Storage.getBookmarks().some(b => b?.url === url);
        }

        function toggleHeroBookmark(item) {
            if (!item?.url) return false;
            const bookmarks = Storage.getBookmarks();
            const idx = bookmarks.findIndex(b => b?.url === item.url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                Storage.setBookmarks(bookmarks);
                showToast('Видалено з обраного');
                return false;
            }
            bookmarks.push({
                url: item.url,
                title: item.title || 'Без назви',
                poster: item.images?.jpg?.large_image_url || '',
                addedAt: Date.now()
            });
            Storage.setBookmarks(bookmarks);
            DailyStats.increment('bookmarksToday', 1);
            showToast('Додано до обраного');
            return true;
        }

        function renderHeroSlide(item) {
            const container = document.getElementById('heroSlidesContainer');
            if (!container || !item) return;
            const poster = item.images?.jpg?.large_image_url || '';
            const rawTitle = String(item.title || 'Без назви').trim();
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38).trimEnd() + '…' : rawTitle;
            const genres = Array.isArray(item.genres) && item.genres.length ? item.genres : ['Аніме'];
            const rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
            const year = item.year || '';
            const episodes = item.totalEpisodes || 0;
            const synopsis = cleanHeroSynopsis(item.synopsis);

            const metaParts = [];
            if (year) metaParts.push(year);
            if (episodes > 0) metaParts.push(episodes + ' еп.');
            const metaHtml = metaParts.length > 0
                ? `<span class="hero-info-separator">·</span><span class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</span>`
                : '';

            const synopsisHtml = synopsis
                ? `<div class="hero-slide-desc">${escapeHeroText(synopsis)}</div>`
                : '';

            const slide = document.createElement('div');
            slide.className = 'hero-slide active';
            slide.dataset.url = item.url;

            // Fallback poster — якщо зображення не завантажилось
            const safePoster = poster || '';
            const bgStyle = safePoster
                ? `background-image: url('${safePoster}');`
                : 'background: linear-gradient(135deg, #1a1a1a, #2d2d2d);';

            const bookmarked = isHeroItemBookmarked(item.url);
            slide.innerHTML = `
                <div class="hero-slide-bg" id="heroBg_${Date.now()}" style="${bgStyle}"></div>
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <span class="hero-slide-kicker">Обрано для тебе</span>
                    <div class="hero-slide-title">${escapeHeroText(title)}</div>
                    ${synopsisHtml}
                    <div class="hero-slide-tags">
                        ${genres.slice(0, 3).map(g => `<span class="hero-tag genre-tag">${escapeHeroText(g)}</span>`).join('')}
                    </div>
                    <div class="hero-info-pill hero-rating-row hero-rating-row--bottom">
                        <span class="hero-rating-badge"><span class="star">★</span> ${rating}</span>
                        ${metaHtml}
                    </div>
                    <div class="hero-cta-row">
                        <button type="button" class="hero-watch-btn" aria-label="Дивитись ${escapeHeroText(title)}"><i class="fas fa-play"></i><span>Дивитись</span></button>
                        <button type="button" class="hero-fav-btn${bookmarked ? ' is-active' : ''}" aria-pressed="${bookmarked ? 'true' : 'false'}" aria-label="${bookmarked ? 'Видалити з обраного' : 'Додати в обране'}"><i class="fas fa-heart"></i></button>
                    </div>
                </div>
            `;

            // Preload poster image — якщо не завантажиться, фон лишається градієнтом
            if (safePoster) {
                const img = new Image();
                img.onload = () => {
                    const bg = slide.querySelector('.hero-slide-bg');
                    if (bg) bg.style.backgroundImage = `url('${safePoster}')`;
                };
                img.onerror = () => {
                    const bg = slide.querySelector('.hero-slide-bg');
                    if (bg) bg.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)';
                };
                img.src = safePoster;
            }

            container.innerHTML = '';
            container.appendChild(slide);

            // Весь слайд клікабельний — відкриває аніме. Свайп (не тап) перемикає слайди, не відкриваючи сторінку.
            slide.addEventListener('click', () => {
                if (heroJustSwiped) { heroJustSwiped = false; return; }
                if (item.url) openPlayerPage(item.url);
            });

            // Кнопка "Дивитись" робить той самий перехід явним і фокусованим —
            // не залежить від кліку по всьому слайду.
            slide.querySelector('.hero-watch-btn')?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                if (item.url) openPlayerPage(item.url);
            });

            // "В обране" — окрема дія, не повинна відкривати плеєр.
            const favBtn = slide.querySelector('.hero-fav-btn');
            favBtn?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const active = toggleHeroBookmark(item);
                favBtn.classList.toggle('is-active', active);
                favBtn.setAttribute('aria-pressed', String(active));
                favBtn.setAttribute('aria-label', active ? 'Видалити з обраного' : 'Додати в обране');
                // Icon stays a solid heart; only color/opacity communicate the active state (see .hero-fav-btn.is-active).
            });
        }

        function buildHeroIndicators() {
            const dotsContainer = document.getElementById('heroDots');
            if (!dotsContainer) return;
            dotsContainer.innerHTML = '';
            heroItems.forEach((_, idx) => {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = 'hero-dot' + (idx === heroCurrentIndex ? ' active' : '');
                dot.setAttribute('aria-label', `Показати рекомендацію ${idx + 1}`);
                dot.setAttribute('aria-current', String(idx === heroCurrentIndex));
                dot.addEventListener('click', () => goToSlide(idx));
                dotsContainer.appendChild(dot);
            });
        }

        function updateHeroIndicators() {
            const dots = document.querySelectorAll('.hero-dot');
            dots.forEach((dot, idx) => {
                const active = idx === heroCurrentIndex;
                dot.classList.toggle('active', active);
                dot.setAttribute('aria-current', String(active));
            });
        }

        async function goToSlide(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            if (idx === heroCurrentIndex) return;
            heroCurrentIndex = idx;
            // Показуємо слайд одразу — не чекаємо деталей
            renderHeroSlide(heroItems[idx]);
            updateHeroIndicators();
            resetHeroTimer();
            // Деталі завантажуємо у фоні — оновимо слайд коли прийдуть
            if (!heroItems[idx].detailsLoaded) {
                loadHeroItemDetails(idx).then(() => {
                    if (heroCurrentIndex === idx) renderHeroSlide(heroItems[idx]);
                }).catch(() => {});
            }
            // Preload наступного слайду
            const nextIdx = (idx + 1) % heroItems.length;
            if (!heroItems[nextIdx].detailsLoaded) {
                loadHeroItemDetails(nextIdx).catch(() => {});
            }
        }

        function nextSlide() {
            if (heroCurrentIndex >= heroItems.length - 1) {
                loadNextHeroBatch().catch(() => {});
                return;
            }
            goToSlide(heroCurrentIndex + 1);
        }

        function prevSlide() {
            goToSlide((heroCurrentIndex - 1 + heroItems.length) % heroItems.length);
        }

        // Гортання пальцем замість стрілок — свайп вліво/вправо перемикає слайди
        function initHeroSwipe() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper || wrapper.dataset.swipeInit) return;
            wrapper.dataset.swipeInit = '1';
            let startX = 0, startY = 0, tracking = false;
            wrapper.addEventListener('touchstart', (e) => {
                if (!e.touches.length) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                tracking = true;
            }, { passive: true });
            wrapper.addEventListener('touchend', (e) => {
                if (!tracking || !e.changedTouches.length) return;
                tracking = false;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                    heroJustSwiped = true;
                    if (dx < 0) nextSlide(); else prevSlide();
                }
            }, { passive: true });
        }

        let heroProgressInterval = null;
        const HERO_SLIDE_DURATION = 6000;

        function startHeroRotation() {
            stopHeroRotation();
            if (heroItems.length < 2) return;
            const fill = document.getElementById('heroProgressFill');
            let elapsed = 0;
            if (fill) fill.style.width = '0%';
            heroProgressInterval = setInterval(() => {
                elapsed += 50;
                if (fill) fill.style.width = (elapsed / HERO_SLIDE_DURATION * 100) + '%';
            }, 50);
            heroRotationTimer = setTimeout(nextSlide, HERO_SLIDE_DURATION);
        }

        function stopHeroRotation() {
            if (heroRotationTimer) { clearTimeout(heroRotationTimer); heroRotationTimer = null; }
            if (heroProgressInterval) { clearInterval(heroProgressInterval); heroProgressInterval = null; }
            const fill = document.getElementById('heroProgressFill');
            if (fill) fill.style.width = '0%';
        }

        function resetHeroTimer() {
            stopHeroRotation();
            startHeroRotation();
        }
