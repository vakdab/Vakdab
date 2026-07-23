import { ANIMEUA_BASE } from "../config/constants.js";
import { safeQuery, safeQueryAll } from "../utils/dom.js";
import { fetchUA } from "./fetch.js";

function parseAnimeuaCards(doc) {
  const cards = safeQueryAll('.poster', doc);
  if (cards.length) {
    return cards.map(card => {
      const linkEl = card.tagName === 'A' ? card : safeQuery('a', card);
      const href = linkEl?.getAttribute('href') || '';
      const img = safeQuery('img', card);
      const posterSrc = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
      const titleEl = safeQuery('.poster__title', card) || safeQuery('h3', card);
      const title = (titleEl?.textContent || '').trim() || 'Без назви';
      return {
        mal_id: href.hashCode(),
        title,
        url: href.startsWith('http') ? href : ANIMEUA_BASE + href,
        images: { jpg: { large_image_url: posterSrc.startsWith('http') ? posterSrc : (posterSrc ? ANIMEUA_BASE + posterSrc : '') } },
        score: null,
        year: null,
        from: 'animeua'
      };
    });
  }
  const links = safeQueryAll('a[href*="/anime/"]', doc);
  const unique = new Map();
  links.forEach(a => { if (!unique.has(a.href)) unique.set(a.href, a); });
  return Array.from(unique.values()).map(a => {
    const img = safeQuery('img', a);
    const src = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
    const title = (safeQuery('.poster__title', a)?.textContent || a.textContent || '').trim();
    return {
      mal_id: a.href.hashCode(),
      title: title || 'Без назви',
      url: a.href,
      images: { jpg: { large_image_url: src.startsWith('http') ? src : ANIMEUA_BASE + src } },
      score: null,
      year: null,
      from: 'animeua'
    };
  });
}

export async function fetchAnimeuaMain(page) {
  const doc = await fetchUA(`${ANIMEUA_BASE}/page/${page}/`);
  return parseAnimeuaCards(doc);
}
export async function searchAnimeua(query, page) {
  const doc = await fetchUA(`${ANIMEUA_BASE}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}&page=${page}`);
  return parseAnimeuaCards(doc);
}
export async function fetchAnimeuaByCategory(categorySlug, page) {
  const url = page > 1 ? `${ANIMEUA_BASE}/${categorySlug}/page/${page}/` : `${ANIMEUA_BASE}/${categorySlug}/`;
  const doc = await fetchUA(url);
  return parseAnimeuaCards(doc);
}
export async function fetchAnimeuaTop100() {
  const doc = await fetchUA(`${ANIMEUA_BASE}/top.html`);
  return parseAnimeuaCards(doc);
}
export async function fetchAnimeuaByGenre(genreSlug, page) {
  const url = page > 1 ? `${ANIMEUA_BASE}/${genreSlug}/page/${page}/` : `${ANIMEUA_BASE}/${genreSlug}/`;
  const doc = await fetchUA(url);
  return parseAnimeuaCards(doc);
}

function extractPlayerIframeUrls(doc) {
  const selectors = ['.video-responsive iframe', '.player-responsive iframe', '#player iframe', '.pmovie__player iframe', 'iframe[src]', 'iframe[data-src]'];
  const urls = [];
  for (const sel of selectors) {
    safeQueryAll(sel, doc).forEach(el => {
      let src = el.getAttribute('src') || el.getAttribute('data-src');
      if (!src || src === 'about:blank') return;
      if (src.startsWith('//')) src = 'https:' + src;
      if (!src.startsWith('http')) src = ANIMEUA_BASE + src;
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
        if (!url.startsWith('http')) url = ANIMEUA_BASE + url;
        urls.push(url);
      }
    }
  }
  return [...new Set(urls)];
}

function extractSourcesFromText(text, providerName) {
  let sources = [];
  let jsonMatch = null;
  const _pjsM = text.match(/Playerjs\s*\(\s*\{[\s\S]*?file\s*:\s*'(\[[\s\S]*?\])'\s*[,\n]/);
  if (_pjsM) jsonMatch = [null, _pjsM[1]];
  if (!jsonMatch) {
    const _fmA = text.match(/file\s*:\s*'(\[[\s\S]+?\])'/i);
    const _fmB = text.match(/file\s*:\s*"(\[[\s\S]+?\])"/i);
    if (_fmA) jsonMatch = [null, _fmA[1]];
    else if (_fmB) jsonMatch = [null, _fmB[1]];
  }
  if (!jsonMatch) jsonMatch = text.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);
  if (jsonMatch) {
    try {
      let raw = jsonMatch[1].trim();
      if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1);
      if (raw.startsWith('{') && raw.endsWith('}')) raw = `[${raw}]`;
      const clean = raw.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
      const arr = JSON.parse(clean);
      const walk = (items, dub, season) => {
        dub = dub || '';
        season = season || '1';
        items.forEach(item => {
          if (item.folder || item.playlist) {
            let nd = dub, ns = season;
            const ft = item.title || '';
            const sm = ft.match(/[Сс]езон\s*(\d+)/);
            if (sm) { ns = sm[1]; if (ft.trim().toLowerCase() !== `сезон ${ns}`.toLowerCase()) nd = ft.replace(/[Сс]езон\s*\d+/g, '').replace(/\//g, '').trim() || dub; } else if (ft) nd = ft;
            walk(item.folder || item.playlist, nd, ns);
          } else if (item.file) {
            const epT = item.title || 'Серія';
            let fd = dub || providerName || 'UA', fs = season;
            const esm = epT.match(/[Сс]езон\s*(\d+)/);
            if (esm) fs = esm[1];
            const epm = epT.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Еe]п\.?\s*(\d+)/);
            sources.push({ label: epT, file: item.file, provider: providerName, dub: fd.trim(), season: fs, episode: epm ? (epm[1] || epm[2] || epm[3]) : '1' });
          }
        });
      };
      if (Array.isArray(arr)) walk(arr);
      else if (arr.file) sources.push({ label: arr.title || 'Озвучка', file: arr.file, provider: providerName, dub: providerName || 'UA', season: '1', episode: '1' });
    } catch (e) { /* ignore */ }
  }
  if (sources.length === 0) {
    const urlMatches = [...text.matchAll(/https?:\/\/[^\s\'"<>]+\.m3u8[^\s\'"<>]*/g)];
    urlMatches.forEach((m, idx) => {
      if (!sources.some(s => s.file === m[0])) sources.push({ label: `Потік ${idx+1}`, file: m[0], provider: providerName, dub: providerName || 'UA', season: '1', episode: String(idx + 1) });
    });
  }
  return sources;
}

export async function loadAnimeuaDetail(animeUrl) {
  const doc = await fetchUA(animeUrl);
  const hasAnimeContent = safeQuery('.pmovie__title, .page__subcol-main h1, .pmovie__player, .video-responsive iframe, .video-responsive iframe[data-src]', doc);
  const rawHtml = doc._rawHtml || '';
  const hasIframe = rawHtml.includes('ashdi.vip') || rawHtml.includes('vidmoly') || rawHtml.includes('iframe');
  if (!hasAnimeContent && !hasIframe) throw new Error('Це аніме не знайдено на сайті.');

  let title = '';
  for (const sel of ['.page__subcol-main h1', '.pmovie__title', 'h1.title', 'h1']) {
    const el = safeQuery(sel, doc);
    if (el?.textContent.trim()) { title = el.textContent.trim(); break; }
  }
  let poster = '';
  for (const sel of ['div.page__subcol-side .img-fit-cover img', '.pmovie__poster img', '.anime__poster img']) {
    const el = safeQuery(sel, doc);
    if (el) { const src = el.getAttribute('data-src') || el.getAttribute('src') || '';
      if (src) { poster = src.startsWith('http') ? src : ANIMEUA_BASE + src; break; } }
  }
  const genres = safeQueryAll('.pmovie__genres a, .genres a', doc).map(a => a.textContent.trim()).filter(Boolean);
  const yearEl = safeQuery('.pmovie__year, .release-year', doc);
  const yearMatch = (yearEl?.textContent || '').match(/\d{4}/);
  let year = yearMatch ? parseInt(yearMatch[0]) : null;
  if (year !== null) year = year - 1;
  let synopsis = '';
  for (const sel of ['.full-text', '.pmovie__description', '.anime__description']) {
    const el = safeQuery(sel, doc);
    if (el?.textContent.trim()) { synopsis = el.textContent.trim(); break; }
  }
  let rating = '';
  const ratingEl = safeQuery('.pmovie__age p, .pmovie__age', doc);
  if (ratingEl) rating = ratingEl.textContent.replace('Рейтинг:', '').trim();

  const playerUrls = extractPlayerIframeUrls(doc);
  const allRawSources = [];
  const playerFetchResults = await Promise.allSettled(
    playerUrls.map(async (playerUrl) => {
      let provider = 'Джерело';
      if (playerUrl.includes('ashdi')) provider = 'AnimeUA';
      else if (playerUrl.includes('vidmoly')) provider = 'Vidmoly';
      else if (playerUrl.includes('player')) provider = 'Player';
      const playerHtml = await fetchUA(playerUrl);
      const text = playerHtml._rawHtml || playerHtml.body?.innerHTML || '';
      let sources = extractSourcesFromText(text, provider);
      const nestedResults = await Promise.allSettled(
        safeQueryAll('iframe', playerHtml)
          .map(nested => nested.getAttribute('src') || nested.getAttribute('data-src'))
          .filter(u => u && u !== 'about:blank')
          .map(u => {
            if (u.startsWith('//')) u = 'https:' + u;
            if (!u.startsWith('http')) u = ANIMEUA_BASE + u;
            return fetchUA(u).then(h => extractSourcesFromText(h._rawHtml || h.body?.innerHTML || '', provider));
          })
      );
      nestedResults.forEach(r => { if (r.status === 'fulfilled') sources.push(...r.value); });
      return sources;
    })
  );
  playerFetchResults.forEach(r => { if (r.status === 'fulfilled') allRawSources.push(...r.value); });

  const seasons = {};
  const seenKeys = new Set();
  allRawSources.forEach(s => {
    const sn = s.season || '1', dn = s.dub || 'UA', en = s.episode || '1';
    const uk = `${sn}-${dn}-${en}-${s.file}`;
    if (!seenKeys.has(uk)) {
      seenKeys.add(uk);
      if (!seasons[sn]) seasons[sn] = {};
      if (!seasons[sn][dn]) seasons[sn][dn] = [];
      seasons[sn][dn].push({ title: s.label, season: sn, episode: en, file: s.file, dub: dn, provider: s.provider });
    }
  });
  for (const s in seasons)
    for (const d in seasons[s]) seasons[s][d].sort((a, b) => parseInt(a.episode) - parseInt(b.episode));

  const sources = [...new Set(allRawSources.map(s => s.provider).filter(Boolean))];
  if (sources.length === 0) sources.push('Основне');

  return {
    mal_id: animeUrl.hashCode(),
    title,
    images: { jpg: { large_image_url: poster, image_url: poster } },
    genres,
    year,
    synopsis,
    seasons,
    url: animeUrl,
    from: 'animeua',
    score: rating,
    sources: sources,
    totalEpisodes: Object.values(seasons).reduce((sum, s) => sum + Object.values(s).reduce((s2, e) => Math.max(s2, e.length), 0), 0)
  };
}
