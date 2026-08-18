
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const target = url.searchParams.get('url');
    if (!target || target.trim() === '') {
      return new Response("Missing 'url' parameter", {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' },
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch (_) {
      return new Response("Invalid 'url' parameter", {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' },
      });
    }

    // --- VakDab manga-only mode: resolve the chapter list for one manga title ---
    if (url.searchParams.get('manga_chapters') === '1' && targetUrl.hostname === 'manga.in.ua' && targetUrl.pathname.startsWith('/mangas/')) {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
      const pageResponse = await fetch(targetUrl.href, {
        headers: { 'User-Agent': ua, 'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8' },
        cf: { cacheTtl: 0, cacheEverything: false },
      });
      const pageHtml = await pageResponse.text();
      if (!pageResponse.ok) return new Response(JSON.stringify({ error: `manga.in.ua: HTTP ${pageResponse.status}`, chapters: [] }), { status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
      const linkBlock = pageHtml.match(/<[^>]+id=[\"']linkstocomics[\"'][^>]*>/i)?.[0] || '';
      const newsId = linkBlock.match(/data-news_id=[\"']?(\d+)/i)?.[1] || pageHtml.match(/data-news_id=[\"']?(\d+)/i)?.[1];
      const newsCategory = linkBlock.match(/data-news_category=[\"']?([^\"' >]+)/i)?.[1] || '';
      const thisLink = linkBlock.match(/data-this_link=[\"']([^\"']*)/i)?.[1] || '';
      const userHash = pageHtml.match(/(?:site_login_hash|user_hash)\s*[=:]\s*[\"']([^\"']+)[\"']/i)?.[1] || '';
      const setCookie = typeof pageResponse.headers.getSetCookie === 'function'
        ? pageResponse.headers.getSetCookie().join(', ')
        : (pageResponse.headers.get('set-cookie') || '');
      const cookieHeader = [...setCookie.matchAll(/(?:^|,\s*)([A-Za-z0-9_%-]+=[^;,\s]+)/g)].map(m => m[1]).join('; ');
      if (!newsId || !userHash) return new Response(JSON.stringify({ error: 'manga.in.ua: session data not found', chapters: [] }), { status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
      const ajaxUrl = new URL('/engine/ajax/controller.php?mod=load_chapters', targetUrl.origin);
      const body = new URLSearchParams({ action: 'show', news_id: newsId, news_category: newsCategory, this_link: thisLink, user_hash: userHash });
      const ajaxResponse = await fetch(ajaxUrl.href, {
        method: 'POST',
        body,
        headers: { 'User-Agent': ua, 'Referer': targetUrl.href, 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Cookie': cookieHeader, 'Accept': 'text/html,*/*' },
        cf: { cacheTtl: 0, cacheEverything: false },
      });
      const ajaxHtml = await ajaxResponse.text();
      const chapters = [...ajaxHtml.matchAll(/<(?:option\b[^>]*value|a\b[^>]*href)=[\"']([^\"']*\/chapters\/[^\"']+)[\"'][^>]*>([\s\S]*?)<\/(?:option|a)>/gi)].map(match => ({
        url: new URL(match[1], targetUrl.origin).href,
        title: match[2].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#0*39;|&#x0*27;/gi, "'").replace(/\s+/g, ' ').trim(),
      })).filter(item => /^https?:\/\/manga\.in\.ua\/chapters\/\d+-[^?#]+\.html/i.test(item.url));
      const title = pageHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
      return new Response(JSON.stringify({ source: 'manga.in.ua', mangaUrl: targetUrl.href, title, chapters }), { status: ajaxResponse.ok ? 200 : 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // --- VakDab manga-only mode: return page image URLs, not the source site's HTML ---
    if (url.searchParams.get('manga_pages') === '1' && targetUrl.hostname === 'manga.in.ua' && targetUrl.pathname.startsWith('/chapters/')) {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
      const pageResponse = await fetch(targetUrl.href, { headers: { 'User-Agent': ua, 'Accept-Language': 'uk-UA,uk;q=0.9,en;q=0.8' }, cf: { cacheTtl: 0, cacheEverything: false } });
      const pageHtml = await pageResponse.text();
      if (!pageResponse.ok) return new Response(JSON.stringify({ error: `manga.in.ua: HTTP ${pageResponse.status}` }), { status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
      const newsId = pageHtml.match(/<[^>]+id=[\"']comics[\"'][^>]+data-news_id=[\"']?(\d+)[\"']?/i)?.[1] || pageHtml.match(/data-news_id=[\"']?(\d+)[\"']?[^>]+id=[\"']comics[\"']/i)?.[1];
      const userHash = pageHtml.match(/(?:site_login_hash|user_hash)\s*[=:]\s*["']([^"']+)["']/i)?.[1];
      const setCookie = typeof pageResponse.headers.getSetCookie === 'function'
        ? pageResponse.headers.getSetCookie().join(', ')
        : (pageResponse.headers.get('set-cookie') || '');
      const cookieHeader = [...setCookie.matchAll(/(?:^|,\s*)([A-Za-z0-9_%-]+=[^;,\s]+)/g)].map(m => m[1]).join('; ');
      if (!newsId || !userHash) return new Response(JSON.stringify({ error: 'manga.in.ua: session data not found', images: [] }), { status: 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } });
      const ajaxUrl = new URL('/engine/ajax/controller.php', targetUrl.origin);
      ajaxUrl.search = new URLSearchParams({ mod: 'load_chapters_image', news_id: newsId, action: 'show', user_hash: userHash }).toString();
      const ajaxResponse = await fetch(ajaxUrl.href, { headers: { 'User-Agent': ua, 'Referer': targetUrl.href, 'X-Requested-With': 'XMLHttpRequest', 'Cookie': cookieHeader, 'Accept': 'text/html,*/*' }, cf: { cacheTtl: 0, cacheEverything: false } });
      const ajaxHtml = await ajaxResponse.text();
      const images = [...ajaxHtml.matchAll(/(?:data-src|src)=["']([^"']+)["']/gi)].map(m => m[1]).map(value => new URL(value, targetUrl.origin).href).filter(value => /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(value));
      return new Response(JSON.stringify({ source: 'manga.in.ua', chapterUrl: targetUrl.href, images }), { status: ajaxResponse.ok ? 200 : 502, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // --- User-Agent ---
    const forceUA = url.searchParams.get('force_ua');
    let userAgent;
    if (forceUA === 'desktop') {
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    } else if (forceUA === 'mobile') {
      userAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
    } else if (forceUA) {
      userAgent = forceUA;
    } else {
      userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    }

    // --- Заголовки запиту (як у реальному браузері) ---
    const origin = targetUrl.origin;
    const isVideo = /\.(m3u8|ts|mp4|m4s|webm|mkv|mov|avi)$/i.test(targetUrl.pathname);
    const referer = isVideo ? 'https://tortuga.wtf/' : origin + '/';
    const rangeHeader = request.headers.get('Range');

    const fetchHeaders = new Headers({
      'Referer': referer,
      'Origin': origin,
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    });
    if (rangeHeader) fetchHeaders.set('Range', rangeHeader);

    // --- Ретраї з таймаутом ---
    const MAX_ATTEMPTS = 3;
    const TIMEOUT_MS = 8000;
    let response, lastError;

    // debug=1 — повернути метадані замість HTML для перевірки
    const debugMode = url.searchParams.get('debug') === '1';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        response = await fetch(target, {
          headers: fetchHeaders,
          signal: controller.signal,
          // Явно вимикаємо edge-кеш Cloudflare для запитів
          cf: { cacheTtl: 0, cacheEverything: false },
        });
        clearTimeout(timer);
        break;
      } catch (e) {
        clearTimeout(timer);
        lastError = e;
        response = null;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 300 * attempt));
        }
      }
    }

    if (!response) {
      return new Response('Fetch error: ' + (lastError ? lastError.message : 'unknown'), {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' },
      });
    }

    const contentType = (response.headers.get('Content-Type') || '').toLowerCase();

    if (debugMode) {
      const text = await response.text();
      const debugInfo = {
        requestedUrl: target,
        userAgentSent: userAgent,
        upstreamStatus: response.status,
        upstreamContentType: contentType,
        bodyLength: text.length,
        hasIframeTag: text.includes('<iframe'),
        hasAshdi: text.includes('ashdi'),
        hasVidmoly: text.includes('vidmoly'),
        hasPlayerjs: text.includes('Playerjs'),
        first500Chars: text.slice(0, 500),
        last500Chars: text.slice(-500),
      };
      return new Response(JSON.stringify(debugInfo, null, 2), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
    }

    // --- Переписування M3U8 ---
    if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      const text = await response.text();
      const base = new URL(target);
      const proxyOrigin = url.origin;

      const rewritten = text.split('\n').map(line => {
        if (!line.trim() || line.startsWith('#')) return line;
        try {
          const abs = new URL(line.trim(), base).href;
          return proxyOrigin + '/?url=' + encodeURIComponent(abs);
        } catch (_) {
          return line;
        }
      }).join('\n');

      return new Response(rewritten, {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // --- Інші файли: проксіюємо як є, додаючи CORS та зберігаючи 206 ---
    const respHeaders = new Headers();
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Cache-Control'].forEach(h => {
      const v = response.headers.get(h);
      if (v) respHeaders.set(h, v);
    });
    if (isVideo && !respHeaders.has('Accept-Ranges')) {
      respHeaders.set('Accept-Ranges', 'bytes');
    }
    respHeaders.set('Cache-Control', respHeaders.get('Cache-Control') || 'public, max-age=3600');

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    });
  },
};
