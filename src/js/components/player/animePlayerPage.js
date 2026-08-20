import { doc, setDoc, deleteDoc, collection, query, where } from '../../config/firebase.js';
import { auth, db } from '../../services/firebase/client.js';
import { GENRE_MAP } from '../../config/constants.js?v=20260820-hikka-proxy-fix4';
import { Router } from '../../core/compat/router.js';
import { Storage } from '../../core/compat/storage.js?v=20260820-appearance-cleanup-v1';
import { LampaPlayer } from './lampaPlayer.js?v=20260820-player-modern-v1';
import { DailyStats } from '../rating/ratingSystem.js?v=20260820-appearance-cleanup-v1';
import {
    CATALOG_POSTER_FALLBACK, normalizeGenreList, normalizePosterUrl, pickPreferredDub,
    resolveAshdiPlaybackUrl, fetchHikkaByGenre, fetchHikkaTop100, loadHikkaDetail,
    searchHikka, switchProviderSource
} from '../../services/catalog.js';
import {
    ANIME_CARD_PLACEHOLDER, openRandomAnime, showTop100, statusLabelUa
} from '../pages/homeLegacy.js?v=20260820-gif-video-v2';
import { renderProfilePage } from '../pages/profileLegacy.js?v=20260820-gif-video-v2';
import {
    detectDeviceInfo, ensureFirebaseGuestAuth, escapeHtml, showToast, loadGenres
} from '../../legacy/app-legacy.js?v=20260820-gif-video-v2';
import { loadFeature } from '../../core/feature-loader.js?v=20260818-ranobe-v6';

        // ====================================================================
        //  ПЛЕЄР
        // ====================================================================
        export let playerPageAnimeuaSeasons = null;
        export let externalSourceCache = {};
        export let playerPageAnime = null;
        let playerPageTmdbInfo = null;
        let playerPageTmdbEpisodeMap = {};
        let playerPagePlayer = null;
        let _playerLoadController = null; // AbortController для поточного завантаження плеєра
        export let playerPageCurrentSeason = '1';
        export let playerPageCurrentDub = '';
        let playerPageCurrentQuality = '720p';
        let playerPageActiveEpisodeFile = null;
        let playerPagePlaybackRequest = 0;
        let playerPageCurrentAnimeUrl = null;
        export let playerPageCurrentSource = 'Основне';
        export const setPlayerPageAnimeuaSeasons = value => { playerPageAnimeuaSeasons = value; };
        export const setPlayerPageAnime = value => { playerPageAnime = value; };
        export const setPlayerPageCurrentSeason = value => { playerPageCurrentSeason = value; };
        export const setPlayerPageCurrentDub = value => { playerPageCurrentDub = value; };
        export const setPlayerPageCurrentSource = value => { playerPageCurrentSource = value; };
        let playerPageCurrentView = 'grid';
        let playerPageEpisodes = [];
        let playerPageSources = ['Основне'];
        let playerPageCurrentEpisodeNum = '1';
        let playerPageHistoryUpdated = false;
        let playerPageWatchStartTime = 0;
        let playerPageAccumulatedWatchSeconds = 0;
        let playerPageLastVideoTime = null;
        let playerPageIsPlaying = false;
        export let playerPageIsOpen = false;
        let playerPagePreviousBodyOverflow = '';
        let playerPagePreviousActiveElement = null;
        let playerRatingSourceIsTmdb = false; // TMDB рейтинг має пріоритет над локальним рейтингом глядачів
        let playerJikanData = null;
        let playerCharacterItems = [];
        let playerCharacterExpanded = false;
        let playerRelatedItems = [];
        let playerMediaItems = [];
        let playerMediaExpanded = false;
        let playerCountdownTimer = null;

        const QUALITY_OPTIONS = ['Максимальна', '2160p (4K)', '1440p', '1080p', '720p', '480p', '360p'];

        function renderPlayerEpisodeError(message, diagnostics, retryUrl) {
            const grid = document.getElementById('episodeViewGrid');
            if (!grid) return;
            const device = diagnostics?.device?.type || detectDeviceInfo(navigator.userAgent).type;
            const stage = diagnostics?.failedStage || 'завантаження даних плеєра';
            const detail = diagnostics?.emptyObject ? `Не знайдено: ${diagnostics.emptyObject}.` : `Етап: ${stage}.`;
            grid.innerHTML = `<div class="episode-empty player-error-state">
                <i class="fas fa-triangle-exclamation"></i>
                <strong>${escapeHtml(message)}</strong>
                <span>${escapeHtml(detail)} Пристрій: ${escapeHtml(device)}.</span>
                <button class="btn-outline player-retry-btn" type="button"><i class="fas fa-redo"></i> Спробувати ще раз</button>
            </div>`;
            const retry = grid.querySelector('.player-retry-btn');
            retry?.addEventListener('click', () => {
                retry.disabled = true;
                retry.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Повторюємо...';
                openPlayerPage(retryUrl || playerPageCurrentAnimeUrl);
            });
        }

        export async function openPlayerPage(url, options = {}) {
            loadFeature('player').catch(error => console.warn('[VakDab] player feature preload:', error));
            const modal = document.getElementById('playerPageModal');
            if (!modal) return;
            if (!playerPageIsOpen) {
                playerPagePreviousBodyOverflow = document.body.style.overflow || '';
                playerPagePreviousActiveElement = document.activeElement;
            }
            playerPageIsOpen = true;
            modal.classList.add('is-open');
            modal.setAttribute('aria-hidden', 'false');
            modal.setAttribute('aria-busy', 'true');
            document.documentElement.classList.add('player-page-open');
            document.body.classList.add('player-page-open');
            document.getElementById('bottomNav')?.classList.add('hidden-nav');
            // Скасувати попереднє завантаження якщо є
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            _playerLoadController = new AbortController();
            const _thisSignal = _playerLoadController.signal;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
            playerPageAnime = null;
            playerPageTmdbInfo = null;
            playerPageTmdbEpisodeMap = {};
            playerPageActiveEpisodeFile = null;
            playerPageCurrentEpisodeNum = '1';
            playerPagePlaybackRequest += 1;
            playerJikanData = null;
            playerCharacterItems = [];
            playerCharacterExpanded = false;
            playerRelatedItems = [];
            playerMediaItems = [];
            playerMediaExpanded = false;
            if (playerCountdownTimer) { clearInterval(playerCountdownTimer); playerCountdownTimer = null; }
            const infoGridReset = document.getElementById('animeInfoGrid');
            if (infoGridReset) infoGridReset.innerHTML = '<div class="anime-info-placeholder">Завантаження інформації…</div>';
            const countdownReset = document.getElementById('animeCountdown');
            if (countdownReset) countdownReset.textContent = '';
            setSectionState('relatedSection', false);
            setSectionState('mediaSection', false);
            setSectionState('mainCharactersSection', false);
            const mainCharactersMoreReset = document.getElementById('mainCharactersMoreBtn');
            if (mainCharactersMoreReset) mainCharactersMoreReset.hidden = true;
            playerPageCurrentAnimeUrl = url;
            playerPageHistoryUpdated = false;
            playerPageWatchStartTime = 0;
            playerPageAccumulatedWatchSeconds = 0;
            playerPageLastVideoTime = null;
            playerPageIsPlaying = false;
            document.getElementById('playerVideoContainer').classList.add('active');
            const posterTargets = [document.getElementById('playerPosterImg'), document.getElementById('playerHeroPoster')];
            posterTargets.forEach(img => { if (img) { img.src = CATALOG_POSTER_FALLBACK; img.alt = ''; } });
            document.getElementById('playerBlurBg').style.backgroundImage = `url(${CATALOG_POSTER_FALLBACK})`;
            document.getElementById('playerPageVideo').innerHTML = '';
            document.getElementById('episodeViewGrid').innerHTML = '';
            document.getElementById('episodeViewCompact').innerHTML = '';
            document.getElementById('episodeViewClassic').innerHTML = '';
            document.getElementById('episodePanel').classList.remove('visible');
            document.getElementById('page-episodes').classList.remove('active');
            document.getElementById('page-info').classList.add('active');
            document.getElementById('playerSynopsis').textContent = '';
            document.getElementById('synopsisMoreBtn').style.display = 'none';
            document.getElementById('playerTopbarTitle').textContent = '';
            document.getElementById('playerVideoEpisodeOverlay')?.replaceChildren();
            document.getElementById('playerVideoSeasonOverlay')?.replaceChildren();
            document.getElementById('playerKicker').style.display = '';
            const _resetLogoImg = document.getElementById('playerTitleLogo');
            if (_resetLogoImg) { _resetLogoImg.style.display = 'none'; _resetLogoImg.src = ''; }
            document.getElementById('castSection').style.display = 'none';
            document.getElementById('castList').innerHTML = '';
            const resetCastTitle = document.querySelector('#castSection .section-title');
            if (resetCastTitle) resetCastTitle.textContent = 'Актори';
            document.getElementById('mainCharactersList').innerHTML = '';
            document.getElementById('mainCharactersMoreBtn').hidden = true;
            const _resetRelatedSection = document.getElementById('relatedSeasonsSection');
            if (_resetRelatedSection) _resetRelatedSection.style.display = 'none';
            playerRatingSourceIsTmdb = false;
            updateLikeButton();
            updateDislikeButton();
            updateBookmarkButton(url);
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            modal.querySelector('.modal-content').scrollTop = 0;
            modal.focus({ preventScroll: true });
            try {
                const anime = await loadHikkaDetail(url);
                // Якщо плеєр вже закрили поки завантажувалось — не оновлювати DOM
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                playerPageAnime = anime;
                playerPageAnimeuaSeasons = {};
                externalSourceCache = {};
                playerPageSources = anime.mikaiUrl ? ['Mikai / ASHDI'] : anime.animeOnUrl ? ['AnimeON / ASHDI'] : ['Основне'];
                playerPageCurrentSource = playerPageSources[0];
                const posterUrl = normalizePosterUrl(anime.images?.jpg?.large_image_url);
                document.getElementById('playerPosterImg').src = posterUrl;
                const heroPoster = document.getElementById('playerHeroPoster');
                if (heroPoster) { heroPoster.src = posterUrl; heroPoster.alt = anime.title || ''; }
                document.getElementById('playerPosterTitle').textContent = anime.title;
                document.getElementById('playerKicker').textContent = anime.originalTitle || anime.title;
                document.getElementById('playerTopbarTitle').textContent = anime.title;
                document.getElementById('playerBlurBg').style.backgroundImage = `url(${posterUrl})`;
                const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                    e) => Math.max(s2, e.length), 0), 0);
                document.getElementById('playerAgeBadge').textContent = anime.score || '—';
                const isMovie = playerAnimeIsMovie(anime);
                document.getElementById('playerStatusTag').textContent = isMovie ? 'Фільм' : (totalEpisodes > 0 ? 'Онгоїнг' : 'Завершено');
                const animeRuntime = formatMovieRuntime(anime.runtimeMinutes);
                document.getElementById('playerMetaLine').textContent = isMovie
                    ? `${anime.year || '—'}, Фільм${animeRuntime ? ` · ${animeRuntime}` : ''}`
                    : `${anime.year || '—'}, ${totalEpisodes} еп.`;
                document.getElementById('playerTagRow').innerHTML =
                    normalizeGenreList(anime.genres).slice(0, 4).map(g => `<span class="tag">${escapeHtml(g)}</span>`).join('');
                document.getElementById('playerEpisodeCountNum').textContent = totalEpisodes;
                const synopsisEl = document.getElementById('playerSynopsis');
                synopsisEl.textContent = anime.synopsis || 'Опис відсутній.';
                const moreBtn = document.getElementById('synopsisMoreBtn');
                setTimeout(() => {
                    if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) {
                        moreBtn.style.display = 'block';
                    }
                }, 100);
                moreBtn.onclick = () => {
                    synopsisEl.classList.toggle('expanded');
                    moreBtn.textContent = synopsisEl.classList.contains('expanded') ? 'менше' : 'більше';
                };
                updateSourceChip();
                loadAnimeRatingAggregate(url);
                const seasons = Object.keys(anime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                playerPageCurrentSeason = seasons[0] || '1';
                playerPageCurrentDub = pickPreferredDub(anime.seasons[playerPageCurrentSeason]);
                playerPageCurrentEpisodeNum = '1';
                playerPageCurrentQuality = '720p';
                buildSeasonRow(seasons);
                buildEpisodeViews();
                updateFilterChip();
                updatePlayFabLabel();
                document.getElementById('episodePanel').classList.add('visible');
                if (seasons.length === 0 || Object.keys(anime.seasons || {}).length === 0) {
                    renderPlayerEpisodeError('Аніме поки що не вийшло в українській озвучці.', anime._diagnostics, anime.url);
                    console.warn('No episodes found for anime:', anime.url, anime._diagnostics);
                }
                buildBottomSheetData();
                modal.setAttribute('aria-busy', 'false');
                if (window.lucide) lucide.createIcons();

                // ============================================================
                //  TMDB — заміна метаданих на офіційні (жанр/рік/опис/постер/
                //  актори/лого/віковий рейтинг). Відео залишається з Hikka/Mikai.
                // ============================================================
                (async () => {
                    try {
                        const tmdbInfo = await fetchTmdbForAnime(anime);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        if (!tmdbInfo) { await loadAndRenderJikanExtras(anime, null, null); return; }
                        playerPageTmdbInfo = tmdbInfo;
                        const currentSeasonNum = String(playerPageCurrentSeason || '1');
                        const currentSeasonPoster = await fetchTmdbSeasonPoster(tmdbInfo, currentSeasonNum);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        const details = await fetchTmdbFullDetails(tmdbInfo);
                        if (_thisSignal.aborted || playerPageCurrentAnimeUrl !== url) return;
                        if (!details) { await loadAndRenderJikanExtras(anime, tmdbInfo, null); return; }

                        // Artwork always remains from Hikka. TMDB is metadata-only.
                        const isMovie = tmdbInfo.mediaType === 'movie' || playerAnimeIsMovie(anime);
                        const hikkaPoster = posterUrl || ANIME_CARD_PLACEHOLDER;
                        const tmdbPoster = normalizePosterUrl(tmdbImgUrl(currentSeasonPoster || details.poster_path, 'w780'), hikkaPoster);
                        // Hikka є джерелом істини для назви, сезону, року, статусу, жанрів і серій.
                        // TMDB використовується лише для постера, логотипа та рейтингу.
                        const title = anime.title || details.name || details.original_name || 'Без назви';
                        const originalTitle = anime.originalTitle || details.original_name || title;
                        const year = anime.year || (details.release_date || details.first_air_date || '').slice(0, 4) || '—';
                        const numEpisodes = totalEpisodes || anime.totalEpisodes || 0;
                        const runtime = formatMovieRuntime(anime.runtimeMinutes) || formatMovieRuntime(details.runtime);
                        const hikkaStatus = statusLabelUa(anime.status);
                        const statusLabel = isMovie ? 'Фільм' : (hikkaStatus || (numEpisodes > 0 ? 'Онгоїнг' : 'Завершено'));
                        const overview = anime.synopsis || details.overview || '';
                        const ageRating = tmdbAgeRating(details);
                        const logoUrl = tmdbBestLogo(details);

                        // Постери плеєра — з TMDB, fallback залишається Hikka.
                        document.getElementById('playerPosterImg').src = tmdbPoster;
                        const heroPoster = document.getElementById('playerHeroPoster');
                        if (heroPoster) { heroPoster.src = tmdbPoster; heroPoster.alt = title || ''; }
                        const tmdbBackdrop = tmdbBestBackdrop(details);
                        document.getElementById('playerBlurBg').style.backgroundImage = `url(${tmdbBackdrop || tmdbPoster})`;
                        document.getElementById('playerPosterTitle').textContent = title;
                        document.getElementById('playerKicker').textContent = originalTitle;
                        document.getElementById('playerTopbarTitle').textContent = title;
                        document.getElementById('playerAgeBadge').textContent = ageRating || anime.score || '—';
                        document.getElementById('playerStatusTag').textContent = statusLabel;
                        document.getElementById('playerMetaLine').textContent = isMovie ? `${year}, Фільм${runtime ? ` · ${runtime}` : ''}` : `${year}, ${numEpisodes} еп.`;
                        // Не перезаписуємо жанри Hikka навіть коли TMDB повернув свої жанри.
                        document.getElementById('playerEpisodeCountNum').textContent = numEpisodes;
                        // Description comes from Hikka. TMDB is not allowed to replace it.
                        if (!String(anime.synopsis || '').trim() && overview) {
                            synopsisEl.textContent = overview;
                            moreBtn.style.display = 'none';
                            setTimeout(() => {
                                if (synopsisEl.scrollHeight > synopsisEl.clientHeight + 2) moreBtn.style.display = 'block';
                            }, 100);
                        }
                        if (details.vote_average) {
                            playerRatingSourceIsTmdb = true;
                            document.getElementById('playerRatingNum').textContent = details.vote_average.toFixed(1);
                            document.getElementById('playerRatingLabel').textContent = 'TMDB';
                        }
                        const logoImg = document.getElementById('playerTitleLogo');
                        const kickerEl = document.getElementById('playerKicker');
                        if (logoUrl && logoImg) {
                            logoImg.onerror = () => { logoImg.style.display = 'none'; if (kickerEl) kickerEl.style.display = ''; };
                            logoImg.onload = () => { logoImg.style.display = 'block'; if (kickerEl) kickerEl.style.display = 'none'; };
                            logoImg.src = logoUrl;
                        }
                        renderCast(details);
                        loadAndRenderJikanExtras(anime, tmdbInfo, details);
                    } catch (e) {
                        console.warn('TMDB metadata enrich failed', e);
                    }
                })();
            } catch (err) {
                // Якщо запит скасовано (юзер закрив плеєр або відкрив інше) — мовчки ігноруємо
                if (_thisSignal.aborted || modal.style.display === 'none') return;
                if (_thisSignal.aborted || (err && (err.name === 'AbortError' || err._playerAborted || (err.message && (err.message.includes('aborted') || err.message.includes('Fetch is aborted')))))) return;

                const isNotFound = err.message && (err.message.includes('не знайдено') || err.message.includes('404'));
                const isTimeout = err.message && err.message.includes('очікування');
                const isNetwork = err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('502') || err.message.includes('503') || err.message.includes('aborted') || err.message.includes('Fetch is aborted'));

                let userMsg, icon;
                if (isNotFound) {
                    icon = 'fa-search';
                    userMsg = 'Аніме не знайдено на джерелі';
                    document.getElementById('playerSynopsis').textContent = 'Це аніме поки що недоступне.';
                } else if (isTimeout) {
                    icon = 'fa-clock';
                    userMsg = 'Час очікування вичерпано. Перевірте з\'єднання і спробуйте ще раз.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else if (isNetwork) {
                    icon = 'fa-wifi';
                    userMsg = 'Помилка мережі або сервер не відповідає. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                } else {
                    icon = 'fa-exclamation-circle';
                    userMsg = 'Помилка завантаження. Спробуйте пізніше.';
                    document.getElementById('playerSynopsis').textContent = userMsg;
                }
                modal.setAttribute('aria-busy', 'false');

                const diagForErr = err._diagnostics || {
                    url, ua: navigator.userAgent, device: detectDeviceInfo(navigator.userAgent),
                    httpStatus: null, contentType: null, cfCacheStatus: null, cfRay: null, usedCloudflareWorker: true, corsError: isNetwork,
                    htmlLoaded: false, htmlSize: 0, iframeCount: 0, iframeUrls: [], foundAshdi: false, foundVidmoly: false, foundPlayerjs: false,
                    foundDataSrc: false, foundDataFile: false, foundVideoTag: false, foundSourceTag: false, playerUrlsCount: 0, seasonsCount: 0,
                    episodesCount: 0, extractPlayerIframeUrlsRan: false, extractSourcesFromTextRan: false, foundM3u8: false, foundMp4: false,
                    foundPlayerjsJson: false, foundBase64Playerjs: false, jsErrors: [err.stack || err.message || String(err)],
                    failedStage: 'openPlayerPage() — необроблена помилка завантаження', emptyObject: null
                };

                if (options.fromDeepLink) {
                    closePlayerPage();
                    Router.goTo('main');
                    setTimeout(() => showToast('Аніме не знайдено'), 0);
                    return;
                }
                renderPlayerEpisodeError(userMsg, diagForErr, url);
                document.getElementById('episodePanel').classList.add('visible');
                console.error('Player load error:', err.message || err, diagForErr);
            }
        }

        // Будуємо силку на НАШ сайт (не на джерело hikka.io / mikai.me) — при відкритті вона
        // сама відкриє потрібне аніме в плеєрі, див. обробку #anime? при завантаженні сторінки.
        function buildShareUrl(animeUrl) {
            // Посилання працює на Firebase Hosting без окремого /share endpoint.
            // URLSearchParams при відкритті hash уже декодує значення один раз.
            const base = new URL('./', window.location.href);
            base.hash = `anime?url=${encodeURIComponent(animeUrl || '')}`;
            return base.href;
        }

        function shareAnime() {
            const anime = playerPageAnime;
            const url = buildShareUrl(playerPageCurrentAnimeUrl) || window.location.href;
            const title = anime?.title || 'VAKDAB';
            if (navigator.share) {
                navigator.share({ title, text: `Дивись «${title}» у VAKDAB ✨`, url }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => showToast('Посилання скопійовано'))
                    .catch(() => showToast('Не вдалося скопіювати посилання'));
            } else {
                showToast('Поділитися не підтримується на цьому пристрої');
            }
        }

        function findContinueWatching(anime) {
            if (!anime || !anime.seasons) return null;
            const history = Storage.getHistory();
            const entry = history.find(h => h.url === anime.url);
            if (!entry) return null;
            const season = entry.season || '1';
            const dubs = Object.keys(anime.seasons[season] || {});
            for (const dub of dubs) {
                const eps = anime.seasons[season][dub] || [];
                const ep = eps.find(e => e.episode === entry.episode);
                if (ep) return { season, dub, ep, progress: entry.progress || 0 };
            }
            return null;
        }

        function updatePlayFabLabel() {
            const label = document.getElementById('playerPlayFabLabel');
            if (!label || !playerPageAnime) return;
            const cw = findContinueWatching(playerPageAnime);
            label.textContent = (cw && cw.progress < 95) ? 'Продовжити' : 'Дивитись';
        }

        function playFeaturedEpisode() {
            if (!playerPageAnime) { showToast('Аніме ще завантажується'); return; }
            const cw = findContinueWatching(playerPageAnime);
            if (cw && cw.progress < 95) {
                if (cw.season !== playerPageCurrentSeason || cw.dub !== playerPageCurrentDub) {
                    playerPageCurrentSeason = cw.season;
                    playerPageCurrentDub = cw.dub;
                    buildEpisodeViews();
                    updateFilterChip();
                    const row = document.getElementById('episodeSeasonRow');
                    if (row) {
                        row.querySelectorAll('.season-num').forEach(b => b.classList.toggle('active', b.dataset.season === cw.season));
                    }
                }
                playEpisode(cw.ep.file, cw.ep.episode);
                return;
            }
            const episodes = getCurrentEpisodes();
            if (!episodes.length) { showToast('Немає доступних серій'); return; }
            playEpisode(episodes[0].file, episodes[0].episode);
        }

        export function updateSourceChip() {
            const label = document.getElementById('playerSourceLabel');
            if (label) label.textContent = playerPageCurrentSource || 'Джерело';
            const watchSourceValue = document.getElementById('watchSourceValue');
            if (watchSourceValue) watchSourceValue.textContent = `${playerPageCurrentSource || 'Джерело'} · ${playerPageCurrentQuality || ''}`;
        }

        function renderDubLogo(dubName) {
            const logoUrl = playerPageAnime?.dubLogos?.[dubName] ||
                playerPageAnime?.seasons?.[playerPageCurrentSeason]?.[dubName]?.find(ep => ep?.teamLogo)?.teamLogo || '';
            const fallback = escapeHtml(String(dubName || 'Оз').trim().slice(0, 2).toUpperCase());
            if (!logoUrl) return `<span class="dub-logo dub-logo-fallback" aria-hidden="true">${fallback}</span>`;
            return `<span class="dub-logo" aria-hidden="true"><img src="${escapeHtml(logoUrl)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'"><span class="dub-logo-fallback" style="display:none">${fallback}</span></span>`;
        }

        function renderCompactPlayerSelectors() {
            const episodeSelect = document.getElementById('playerEpisodeSelect');
            const dubSelect = document.getElementById('playerDubSelect');
            const seasonSelect = document.getElementById('playerSeasonSelect');
            const episodes = getCurrentEpisodes();
            const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
            const dubs = Object.keys(playerPageAnime?.seasons?.[playerPageCurrentSeason] || {}).sort();
            if (episodeSelect) {
                episodeSelect.innerHTML = episodes.map(ep => `<option value="${escapeHtml(String(ep.episode))}">Серія ${escapeHtml(String(ep.episode))}</option>`).join('');
                episodeSelect.value = String(playerPageCurrentEpisodeNum || episodes[0]?.episode || '1');
            }
            if (dubSelect) {
                dubSelect.innerHTML = dubs.map(d => `<option value="${escapeHtml(String(d))}">${escapeHtml(String(d))}</option>`).join('');
                dubSelect.value = String(playerPageCurrentDub || dubs[0] || '');
            }
            if (seasonSelect) {
                seasonSelect.innerHTML = seasons.map(s => `<option value="${escapeHtml(String(s))}">Сезон ${escapeHtml(String(s))}</option>`).join('');
                seasonSelect.value = String(playerPageCurrentSeason || seasons[0] || '1');
            }
            const currentIndex = episodes.findIndex(ep => String(ep.episode) === String(playerPageCurrentEpisodeNum));
            document.getElementById('playerPrevEpisode')?.toggleAttribute('disabled', currentIndex <= 0 || !episodes.length);
            document.getElementById('playerNextEpisode')?.toggleAttribute('disabled', currentIndex < 0 || currentIndex >= episodes.length - 1);
            const logo = playerPageAnime?.dubLogos?.[playerPageCurrentDub] || dubs.flatMap(d => playerPageAnime?.seasons?.[playerPageCurrentSeason]?.[d] || []).find(ep => ep?.teamLogo)?.teamLogo || '';
            const logoEl = document.getElementById('playerCompactDubLogo');
            if (logoEl) logoEl.innerHTML = logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy">` : escapeHtml(String(playerPageCurrentDub || 'О').trim().slice(0, 1).toUpperCase());
        }

        export function updateFilterChip() {
            const chip = document.getElementById('playerFilterChip');
            if (chip) chip.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
            const watchFilterValue = document.getElementById('watchFilterValue');
            if (watchFilterValue) watchFilterValue.textContent = `Сезон ${playerPageCurrentSeason} · ${playerPageCurrentDub}`;
            const dubs = Object.keys(playerPageAnime?.seasons?.[playerPageCurrentSeason] || {}).sort();
            let formatHtml = dubs.map(d => {
                const active = d === playerPageCurrentDub ? ' active-format' : '';
                return `<span class="format-pill${active}" data-dub="${escapeHtml(d)}" aria-label="${escapeHtml(d)}" style="cursor:pointer;">${renderDubLogo(d)}<span class="dub-label">${escapeHtml(String(d).toUpperCase())}</span></span>`;
            }).join('');
            [document.getElementById('playerDubControls')].forEach(formatRow => {
                if (!formatRow) return;
                formatRow.innerHTML = formatHtml;
                formatRow.querySelectorAll('.format-pill[data-dub]').forEach(pill => {
                    pill.addEventListener('click', () => selectDubFromSheet(pill.dataset.dub));
                });
            });
            renderSeasonTabs();
            renderCompactPlayerSelectors();
        }

        function renderSeasonTabs() {
            const sectionTitle = document.getElementById('episodeSectionTitle');
            if (!sectionTitle) return;
            const seasons = Object.keys(playerPageAnime?.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
            if (seasons.length <= 1) {
                sectionTitle.textContent = `Сезон ${playerPageCurrentSeason || 1}`;
                sectionTitle.classList.add('single');
                return;
            }
            sectionTitle.classList.remove('single');
            sectionTitle.innerHTML = seasons.map(s => {
                const active = s === playerPageCurrentSeason ? ' active-season-tab' : '';
                return `<span class="season-tab${active}" data-season="${s}">Сезон ${s}</span>`;
            }).join('');
            sectionTitle.querySelectorAll('.season-tab').forEach(tab => {
                tab.addEventListener('click', () => selectSeasonFromSheet(tab.dataset.season));
            });
        }

        // ====================================================================
        //  СТОРІНКА "ДИВИТИСЯ" — окрема від інформації про аніме
        // ====================================================================
        function openWatchPage() {
            if (!playerPageAnime) { showToast('Аніме ще завантажується'); return; }
            // Episodes now live below the anime information on the same page.
            document.getElementById('page-info')?.classList.add('active');
            const episodesSection = document.querySelector('#playerPageModal #playerVideoContainer');
            if (episodesSection) episodesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const cw = findContinueWatching(playerPageAnime);
            if (cw && cw.progress < 95 && (cw.season !== playerPageCurrentSeason || cw.dub !== playerPageCurrentDub)) {
                playerPageCurrentSeason = cw.season;
                playerPageCurrentDub = cw.dub;
                buildEpisodeViews();
                updateFilterChip();
            }
        }

        function closeWatchPage() {
            // Вбудований плеєр живе на одному screen; при закритті лише очищаємо відео.
            document.getElementById('page-info')?.classList.add('active');
            if (playerPagePlayer) {
                if (playerPagePlayer._timeUpdateListener && playerPagePlayer.videoRef) {
                    playerPagePlayer.videoRef.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer.destroy();
                playerPagePlayer = null;
            }
            document.getElementById('playerVideoContainer').classList.remove('active');
            document.getElementById('playerPageVideo').innerHTML = '';
        }

        export function buildSeasonRow(seasons) {
            const row = document.getElementById('episodeSeasonRow');
            if (!row) return;
            let html = `<span>Сезон</span>`;
            seasons.forEach(s => {
                const active = s === playerPageCurrentSeason ? ' active' : '';
                html += `<div class="season-num${active}" data-season="${s}">${s}</div>`;
            });
            row.innerHTML = html;
            row.querySelectorAll('.season-num').forEach(btn => {
                btn.addEventListener('click', () => {
                    const season = btn.dataset.season;
                    if (season === playerPageCurrentSeason) return;
                    playerPageCurrentSeason = season;
                    const dubs = Object.keys((playerPageAnime.seasons[season]) || {}).sort();
                    playerPageCurrentDub = dubs[0] || '';
                    row.querySelectorAll('.season-num').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    buildEpisodeViews();
                    refreshPlayerSeasonPoster(season);
                    updateFilterChip();
                    updatePlayFabLabel();
                    buildBottomSheetData();
                });
            });
        }

        function getCurrentEpisodes() {
            if (!playerPageAnime) return [];
            const eps = playerPageAnime.seasons?.[playerPageCurrentSeason]?.[playerPageCurrentDub] || [];
            return eps;
        }

        function getEpisodeProgress(episode) {
            const history = Storage.getHistory();
            const animeUrl = playerPageCurrentAnimeUrl;
            const found = history.find(h => h.url === animeUrl && h.episode === episode);
            return found ? Math.min(found.progress || 0, 100) : 0;
        }

        // ====================================================================
        //  TMDB — метадані та постери (постачальник картинок/оцінок), відео
        //  завжди залишається з hikka.io / mikai.me — TMDB тут лише для оформлення.
        // ====================================================================
        const TMDB_API_KEY = '38fef08bc6a49bdd5a69c336d34a7954';
        const TMDB_BASE = 'https://api.themoviedb.org/3';
        const TMDB_IMG = 'https://image.tmdb.org/t/p';
        let tmdbAnimeCache = {};

        function cleanTitleForTmdb(title) {
            return String(title || '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[«»"'`]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function tmdbQueryVariants(anime) {
            const values = [anime?.originalTitle, anime?.title];
            try {
                const slug = decodeURIComponent(new URL(anime?.url || '').pathname.split('/').pop() || '')
                    .replace(/\.(html?|php)$/i, '').replace(/^\d+[-_]+/, '').replace(/[-_]+/g, ' ');
                values.push(slug);
            } catch { /* URL may be absent on external items */ }
            const variants = [];
            values.filter(Boolean).forEach(value => {
                const clean = cleanTitleForTmdb(value);
                if (!clean) return;
                variants.push(clean);
                variants.push(clean
                    .replace(/\b(?:сезон|season|частина|part|cour|tv|серіал)\s*\d+\b/gi, '')
                    .replace(/\b\d+\s*(?:сезон|season|частина|part|cour)\b/gi, '')
                    .replace(/\s+/g, ' ').trim());
                variants.push(clean.split(/\s+[/:|]\s+/)[0].trim());
            });
            return [...new Set(variants.filter(v => v.length >= 2))].slice(0, 6);
        }

        function tmdbImgUrl(path, size) {
            return path ? `${TMDB_IMG}/${size || 'w342'}${path}` : null;
        }

        function tmdbNormalizeTitle(value) {
            return cleanTitleForTmdb(value).toLowerCase()
                .replace(/[^a-zа-яіїєґ0-9\s]/gi, ' ')
                .replace(/\b(season|сезон|part|частина|tv|серіал|anime)\b/gi, ' ')
                .replace(/\s+/g, ' ').trim();
        }

        function tmdbCardType(hit) {
            if (!hit) return null;
            if (hit.media_type === 'movie') return 'Фільм';
            const isAnimation = (hit.genre_ids || []).includes(16);
            const isJapanese = ['ja', 'ko'].includes((hit.original_language || '').toLowerCase()) ||
                (hit.origin_country || []).some(c => ['JP', 'KR'].includes(c));
            return isAnimation && isJapanese ? 'Аніме' : 'Серіал';
        }

        function tmdbIsLikelyAnime(hit) {
            if (!hit || !(hit.genre_ids || []).includes(16)) return false;
            const language = (hit.original_language || '').toLowerCase();
            const countries = hit.origin_country || [];
            return ['ja', 'ko', 'zh'].includes(language) || countries.some(c => ['JP', 'KR', 'CN'].includes(c));
        }

        function tmdbCandidateScore(hit, query, anime = null) {
            const q = tmdbNormalizeTitle(query);
            const candidateNames = [hit?.title, hit?.name, hit?.original_name].filter(Boolean).map(tmdbNormalizeTitle);
            const originalQuery = tmdbNormalizeTitle(anime?.originalTitle || '');
            const title = tmdbNormalizeTitle(hit.title || hit.name || hit.original_name || '');
            if (!q || !title) return -1000;
            let score = 0;
            if (candidateNames.includes(originalQuery) && originalQuery) score += 35;
            if (title === q) score += 140;
            else if (title.includes(q) || q.includes(title)) score += 45;
            const qTokens = new Set(q.split(' ').filter(Boolean));
            const overlap = title.split(' ').filter(t => qTokens.has(t)).length;
            score += overlap * 10;
            if (hit.media_type === 'tv') score += 8;
            if (tmdbIsLikelyAnime(hit)) score += 35;
            if (hit.poster_path) score += 5;
            return score + Math.min(Number(hit.popularity) || 0, 20) * 0.1;
        }

        const tmdbCardFrameCache = new Map();

        async function fetchTmdbCardFrame(tmdbId, mediaType, fallbackPath) {
            const key = `${mediaType}:${tmdbId}`;
            if (tmdbCardFrameCache.has(key)) return tmdbCardFrameCache.get(key);
            let frame = fallbackPath ? tmdbImgUrl(fallbackPath, 'w780') : null;
            if (mediaType === 'tv') {
                try {
                    const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}/season/1?api_key=${TMDB_API_KEY}&language=en-US`);
                    if (res.ok) {
                        const data = await res.json();
                        const still = (data.episodes || []).find(ep => ep.still_path)?.still_path;
                        if (still) frame = tmdbImgUrl(still, 'w780');
                    }
                } catch (e) {
                    console.warn('TMDB episode frame failed', { tmdbId, error: e });
                }
            }
            tmdbCardFrameCache.set(key, frame);
            return frame;
        }

        export async function fetchTmdbCardInfo(anime) {
            if (!anime || !TMDB_API_KEY) return null;
            const cacheKey = 'card:' + (anime.url || anime.title);
            if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
            const queries = tmdbQueryVariants(anime);
            const languages = ['uk-UA', 'en-US'];
            let candidates = [];
            for (const q of queries) {
                for (const language of languages) {
                    try {
                        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(q)}&include_adult=false`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        candidates.push(...(data.results || []).filter(r =>
                            (r.media_type === 'tv' || r.media_type === 'movie') && r.poster_path
                        ).map(r => ({ ...r, _query: q })));
                    } catch (e) {
                        console.error('TMDB card search failed', { query: q, language, error: e });
                    }
                }
            }
            if (candidates.length) {
                const unique = [...new Map(candidates.map(r => [`${r.media_type}:${r.id}`, r])).values()];
                const preferredType = anime.type === 'movie' ? 'movie' : 'tv';
                    const matching = unique
                    .filter(item => item.media_type === preferredType && tmdbIsLikelyAnime(item))
                    .sort((a, b) => tmdbCandidateScore(b, b._query, anime) - tmdbCandidateScore(a, a._query, anime));
                const hit = matching[0];
                if (hit && tmdbCandidateScore(hit, hit._query, anime) >= 45) {
                    const frame = await fetchTmdbCardFrame(hit.id, hit.media_type, hit.backdrop_path);
                    const info = {
                        poster: tmdbImgUrl(hit.poster_path, 'w500'),
                        frame,
                        rating: hit.vote_average ? Number(hit.vote_average).toFixed(1) : null,
                        type: tmdbCardType(hit),
                        mediaType: hit.media_type,
                        tmdbId: hit.id
                    };
                    tmdbAnimeCache[cacheKey] = info;
                    return info;
                }
            }
            tmdbAnimeCache[cacheKey] = null;
            return null;
        }

        async function fetchTmdbForAnime(anime) {
            if (!anime || !TMDB_API_KEY) return null;
            const cacheKey = anime.url || anime.title;
            if (tmdbAnimeCache[cacheKey] !== undefined) return tmdbAnimeCache[cacheKey];
            const queries = tmdbQueryVariants(anime);
            const languages = ['uk-UA', 'en-US', 'ru-RU'];
            const expectedType = playerAnimeIsMovie(anime) ? 'movie' : 'tv';
            let allCandidates = [];
            for (const q of queries) {
                for (const language of languages) {
                    try {
                        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&language=${language}&query=${encodeURIComponent(q)}&include_adult=false`);
                        if (!res.ok) continue;
                        const data = await res.json();
                        allCandidates.push(...(data.results || []).filter(r =>
                            r.media_type === expectedType && r.poster_path && tmdbIsLikelyAnime(r)
                        ).map(r => ({ ...r, _query: q })));
                    } catch (e) { console.warn('TMDB search failed', { query: q, language, error: e }); }
                }
            }
            const ranked = [...allCandidates.reduce((map, candidate) => {
                const key = `${candidate.media_type}:${candidate.id}`;
                const score = tmdbCandidateScore(candidate, candidate._query, anime);
                const previous = map.get(key);
                if (!previous || score > previous._tmdbScore) map.set(key, { ...candidate, _tmdbScore: score });
                return map;
            }, new Map()).values()]
                .sort((a, b) => b._tmdbScore - a._tmdbScore);
            const best = ranked[0];
            if (best && best._tmdbScore >= 45) {
                const info = { id: best.id, mediaType: best.media_type, poster: best.poster_path, backdrop: best.backdrop_path, seasonsCache: {}, seasonPosters: {} };
                tmdbAnimeCache[cacheKey] = info;
                return info;
            }
            tmdbAnimeCache[cacheKey] = null;
            return null;
        }

        async function fetchTmdbSeasonEpisodes(tmdbInfo, seasonNum) {
            if (!tmdbInfo || !tmdbInfo.id) return null;
            if (tmdbInfo.seasonsCache[seasonNum] !== undefined) return tmdbInfo.seasonsCache[seasonNum];
            try {
                const res = await fetch(`${TMDB_BASE}/tv/${tmdbInfo.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}`);
                if (!res.ok) { tmdbInfo.seasonsCache[seasonNum] = null; return null; }
                const data = await res.json();
                tmdbInfo.seasonsCache[seasonNum] = data.episodes || [];
                return tmdbInfo.seasonsCache[seasonNum];
            } catch (e) { tmdbInfo.seasonsCache[seasonNum] = null; return null; }
        }
        async function fetchTmdbSeasonPoster(tmdbInfo, seasonNum) {
            if (!tmdbInfo || tmdbInfo.mediaType !== 'tv' || !tmdbInfo.id) return null;
            tmdbInfo.seasonPosters ||= {};
            if (tmdbInfo.seasonPosters[seasonNum] !== undefined) return tmdbInfo.seasonPosters[seasonNum];
            try {
                const res = await fetch(`${TMDB_BASE}/tv/${tmdbInfo.id}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=uk-UA`);
                if (!res.ok) { tmdbInfo.seasonPosters[seasonNum] = null; return null; }
                const data = await res.json();
                const poster = data.poster_path || null;
                tmdbInfo.seasonPosters[seasonNum] = poster;
                return poster;
            } catch (e) {
                tmdbInfo.seasonPosters[seasonNum] = null;
                return null;
            }
        }
        async function refreshPlayerSeasonPoster(seasonNum) {
            const tmdbInfo = playerPageTmdbInfo;
            if (!tmdbInfo || tmdbInfo.mediaType !== 'tv') return;
            const requestedSeason = String(seasonNum || '1');
            const seasonPoster = await fetchTmdbSeasonPoster(tmdbInfo, requestedSeason);
            if (String(playerPageCurrentSeason || '1') !== requestedSeason || !playerPageIsOpen) return;
            const fallback = tmdbInfo.poster ? tmdbImgUrl(tmdbInfo.poster, 'w780') : ANIME_CARD_PLACEHOLDER;
            const poster = normalizePosterUrl(tmdbImgUrl(seasonPoster, 'w780'), fallback);
            const posterEl = document.getElementById('playerPosterImg');
            const heroPoster = document.getElementById('playerHeroPoster');
            const blur = document.getElementById('playerBlurBg');
            if (posterEl) posterEl.src = poster;
            if (heroPoster) heroPoster.src = poster;
            if (blur) blur.style.backgroundImage = `url(${poster})`;
        }

        // ====================================================================
        //  TMDB — ПОВНІ МЕТАДАНІ (жанр/рік/опис/постер/актори/лого/віковий рейтинг)
        //  Відео завжди залишається з Hikka/Mikai/uaserials — TMDB тут лише дані для UI.
        // ====================================================================
        async function fetchTmdbFullDetails(tmdbInfo) {
            if (!tmdbInfo || !tmdbInfo.id) return null;
            if (tmdbInfo.fullDetails !== undefined) return tmdbInfo.fullDetails;
            try {
                const mediaPath = tmdbInfo.mediaType === 'movie' ? 'movie' : 'tv';
                const append = tmdbInfo.mediaType === 'movie' ? 'credits,images,release_dates' : 'credits,images,content_ratings';
                const res = await fetch(`${TMDB_BASE}/${mediaPath}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=uk-UA&append_to_response=${append}&include_image_language=uk,en,ja,null`);
                if (!res.ok) { tmdbInfo.fullDetails = null; return null; }
                const data = await res.json();
                // Якщо опис або жанри порожні українською — донасичуємо з англійської версії
                if (!data.overview || !(data.genres || []).length) {
                    try {
                        const resEn = await fetch(`${TMDB_BASE}/${mediaPath}/${tmdbInfo.id}?api_key=${TMDB_API_KEY}&language=en-US`);
                        if (resEn.ok) {
                            const dataEn = await resEn.json();
                            if (!data.overview) data.overview = dataEn.overview || '';
                            if (!(data.genres || []).length) data.genres = dataEn.genres || [];
                        }
                    } catch (e) { /* ignore */ }
                }
                tmdbInfo.fullDetails = data;
                return data;
            } catch (e) { console.warn('TMDB full details failed', e); tmdbInfo.fullDetails = null; return null; }
        }

        function tmdbBestLogo(details) {
            const logos = (details && details.images && details.images.logos) || [];
            if (!logos.length) return null;
            const pick = logos.find(l => l.iso_639_1 === 'uk') || logos.find(l => l.iso_639_1 === 'en') ||
                logos.find(l => !l.iso_639_1) || logos[0];
            return pick ? tmdbImgUrl(pick.file_path, 'w500') : null;
        }

        function tmdbAgeRating(details) {
            const ratings = (details?.content_ratings?.results || []).map(r => ({ country: r.iso_3166_1, value: r.rating }));
            const releaseRatings = (details?.release_dates?.results || []).flatMap(country =>
                (country.release_dates || []).map(r => ({ country: country.iso_3166_1, value: r.certification }))
            ).filter(r => r.value);
            const results = [...ratings, ...releaseRatings];
            const pick = results.find(r => r.country === 'UA') || results.find(r => r.country === 'US') ||
                results.find(r => r.country === 'JP') || results[0];
            return pick?.value || null;
        }

        // Кадр (backdrop) з TMDB для фону сторінки аніме — беремо найкращий за мовою/якістю,
        // фолбек на основний backdrop_path, якщо масив images.backdrops порожній.
        function tmdbBestBackdrop(details) {
            const backdrops = (details && details.images && details.images.backdrops) || [];
            if (backdrops.length) {
                const sorted = [...backdrops].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0) || (b.width || 0) - (a.width || 0));
                const pick = sorted.find(b => !b.iso_639_1) || sorted[0];
                if (pick) return tmdbImgUrl(pick.file_path, 'w1280');
            }
            if (details && details.backdrop_path) return tmdbImgUrl(details.backdrop_path, 'w1280');
            return null;
        }

        const TMDB_STATUS_LABELS = {
            'Returning Series': 'Онгоїнг',
            'Ended': 'Завершено',
            'Canceled': 'Завершено',
            'In Production': 'Готується',
            'Planned': 'Заплановано',
            'Pilot': 'Пілот'
        };

        // ====================================================================
        //  JIKAN / MAL — персонажі, сейю, зв'язки, студія, broadcast та media.
        //  Дані завжди прив'язані до MAL ID; пошук за назвою використовується
        //  тільки коли сторінка Hikka не має зовнішнього ID.
        // ====================================================================
        const JIKAN_BASE = 'https://api.jikan.moe/v4';
        const jikanCache = new Map();
        const JIKAN_STATUS_LABELS = {
            'Currently Airing': 'Онґоїнг', 'Finished Airing': 'Завершено',
            'Not yet aired': 'Майбутнє', 'Discontinued': 'Скасовано', 'On Hiatus': 'Призупинено'
        };
        const SEASON_LABELS = { winter: 'Зима', spring: 'Весна', summer: 'Літо', fall: 'Осінь' };

        async function fetchJikan(path) {
            if (jikanCache.has(path)) return jikanCache.get(path);
            const promise = fetch(`${JIKAN_BASE}${path}`, { cache: 'force-cache' }).then(r => {
                if (!r.ok) throw new Error(`Jikan HTTP ${r.status}`);
                return r.json();
            });
            jikanCache.set(path, promise);
            try { return await promise; } catch (e) { jikanCache.delete(path); throw e; }
        }

        function normalizeJikanTitle(v) {
            return String(v || '').toLowerCase().replace(/[«»'"`]/g, '')
                .replace(/\b(season|сезон|part|частина|cour|tv|серіал|anime)\s*\d*\b/gi, ' ')
                .replace(/[^a-zа-яіїєґ0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
        }

        async function resolveJikanById(malId) {
            const data = (await fetchJikan(`/anime/${malId}/full`)).data;
            if (data) data._provider = 'jikan';
            return data || null;
        }

        async function withTimeout(promise, ms, label = 'Запит перевищив час очікування') {
            let timer;
            const timeout = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(label)), ms);
            });
            try { return await Promise.race([promise, timeout]); }
            finally { clearTimeout(timer); }
        }

        async function resolveJikanByTitle(query) {
            const result = await fetchJikan(`/anime?q=${encodeURIComponent(query)}&limit=5&sfw=true`);
            const target = normalizeJikanTitle(query);
            const candidates = (result.data || []).map(x => {
                const names = [x.title, x.title_english, x.title_japanese, ...(x.title_synonyms || [])].map(normalizeJikanTitle);
                let score = names.includes(target) ? 100 : 0;
                if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
                if (x.type === 'TV') score += 4;
                return { x, score };
            }).sort((a, b) => b.score - a.score);
            const best = candidates[0];
            // Do not attach a weak unrelated title just because search returned something.
            if (!best || best.score < 35) return null;
            return resolveJikanById(best.x.mal_id);
        }

        // ====================================================================
        //  ANILIST — другий стабільний ID у пріоритеті користувача. Використовуємо,
        //  коли Jikan/MAL недоступний (live search на MAL часто падає з 504,
        //  хоча вже кешовані ID-запити можуть проходити) або не знайшов збіг.
        //  AniList повертає персонажів, зв'язки, студію та nextAiringEpisode
        //  (Unix-час, тому конвертація часової зони відбувається без ручних зсувів)
        //  усе в одному GraphQL-запиті.
        // ====================================================================
        const ANILIST_BASE = 'https://graphql.anilist.co';
        const anilistCache = new Map();
        const ANILIST_STATUS_LABELS = {
            RELEASING: 'Онґоїнг', FINISHED: 'Завершено', NOT_YET_RELEASED: 'Майбутнє',
            CANCELLED: 'Скасовано', HIATUS: 'Призупинено'
        };
        const ANILIST_RELATION_LABELS = {
            PREQUEL: 'попередній сезон', SEQUEL: 'наступний сезон', SIDE_STORY: 'спін-оф',
            SPIN_OFF: 'спін-оф', ALTERNATIVE: "альтернативна версія", SUMMARY: 'короткий переказ',
            ADAPTATION: 'адаптація', PARENT: 'пов’язаний твір', CHARACTER: 'пов’язаний твір',
            FULL_STORY: 'повна історія', OTHER: 'пов’язаний твір'
        };
        const ANILIST_FORMAT_LABELS = { TV: 'TV Серіал', TV_SHORT: 'TV Серіал', MOVIE: 'Фільм', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Спешл', MUSIC: 'Музика' };

        const ANILIST_SEARCH_QUERY = `query ($search: String) { Page(perPage: 5) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
            studios(isMain: true) { nodes { name } }
            nextAiringEpisode { airingAt episode }
            characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } }
        } }`;

        async function fetchAnilist(query, variables) {
            const key = JSON.stringify({ query, variables });
            if (anilistCache.has(key)) return anilistCache.get(key);
            const promise = fetch(ANILIST_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query, variables })
            }).then(r => { if (!r.ok) throw new Error(`AniList HTTP ${r.status}`); return r.json(); });
            anilistCache.set(key, promise);
            try { return await promise; } catch (e) { anilistCache.delete(key); throw e; }
        }

        function normalizeAnilistTitle(v) { return normalizeJikanTitle(v); }

        async function fetchAnilistRelations(anilistId) {
            const query = `query ($id: Int) { Media(id: $id) { relations { edges { relationType(version: 2) node {
                id type title { romaji english } format startDate { year } coverImage { large } siteUrl } } } } }`;
            const res = await fetchAnilist(query, { id: anilistId });
            return res?.data?.Media?.relations?.edges || [];
        }

        function adaptAnilistMedia(media) {
            const studios = (media.studios?.nodes || []).map(n => ({ name: n.name }));
            const characters = (media.characters?.edges || []).map(e => ({
                character: { name: e.node?.name?.full, name_kanji: e.node?.name?.native, images: { webp: { image_url: e.node?.image?.large } } },
                role: e.role === 'MAIN' ? 'Головна роль' : 'Другорядна роль',
                voice_actors: e.voiceActors?.length ? [{ language: 'Japanese', person: { name: e.voiceActors[0].name.full, images: { webp: { image_url: e.voiceActors[0].image?.large } } } }] : []
            }));
            const seasonMap = { WINTER: 'winter', SPRING: 'spring', SUMMER: 'summer', FALL: 'fall' };
            return {
                _provider: 'anilist', _anilistId: media.id,
                title: media.title?.romaji || media.title?.english, url: media.siteUrl,
                type: media.format === 'MOVIE' ? 'Movie' : 'TV',
                status: media.status, _statusLabel: ANILIST_STATUS_LABELS[media.status] || null,
                season: seasonMap[media.season] || null, year: media.seasonYear,
                episodes: media.episodes, duration: media.duration, _durationMinutes: media.duration,
                airing: media.status === 'RELEASING',
                _nextAiringDate: media.nextAiringEpisode ? new Date(media.nextAiringEpisode.airingAt * 1000) : null,
                _nextEpisode: media.nextAiringEpisode?.episode || null,
                rating: media.averageScore ? `AniList ${(media.averageScore / 10).toFixed(1)}` : null,
                genres: media.genres || [], studios, characters
            };
        }

        async function resolveAnilistByTitle(query) {
            const res = await fetchAnilist(ANILIST_SEARCH_QUERY, { search: query });
            const list = res?.data?.Page?.media || [];
            const target = normalizeAnilistTitle(query);
            const candidates = list.map(m => {
                const names = [m.title?.romaji, m.title?.english, m.title?.native].map(normalizeAnilistTitle);
                let score = names.includes(target) ? 100 : 0;
                if (names.some(n => n && (n.includes(target) || target.includes(n)))) score += 35;
                if (m.format === 'TV') score += 4;
                return { m, score };
            }).sort((a, b) => b.score - a.score);
            const best = candidates[0];
            if (!best || best.score < 35) return null;
            return adaptAnilistMedia(best.m);
        }

        function hasCharacterData(data) {
            return Array.isArray(data?.characters) && data.characters.some(x => x?.character?.name);
        }

        async function resolveJikanAnime(anime) {
            const stableMalId = Number(anime?.externalIds?.mal_id);
            const stableAnilistId = Number(anime?.externalIds?.anilist_id);
            let jikanFallback = null;
            // Priority 1: MAL ID. Priority 2: AniList ID. Priority 3/4 handled by title fallback below.
            if (stableMalId) {
                try {
                    const byId = await withTimeout(resolveJikanById(stableMalId), 5000, 'Jikan ID запит перевищив час очікування');
                    if (byId && hasCharacterData(byId)) return byId;
                    if (byId) jikanFallback = byId;
                } catch (e) { console.warn('Jikan ID lookup failed, trying other sources:', e); }
            }
            if (stableAnilistId) {
                try {
                    const query = `query ($id: Int) { Media(id: $id, type: ANIME) {
                        id title { romaji english native } format status season seasonYear episodes duration averageScore genres siteUrl
                        studios(isMain: true) { nodes { name } } nextAiringEpisode { airingAt episode }
                        characters(sort: ROLE, perPage: 10) { edges { role node { name { full native } image { large } } voiceActors(language: JAPANESE) { name { full } image { large } } } } } }`;
                    const res = await withTimeout(fetchAnilist(query, { id: stableAnilistId }), 8000, 'AniList ID запит перевищив час очікування');
                    if (res?.data?.Media) return adaptAnilistMedia(res.data.Media);
                } catch (e) { console.warn('AniList ID lookup failed, trying title fallback:', e); }
            }
            const query = anime?.originalTitle || anime?.title;
            if (!query) return jikanFallback;
            // AniList is the preferred title fallback because it usually returns characters and
            // voice actors faster and more consistently than Jikan's rate-limited search endpoint.
            try {
                const anilistMatch = await withTimeout(resolveAnilistByTitle(query), 8000, 'AniList пошук перевищив час очікування');
                if (anilistMatch) return anilistMatch;
            } catch (e) { console.warn('AniList title search unavailable:', e); }
            try {
                const byTitle = await withTimeout(resolveJikanByTitle(query), 5000, 'Jikan пошук перевищив час очікування');
                if (byTitle && hasCharacterData(byTitle)) return byTitle;
                if (byTitle && !jikanFallback) jikanFallback = byTitle;
            } catch (e) { console.warn('Jikan title search unavailable:', e); }
            return jikanFallback;
        }

        function jikanImage(item) {
            return item?.images?.webp?.image_url || item?.images?.jpg?.image_url || '';
        }

        function setSectionState(id, visible) {
            const el = document.getElementById(id);
            if (el) el.style.display = visible ? '' : 'none';
        }

        function formatJikanDuration(value) {
            if (value === null || value === undefined || value === '') return '';
            if (Number.isFinite(Number(value))) return `${Number(value)} хвилин`;
            const m = String(value).match(/(\d+)\s*min/i);
            return m ? `${m[1]} хвилин` : String(value);
        }

        function formatNextEpisodeDate(date) {
            if (!date) return 'Дата невідома';
            return new Intl.DateTimeFormat('uk-UA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
        }

        function nextBroadcastDate(broadcast) {
            if (!broadcast?.day || !broadcast?.time) return null;
            const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
            const targetDay = days[String(broadcast.day).toLowerCase()];
            if (targetDay === undefined) return null;
            const [hour, minute] = String(broadcast.time).split(':').map(Number);
            if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
            // Build the wall-clock date in Tokyo and convert it through Intl, never by a fixed offset.
            const now = new Date();
            const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).formatToParts(now).filter(x => x.type !== 'literal').map(x => [x.type, Number(x.value)]));
            const tokyoWall = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour % 24, parts.minute, parts.second));
            const currentDay = tokyoWall.getUTCDay();
            let delta = (targetDay - currentDay + 7) % 7;
            const candidateWall = new Date(tokyoWall);
            candidateWall.setUTCDate(candidateWall.getUTCDate() + delta);
            candidateWall.setUTCHours(hour, minute, 0, 0);
            if (candidateWall <= tokyoWall) candidateWall.setUTCDate(candidateWall.getUTCDate() + 7);
            const tokyoOffset = tokyoWall.getTime() - now.getTime();
            return new Date(candidateWall.getTime() - tokyoOffset);
        }

        function countdownText(date) {
            const ms = new Date(date).getTime() - Date.now();
            if (!Number.isFinite(ms) || ms <= 0) return 'Очікуємо оновлення';
            const totalMinutes = Math.floor(ms / 60000);
            const days = Math.floor(totalMinutes / 1440);
            const hours = Math.floor((totalMinutes % 1440) / 60);
            const mins = totalMinutes % 60;
            if (days) return `Вихід через ${days} дн. ${hours} год.`;
            if (hours) return `Вихід через ${hours} год. ${mins} хв.`;
            return `Вихід через ${Math.max(mins, 1)} хв.`;
        }

        function renderAnimeInformation(data, tmdbInfo, details) {
            const root = document.getElementById('animeInfoGrid');
            if (!root) return;
            const type = data?.type || (playerAnimeIsMovie() ? 'Movie' : 'TV');
            const typeLabel = type === 'TV' ? 'TV Серіал' : type === 'Movie' ? 'Фільм' : (type || '—');
            const status = data?._statusLabel || JIKAN_STATUS_LABELS[data?.status] || ANILIST_STATUS_LABELS[data?.status] || data?.status || '—';
            const derivedYear = data?.year || (details?.first_air_date || details?.release_date || '').slice(0, 4);
            const seasonYear = data?.season && derivedYear ? `${SEASON_LABELS[data.season] || data.season} ${derivedYear}` : (derivedYear || '—');
            const episodeCount = playerPageAnime?.totalEpisodes ?? '—';
            const nextDate = data?._nextAiringDate instanceof Date && !Number.isNaN(data._nextAiringDate.getTime())
                ? data._nextAiringDate : (data?.airing ? nextBroadcastDate(data.broadcast) : null);
            const nextEpisode = data?._nextEpisode || (data?.airing && Number.isFinite(Number(data?.episodes)) ? Number(data.episodes) + 1 : null);
            const next = nextDate ? `${nextEpisode ? `Епізод ${nextEpisode} · ` : ''}${formatNextEpisodeDate(nextDate)}` : (data?.airing ? 'Дата невідома' : '—');
            const studio = data?.studios?.[0]?.name || details?.production_companies?.[0]?.name || '—';
            const studioLogo = data?.studios?.[0]?.logo || (details?.production_companies?.[0]?.logo_path ? tmdbImgUrl(details.production_companies[0].logo_path, 'w185') : '');
            const rating = data?.rating || (details?.vote_average ? `TMDB ${details.vote_average.toFixed(1)}` : '—');
            const rows = [
                ['Тип', typeLabel], ['Статус', `<span class="anime-info-badge">${escapeHtml(status)}</span>`],
                ['Сезон / рік', seasonYear], ['Епізоди', episodeCount || '—'], ['Наступний епізод', next],
                ['Тривалість епізоду', formatJikanDuration(data?.duration) || (details?.episode_run_time?.[0] ? `${details.episode_run_time[0]} хвилин` : '—')],
                ['Рейтинг', rating],
                ['Жанри', normalizeGenreList(playerPageAnime?.genres).join(' · ') || '—'],
                ['Студія', studioLogo ? `${escapeHtml(studio)}<img class="anime-info-studio-logo" src="${escapeHtml(studioLogo)}" alt="" loading="lazy" onerror="this.remove()">` : studio]
            ];
            root.innerHTML = rows.map(([label, value]) => `<div class="anime-info-row"><span>${escapeHtml(label)}</span><strong>${String(value).includes('anime-info-badge') || String(value).includes('anime-info-studio-logo') ? value : escapeHtml(String(value))}</strong></div>`).join('');
            const countdown = document.getElementById('animeCountdown');
            if (playerCountdownTimer) { clearInterval(playerCountdownTimer); playerCountdownTimer = null; }
            if (countdown) countdown.textContent = nextDate ? countdownText(nextDate) : '';
            if (nextDate) playerCountdownTimer = setInterval(() => { if (countdown) countdown.textContent = countdownText(nextDate); }, 60000);
        }

        function renderMainCharacters(data) {
            const list = document.getElementById('mainCharactersList');
            const more = document.getElementById('mainCharactersMoreBtn');
            if (!list) return;
            playerCharacterItems = (data?.characters || []).filter(x => x?.character?.name).map(x => ({
                name: x.character.name, original: x.character.name_kanji, role: x.role,
                image: jikanImage(x.character), voice: x.voice_actors?.find(v => v.language === 'Japanese')?.person?.name || ''
            })).sort((a, b) => ((a.role === 'Main' || a.role === 'Головна роль') ? 0 : 1) - ((b.role === 'Main' || b.role === 'Головна роль') ? 0 : 1));
            const items = playerCharacterExpanded ? playerCharacterItems : playerCharacterItems.slice(0, 8);
            if (!items.length) {
                list.innerHTML = '';
                if (more) more.hidden = true;
                setSectionState('mainCharactersSection', false);
                return;
            }
            setSectionState('mainCharactersSection', true);
            list.innerHTML = items.map(c => `<article class="cast-card character-card"><div class="cast-avatar" style="${c.image ? `background-image:url('${escapeHtml(c.image)}')` : ''}"></div><div class="cast-name">${escapeHtml(c.name)}</div>${c.original ? `<div class="character-original">${escapeHtml(c.original)}</div>` : ''}<div class="cast-role">${escapeHtml([c.role, c.voice ? `Сейю: ${c.voice}` : ''].filter(Boolean).join(' · '))}</div></article>`).join('');
            if (more) { more.hidden = playerCharacterItems.length <= 8; more.textContent = playerCharacterExpanded ? '←' : '→'; }
        }

        function relatedCardMarkup(x) {
            return `<article class="related-card" data-related-title="${escapeHtml(x.title || '')}" data-related-title-en="${escapeHtml(x.titleEn || '')}"><img src="${escapeHtml(x.image || '')}" alt="" loading="lazy"><div><strong>${escapeHtml(x.title || '')}</strong><span>${escapeHtml([x.year, x.typeLabel, x.relationLabel].filter(Boolean).join(' · '))}</span></div></article>`;
        }

        async function openRelatedAnimeInPlayer(card) {
            if (!card || card.classList.contains('is-loading')) return;
            const title = card.dataset.relatedTitle || '';
            const titleEn = card.dataset.relatedTitleEn || '';
            if (!title && !titleEn) return;
            card.classList.add('is-loading');
            try {
                const queries = [...new Set([title, titleEn].filter(Boolean))];
                let results = [];
                for (const query of queries) {
                    results = await searchHikka(query, 1);
                    if (results?.length) break;
                }
                const normalizeTitle = value => String(value || '').toLocaleLowerCase('uk-UA')
                    .replace(/[\u2010-\u2015:!?.,'’"()\[\]{}]/g, ' ')
                    .replace(/\s+/g, ' ').trim();
                const wanted = queries.map(normalizeTitle).filter(Boolean);
                const exact = (results || []).find(item => {
                    const names = [item.title, item.originalTitle, ...(item.alternativeTitles || [])].map(normalizeTitle);
                    return names.some(name => wanted.includes(name) || wanted.some(q => q === name || q.includes(name) || name.includes(q)));
                });
                const match = exact || results?.[0];
                if (match?.url) openPlayerPage(match.url);
                else showToast(`«${title}» ще не знайдено в каталозі VakDab`);
            } catch (e) { showToast('Не вдалося відкрити пов’язане аніме'); }
            finally { card.classList.remove('is-loading'); }
        }


        async function renderRelatedAnimeFromJikan(data) {
            const current = Number(data?.mal_id);
            const entries = (data?.relations || []).flatMap(group => (group.entry || []).map(entry => ({ ...entry, relation: group.relation })))
                .filter(x => x.mal_id && Number(x.mal_id) !== current);
            const unique = [...new Map(entries.map(x => [x.mal_id, x])).values()];
            const detailItems = unique.slice(0, 24);
            const details = await Promise.allSettled(detailItems.map(x => fetchJikan(`/anime/${x.mal_id}`)));
            return unique.map((x, i) => {
                const result = i < details.length ? details[i] : null;
                const full = result?.status === 'fulfilled' ? result.value.data : {};
                return { url: full.url || x.url, image: jikanImage(full) || jikanImage(x), title: full.title || x.name, year: full.year || (full.aired?.from || '').slice(0, 4), typeLabel: full.type || '', relationLabel: x.relation };
            });
        }

        async function renderRelatedAnimeFromAnilist(data) {
            if (!data?._anilistId) return [];
            const edges = await fetchAnilistRelations(data._anilistId);
            const filtered = edges.filter(e => e.node?.id !== data._anilistId && e.node?.type === 'ANIME');
            const unique = [...new Map(filtered.map(e => [e.node.id, e])).values()];
            return unique.map(e => ({
                url: e.node.siteUrl, image: e.node.coverImage?.large,
                title: e.node.title?.romaji || e.node.title?.english, titleEn: e.node.title?.english || e.node.title?.romaji, year: e.node.startDate?.year,
                typeLabel: ANILIST_FORMAT_LABELS[e.node.format] || e.node.format,
                relationLabel: ANILIST_RELATION_LABELS[e.relationType] || null
            }));
        }

        async function renderRelatedAnime(data) {
            const list = document.getElementById('relatedList');
            const more = document.getElementById('relatedMoreBtn');
            if (!list) return;
            try {
                playerRelatedItems = data?._provider === 'anilist' ? await renderRelatedAnimeFromAnilist(data) : await renderRelatedAnimeFromJikan(data);
            } catch (e) { console.warn('Related anime lookup failed:', e); playerRelatedItems = []; }
            if (!playerRelatedItems.length) { setSectionState('relatedSection', false); return; }
            setSectionState('relatedSection', true);
            const visible = playerRelatedItems.slice(0, 4);
            list.innerHTML = visible.map(relatedCardMarkup).join('');
            list.querySelectorAll('.related-card').forEach(card => card.addEventListener('click', () => openRelatedAnimeInPlayer(card)));
            const count = document.getElementById('relatedCount');
            if (count) count.textContent = `(${playerRelatedItems.length})`;
            if (more) more.hidden = playerRelatedItems.length <= 4;
        }

        function renderAnimeMedia(data) {
            const list = document.getElementById('mediaList');
            const more = document.getElementById('mediaMoreBtn');
            if (!list) return;
            playerMediaItems = [
                ...(data?.theme?.openings || []).map(x => ({ label: 'Opening', title: x })),
                ...(data?.theme?.endings || []).map(x => ({ label: 'Ending', title: x }))
            ].filter(x => x.title).filter((x, i, arr) => arr.findIndex(y => y.label === x.label && y.title === x.title) === i);
            if (!playerMediaItems.length) { setSectionState('mediaSection', false); return; }
            setSectionState('mediaSection', true);
            const items = playerMediaExpanded ? playerMediaItems : playerMediaItems.slice(0, 8);
            list.innerHTML = items.map((x, i) => `<div class="media-track"><span>${escapeHtml(x.label)}</span><strong>${escapeHtml(x.title)}</strong></div>`).join('');
            if (more) { more.hidden = playerMediaItems.length <= 8; more.textContent = playerMediaExpanded ? '←' : '→'; }
        }

        async function loadAndRenderJikanExtras(anime, tmdbInfo, details) {
            try {
                const data = await resolveJikanAnime(anime);
                if (playerPageCurrentAnimeUrl !== anime.url) return;
                if (!data) {
                    const infoGrid = document.getElementById('animeInfoGrid');
                    if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">Розширена інформація тимчасово недоступна</div>';
                    setSectionState('relatedSection', false);
                    setSectionState('mediaSection', false);
                    setSectionState('mainCharactersSection', false);
                    return;
                }
                playerJikanData = data;
                renderAnimeInformation(data, tmdbInfo, details);
                renderMainCharacters(data);
                if (document.getElementById('castSection')?.style.display === 'none') renderVoiceCast(data);
                renderAnimeMedia(data);
                await renderRelatedAnime(data);
            } catch (e) {
                console.warn('Jikan anime extras unavailable:', e);
                const infoGrid = document.getElementById('animeInfoGrid');
                if (infoGrid) infoGrid.innerHTML = '<div class="anime-info-placeholder">Розширена інформація тимчасово недоступна</div>';
                const mainCharactersList = document.getElementById('mainCharactersList');
                if (mainCharactersList && !playerCharacterItems.length) {
                    setSectionState('mainCharactersSection', true);
                    mainCharactersList.innerHTML = '<div class="player-empty-episodes">Персонажі тимчасово недоступні</div>';
                }
                setSectionState('relatedSection', false);
                setSectionState('mediaSection', false);
            }
        }

        function renderCast(details) {
            const section = document.getElementById('castSection');
            const list = document.getElementById('castList');
            if (!section || !list) return;
            const cast = ((details && details.credits && details.credits.cast) || []).slice(0, 8);
            if (!cast.length) { list.innerHTML = ''; section.style.display = 'none'; return; }
            section.style.display = '';
            const castTitle = section.querySelector('.section-title');
            if (castTitle) castTitle.textContent = 'Актори';
            list.innerHTML = cast.map(c => {
                const avatar = c.profile_path ? tmdbImgUrl(c.profile_path, 'w185') : '';
                const avatarStyle = avatar ? `background-image:url(${avatar});background-size:cover;background-position:center;` : '';
                return `
                <div class="cast-card">
                    <div class="cast-avatar" style="${avatarStyle}"></div>
                    <div class="cast-name">${escapeHtml(c.name || '')}</div>
                    <div class="cast-role">${escapeHtml(c.character || '')}</div>
                </div>`;
            }).join('');
        }

        function renderVoiceCast(data) {
            const section = document.getElementById('castSection');
            const list = document.getElementById('castList');
            if (!section || !list) return;
            const cast = (data?.characters || []).filter(x => x?.character?.name && x?.voice_actors?.length).slice(0, 12);
            if (!cast.length) return;
            section.style.display = '';
            section.querySelector('.section-title').textContent = 'Актори / сейю';
            list.innerHTML = cast.map(x => {
                const c = x.character;
                const voice = x.voice_actors?.find(v => v.language === 'Japanese') || x.voice_actors?.[0];
                const person = voice?.person || {};
                const avatar = jikanImage(person);
                const style = avatar ? `background-image:url('${escapeHtml(avatar)}');` : '';
                return `<article class="cast-card"><div class="cast-avatar" style="${style}"></div><div class="cast-name">${escapeHtml(person.name || 'Сейю невідомий')}</div><div class="cast-role">${escapeHtml(c.name || '')}</div></article>`;
            }).join('');
        }

        function tmdbStillFor(ep, epMap, tmdbInfo, fallback) {
            const tmdbEpisode = epMap && epMap[parseInt(ep.episode, 10)];
            return tmdbImgUrl(tmdbEpisode?.still_path, 'w500') || fallback;
        }

        function tmdbRatingFor(ep, epMap) {
            const t = epMap && epMap[parseInt(ep.episode)];
            if (t && t.vote_average) return t.vote_average.toFixed(1);
            return null;
        }

        // ====================================================================
        //  ПОБУДОВА СПИСКУ СЕРІЙ — Сітка / Компактний / Класичний
        // ====================================================================
        function buildGridCard(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="episode-grid-card${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="episode-grid-thumb" style="background-image:url(${img})">
                  <span class="episode-grid-num">${String(ep.episode).padStart(2, '0')}</span>
                </div>
                <div class="episode-grid-info">
                  <div class="episode-grid-title">Серія ${ep.episode}</div>
                  <div class="episode-grid-meta">
                    ${rating ? `<span class="episode-grid-rating">★ ${rating}</span><span>·</span>` : ''}
                    <span>${statusText}</span>
                  </div>
                  <div class="episode-grid-progress"><div class="episode-grid-progress-bar" style="width:${Math.min(progress, 100)}%"></div></div>
                </div>
              </div>`;
        }

        function buildCompactRow(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="epv2c-row${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="epv2c-thumb" style="background-image:url(${img})"><span class="epv2c-num">${ep.episode}</span></div>
                <div class="epv2c-body">
                  <div class="epv2c-title">Серія ${ep.episode}</div>
                  <div class="epv2c-meta">
                    ${rating ? `<span>★ ${rating}</span><span>•</span>` : ''}
                    <span>${statusText}</span>
                  </div>
                </div>
                <span class="epv2c-quality">${playerPageCurrentQuality || '—'}</span>
              </div>`;
        }

        function buildClassicRow(ep, posterUrl, epMap, tmdbInfo) {
            const progress = getEpisodeProgress(ep.episode);
            const watched = progress >= 95;
            const img = tmdbStillFor(ep, epMap, tmdbInfo, posterUrl);
            const rating = tmdbRatingFor(ep, epMap);
            const statusText = watched ? 'Переглянуто' : (progress > 0 ? `${Math.round(progress)}%` : 'Доступно');
            return `
              <div class="epv2l-row${watched ? ' watched' : ''}" data-file="${ep.file}" data-episode="${ep.episode}">
                <div class="epv2l-thumb" style="background-image:url(${img})">
                  <span class="epv2l-badge epv2l-badge-num">Серія ${ep.episode}</span>
                  <span class="epv2l-badge epv2l-badge-quality">${playerPageCurrentQuality || '—'}</span>
                  ${progress > 0 ? `<div class="epv2l-progress"><div class="epv2l-progress-fill" style="width:${Math.min(progress, 100)}%"></div></div>` : ''}
                </div>
                <div class="epv2l-meta-row">
                  ${rating ? `<span class="epv2-rating"><i data-lucide="star" style="width:11px;height:11px;"></i>${rating}</span><span class="epv2-dot">•</span>` : ''}
                  <span>${statusText}</span>
                </div>
              </div>`;
        }

        function attachEpisodeClickHandlers(container) {
            if (!container) return;
            container.querySelectorAll('[data-file]').forEach(card => {
                card.addEventListener('click', () => {
                    const file = card.dataset.file;
                    const epNum = card.dataset.episode;
                    if (!file) return;
                    playerPageCurrentEpisodeNum = epNum;
                    playEpisode(file, epNum);
                });
            });
        }

        function renderAllEpisodeViews(episodes, epMap, tmdbInfo) {
            const picker = document.getElementById('episodeViewGrid');
            const compactContainer = document.getElementById('episodeViewCompact');
            const classicContainer = document.getElementById('episodeViewClassic');
            if (!picker) return;
            if (!episodes.length) {
                const emptyHtml = '<div class="player-empty-episodes">Серії ще не знайдені на цьому джерелі.</div>';
                picker.innerHTML = emptyHtml;
                if (compactContainer) compactContainer.innerHTML = '';
                if (classicContainer) classicContainer.innerHTML = '';
                return;
            }
            // The new player deliberately uses buttons instead of a poster grid.
            picker.innerHTML = episodes.map(ep => {
                const active = String(ep.episode) === String(playerPageCurrentEpisodeNum) ? ' active' : '';
                const progress = getEpisodeProgress(ep.episode);
                return `<button type="button" class="player-episode-btn${active}" data-file="${escapeHtml(ep.file || '')}" data-episode="${escapeHtml(ep.episode || '')}">
                    <span class="player-episode-number">${escapeHtml(ep.episode || '—')}</span>
                    <span class="player-episode-title">${escapeHtml(ep.title || `Серія ${ep.episode || ''}`)}</span>
                    ${progress > 0 ? `<span class="player-episode-progress" style="--progress:${progress}%"></span>` : ''}
                </button>`;
            }).join('');
            if (compactContainer) compactContainer.innerHTML = '';
            if (classicContainer) classicContainer.innerHTML = '';
            attachEpisodeClickHandlers(picker);
        }

        export async function buildEpisodeViews() {
            const episodes = getCurrentEpisodes();
            playerPageEpisodes = episodes;
            renderAllEpisodeViews(episodes, null, null);
            if (!episodes.length) return;
            try {
                if (playerAnimeIsMovie()) return;
                const tmdbInfo = await fetchTmdbForAnime(playerPageAnime);
                if (!tmdbInfo) return;
                const seasonNum = parseInt(playerPageCurrentSeason) || 1;
                const seasonEpisodes = await fetchTmdbSeasonEpisodes(tmdbInfo, seasonNum);
                // якщо сезон/озвучку вже змінили поки йшов запит — не рендеримо застарілі дані
                if (getCurrentEpisodes() !== episodes) return;
                if (!seasonEpisodes) return;
                const epMap = {};
                seasonEpisodes.forEach(e => { epMap[e.episode_number] = e; });
                playerPageTmdbEpisodeMap = epMap;
                renderAllEpisodeViews(episodes, epMap, tmdbInfo);
                setPlayerFramePoster(tmdbImgUrl(epMap[Number(playerPageCurrentEpisodeNum)]?.still_path, 'w1280'));
            } catch (e) { console.warn('TMDB enrich failed', e); }
        }

        function playerAnimeIsMovie(anime = playerPageAnime) {
            return anime?.type === 'movie' || (anime?.genres || []).some(g => /повнометраж|фільм|movie/i.test(g));
        }

        function setPlayerFramePoster(frameUrl = '') {
            const frame = document.getElementById('playerFramePoster');
            if (!frame) return;
            const url = frameUrl || tmdbImgUrl(playerPageTmdbInfo?.backdrop_path, 'w1280') || document.getElementById('playerPosterImg')?.src || '';
            if (url) { frame.src = url; frame.classList.remove('is-hidden'); }
            else frame.classList.add('is-hidden');
        }
        function hidePlayerFramePoster() {
            const frame = document.getElementById('playerFramePoster');
            if (frame) frame.classList.add('is-hidden');
        }
        function formatMovieRuntime(minutes) {
            const n = Number(minutes);
            if (!Number.isFinite(n) || n <= 0) return '';
            const h = Math.floor(n / 60);
            const m = Math.round(n % 60);
            return h ? `${h} год ${m ? m + ' хв' : ''}`.trim() : `${m} хв`;
        }

        async function playEpisode(file, epNum) {
            if (!file) { showToast('Немає файлу для відтворення'); return; }
            if (!playerPageIsOpen) return;
            const playbackRequest = ++playerPagePlaybackRequest;
            playerPageCurrentEpisodeNum = epNum || '1';
            renderAllEpisodeViews(getCurrentEpisodes(), null, null);
            const videoContainer = document.getElementById('playerVideoContainer');
            const videoDiv = document.getElementById('playerPageVideo');
            const previewPlayButton = document.getElementById('playerPreviewPlay');
            previewPlayButton?.classList.remove('is-hidden');
            videoContainer.classList.add('active');
            videoContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const videoTitleEl = document.getElementById('playerTopbarTitle');
            if (videoTitleEl) videoTitleEl.textContent = playerPageAnime?.title || '';
            videoDiv.innerHTML = '';
            setPlayerFramePoster(tmdbImgUrl(playerPageTmdbEpisodeMap[Number(epNum)]?.still_path, 'w1280'));
            let finalUrl = file;
            if (/ashdi\.vip\/vod\//i.test(file)) {
                showToast('Підключення ASHDI через проксі...');
                try {
                    finalUrl = await resolveAshdiPlaybackUrl(file);
                } catch (error) {
                    if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
                    console.warn('[ASHDI playback]', error);
                    videoContainer.classList.remove('active');
                    videoDiv.innerHTML = '<div class="player-video-error"><i class="fas fa-triangle-exclamation"></i><span>Відео цієї серії недоступне.</span></div>';
                    showToast(`ASHDI: ${error.message || 'відео недоступне'}`);
                    return;
                }
            }
            if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
            playerPageActiveEpisodeFile = finalUrl;

            if (playerPagePlayer) { playerPagePlayer.destroy();
                playerPagePlayer = null; }
            if (playbackRequest !== playerPagePlaybackRequest || !playerPageIsOpen) return;
            playerPagePlayer = new LampaPlayer(videoDiv, { poster: playerPageAnime?.images?.jpg?.large_image_url });
            playerPagePlayer.loadSource(finalUrl, playerPageAnime?.title || '', `Серія ${epNum}`);
            playerPageHistoryUpdated = false;
            playerPageWatchStartTime = 0;
            playerPageAccumulatedWatchSeconds = 0;
            playerPageLastVideoTime = null;
            playerPageIsPlaying = false;
            const video = playerPagePlayer.videoRef;
            if (video) {
                const hideFrame = () => {
                    hidePlayerFramePoster();
                    document.getElementById('playerPreviewPlay')?.classList.add('is-hidden');
                };
                const syncPlaybackClock = () => {
                    if (!playerPageIsPlaying) return;
                    const currentTime = Number(video.currentTime);
                    if (!Number.isFinite(currentTime)) return;
                    if (playerPageLastVideoTime !== null) {
                        const delta = currentTime - playerPageLastVideoTime;
                        // Ignore seeks/jumps; only count normal media progression.
                        if (delta >= 0 && delta <= 5) playerPageAccumulatedWatchSeconds += delta;
                    }
                    playerPageLastVideoTime = currentTime;
                };
                const onPlaying = () => {
                    playerPageIsPlaying = true;
                    playerPageLastVideoTime = Number(video.currentTime) || 0;
                };
                const onPause = () => {
                    syncPlaybackClock();
                    playerPageIsPlaying = false;
                    playerPageLastVideoTime = Number(video.currentTime) || 0;
                };
                const onSeeking = () => { playerPageLastVideoTime = null; };
                const onSeeked = () => { playerPageLastVideoTime = Number(video.currentTime) || 0; };
                video.addEventListener('playing', hideFrame, { once: true });
                video.addEventListener('playing', onPlaying);
                video.addEventListener('pause', onPause);
                video.addEventListener('waiting', onPause);
                video.addEventListener('seeking', onSeeking);
                video.addEventListener('seeked', onSeeked);
                const onTimeUpdate = () => {
                    syncPlaybackClock();
                    if (playerPageHistoryUpdated) return;
                    if (!playerPageAnime) return;
                    const duration = video.duration;
                    if (!duration || duration === Infinity) return;
                    const progress = (video.currentTime / duration) * 100;
                    const watchSecondsSoFar = Math.floor(playerPageAccumulatedWatchSeconds);
                    // Зберігаємо в історію через 2 хвилини перегляду
                    if (watchSecondsSoFar >= 120) {
                        playerPageHistoryUpdated = true;
                        const ep = epNum || playerPageCurrentEpisodeNum || '1';
                        const season = playerPageCurrentSeason || '1';
                        const history = Storage.getHistory();
                        const idx = history.findIndex(h => h.url === playerPageAnime.url);
                        // watchTime вже обчислено вище
                        if (watchSecondsSoFar > 0) {
                            Storage.addWatchTime(watchSecondsSoFar);
                            DailyStats.increment('minutesToday', Math.round(watchSecondsSoFar / 60));
                        }
                        if (idx >= 0) {
                            history[idx].episode = ep;
                            history[idx].season = season;
                            history[idx].timestamp = Date.now();
                            history[idx].progress = Math.min(progress, 100);
                            history[idx].duration = Math.floor(video.currentTime);
                            Storage.setHistory(history);
                        } else {
                            const entry = {
                                animeId: playerPageAnime.mal_id || playerPageAnime.url.hashCode(),
                                title: playerPageAnime.title,
                                poster: playerPageAnime.images?.jpg?.large_image_url || '',
                                url: playerPageAnime.url,
                                episode: ep,
                                season: season,
                                timestamp: Date.now(),
                                progress: Math.min(progress, 100),
                                duration: Math.floor(video.currentTime)
                            };
                            history.unshift(entry);
                            DailyStats.increment('episodesToday', 1);
                            DailyStats.addUniqueAnime(playerPageAnime.url);
                            if (history.length > 200) history.length = 200;
                            Storage.setHistory(history);
                        }
                        showToast(`Серія ${ep} збережена в історію`);
                        video.removeEventListener('timeupdate', onTimeUpdate);
                        buildEpisodeViews();
                    }
                };
                video.addEventListener('timeupdate', onTimeUpdate);
                if (playerPagePlayer._timeUpdateListener) {
                    video.removeEventListener('timeupdate', playerPagePlayer._timeUpdateListener);
                }
                playerPagePlayer._timeUpdateListener = onTimeUpdate;
            }
            setTimeout(() => { videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
        }

        export function closePlayerPage() {
            const modal = document.getElementById('playerPageModal');
            if (!modal || (!playerPageIsOpen && !modal.classList.contains('is-open'))) return;
            playerPageIsOpen = false;
            playerPagePlaybackRequest += 1;
            modal.setAttribute('aria-busy', 'false');
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('is-open');
            // Скасувати активне завантаження — щоб catch не показував помилку
            if (_playerLoadController) {
                _playerLoadController.abort();
                _playerLoadController = null;
            }
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
            }
            closeWatchPage();
            modal.style.display = 'none';
            document.documentElement.classList.remove('player-page-open');
            document.body.classList.remove('player-page-open');
            document.getElementById('bottomNav')?.classList.remove('hidden-nav');
            document.body.style.overflow = playerPagePreviousBodyOverflow;
            document.getElementById('episodePanel').classList.remove('visible');
            if (playerPagePreviousActiveElement && document.contains(playerPagePreviousActiveElement)) {
                playerPagePreviousActiveElement.focus({ preventScroll: true });
            }
            playerPagePreviousActiveElement = null;
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        function updateBookmarkButton(url) {
            const btn = document.getElementById('playerBookmarkBtn');
            if (!btn) return;
            const bookmarks = Storage.getBookmarks();
            const isBookmarked = bookmarks.some(b => b.url === url);
            btn.classList.toggle('bookmarked', isBookmarked);
            btn.innerHTML = isBookmarked ?
                '<i class="fas fa-heart" style="color:#ffd700;"></i>' :
                '<i class="fas fa-heart"></i>';
        }

        function toggleBookmark() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для закладки'); return; }
            const bookmarks = Storage.getBookmarks();
            const idx = bookmarks.findIndex(b => b.url === url);
            if (idx >= 0) {
                bookmarks.splice(idx, 1);
                Storage.setBookmarks(bookmarks);
                showToast('Видалено з закладок');
                updateBookmarkButton(url);
                if (Router.currentRoute === 'profile') renderProfilePage();
                return;
            }
            const anime = playerPageAnime;
            if (!anime) { showToast('Помилка: немає даних про аніме'); return; }
            const totalEpisodes = Object.values(anime.seasons || {}).reduce((sum, s) => sum + Object.values(s).reduce((s2,
                e) => Math.max(s2, e.length), 0), 0);
            bookmarks.push({
                url: anime.url,
                title: anime.title,
                poster: anime.images?.jpg?.large_image_url || '',
                episodes: totalEpisodes + ' еп.',
                addedAt: Date.now()
            });
            Storage.setBookmarks(bookmarks);
            DailyStats.increment('bookmarksToday', 1);
            showToast('Додано до закладок');
            updateBookmarkButton(url);
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        // ====================================================================
        //  ЛАЙК / ДИЗЛАЙК
        // ====================================================================
        function updateLikeButton() {
            const btn = document.getElementById('likeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'like') {
                btn.classList.add('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up" style="color:#00ff88;"></i>';
            } else {
                btn.classList.remove('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
            }
        }

        function updateDislikeButton() {
            const btn = document.getElementById('dislikeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'dislike') {
                btn.classList.add('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down" style="color:#ff4444;"></i>';
            } else {
                btn.classList.remove('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down"></i>';
            }
        }

        export function toggleLike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'like') {
                delete likes[url];
                Storage.setLikes(likes);
                syncAnimeRating(url, 0);
                showToast('Лайк скасовано');
            } else {
                likes[url] = 'like';
                Storage.setLikes(likes);
                DailyStats.increment('likesToday', 1);
                DailyStats.addTotalRating();
                syncAnimeRating(url, 1);
                showToast('Лайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        export function toggleDislike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'dislike') {
                delete likes[url];
                Storage.setLikes(likes);
                syncAnimeRating(url, 0);
                showToast('Дизлайк скасовано');
            } else {
                likes[url] = 'dislike';
                Storage.setLikes(likes);
                syncAnimeRating(url, -1);
                showToast('Дизлайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (Router.currentRoute === 'profile') renderProfilePage();
        }

        // ====================================================================
        //  BOTTOM SHEET
        // ====================================================================
        let bottomSheetMode = 'full';

        export function buildBottomSheetData() {
            const bindItems = (root, selector, callback) => {
                root?.querySelectorAll(selector).forEach(item => {
                    const activate = () => callback(item.dataset.value);
                    item.addEventListener('click', activate);
                    item.addEventListener('keydown', event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            activate();
                        }
                    });
                });
            };

            const sourceList = document.getElementById('bsSourceList');
            if (sourceList) {
                const sources = playerPageSources.length ? playerPageSources : ['Основне'];
                sourceList.innerHTML = sources.map(s => {
                    const active = s === playerPageCurrentSource ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(s))}" role="button" tabindex="0">${escapeHtml(String(s))}</div>`;
                }).join('');
                bindItems(sourceList, '[data-value]', value => switchProviderSource(value));
            }

            const dubList = document.getElementById('bsDubList');
            if (dubList && playerPageAnime?.seasons) {
                const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                const currentSeason = playerPageCurrentSeason || seasons[0] || '1';
                const dubs = Object.keys(playerPageAnime.seasons[currentSeason] || {}).sort();
                dubList.innerHTML = dubs.map(d => {
                    const active = d === playerPageCurrentDub ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(d))}" role="button" tabindex="0">${escapeHtml(String(d))}</div>`;
                }).join('');
                bindItems(dubList, '[data-value]', value => selectDubFromSheet(value));
            }

            const seasonList = document.getElementById('bsSeasonList');
            if (seasonList && playerPageAnime?.seasons) {
                const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
                seasonList.innerHTML = seasons.map(s => {
                    const active = s === playerPageCurrentSeason ? ' active' : '';
                    return `<div class="source-item${active}" data-value="${escapeHtml(String(s))}" role="button" tabindex="0">Сезон ${escapeHtml(String(s))}</div>`;
                }).join('');
                bindItems(seasonList, '[data-value]', value => selectSeasonFromSheet(value));
            }

            const qualityRow = document.getElementById('bsQualityRow');
            if (qualityRow) {
                qualityRow.innerHTML = QUALITY_OPTIONS.map(q => {
                    const active = q === playerPageCurrentQuality ? ' active' : '';
                    return `<div class="quality-item${active}" data-value="${escapeHtml(String(q))}" role="button" tabindex="0">${escapeHtml(String(q))}</div>`;
                }).join('');
                bindItems(qualityRow, '[data-value]', value => selectQualityFromSheet(value));
            }
        }

        window.selectDubFromSheet = function(dub) {
            playerPageCurrentDub = dub;
            buildEpisodeViews();
            updateFilterChip();
            buildBottomSheetData();
            showToast(`Озвучка: ${dub}`);
        };

        window.selectSeasonFromSheet = function(season) {
            playerPageCurrentSeason = season;
            const dubs = Object.keys(playerPageAnime?.seasons?.[season] || {}).sort();
            playerPageCurrentDub = dubs[0] || '';
            buildEpisodeViews();
            refreshPlayerSeasonPoster(season);
            updateFilterChip();
            buildBottomSheetData();
            showToast(`Сезон ${season}`);
        };

        window.selectQualityFromSheet = function(quality) {
            playerPageCurrentQuality = quality;
            buildBottomSheetData();
            showToast(`Якість: ${quality}`);
        };

        export function openBottomSheet(mode) {
            bottomSheetMode = mode || 'full';
            buildBottomSheetData();
            document.getElementById('bottomSheetOverlay').classList.add('open');
        }

        export function closeBottomSheet() {
            document.getElementById('bottomSheetOverlay').classList.remove('open');
        }

        // ====================================================================
        //  ОБРОБНИКИ ПОДІЙ
        // ====================================================================
        function openMenuPopover() {
            const overlay = document.getElementById('menuPopoverOverlay');
            if (overlay) overlay.classList.add('visible');
        }
        export function closeMenuPopover() {
            const overlay = document.getElementById('menuPopoverOverlay');
            if (overlay) overlay.classList.remove('visible');
        }
        window.closeMenuPopover = closeMenuPopover;

        document.getElementById('bnMenu')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openMenuPopover();
        });

        document.getElementById('menuPopoverOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'menuPopoverOverlay') closeMenuPopover();
        });

        document.querySelectorAll('.menu-popover-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                closeMenuPopover();
                if (action === 'genres') {
                    Router.goTo('genres');
                } else if (action === 'settings') {
                    Router.goTo('settings');
                } else if (action === 'filters') {
                    Router.goTo('filter');
                } else if (action === 'stickers') {
                    Router.goTo('stickers');
                } else if (action === 'schedule') {
                    Router.goTo('schedule');
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeMenuPopover();
            }
        });

        document.getElementById('searchCircleBtn')?.addEventListener('click', () => {
            Router.goTo('search');
            setTimeout(() => {
                const inp = document.getElementById('searchPageInput');
                if (inp) inp.focus();
            }, 200);
        });

        document.getElementById('top100Btn').addEventListener('click', showTop100);
        document.getElementById('randomBtn').addEventListener('click', openRandomAnime);
        document.getElementById('logoHome').addEventListener('click', () => Router.goTo('main'));

        const cpBtn = document.getElementById('closePlayerPageBtn');
        if (cpBtn) cpBtn.addEventListener('click', closePlayerPage);
        // Fullscreen button — global handler
        const playerFsBtn = document.getElementById('playerFullscreenBtn');
        if (playerFsBtn) {
            playerFsBtn.addEventListener('click', () => {
                // Використовуємо toggleFullscreen з LampaPlayer якщо доступний
                // Always use playerVideoContainer directly for fullscreen
                if (playerPagePlayer) { playerPagePlayer.toggleFullscreen(); return; }
                const container = document.getElementById('playerVideoContainer');
                if (!container) return;
                if (document.fullscreenElement || document.webkitFullscreenElement) {
                    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)?.call(document);
                    return;
                }
                const target = container.querySelector('.lampa-player-container') || container;
                const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
                if (request) Promise.resolve(request.call(target)).catch(() => {});
                else if (target.querySelector('video')?.webkitEnterFullscreen) target.querySelector('video').webkitEnterFullscreen();
            });
        }

        const previewPlayButton = document.getElementById('playerPreviewPlay');
        previewPlayButton?.addEventListener('click', () => {
            if (playerPagePlayer?.videoRef) {
                playerPagePlayer.togglePlay();
                return;
            }
            const episode = getCurrentEpisodes().find(ep => String(ep.episode) === String(playerPageCurrentEpisodeNum)) || getCurrentEpisodes()[0];
            if (episode) playEpisode(episode.file, episode.episode);
        });

        const compactEpisodeSelect = document.getElementById('playerEpisodeSelect');
        compactEpisodeSelect?.addEventListener('change', () => {
            const episode = getCurrentEpisodes().find(ep => String(ep.episode) === String(compactEpisodeSelect.value));
            if (episode) playEpisode(episode.file, episode.episode);
        });
        document.getElementById('playerDubSelect')?.addEventListener('change', event => selectDubFromSheet(event.target.value));
        document.getElementById('playerSeasonSelect')?.addEventListener('change', event => selectSeasonFromSheet(event.target.value));
        document.getElementById('playerPrevEpisode')?.addEventListener('click', () => {
            const episodes = getCurrentEpisodes();
            const index = episodes.findIndex(ep => String(ep.episode) === String(playerPageCurrentEpisodeNum));
            const episode = episodes[index - 1];
            if (episode) playEpisode(episode.file, episode.episode);
        });
        document.getElementById('playerNextEpisode')?.addEventListener('click', () => {
            const episodes = getCurrentEpisodes();
            const index = episodes.findIndex(ep => String(ep.episode) === String(playerPageCurrentEpisodeNum));
            const episode = episodes[index + 1];
            if (episode) playEpisode(episode.file, episode.episode);
        });

        document.getElementById('playerSourceChip').addEventListener('click', () => {
            openBottomSheet('source');
        });

        document.getElementById('playerFilterBtn').addEventListener('click', () => {
            openBottomSheet('full');
        });

        document.getElementById('bsApplyBtn').addEventListener('click', () => {
            closeBottomSheet();
            if (bottomSheetMode === 'source') {
                showToast(`Джерело: ${playerPageCurrentSource}`);
            } else {
                showToast('Фільтри застосовано');
            }
        });

        document.getElementById('bottomSheetOverlay').addEventListener('click', function(e) {
            if (e.target === this) closeBottomSheet();
        });

        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.view;
                showViewMode(mode);
            });
        });

        document.getElementById('mainCharactersMoreBtn')?.addEventListener('click', () => {
            playerCharacterExpanded = !playerCharacterExpanded;
            renderMainCharacters(playerJikanData);
        });
        document.getElementById('mediaMoreBtn')?.addEventListener('click', () => {
            playerMediaExpanded = !playerMediaExpanded;
            renderAnimeMedia(playerJikanData);
        });
        document.getElementById('relatedMoreBtn')?.addEventListener('click', () => {
            const list = document.getElementById('relatedList');
            if (!list) return;
            list.innerHTML = playerRelatedItems.map(relatedCardMarkup).join('');
            list.querySelectorAll('.related-card').forEach(card => card.addEventListener('click', () => openRelatedAnimeInPlayer(card)));
            document.getElementById('relatedMoreBtn').hidden = true;
        });

        document.getElementById('likeBtn').addEventListener('click', toggleLike);
        document.getElementById('dislikeBtn').addEventListener('click', toggleDislike);
        document.getElementById('playerBookmarkBtn').addEventListener('click', toggleBookmark);
        document.getElementById('videoBackBtn')?.addEventListener('click', () => {
            const videoContainer = document.getElementById('playerVideoContainer');
            videoContainer.classList.remove('active');
            if (playerPagePlayer) { try { playerPagePlayer.destroy(); } catch(e){} playerPagePlayer = null; }
            document.getElementById('playerPageVideo').innerHTML = '';
        });

        // ====================================================================
        //  РЕЙТИНГ ГЛЯДАЧІВ (реальний, спільний, Firestore anime_ratings)
        // ====================================================================
        async function loadAnimeRatingAggregate(animeUrl) {
            const numEl = document.getElementById('playerRatingNum');
            const labelEl = document.getElementById('playerRatingLabel');
            if (!numEl) return;
            if (!playerRatingSourceIsTmdb) {
                numEl.textContent = '—';
                if (labelEl) labelEl.textContent = 'ОЦІНКА ГЛЯДАЧІВ';
            }
            try {
                if (!db) return;
                await ensureFirebaseGuestAuth();
                const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
                const q = query(collection(db, 'anime_ratings'), where('animeId', '==', animeId));
                const snap = await getDocs(q);
                // TMDB-рейтинг має пріоритет — якщо він уже застосований, локальну оцінку глядачів не показуємо в тому ж тайлі
                if (playerRatingSourceIsTmdb) return;
                if (snap.empty) { numEl.textContent = '—'; if (labelEl) labelEl.textContent = 'НЕМАЄ ОЦІНОК'; return; }
                let sum = 0, count = 0;
                snap.forEach(d => { const v = d.data().value; if (v === 1 || v === -1) { sum += v; count++; } });
                if (count === 0) { numEl.textContent = '—'; if (labelEl) labelEl.textContent = 'НЕМАЄ ОЦІНОК'; return; }
                const score = (((sum / count) + 1) / 2) * 10; // -1..1 -> 0..10
                numEl.textContent = score.toFixed(1);
                if (labelEl) labelEl.textContent = `${count} ${count === 1 ? 'ГОЛОС' : 'ГОЛОСІВ'}`;
            } catch (e) {
                console.warn('Rating aggregate error:', e);
            }
        }

        async function syncAnimeRating(animeUrl, value) {
            try {
                if (!db) return;
                await ensureFirebaseGuestAuth();
                const animeId = String(animeUrl.hashCode ? animeUrl.hashCode() : animeUrl);
                const uid = (auth?.currentUser?.uid) || Storage.getDeviceId?.() || 'anon';
                const docId = `${animeId}_${uid}`;
                const ref = doc(db, 'anime_ratings', docId);
                if (value === 0) { await deleteDoc(ref); }
                else { await setDoc(ref, { animeId, uid, value, updatedAt: Date.now() }); }
                loadAnimeRatingAggregate(animeUrl);
            } catch (e) {
                console.warn('syncAnimeRating error:', e);
            }
        }

        // ====================================================================
        //  РЕКОМЕНДАЦІЇ / ПОДІБНІ (реальні дані з каталогу за жанром)
        // ====================================================================
        function relatedAnimeLabel(anime) {
            const title = String(anime?.title || '');
            if (/\b(?:сезон|season)\s*\d+/i.test(title)) return (title.match(/(?:сезон|season)\s*\d+/i) || [''])[0];
            if (/\b\d+(?:-й|-я|-е)?\s*сезон/i.test(title)) return (title.match(/\b\d+(?:-й|-я|-е)?\s*сезон/i) || [''])[0];
            if (/фільм|movie|film/i.test(title)) return 'Фільм';
            if (/OVA|ONA|спешл|special/i.test(title)) return 'OVA / Special';
            return anime?.type === 'movie' ? 'Фільм' : '';
        }

        function renderPosterCards(container, list, excludeUrl) {
            const items = (list || []).filter(a => a.url !== excludeUrl).slice(0, 8);
            if (!items.length) { container.closest('section').style.display = 'none'; return; }
            container.closest('section').style.display = '';
            container.innerHTML = items.map(a => {
                const poster = a.images?.jpg?.large_image_url || '';
                const relationLabel = relatedAnimeLabel(a);
                return `
              <div class="poster-card" data-url="${escapeHtml(a.url)}">
                <div class="poster-thumb" style="background-image:url(${poster})">
                  ${(a.status || relationLabel) ? `<div class="poster-badges">${a.status ? `<span class="pb-format">${escapeHtml(a.status)}</span>` : ''}${relationLabel ? `<span class="pb-format">${escapeHtml(relationLabel)}</span>` : ''}</div>` : ''}
                </div>
                <div class="poster-title">${escapeHtml(a.title)}</div>
              </div>`;
            }).join('');
            container.querySelectorAll('.poster-card').forEach(card => {
                card.addEventListener('click', () => openPlayerPage(card.dataset.url));
            });
        }

        // Прибираємо суфікси сезону/частини/типу з назви, щоб знайти інші сезони/фільми того ж аніме
        function baseTitleForRelated(title) {
            return (title || '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[«»"'`]/g, '')
                .replace(/\b\d+(?:-й|-я|-е)?\s*сезон\b/gi, '')
                .replace(/\bсезон\s*\d+\b/gi, '')
                .replace(/\bseason\s*\d+\b/gi, '')
                .replace(/\bs\d+\b/gi, '')
                .replace(/\b\d+\s*частина\b/gi, '')
                .replace(/\bчастина\s*\d+\b/gi, '')
                .replace(/\b(фільм|movie|film|ova|ona|спешл|special)\b/gi, '')
                .replace(/[:\-–—]\s*$/, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function extractRelatedOrderNum(title) {
            const t = String(title || '');
            const m = t.match(/(\d+)(?:-й|-я|-е)?\s*сезон/i) || t.match(/сезон\s*(\d+)/i) ||
                t.match(/season\s*(\d+)/i) || t.match(/\bs(\d+)\b/i) ||
                t.match(/(\d+)\s*частина/i) || t.match(/частина\s*(\d+)/i);
            if (m) return parseInt(m[1], 10);
            if (/фільм|movie|film/i.test(t)) return 900;
            if (/ova|ona|спешл|special/i.test(t)) return 950;
            return 1;
        }

        let relatedSeasonsCache = {};
        async function fetchRelatedSeasons(anime) {
            const base = baseTitleForRelated(anime.title || anime.originalTitle);
            if (!base || base.length < 3) return [];
            const cacheKey = base.toLowerCase();
            if (relatedSeasonsCache[cacheKey] !== undefined) return relatedSeasonsCache[cacheKey];
            try {
                const results = await searchHikka(base, 1);
                const baseNorm = base.toLowerCase();
                const filtered = (results || []).filter(a => {
                    const otherBase = baseTitleForRelated(a.title).toLowerCase();
                    if (!otherBase) return false;
                    return otherBase === baseNorm || otherBase.includes(baseNorm) || baseNorm.includes(otherBase);
                });
                filtered.sort((a, b) => extractRelatedOrderNum(a.title) - extractRelatedOrderNum(b.title));
                relatedSeasonsCache[cacheKey] = filtered;
                return filtered;
            } catch (e) {
                console.warn('Related seasons fetch error:', e);
                relatedSeasonsCache[cacheKey] = [];
                return [];
            }
        }

        async function renderRelatedSeasons(anime) {
            const section = document.getElementById('relatedSeasonsSection');
            const el = document.getElementById('relatedSeasonsHscroll');
            if (section) section.style.display = 'none';
            if (!el) return;
            try {
                const list = await fetchRelatedSeasons(anime);
                renderPosterCards(el, list, anime.url);
            } catch (e) {
                console.warn('Related seasons render error:', e);
            }
        }

        async function renderRecommendationsAndSimilar(anime) {
            const recSection = document.getElementById('recommendationsSection');
            const recEl = document.getElementById('recommendationsHscroll');
            if (recSection) recSection.style.display = 'none';
            if (!recEl) return;
            const genres = anime.genres || [];
            // Пробуємо усі жанри по черзі, поки не знайдемо результат — раніше бралась
            // лише перша генра і секція просто лишалась порожньою/схованою, якщо жанр
            // не мапився або на сторінці жанру нічого не було.
            for (const g of genres) {
                const slug = GENRE_MAP[g];
                if (!slug) continue;
                try {
                    const list = await fetchHikkaByGenre(slug, 1);
                    const filtered = (list || []).filter(a => a.url !== anime.url);
                    if (filtered.length) {
                        renderPosterCards(recEl, filtered, anime.url);
                        return;
                    }
                } catch (e) {
                    console.warn('Recommendations/similar fetch error:', e);
                }
            }
            // Фолбек — якщо жоден жанр не дав результату, показуємо топ-100, щоб секція
            // не зникала непередбачувано в одних плеєрах і не з'являлась в інших.
            try {
                const top = await fetchHikkaTop100();
                renderPosterCards(recEl, top || [], anime.url);
            } catch (e) {
                console.warn('Recommendations fallback (top100) error:', e);
            }
        }

        document.getElementById('playerPageModal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closePlayerPage();
        });
        document.getElementById('playerShareBtn').addEventListener('click', shareAnime);
        document.getElementById('watchBackBtn')?.addEventListener('click', closeWatchPage);
        document.getElementById('watchSourcePill')?.addEventListener('click', () => openBottomSheet('source'));
        document.getElementById('watchFilterPill')?.addEventListener('click', () => openBottomSheet('full'));

        // ====================================================================
        //  ПОКАЗ ВИГЛЯДУ ЕПІЗОДІВ
        // ====================================================================
        export function showViewMode(mode) {
            const grid = document.getElementById('episodeViewGrid');
            const compact = document.getElementById('episodeViewCompact');
            const classic = document.getElementById('episodeViewClassic');
            grid.classList.toggle('hidden', mode !== 'grid');
            compact.classList.toggle('hidden', mode !== 'compact');
            classic.classList.toggle('hidden', mode !== 'classic');
            document.querySelectorAll('.view-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.view === mode);
            });
            playerPageCurrentView = mode;
        }
        window.showViewMode = showViewMode;
