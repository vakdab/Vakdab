import { HIKKA_API, HIKKA_PROXY_URL } from '../../config/constants.js?v=20260824-settings-redesign-v1';
import { safeQueryAll } from '../../utils/dom.js';
import { getProxyUrl, isEmbedUrl } from '../../utils/image.js';
import { debugLog } from '../../utils/debug.js';
import { DEFAULT_CATALOG_PAGE_SIZE, readCatalogMeta, attachCatalogMeta } from './pagination.js?v=20260829-catalog-28-v1';
import {
    externalSourceCache, playerPageAnime, playerPageAnimeuaSeasons,
    setPlayerPageCurrentDub, setPlayerPageCurrentSeason, setPlayerPageCurrentSource,
    setPlayerPageAnimeuaSeasons, setPlayerPageAnime,
    playerPageCurrentDub, playerPageCurrentSeason, playerPageCurrentSource,
    buildBottomSheetData, buildEpisodeViews, buildSeasonRow,
    showToast, updateFilterChip, updateSourceChip
} from '../../legacy/app-legacy.js?v=20260909-player-v8';

        export const CATALOG_POSTER_FALLBACK = './assets/icons/android-chrome-512x512.png';
        export function normalizeAnimeUrl(href = '') {
            const value = String(href || '').trim();
            if (!value) return '';
            try { return new URL(value, HIKKA_API).href; } catch { return ''; }
        }
        export function normalizePosterUrl(src = '', fallback = CATALOG_POSTER_FALLBACK) {
            const value = String(src || '').trim();
            return /^https?:\/\//i.test(value) ? value : fallback;
        }
        export function normalizeGenreList(values) {
            const result=[]; const seen=new Set();
            for (const value of (Array.isArray(values) ? values : [values])) {
                const label=String(typeof value==='object' ? (value?.name_ua || value?.name || '') : value || '').trim();
                const key=label.toLocaleLowerCase('uk-UA');
                if(label && !seen.has(key)){seen.add(key);result.push(label);}
            }
            return result;
        }
        export function normalizeSynopsisText(value) {
            return String(value || '')
                .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
                .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
                .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
                .replace(/<[^>]+>/g, '')
                .replace(/\\r?\\n/g, '\n')
                .replace(/\r\n?/g, '\n')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        }
        export function hikkaType(item={}) {
            return item.media_type==='movie' ? 'movie' : (item.media_type==='ova'||item.media_type==='ona' ? 'ova' : 'tv');
        }
        export function animeTypeLabel(type = 'tv') {
            return type === 'movie' ? 'Фільм' : type === 'ova' ? 'OVA' : 'Серіал';
        }
        export function extractExternalAnimeIds(item = {}) {
            const external = Array.isArray(item.external) ? item.external : [];
            const fromUrl = (pattern) => {
                const hit = external.map(x => String(x?.url || '')).map(url => url.match(pattern)).find(Boolean);
                return hit ? Number(hit[1]) : null;
            };
            const malId = Number(item.mal_id || item.malId || fromUrl(/myanimelist\.net\/anime\/(\d+)/i) || 0) || null;
            const anilistId = Number(item.anilist_id || item.anilistId || fromUrl(/anilist\.co\/anime\/(\d+)/i) || 0) || null;
            return { ...(malId ? { mal_id: malId } : {}), ...(anilistId ? { anilist_id: anilistId } : {}) };
        }
        export function hikkaItem(item={}, endpoint = 'anime') {
            const title=item.title_ua || item.title_en || item.title_ja || item.name_ua || item.name_en || 'Без назви';
            const contentType = endpoint === 'manga' ? 'manga' : endpoint === 'novel' ? 'novel' : hikkaType(item);
            const contentTypeLabel = contentType === 'manga' ? 'Манґа' : contentType === 'novel' ? 'Ранобе' : contentType === 'movie' ? 'Фільм' : contentType === 'ova' ? 'OVA' : 'Серіал';
            const genreSlugs = (Array.isArray(item.genres) ? item.genres : [item.genres])
                .map(value => typeof value === 'object' ? value?.slug : value)
                .map(value => String(value || '').trim())
                .filter(Boolean);
            return { ...item, mal_id:item.mal_id || item.slug?.hashCode?.() || Date.now(), title,
                originalTitle:item.title_en || item.title_ja || item.name_en || '', url:`${HIKKA_API}/${endpoint}/${item.slug}`,
                images:{jpg:{large_image_url:item.image || CATALOG_POSTER_FALLBACK, image_url:item.image || CATALOG_POSTER_FALLBACK}},
                genres:normalizeGenreList(item.genres), genreSlugs, type:contentType, typeLabel:contentTypeLabel,
                synopsis:normalizeSynopsisText(item.synopsis_ua || item.synopsis_en || ''), from:'hikka' };
        }
        export function hikkaRequest(url, options = {}) {
            return fetch(`${HIKKA_PROXY_URL}/?url=${encodeURIComponent(url)}`, {
                ...options,
                headers: { Accept: 'application/json', ...(options.headers || {}) }
            });
        }

        export const HIKKA_CATALOG_PAGE_SIZE = DEFAULT_CATALOG_PAGE_SIZE;

        export async function hikkaCatalog(type='anime', page=1, body={}) {
            const endpoint=type==='manga'?'manga':type==='novel'?'novel':'anime';
            const currentPage = Math.max(1, Number(page) || 1);
            const apiUrl = `${HIKKA_API}/${endpoint}?page=${currentPage}&size=${HIKKA_CATALOG_PAGE_SIZE}`;
            let res;
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt += 1) {
                try {
                    res = await hikkaRequest(apiUrl, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
                    if (res.ok) break;
                    const retryable = res.status === 429 || res.status >= 500;
                    if (!retryable || attempt === 3) throw new Error(`Hikka API: HTTP ${res.status}`);
                    await new Promise(resolve => setTimeout(resolve, 350 * (2 ** (attempt - 1))));
                } catch (error) {
                    lastError = error;
                    if (/Hikka API: HTTP 4\d\d/.test(String(error?.message || '')) || attempt === 3) throw error;
                    await new Promise(resolve => setTimeout(resolve, 350 * (2 ** (attempt - 1))));
                }
            }
            if (!res?.ok) throw lastError || new Error('Hikka API: порожня відповідь');
            let data;
            try { data = await res.json(); } catch { throw new Error('Hikka API: неправильний JSON'); }
            const rawItems = Array.isArray(data?.list) ? data.list : Array.isArray(data?.data) ? data.data : [];
            const items = rawItems.map(item => hikkaItem(item, endpoint));
            const meta = readCatalogMeta(data, currentPage, HIKKA_CATALOG_PAGE_SIZE, items.length);
            debugLog('catalog', 'page', { endpoint, requestedPage: currentPage, requestedLimit: HIKKA_CATALOG_PAGE_SIZE, receivedItems: rawItems.length, uniqueItems: new Set(items.map(item => item.url)).size, total: meta.total, hasNextPage: meta.hasNextPage });
            return attachCatalogMeta(items, meta);
        }
        export async function fetchHikkaMain(page) { return hikkaCatalog('anime', page, {only_translated:true, sort:['score:desc','scored_by:desc']}); }
        export async function searchHikka(query, page) { return hikkaCatalog('anime', page, {query:String(query||'').trim(), only_translated:true}); }
        export async function searchHikkaAllTitles(query, page) { return hikkaCatalog('anime', page, {query:String(query||'').trim()}); }
        export async function fetchHikkaByCategory(categorySlug, page) {
            const body = String(categorySlug).startsWith('format:')
                ? { media_type: [String(categorySlug).slice(7)], only_translated: true }
                : { genres: [categorySlug], only_translated: true };
            return hikkaCatalog('anime', page, body);
        }
        export async function fetchHikkaTop100() {
            const settled = await Promise.allSettled(
                [1, 2, 3, 4].map(page => hikkaCatalog('anime', page, {
                    sort: ['score:desc', 'scored_by:desc'],
                    only_translated: true
                }))
            );
            const unique = new Map();
            settled.forEach(result => {
                if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                    result.value.forEach(item => {
                        if (item?.url && !unique.has(item.url)) unique.set(item.url, item);
                    });
                }
            });
            return [...unique.values()].slice(0, 100);
        }
        export async function fetchHikkaByGenre(genreSlug, page) { return fetchHikkaByCategory(genreSlug, page); }

        export async function fetchHikkaQuickFilter(page, opts = {}) {
            const body = { only_translated: true };
            if (opts.genres && opts.genres.length) body.genres = opts.genres;
            if (opts.type) body.media_type = [opts.type];
            if (opts.status === 'ongoing') body.status = ['ongoing'];
            if (opts.yearMin && opts.yearMax) {
                body.years = [Number(opts.yearMin), Number(opts.yearMax)];
            }
            // Only these sort fields are supported by the Hikka API.
            // For alphabetical / episode-count sorting (not supported server-side),
            // we fetch by score and re-sort the page client-side.
            const apiSortMap = {
                rating: ['score:desc', 'scored_by:desc'],
                year: ['start_date:desc'],
                added: ['created:desc'],
                alpha: ['score:desc', 'scored_by:desc'],
                episodes: ['score:desc', 'scored_by:desc']
            };
            body.sort = apiSortMap[opts.sort] || apiSortMap.rating;
            const items = await hikkaCatalog('anime', page, body);
            // Client-side re-sort for options the API can't sort by.
            if (opts.sort === 'alpha') {
                items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'uk'));
            } else if (opts.sort === 'episodes') {
                items.sort((a, b) => Number(b.episodes_total || b.episodes_released || 0) - Number(a.episodes_total || a.episodes_released || 0));
            }
            return items;
        }

        // Hikka є єдиним джерелом каталогу та інформації. Mikai використовується
        // як proxy-джерело озвучок, сезонів і ASHDI no-ad embed-посилань.
        export async function fetchAnimeLite(animeUrl) {
            const match = String(animeUrl || '').match(/\/anime\/([^\/?#]+)/i);
            const slug = match?.[1] || String(animeUrl || '').split('/').filter(Boolean).pop();
            if (!slug) throw new Error('Не знайдено Hikka slug');
            const res = await hikkaRequest(`${HIKKA_API}/anime/${encodeURIComponent(slug)}`);
            if (!res.ok) throw new Error(`Hikka API: HTTP ${res.status}`);
            const d = await res.json();
            return {
                episodes: Number(d.episodes_total || d.episodes_released || 0) || null,
                synopsis: normalizeSynopsisText(d.synopsis_ua || d.synopsis_en || '')
            };
        }

        export function getExternalWatchUrl(hikkaAnime = {}, hostPattern) {
            const external = Array.isArray(hikkaAnime.external) ? hikkaAnime.external : [];
            return external.find(item => item?.type === 'watch' && hostPattern.test(item.url || ''))?.url || '';
        }
        export function getMikaiUrl(hikkaAnime = {}) {
            return getExternalWatchUrl(hikkaAnime, /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i);
        }
        export function getAnimeOnUrl(hikkaAnime = {}) {
            return getExternalWatchUrl(hikkaAnime, /^https?:\/\/(?:www\.)?animeon\.club\/anime\//i);
        }
        export function getAnimeOnId(animeOnUrl = '') {
            const match = String(animeOnUrl).match(/\/anime\/(\d+)(?:[-/]|$)/i);
            return match?.[1] || '';
        }
        export async function fetchAnimeOnJson(url) {
            const proxyUrl = getProxyUrl(url, 'desktop');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 25000);
            try {
                const res = await fetch(proxyUrl, {
                    mode: 'cors', credentials: 'omit', cache: 'no-cache', signal: controller.signal,
                    headers: { Accept: 'application/json' }
                });
                if (!res.ok) throw new Error(`AnimeON API: HTTP ${res.status}`);
                return await res.json();
            } finally { clearTimeout(timer); }
        }
        export async function loadAnimeOnSeasons(animeOnUrl) {
            const animeId = getAnimeOnId(animeOnUrl);
            if (!animeId) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
            const data = await fetchAnimeOnJson(`https://animeon.club/api/player/${animeId}/translations`);
            const translations = Array.isArray(data?.translations) ? data.translations : [];
            const ranked = translations.slice().sort((a, b) => {
                const an = String(a?.translation?.name || ''), bn = String(b?.translation?.name || '');
                const preferred = name => /fanvox|hajime|робота голосом|одноголос/i.test(name) ? 1 : 0;
                return preferred(bn) - preferred(an) ||
                    Math.max(...(b?.player || []).map(x => Number(x?.episodesCount) || 0), 0) -
                    Math.max(...(a?.player || []).map(x => Number(x?.episodesCount) || 0), 0);
            });
            const selected = ranked.find(x => (x?.player || []).some(p => Number(p?.episodesCount) > 0)) || ranked[0];
            const translation = selected?.translation;
            const player = (selected?.player || []).slice().sort((a, b) => (Number(b?.episodesCount) || 0) - (Number(a?.episodesCount) || 0))[0];
            if (!translation || !player) return { seasons: {}, dubLogos: {}, subtitleLogos: {} };
            const episodesData = await fetchAnimeOnJson(`https://animeon.club/api/player/${animeId}/episodes?take=100&skip=-1&playerId=${encodeURIComponent(player.id)}&translationId=${encodeURIComponent(translation.id)}&includeAlternative=true`);
            const episodeRefs = Array.isArray(episodesData?.episodes) ? episodesData.episodes : [];
            const loaded = await Promise.all(episodeRefs.map(async ref => {
                try {
                    const episode = await fetchAnimeOnJson(`https://animeon.club/api/player/${encodeURIComponent(ref.id)}/episode`);
                    const file = String(episode?.videoUrl || '').trim();
                    return file ? { episode: String(ref.episode), file, dub: translation.name, provider: 'AnimeON', label: translation.name } : null;
                } catch { return null; }
            }));
            const list = loaded.filter(Boolean).sort((a, b) => Number(a.episode) - Number(b.episode));
            const logo = translation.studios?.[0]?.avatar?.preview ? `https://animeon.club/api/uploads/images/${translation.studios[0].avatar.preview}` : '';
            return {
                seasons: list.length ? { '1': { [translation.name || 'AnimeON']: list } } : {},
                dubLogos: logo ? { [translation.name || 'AnimeON']: logo } : {},
                subtitleLogos: {}
            };
        }

        export function resolveMikaiNuxtPayload(payload) {
            const memo = new Map();
            const resolving = new Set();
            const resolveRef = (index) => {
                if (!Number.isInteger(index) || index < 0 || index >= payload.length) return index;
                if (memo.has(index)) return memo.get(index);
                if (resolving.has(index)) return null;
                resolving.add(index);
                const raw = payload[index];
                let value;
                if (typeof raw === 'number') value = raw;
                else if (Array.isArray(raw)) {
                    const tag = typeof raw[0] === 'string' ? raw[0] : '';
                    if (['ShallowReactive', 'Reactive', 'Set', 'Date', 'URL'].includes(tag) && raw.length > 1) {
                        value = resolveRef(raw[1]);
                    } else {
                        value = raw.map(item => typeof item === 'number' ? resolveRef(item) : item);
                    }
                } else if (raw && typeof raw === 'object') {
                    value = {};
                    Object.entries(raw).forEach(([key, item]) => {
                        value[key] = typeof item === 'number' ? resolveRef(item) : item;
                    });
                } else value = raw;
                resolving.delete(index);
                memo.set(index, value);
                return value;
            };
            return payload.map((_, index) => resolveRef(index));
        }

        export function addNoAdsQuery(url) {
            if (!url) return '';
            return `${url}${url.includes('?') ? '&' : '?'}nopl`;
        }

        export async function fetchMikaiHtml(mikaiUrl) {
            const proxyUrl = getProxyUrl(mikaiUrl, 'desktop');
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 25000);
            try {
                const res = await fetch(proxyUrl, {
                    mode: 'cors',
                    credentials: 'omit',
                    cache: 'no-cache',
                    signal: controller.signal,
                    headers: { Accept: 'text/html,application/xhtml+xml' }
                });
                if (!res.ok) throw new Error(`Mikai proxy: HTTP ${res.status}`);
                return await res.text();
            } finally {
                clearTimeout(timer);
            }
        }

        export function getMikaiTeamLogoUrl(team) {
            const avatarUid = team?.avatarUid || team?.avatar?.uid || team?.avatar?.id || team?.teams?.[0]?.avatarUid || '';
            return avatarUid ? `https://images.mikai.me/avatar/medium/${encodeURIComponent(avatarUid)}.webp` : '';
        }

        export function parseMikaiSeasonsFromHtml(html) {
            const htmlText = String(html || '');
            const posterCandidates = [...htmlText.matchAll(/https?:\/\/images\.mikai\.me\/(?:ua_poster|poster)\/(?:big|medium|small)\/[^"'<>\s]+/gi)]
                .map(match => match[0].replace(/&amp;/gi, '&'));
            const mikaiPosterUrl = posterCandidates.find(url => /\/ua_poster\/big\//i.test(url)) ||
                posterCandidates.find(url => /\/ua_poster\/medium\//i.test(url)) ||
                posterCandidates.find(url => /\/poster\/big\//i.test(url)) ||
                posterCandidates.find(url => /\/poster\/medium\//i.test(url)) || '';
            const match = htmlText.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
            if (!match) throw new Error('Mikai Nuxt payload не знайдено');
            let payload;
            try { payload = JSON.parse(match[1]); } catch { throw new Error('Mikai Nuxt payload пошкоджений'); }
            const resolved = resolveMikaiNuxtPayload(payload);
            const playerGroups = [];
            resolved.forEach(value => {
                if (Array.isArray(value?.players)) playerGroups.push(...value.players);
            });
            const dubs = new Map();
            const dubLogos = {};
            const subtitleLogos = {};
            playerGroups.forEach(group => {
                if (!group || !Array.isArray(group.providers)) return;
                const teamName = String(group.team?.name || 'Озвучка').trim();
                const logoUrl = getMikaiTeamLogoUrl(group.team);
                if (logoUrl) {
                    (group.isSubs ? subtitleLogos : dubLogos)[teamName] = logoUrl;
                }
                if (group.isSubs) return;
                // Collect episodes per provider first. Mikai lists several
                // providers (ASHDI, MOONANIME, TORTUGA...) for the same team,
                // and mixing them blindly replaces working links with broken
                // ones, so the merge below is ordered and per-episode.
                const providerEpisodes = new Map();
                group.providers.forEach(provider => {
                    const providerName = String(provider?.name || '').trim().toUpperCase();
                    if (!providerName) return;
                    const episodes = providerEpisodes.get(providerName) || new Map();
                    (provider.episodes || []).forEach(ep => {
                        const number = String(ep?.number ?? '').trim();
                        const playLink = String(ep?.playLink || '').trim();
                        if (!number || !playLink) return;
                        const previous = episodes.get(number);
                        if (!previous || String(ep?.createdAt || '') > String(previous.createdAt || '')) {
                            episodes.set(number, {
                                title: `Серія ${number}`,
                                season: '1',
                                episode: number,
                                file: addNoAdsQuery(playLink),
                                dub: teamName,
                                teamLogo: logoUrl,
                                provider: providerName,
                                createdAt: ep?.createdAt || ''
                            });
                        }
                    });
                    if (episodes.size) providerEpisodes.set(providerName, episodes);
                });
                if (!providerEpisodes.size) return;
                // ASHDI is the primary source: the player resolves its direct
                // HLS manifests. MOONANIME (iframe) only fills episodes that
                // ASHDI does not have, e.g. teams/uploads without an ASHDI copy.
                // TORTUGA and unknown providers are ignored on purpose: the
                // player cannot resolve their links.
                const merged = new Map();
                ['ASHDI', 'MOONANIME'].forEach(providerName => {
                    const episodes = providerEpisodes.get(providerName);
                    if (!episodes) return;
                    episodes.forEach((episode, number) => {
                        if (!merged.has(number)) merged.set(number, episode);
                    });
                });
                if (merged.size) dubs.set(teamName, merged);
            });
            const dubObject = {};
            [...dubs.entries()].sort(([a], [b]) => a.localeCompare(b, 'uk')).forEach(([team, episodes]) => {
                const list = [...episodes.values()].sort((a, b) => Number(a.episode) - Number(b.episode));
                if (list.length) dubObject[team] = list;
            });
            return {
                seasons: Object.keys(dubObject).length ? { '1': dubObject } : {},
                dubLogos,
                subtitleLogos,
                mikaiPosterUrl
            };
        }

        export const ashdiPlaybackCache = new Map();
        export async function resolveAshdiPlaybackUrl(ashdiPageUrl) {
            if (!ashdiPageUrl) throw new Error('Порожній ASHDI URL');
            const cached = ashdiPlaybackCache.get(ashdiPageUrl);
            if (cached) return cached;
            const html = await fetchMikaiHtml(ashdiPageUrl);
            const normalizedHtml = String(html)
                .replace(/\\u002F/g, '/')
                .replace(/\\\//g, '/')
                .replace(/&amp;/gi, '&');
            const matches = normalizedHtml.match(/https?:\/\/[^"'<>\s]+\.m3u8(?:\?[^"'<>\s]*)?/gi) || [];
            const manifest = matches.find(url => /ashdi\.vip|video\d+/i.test(url)) || matches[0];
            if (!manifest) throw new Error('ASHDI m3u8 manifest не знайдено');
            const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
            const proxiedManifest = getProxyUrl(manifest, isMobileDevice ? 'mobile' : 'desktop');
            ashdiPlaybackCache.set(ashdiPageUrl, proxiedManifest);
            return proxiedManifest;
        }

        const moonanimeStreamCache = new Map();

        // MoonAnime wraps its player config in an obfuscated inline script:
        // base64 -> XOR(seed byte + 32-byte key + rolling checksum). This
        // decrypts it and returns the raw Playerjs config text.
        function decryptMoonanimePlayerConfig(html) {
            const scripts = String(html || '').match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi) || [];
            for (const raw of scripts) {
                const body = raw.replace(/^<script[^>]*>/i, '').replace(/<\/script>\s*$/i, '');
                const blobMatch = body.match(/atob\(\s*"([A-Za-z0-9+\/=]{500,})"\s*\)/);
                if (!blobMatch || !/Uint8Array\.from\(/.test(body)) continue;
                try {
                    const bytes = Uint8Array.from(atob(blobMatch[1]), c => c.charCodeAt(0));
                    if (bytes.length < 40) continue;
                    const key = bytes.slice(1, 33);
                    const out = new Uint8Array(bytes.length - 33);
                    let rolling = bytes[0];
                    for (let i = 0; i < out.length; i += 1) {
                        const k = key[i % 32];
                        out[i] = bytes[i + 33] ^ k ^ rolling;
                        rolling = (bytes[i + 33] + k) & 255;
                    }
                    const decrypted = new TextDecoder().decode(out);
                    if (/new\s+Playerjs/.test(decrypted)) return decrypted;
                } catch (_) { /* try the next inline script */ }
            }
            return null;
        }

        // The Playerjs config stores the stream URL as `file: fn("base64")`,
        // where fn XOR-decodes with a short key embedded next to it.
        function decodeMoonanimeConfigValue(decrypted, configKey) {
            const valueMatch = decrypted.match(new RegExp(configKey + '\\s*:\\s*[A-Za-z_$][\\w$]*\\(\\s*"([A-Za-z0-9+/=]+)"\\s*\\)'));
            if (!valueMatch) return '';
            const keyMatch = decrypted.match(/var\s+k\s*=\s*"([^"]+)"/);
            if (!keyMatch) return '';
            const key = keyMatch[1];
            const bytes = Uint8Array.from(atob(valueMatch[1]), c => c.charCodeAt(0));
            let out = '';
            for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i] ^ key.charCodeAt(i % key.length));
            try { return decodeURIComponent(escape(out)); } catch (_) { return out; }
        }

        // Resolves a MoonAnime iframe page into a direct HLS manifest so the
        // episode plays inside our own LampaPlayer instead of their embed.
        export async function resolveMoonanimeStreamUrl(iframeUrl) {
            if (!iframeUrl) throw new Error('Порожній MoonAnime URL');
            const cached = moonanimeStreamCache.get(iframeUrl);
            if (cached) return cached;
            const html = await fetchMikaiHtml(iframeUrl);
            const decrypted = decryptMoonanimePlayerConfig(html);
            if (!decrypted) throw new Error('не вдалося прочитати плеєр MoonAnime');
            let manifest = decodeMoonanimeConfigValue(decrypted, 'file');
            if (!/^https?:\/\//i.test(manifest) || !/\.m3u8/i.test(manifest)) {
                throw new Error('потік MoonAnime не знайдено');
            }
            const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
            const proxiedManifest = getProxyUrl(manifest, isMobileDevice ? 'mobile' : 'desktop');
            moonanimeStreamCache.set(iframeUrl, proxiedManifest);
            return proxiedManifest;
        }

        export function inferAnimeSeasonNumber(data = {}, ...sources) {
            const explicit = [data.season_number, data.seasonNumber, data.season?.number, data.season?.season_number]
                .map(Number).find(n => Number.isInteger(n) && n > 0 && n < 100);
            if (explicit) return String(explicit);
            const text = [
                data.title_ua, data.title_en, data.title_ja, data.name_ua, data.name_en,
                data.slug, data.url, ...sources
            ].filter(Boolean).join(' ');
            const match = String(text).match(/(?:\bseason\s*|\bсезон\s*|\bсезона\s*|\bсезону\s*)(\d{1,2})/i) ||
                String(text).match(/\b(\d{1,2})(?:st|nd|rd|th|-й|-я|-е)?\s*season\b/i) ||
                String(text).match(/\bs(\d{1,2})(?:\b|[-_])/i);
            const number = Number(match?.[1]);
            return Number.isInteger(number) && number > 0 && number < 100 ? String(number) : '1';
        }
        export async function loadMikaiSeasons(mikaiUrl) {
            if (!mikaiUrl) return { seasons: {}, dubLogos: {}, subtitleLogos: {}, mikaiPosterUrl: '' };
            const html = await fetchMikaiHtml(mikaiUrl);
            return parseMikaiSeasonsFromHtml(html);
        }
        export function pickPreferredDub(seasonData = {}) {
            const dubs = Object.keys(seasonData || {});
            return dubs.find(dub => /робота голосом/i.test(dub)) ||
                dubs.slice().sort((a, b) => (seasonData[b]?.length || 0) - (seasonData[a]?.length || 0))[0] || '';
        }

        export async function loadHikkaDetail(animeUrl) {
            const match = String(animeUrl || '').match(/\/anime\/([^\/?#]+)/i);
            const slug = match?.[1] || String(animeUrl || '').split('/').filter(Boolean).pop();
            if (!slug) throw new Error('Не знайдено Hikka slug');
            const res = await hikkaRequest(`${HIKKA_API}/anime/${encodeURIComponent(slug)}`);
            if (!res.ok) throw new Error(`Hikka API: HTTP ${res.status}`);
            const d = await res.json();
            const item = hikkaItem(d);
            const total = Number(d.episodes_total || d.episodes_released || 0);
            const mikaiUrl = getMikaiUrl(d);
            const animeOnUrl = getAnimeOnUrl(d);
            let seasons = {};
            let dubLogos = {};
            let subtitleLogos = {};
            let mikaiPosterUrl = '';
            if (mikaiUrl) {
                try {
                    const mikaiData = await loadMikaiSeasons(mikaiUrl);
                    seasons = mikaiData.seasons || {};
                    const sourceSeason = inferAnimeSeasonNumber(d, mikaiUrl, animeUrl);
                    if (sourceSeason !== '1' && seasons['1']) seasons = { [sourceSeason]: seasons['1'] };
                    dubLogos = mikaiData.dubLogos || {};
                    subtitleLogos = mikaiData.subtitleLogos || {};
                    mikaiPosterUrl = mikaiData.mikaiPosterUrl || '';
                } catch (error) { console.warn('[Mikai] Не вдалося завантажити ASHDI:', error); }
            }
            if (!Object.keys(seasons).length && animeOnUrl) {
                try {
                    const animeOnData = await loadAnimeOnSeasons(animeOnUrl);
                    seasons = animeOnData.seasons || {};
                    dubLogos = animeOnData.dubLogos || {};
                    subtitleLogos = animeOnData.subtitleLogos || {};
                } catch (error) { console.warn('[AnimeON] Не вдалося завантажити епізоди:', error); }
            }
            return {
                ...item,
                title: d.title_ua || d.title_en || item.title,
                originalTitle: d.title_en || d.title_ja || '',
                year: d.year || '',
                synopsis: normalizeSynopsisText(d.synopsis_ua || d.synopsis_en || ''),
                score: d.score || d.native_score || null,
                rating: d.score || d.native_score || null,
                runtimeMinutes: d.duration || 0,
                totalEpisodes: total,
                seasons,
                dubLogos,
                subtitleLogos,
                mikaiUrl,
                mikaiPosterUrl,
                animeOnUrl,
                from: mikaiUrl ? 'hikka+mikai+ashdi' : animeOnUrl ? 'hikka+animeon+ashdi' : 'hikka',
                externalIds: extractExternalAnimeIds(d)
            };
        }

        // Об'єднує дані аніме з Hikka постерами та озвучками від інших джерел
        export function unifyAnimeDataWithExternalDubs(hikkaData, externalSeasons, providerName) {
            if (!hikkaData) return externalSeasons;

            // Зберігаємо постер та інформацію з Hikka
            const unifiedData = {
                ...hikkaData,
                seasons: externalSeasons || {}
            };

            // Переконуємось що постер завжди з Hikka
            if (hikkaData.images?.jpg?.large_image_url) {
                unifiedData.images = {
                    jpg: {
                        large_image_url: hikkaData.images.jpg.large_image_url,
                        image_url: hikkaData.images.jpg.large_image_url
                    }
                };
            }

            return unifiedData;
        }

        // Оптимізація: кешування результатів для швидшого переключення джерел
        export const sourceCache = {};
        export function getCachedSource(provider, title) {
            const key = `${provider}:${title}`;
            return sourceCache[key];
        }
        export function setCachedSource(provider, title, data) {
            const key = `${provider}:${title}`;
            sourceCache[key] = data;
        }

        export async function switchProviderSource(providerName) {
            if (providerName === playerPageCurrentSource) return;
            const prevSource = playerPageCurrentSource;
            setPlayerPageCurrentSource(providerName);
            updateSourceChip();
            buildBottomSheetData();

            if (providerName === 'Основне') {
                playerPageAnime.seasons = playerPageAnimeuaSeasons || {};
                refreshAfterSourceSwitch();
                showToast('Джерело: Основне');
                return;
            }

            showToast(`Шукаю озвучки ${providerName}...`);
            try {
                let sourceData = externalSourceCache[providerName];
                if (!sourceData) {
                    const isMikaiProvider = /^mikai\.me$/i.test(String(providerName || '').trim());
                    sourceData = isMikaiProvider
                        ? await loadMikaiSeasons(playerPageAnime?.mikaiUrl || getMikaiUrl(playerPageAnime))
                        : await loadAnimeOnSeasons(playerPageAnime?.animeOnUrl || getAnimeOnUrl(playerPageAnime));
                    externalSourceCache[providerName] = sourceData;
                }
                const mikaiData = sourceData;
                playerPageAnime.seasons = mikaiData.seasons || {};
                playerPageAnime.dubLogos = mikaiData.dubLogos || {};
                playerPageAnime.subtitleLogos = mikaiData.subtitleLogos || {};
                refreshAfterSourceSwitch();
                showToast(`${providerName}: українське відео без реклами`);
            } catch (e) {
                console.warn('[switchProviderSource]', providerName, e);
                showToast(`${providerName}: ${e.message || 'недоступно'}`);
                setPlayerPageCurrentSource(prevSource);
                updateSourceChip();
                buildBottomSheetData();
            }
        }

        export function refreshAfterSourceSwitch() {
            const seasons = Object.keys(playerPageAnime.seasons || {}).sort((a, b) => parseInt(a) - parseInt(b));
            setPlayerPageCurrentSeason(seasons[0] || '1');
            setPlayerPageCurrentDub(pickPreferredDub(playerPageAnime.seasons[playerPageCurrentSeason]));
            buildSeasonRow(seasons);
            buildEpisodeViews();
            updateFilterChip();
            buildBottomSheetData();
            if (seasons.length === 0) {
                document.getElementById('episodeViewGrid').innerHTML =
                    '<div class="episode-empty"><i class="fas fa-search"></i> Серії не знайдені на цьому джерелі.</div>';
            }
        }

        export function extractPlayerIframeUrls(doc) {
            const selectors = ['.video-responsive iframe', '.player-responsive iframe', '#player iframe',
                '.pmovie__player iframe', 'iframe[src]', 'iframe[data-src]',
                // мобільна версія hikka.io / mikai.me верстає плеєр в інших контейнерах
                '[class*="player"] iframe', '[class*="video"] iframe',
                'iframe[src*="ashdi"]', 'iframe[src*="vidmoly"]',
                'iframe[data-src*="ashdi"]', 'iframe[data-src*="vidmoly"]'
            ];
            const urls = [];
            for (const sel of selectors) {
                safeQueryAll(sel, doc).forEach(el => {
                    let src = el.getAttribute('src') || el.getAttribute('data-src');
                    if (!src || src === 'about:blank') return;
                    if (src.startsWith('//')) src = 'https:' + src;
                    if (!src.startsWith('http')) src = HIKKA_API + src;
                    urls.push(src);
                });
            }
            const scripts = safeQueryAll('script:not([src])', doc);
            for (const s of scripts) {
                const matches = s.textContent.matchAll(/(?:playerUrl|iframeUrl|src)\s*[:=]\s*['"]([^'"]+)['"]/g);
                for (const match of matches) {
                    let url = match[1];
                    if (url.includes('ashdi.vip') || url.includes('vidmoly') || url.includes('player')) {
                        if (url.startsWith('//')) url = 'https:' + url;
                        if (!url.startsWith('http')) url = HIKKA_API + url;
                        urls.push(url);
                    }
                }
            }
            // Fallback: якщо DOM-парсинг нічого не знайшов (мобільна версія сторінки
            // інколи віддає плеєр у сирому вигляді, який DOMParser не будує правильно) —
            // шукаємо iframe src/data-src прямо в raw HTML через regex.
            if (urls.length === 0) {
                const rawHtml = doc._rawHtml || '';
                const iframeRegex = /iframe[^>]+(?:src|data-src)=["']([^"']*(?:ashdi\.vip|vidmoly|player)[^"']*)["']/gi;
                let m;
                while ((m = iframeRegex.exec(rawHtml)) !== null) {
                    let url = m[1];
                    if (url.startsWith('//')) url = 'https:' + url;
                    if (!url.startsWith('http')) url = HIKKA_API + url;
                    if (!urls.includes(url)) urls.push(url);
                }
            }
            return [...new Set(urls)];
        }

        export function extractSourcesFromText(text, providerName) {
            let sources = [];
            // Покращений regex для Playerjs file:'[...]'
            let jsonMatch = null;
            const _pjsM = text.match(/Playerjs\s*\(\s*\{[\s\S]*?file\s*:\s*'(\[[\s\S]*?\])'\s*[,\n]/);
            if (_pjsM) { jsonMatch = [null, _pjsM[1]]; }
            if (!jsonMatch) {
                const _fmA = text.match(/file\s*:\s*'(\[[\s\S]+?\])'/i);
                const _fmB = text.match(/file\s*:\s*"(\[[\s\S]+?\])"/i);
                if (_fmA) jsonMatch = [null, _fmA[1]];
                else if (_fmB) jsonMatch = [null, _fmB[1]];
            }
            if (!jsonMatch) {
                jsonMatch = text.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);
            }
            if (jsonMatch) {
                try {
                    let raw = jsonMatch[1].trim();
                    if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw
                        .slice(1, -1);
                    if (raw.startsWith('{') && raw.endsWith('}')) raw = `[${raw}]`;
                    const clean = raw.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
                    const arr = JSON.parse(clean);
                    const walk = (items, dub, season) => {
                        dub = dub || '';
                        season = season || '1';
                        items.forEach(item => {
                            if (item.folder || item.playlist) {
                                let nd = dub,
                                    ns = season;
                                const ft = item.title || '';
                                const sm = ft.match(/[Сс]езон\s*(\d+)/);
                                if (sm) { ns = sm[1]; if (ft.trim().toLowerCase() !== `сезон ${ns}`.toLowerCase()) nd =
                                        ft.replace(/[Сс]езон\s*\d+/g, '').replace(/\//g, '').trim() || dub; } else if (
                                    ft) nd = ft;
                                walk(item.folder || item.playlist, nd, ns);
                            } else if (item.file) {
                                const epT = item.title || 'Серія';
                                let fd = dub || providerName || 'UA',
                                    fs = season;
                                const esm = epT.match(/[Сс]езон\s*(\d+)/);
                                if (esm) fs = esm[1];
                                const epm = epT.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Еe]п\.?\s*(\d+)/);
                                sources.push({ label: epT, file: item.file, provider: providerName, dub: fd.trim(),
                                    season: fs, episode: epm ? (epm[1] || epm[2] || epm[3]) : '1' });
                            }
                        });
                    };
                    if (Array.isArray(arr)) walk(arr);
                    else if (arr.file) sources.push({ label: arr.title || 'Озвучка', file: arr.file,
                        provider: providerName, dub: providerName || 'UA', season: '1', episode: '1' });
                } catch (e) { console.warn('JSON parse error', e); }
            }
            if (sources.length === 0) {
                // Деякі версії плеєра віддають прямий mp4, а не m3u8. Раніше такі
                // джерела губились і на Android виходило «серій немає».
                const urlMatches = [...text.matchAll(/https?:\/\/[^\s\'"<>]+\.(?:m3u8|mp4)(?:\?[^\s\'"<>]*)?/gi)];
                urlMatches.forEach((m, idx) => {
                    const file = m[0].replace(/\\\//g, '/');
                    if (!sources.some(s => s.file === file)) sources.push({ label: `Потік ${idx + 1}`, file,
                        provider: providerName, dub: providerName || 'UA', season: '1', episode: String(idx + 1) });
                });
            }
            // Нормалізуємо дублікати та биті пробіли в URL, які часто приходять
            // з HTML-атрибутів на мобільній версії джерела.
            sources = sources.filter(s => s && typeof s.file === 'string' && /^https?:\/\//i.test(s.file))
                .map(s => ({ ...s, file: s.file.trim().replace(/\\\//g, '/') }))
                .filter((s, i, arr) => arr.findIndex(x => x.file === s.file && x.episode === s.episode && x.dub === s.dub) === i);
            return sources;
        }
