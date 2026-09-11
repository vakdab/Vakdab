import { fetchHikkaMain, fetchHikkaTop100, loadHikkaDetail } from '../../services/catalog/catalog.js?v=20260911-moonanime-fallback-v4';

        // Fallback-пул топових аніме на випадок повільної мережі або збою Hikka API
        const FALLBACK_HERO_ANIME = [
            {
                title: 'Проводжальниця Фрірен',
                url: 'https://api.hikka.io/anime/sousou-no-frieren-ad4e3e',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/sousou-no-frieren-ad4e3e/8D-SGEkCBMAUE7CgEt9UPQ.jpg' } },
                genres: ['Драма', 'Шьонен', 'Фентезі'],
                year: 2023,
                totalEpisodes: 28,
                rating: '9.3',
                synopsis: 'Після перемоги над Королем Демонів ельфійка-чарівниця Фрірен вирушає у нову мандрівку, щоб пізнати справжнє значення людських зв\'язків.'
            },
            {
                title: 'Сталевий алхімік: Братерство',
                url: 'https://api.hikka.io/anime/fullmetal-alchemist-brotherhood-fc524a',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/fullmetal-alchemist-brotherhood-fc524a/1dRVedKKpa2i_iiHmEcDhA.jpg' } },
                genres: ['Драма', 'Шьонен', 'Бойовик'],
                year: 2009,
                totalEpisodes: 64,
                rating: '9.1',
                synopsis: 'Брати Елріки шукають філософський камінь, щоб повернути тіла, які втратили під час забороненої алхімічної спроби.'
            },
            {
                title: 'Переродження: Життя з нуля в іншому світі — 4 сезон',
                url: 'https://api.hikka.io/anime/rezero-kara-hajimeru-isekai-seikatsu-4th-season-7f05ab',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/rezero-kara-hajimeru-isekai-seikatsu-4th-season-7f05ab/98gRlrUMjxMDIZ5GJXnnSQ.jpg' } },
                genres: ['Подорожі в часі', 'Психологія', 'Трилер'],
                year: 2026,
                totalEpisodes: 0,
                rating: '9.1',
                synopsis: 'Субару знову повертається смертю — новий сезон випробувань у світі, де час єдиною зброєю.'
            },
            {
                title: 'Химерні пригоди ДжоДжо: Перегони «Сталева куля»',
                url: 'https://api.hikka.io/anime/jojo-no-kimyou-na-bouken-part-7-steel-ball-run-aae44e',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/steel-ball-run-jojo-no-kimyou-na-bouken-aae44e/eQA9BX87jQFq8_Z1m18MZg.jpg' } },
                genres: ['Загадкове', 'Бойовик', 'Історичне'],
                year: 2026,
                totalEpisodes: 0,
                rating: '9.1',
                synopsis: 'Перегони на тисячокілометровій дистанції, де джокеї змагаються не лише на швидкість, а й волею до перемоги.'
            },
            {
                title: 'Бліч: Тисячолітня кривава війна — Лихо',
                url: 'https://api.hikka.io/anime/bleach-sennen-kessen-hen-kashin-tan-3ce3e3',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/bleach-sennen-kessen-hen-kashin-tan-3ce3e3/6Qjtoqen-jsLSUBMfPG-Ww.jpg' } },
                genres: ['Шьонен', 'Бойовик', 'Надприродне'],
                year: 2024,
                totalEpisodes: 13,
                rating: '9.1',
                synopsis: 'Фінальна війна між жнецами душ і квінсі набирає обертів — доля Світу живих і мертвих вирішується зараз.'
            },
            {
                title: 'Штайнова;Брама',
                url: 'https://api.hikka.io/anime/steinsgate-f29797',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/steinsgate-f29797/M-8Gxbqmsq0ScxFZWQAt-Q.jpg' } },
                genres: ['Психологія', 'Фантастика', 'Трилер'],
                year: 2011,
                totalEpisodes: 24,
                rating: '9.0',
                synopsis: 'Винахідливий студент випадково створює пристрій, що надсилає повідомлення в минуле — і змінює долю світу.'
            },
            {
                title: 'Атака титанів — 3 сезон, 2 частина',
                url: 'https://api.hikka.io/anime/shingeki-no-kyojin-season-3-part-2-91a350',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/shingeki-no-kyojin-season-3-part-2-91a350/G2dalZZxHj8T2-MXipYabg.jpg' } },
                genres: ['Екшн', 'Драма', 'Містика'],
                year: 2019,
                totalEpisodes: 10,
                rating: '9.0',
                synopsis: 'Армія Ерена веде останній бій за повернення стін і правду про світ за ними.'
            },
            {
                title: 'Людина-бензопила: Арка Резе',
                url: 'https://api.hikka.io/anime/chainsaw-man-movie-reze-hen-c4febd',
                images: { jpg: { large_image_url: 'https://cdn.hikka.io/content/anime/chainsaw-man-movie-reze-hen-c4febd/UfgfLlbLkAlsSy2ppbY8Vg.jpg' } },
                genres: ['Екшн', 'Надприродне', 'Комедія'],
                year: 2025,
                totalEpisodes: 1,
                rating: '9.0',
                synopsis: 'Денджі зустрічає Резе — дівчину, яка ховає секрет небезпечніший за будь-якого диявола.'
            },
        ];

        let heroItems = [],
            heroPool = [],
            heroSeenUrls = new Set(),
            heroCurrentIndex = 0,
            heroRotationTimer = null,
            heroProgressInterval = null,
            heroJustSwiped = false,
            heroIsPaused = false;

        const HERO_SLIDE_DURATION = 6500;
        const HERO_CACHE_KEY = 'vakdab_hero_cache_v3';

        let heroMountedSlide = null;
        const heroPreloadedImages = new Set();

        // Прогрів постера слайда: Promise резолвиться true після завантаження,
        // false — при помилці. Закешовані URL не качаємо двічі.
        function preloadHeroImage(url) {
            if (!url) return Promise.resolve(false);
            if (heroPreloadedImages.has(url)) return Promise.resolve(true);
            return new Promise(resolve => {
                const img = new Image();
                const done = ok => { heroPreloadedImages.add(url); resolve(ok); };
                img.onload = () => done(true);
                img.onerror = () => done(false);
                img.src = url;
            });
        }

        function getCurrentRoute() {
            if (window.Router?.currentRoute) return window.Router.currentRoute;
            const hash = window.location.hash.slice(1) || 'main';
            return hash.split('?')[0];
        }

        function openPlayer(url) {
            if (typeof window.openPlayerPage === 'function') {
                window.openPlayerPage(url);
            } else {
                window.location.hash = 'anime?' + new URLSearchParams({ url });
            }
        }

        function toast(message) {
            if (typeof window.showToast === 'function') {
                window.showToast(message);
            }
        }

        function getBookmarks() {
            if (window.Storage?.getBookmarks) return window.Storage.getBookmarks();
            try {
                return JSON.parse(localStorage.getItem('vakdab_bookmarks') || '[]');
            } catch (_) {
                return [];
            }
        }

        function saveBookmarks(bookmarks) {
            if (window.Storage?.setBookmarks) {
                window.Storage.setBookmarks(bookmarks);
            } else {
                try {
                    localStorage.setItem('vakdab_bookmarks', JSON.stringify(bookmarks));
                } catch (_) {}
            }
        }

        function isHeroItemBookmarked(url) {
            if (!url) return false;
            return getBookmarks().some(b => b?.url === url);
        }

        function toggleHeroBookmark(item) {
            if (!item?.url) return false;
            const bookmarks = getBookmarks();
            const idx = bookmarks.findIndex(b => b?.url === item.url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                saveBookmarks(bookmarks);
                toast('Видалено з обраного');
                return false;
            }
            bookmarks.push({
                url: item.url,
                title: item.title || 'Без назви',
                poster: item.images?.jpg?.large_image_url || '',
                addedAt: Date.now()
            });
            saveBookmarks(bookmarks);
            toast('Додано до обраного');
            return true;
        }

        function loadCachedHeroPool() {
            try {
                const cached = sessionStorage.getItem(HERO_CACHE_KEY);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (_) {}
            return [];
        }

        function saveCachedHeroPool(pool) {
            try {
                if (Array.isArray(pool) && pool.length > 0) {
                    sessionStorage.setItem(HERO_CACHE_KEY, JSON.stringify(pool.slice(0, 30)));
                }
            } catch (_) {}
        }

        export async function buildHeroBanner() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper) return;

            // Захист від дублювання: якщо через кеш працюють дві копії модуля,
            // друга копія не має будувати другу карусель поверх першої.
            if (window.__vakdabHeroActive) {
                if (getCurrentRoute() === 'main' && typeof window.resumeHeroRotation === 'function' && !heroRotationTimer && heroItems.length > 1) {
                    startHeroRotation();
                }
                return;
            }
            window.__vakdabHeroActive = true;

            // Якщо ми не на головній сторінці — ховаємо банер
            if (getCurrentRoute() !== 'main') {
                wrapper.style.display = 'none';
                return;
            }

            wrapper.style.display = 'block';

            // Швидка ініціалізація з кешу або fallback, щоб користувач бачив банер миттєво
            if (heroPool.length === 0) {
                const cachedPool = loadCachedHeroPool();
                heroPool = cachedPool.length > 0 ? cachedPool : [...FALLBACK_HERO_ANIME];
                heroSeenUrls = new Set();
                heroItems = takeHeroBatch();
                heroCurrentIndex = 0;
                renderHeroSlide(heroItems[0]);
                buildHeroIndicators();
                initHeroControls();
                startHeroRotation();
            } else if (heroItems.length > 1 && !heroRotationTimer) {
                // Повернення на головну після зупинки ротації — відновлюємо автопрокрутку
                startHeroRotation();
            }

            // Фонове оновлення свіжими даними з Hikka API
            fetchFreshHeroData().catch(err => {
                console.warn('Hero background fetch note:', err.message);
            });
        }

        async function fetchFreshHeroData() {
            const [topResult, mainResult] = await Promise.allSettled([
                fetchHikkaTop100(),
                fetchHikkaMain(1)
            ]);

            const topAnime = topResult.status === 'fulfilled' && Array.isArray(topResult.value) ? topResult.value : [];
            const ordinaryAnime = mainResult.status === 'fulfilled' && Array.isArray(mainResult.value) ? mainResult.value : [];

            const combined = [...topAnime, ...ordinaryAnime]
                .filter(item => item?.url && (item.images?.jpg?.large_image_url || item.image))
                .map(item => ({
                    ...item,
                    images: {
                        jpg: {
                            large_image_url: item.images?.jpg?.large_image_url || item.image || ''
                        }
                    }
                }))
                .filter((item, index, list) => list.findIndex(other => other.url === item.url) === index);

            if (combined.length > 0) {
                heroPool = combined;
                saveCachedHeroPool(heroPool);
                // Самодіагностика: якщо постер активного слайда битий (Hikka ротує URL),
                // одразу замінюємо батч свіжими даними — банер не висить темним.
                if (getCurrentRoute() === 'main' && heroItems.length > 0 && heroItems[heroCurrentIndex]) {
                    const activePoster = heroItems[heroCurrentIndex]?.images?.jpg?.large_image_url || '';
                    if (activePoster) {
                        const probe = new Image();
                        probe.onerror = () => {
                            if (getCurrentRoute() !== 'main' || heroItems.length === 0) return;
                            heroSeenUrls = new Set();
                            heroItems = takeHeroBatch();
                            heroCurrentIndex = 0;
                            renderHeroSlide(heroItems[0]);
                            buildHeroIndicators();
                        };
                        probe.src = activePoster;
                    }
                }
                // Якщо попередньо використовувався fallback — оновлюємо батч
                if (heroItems.length === 0 || heroItems[0]?.url === FALLBACK_HERO_ANIME[0].url) {
                    heroSeenUrls = new Set();
                    heroItems = takeHeroBatch();
                    heroCurrentIndex = 0;
                    if (getCurrentRoute() === 'main') {
                        renderHeroSlide(heroItems[0]);
                        buildHeroIndicators();
                        startHeroRotation();
                    }
                }
            }
        }

        function takeHeroBatch() {
            if (!heroPool.length) heroPool = [...FALLBACK_HERO_ANIME];
            const available = heroPool.filter(item => item?.url && !heroSeenUrls.has(item.url));
            if (available.length < 3) {
                heroSeenUrls.clear();
            }
            const poolToPick = heroPool.filter(item => item?.url && !heroSeenUrls.has(item.url));
            const batch = [...poolToPick].sort(() => Math.random() - 0.5).slice(0, 6);
            batch.forEach(item => heroSeenUrls.add(item.url));
            return batch.length ? batch : heroPool.slice(0, 5);
        }

        async function loadNextHeroBatch() {
            stopHeroRotation();
            let nextBatch = takeHeroBatch();
            if (!nextBatch.length) {
                heroSeenUrls.clear();
                nextBatch = takeHeroBatch();
            }
            if (!nextBatch.length) return;
            heroItems = nextBatch;
            heroCurrentIndex = 0;
            renderHeroSlide(heroItems[0]);
            buildHeroIndicators();
            startHeroRotation();
            loadHeroItemDetails(0).then(() => {
                if (heroCurrentIndex === 0) updateHeroSlideContent(heroItems[0]);
            }).catch(() => {});
            if (heroItems.length > 1) loadHeroItemDetails(1).catch(() => {});
        }

        async function loadHeroItemDetails(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            const item = heroItems[idx];
            if (item.detailsLoaded) return;
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
            try {
                const detail = await Promise.race([loadHikkaDetail(item.url), timeoutPromise]);
                item.genres = detail.genres || item.genres || [];
                item.totalEpisodes = detail.totalEpisodes || item.totalEpisodes || 0;
                item.synopsis = detail.synopsis || item.synopsis || '';
                item.year = detail.year || item.year || '';
                item.detailsLoaded = true;
                item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
            } catch (e) {
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

        function renderHeroSlide(item) {
            const container = document.getElementById('heroSlidesContainer');
            if (!container || !item) return;

            const poster = item.images?.jpg?.large_image_url || '';
            const rawTitle = String(item.title || 'Без назви').trim();
            const title = rawTitle.length > 40 ? rawTitle.substring(0, 40).trimEnd() + '…' : rawTitle;
            const genres = Array.isArray(item.genres) && item.genres.length ? item.genres : ['Аніме'];
            const rawRating = item.score ?? item.rating;
            let rating = '';
            if (rawRating && !isNaN(parseFloat(rawRating)) && !String(rawRating).includes('_') && !String(rawRating).toLowerCase().includes('pg')) {
                rating = parseFloat(rawRating).toFixed(1);
            } else {
                let seed = 0;
                for (let i = 0; i < rawTitle.length; i++) seed += rawTitle.charCodeAt(i);
                rating = (8.0 + (seed % 15) / 10).toFixed(1);
            }
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
            slide.className = 'hero-slide';
            slide.dataset.url = item.url;

            const safePoster = poster || '';
            // Постер і градієнт-заглушка в одному background-image: заглушка видно миттєво,
            // а фото домальовується поверх щойно довантажиться — без штучного чекання і без чорного екрана.
            const bgStyle = safePoster
                ? `background-image: url('${safePoster}'), linear-gradient(135deg, #1a1a1a, #2d2d2d);`
                : 'background-image: linear-gradient(135deg, #1a1a1a, #2d2d2d);';

            const bookmarked = isHeroItemBookmarked(item.url);
            slide.innerHTML = `
                <div class="hero-slide-bg" style="${bgStyle}"></div>
                <div class="hero-slide-overlay"></div>
                <div class="hero-slide-content">
                    <div class="hero-slide-title">${escapeHeroText(title)}</div>
                    <div class="hero-slide-tags">
                        ${genres.slice(0, 3).map(g => `<span class="hero-tag genre-tag">${escapeHeroText(g)}</span>`).join('')}
                    </div>
                    ${synopsisHtml}
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

            // Прибираємо слайди, що застрягли без активації (наприклад, при швидких свайпах)
            container.querySelectorAll('.hero-slide:not(.active)').forEach(el => el.remove());

            const previousSlide = heroMountedSlide;
            container.appendChild(slide);
            heroMountedSlide = slide;

            // Активуємо одразу — постер і заглушка вже в одному шарі, чекати нічого не треба.
            // Старий слайд лишається під новим до завершення fade-переходу, потім прибирається.
            slide.classList.add('active');
            if (previousSlide && previousSlide !== slide) {
                setTimeout(() => previousSlide.remove(), 550);
            }

            // Клік по слайду відкриває сторінку, якщо це не був свайп і не клік по кнопках
            slide.addEventListener('click', (e) => {
                if (heroJustSwiped) {
                    heroJustSwiped = false;
                    return;
                }
                if (e.target.closest('.hero-watch-btn, .hero-fav-btn, .hero-dot')) return;
                if (item.url) openPlayer(item.url);
            });

            // Кнопка «Дивитись»
            slide.querySelector('.hero-watch-btn')?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                if (item.url) openPlayer(item.url);
            });

            // Кнопка «В обране»
            const favBtn = slide.querySelector('.hero-fav-btn');
            favBtn?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                const active = toggleHeroBookmark(item);
                favBtn.classList.toggle('is-active', active);
                favBtn.setAttribute('aria-pressed', String(active));
                favBtn.setAttribute('aria-label', active ? 'Видалити з обраного' : 'Додати в обране');
            });
        }

        function updateHeroSlideContent(item) {
            // Оновлюємо текст слайда на місці (жанри/опис/мета після догрузки деталей)
            // без повного рендера — анімації та фон не перезапускаються.
            const slide = heroMountedSlide;
            if (!slide || !item || slide.dataset.url !== item.url) return;

            const rawTitle = String(item.title || 'Без назви').trim();
            const title = rawTitle.length > 40 ? rawTitle.substring(0, 40).trimEnd() + '…' : rawTitle;
            const titleEl = slide.querySelector('.hero-slide-title');
            if (titleEl) titleEl.innerHTML = escapeHeroText(title);

            const genres = Array.isArray(item.genres) && item.genres.length ? item.genres : ['Аніме'];
            const tagsEl = slide.querySelector('.hero-slide-tags');
            if (tagsEl) tagsEl.innerHTML = genres.slice(0, 3).map(g => `<span class="hero-tag genre-tag">${escapeHeroText(g)}</span>`).join('');

            const ratingRow = slide.querySelector('.hero-rating-row');
            if (ratingRow) {
                const rawRating = item.score ?? item.rating;
                let rating = '';
                if (rawRating && !isNaN(parseFloat(rawRating)) && !String(rawRating).includes('_') && !String(rawRating).toLowerCase().includes('pg')) {
                    rating = parseFloat(rawRating).toFixed(1);
                } else {
                    let seed = 0;
                    for (let i = 0; i < rawTitle.length; i++) seed += rawTitle.charCodeAt(i);
                    rating = (8.0 + (seed % 15) / 10).toFixed(1);
                }
                const metaParts = [];
                if (item.year) metaParts.push(item.year);
                if (item.totalEpisodes > 0) metaParts.push(item.totalEpisodes + ' еп.');
                const metaHtml = metaParts.length > 0
                    ? `<span class="hero-info-separator">·</span><span class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</span>`
                    : '';
                ratingRow.innerHTML = `<span class="hero-rating-badge"><span class="star">★</span> ${rating}</span>${metaHtml}`;
            }

            const synopsis = cleanHeroSynopsis(item.synopsis);
            if (synopsis) {
                let descEl = slide.querySelector('.hero-slide-desc');
                if (!descEl) {
                    descEl = document.createElement('div');
                    descEl.className = 'hero-slide-desc';
                    ratingRow?.parentNode?.insertBefore(descEl, ratingRow);
                }
                descEl.textContent = synopsis;
            }
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
                dot.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToSlide(idx);
                });
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

        export async function goToSlide(idx) {
            if (idx < 0 || idx >= heroItems.length) return;
            if (idx === heroCurrentIndex && document.querySelector('.hero-slide')) return;
            heroCurrentIndex = idx;
            renderHeroSlide(heroItems[idx]);
            updateHeroIndicators();
            resetHeroTimer();

            if (!heroItems[idx].detailsLoaded) {
                loadHeroItemDetails(idx).then(() => {
                    if (heroCurrentIndex === idx) updateHeroSlideContent(heroItems[idx]);
                }).catch(() => {});
            }
            const nextIdx = (idx + 1) % heroItems.length;
            if (heroItems[nextIdx]) {
                // Прогрів: постер і деталі наступного слайда вантажаться заздалегідь
                preloadHeroImage(heroItems[nextIdx].images?.jpg?.large_image_url || '');
                if (!heroItems[nextIdx].detailsLoaded) {
                    loadHeroItemDetails(nextIdx).catch(() => {});
                }
            }
        }

        export function nextSlide() {
            if (!heroItems.length) return;
            if (heroCurrentIndex >= heroItems.length - 1) {
                if (heroPool.length > heroItems.length) {
                    loadNextHeroBatch().catch(() => {});
                } else {
                    goToSlide(0);
                }
                return;
            }
            goToSlide(heroCurrentIndex + 1);
        }

        export function prevSlide() {
            if (!heroItems.length) return;
            goToSlide((heroCurrentIndex - 1 + heroItems.length) % heroItems.length);
        }

        function initHeroControls() {
            const wrapper = document.getElementById('heroWrapper');
            if (wrapper) {
                wrapper.querySelectorAll('.hero-nav-arrow, #heroPrevBtn, #heroNextBtn').forEach(el => el.remove());
            }
            initHeroGestures();
        }

        function initHeroGestures() {
            const wrapper = document.getElementById('heroWrapper');
            if (!wrapper || wrapper.dataset.gesturesInit) return;
            wrapper.dataset.gesturesInit = '1';

            let startX = 0, startY = 0, tracking = false, isDragging = false;

            // Touch-свайп для смартфонів та планшетів
            wrapper.addEventListener('touchstart', (e) => {
                if (!e.touches.length) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                tracking = true;
                isDragging = false;
            }, { passive: true });

            wrapper.addEventListener('touchmove', (e) => {
                if (!tracking || !e.touches.length) return;
                const dx = e.touches[0].clientX - startX;
                const dy = e.touches[0].clientY - startY;
                if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
                    isDragging = true;
                }
            }, { passive: true });

            wrapper.addEventListener('touchend', (e) => {
                if (!tracking || !e.changedTouches.length) return;
                tracking = false;
                const dx = e.changedTouches[0].clientX - startX;
                const dy = e.changedTouches[0].clientY - startY;
                if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.15) {
                    heroJustSwiped = true;
                    if (dx < 0) nextSlide(); else prevSlide();
                    setTimeout(() => { heroJustSwiped = false; }, 300);
                }
            }, { passive: true });

            // Drag мишкою для десктопу
            wrapper.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                if (e.target.closest('button, .hero-dot, a')) return;
                startX = e.clientX;
                startY = e.clientY;
                tracking = true;
                isDragging = false;
            });

            window.addEventListener('mousemove', (e) => {
                if (!tracking) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (Math.abs(dx) > 15) {
                    isDragging = true;
                }
            });

            window.addEventListener('mouseup', (e) => {
                if (!tracking) return;
                tracking = false;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                if (isDragging && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.15) {
                    heroJustSwiped = true;
                    if (dx < 0) nextSlide(); else prevSlide();
                    setTimeout(() => { heroJustSwiped = false; }, 300);
                }
            });

            // Пауза при наведенні курсору на десктопі
            wrapper.addEventListener('mouseenter', () => pauseHeroRotation());
            wrapper.addEventListener('mouseleave', () => {
                if (getCurrentRoute() === 'main') resumeHeroRotation();
            });
        }

        export function startHeroRotation() {
            stopHeroRotation();
            heroIsPaused = false;
            if (heroItems.length < 2) return;
            const fill = document.getElementById('heroProgressFill');
            let elapsed = 0;
            if (fill) fill.style.width = '0%';
            heroProgressInterval = setInterval(() => {
                if (heroIsPaused) return;
                elapsed += 50;
                if (fill) fill.style.width = Math.min(100, (elapsed / HERO_SLIDE_DURATION * 100)) + '%';
            }, 50);
            heroRotationTimer = setTimeout(() => {
                if (!heroIsPaused) nextSlide();
            }, HERO_SLIDE_DURATION);
        }

        export function stopHeroRotation() {
            if (heroRotationTimer) { clearTimeout(heroRotationTimer); heroRotationTimer = null; }
            if (heroProgressInterval) { clearInterval(heroProgressInterval); heroProgressInterval = null; }
            const fill = document.getElementById('heroProgressFill');
            if (fill) fill.style.width = '0%';
        }

        export function pauseHeroRotation() {
            heroIsPaused = true;
        }

        export function resumeHeroRotation() {
            heroIsPaused = false;
            if (!heroRotationTimer && heroItems.length > 1) {
                startHeroRotation();
            }
        }

        export function resetHeroTimer() {
            stopHeroRotation();
            startHeroRotation();
        }

        window.buildHeroBanner = buildHeroBanner;
        window.heroNextSlide = nextSlide;
        window.heroPrevSlide = prevSlide;
        window.stopHeroRotation = stopHeroRotation;
        window.pauseHeroRotation = pauseHeroRotation;
        window.resumeHeroRotation = resumeHeroRotation;
