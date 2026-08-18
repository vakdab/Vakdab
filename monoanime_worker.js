async function fetchWithRetry(input, init = {}, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 3);
  const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 12000);
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) return response;
      if (attempt === maxAttempts) return response;
      const retryAfter = Number(response.headers.get('Retry-After'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(5000, retryAfter * 1000) : 300 * (2 ** (attempt - 1));
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, 300 * (2 ** (attempt - 1))));
    }
  }
  throw lastError || new Error('Upstream request failed');
}

function corsHeaders(contentType = '') {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
  });
  if (contentType) headers.set('Content-Type', contentType);
  return headers;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
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
    if (!target || !/^https?:\/\//i.test(target)) {
      return new Response("Missing or invalid 'url' parameter", { status: 400, headers: corsHeaders('text/plain; charset=utf-8') });
    }

    const forceUA = url.searchParams.get('force_ua');
    const userAgent = forceUA === 'mobile'
      ? 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
    const targetUrl = new URL(target);
    const isVideo = /\.(m3u8|ts|mp4|m4s|webm|mkv|mov|avi)$/i.test(targetUrl.pathname);
    const rangeHeader = request.headers.get('Range');
    const fetchHeaders = new Headers({
      Referer: targetUrl.origin + '/',
      Origin: targetUrl.origin,
      'User-Agent': userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    });
    if (rangeHeader) fetchHeaders.set('Range', rangeHeader);

    let response;
    try {
      response = await fetchWithRetry(targetUrl.href, { headers: fetchHeaders }, { timeoutMs: 15000 });
    } catch (error) {
      return new Response(`Fetch error: ${error?.message || 'unknown'}`, { status: 502, headers: corsHeaders('text/plain; charset=utf-8') });
    }

    const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
    if (url.searchParams.get('debug') === '1') {
      const text = await response.text();
      return new Response(JSON.stringify({ requestedUrl: targetUrl.href, upstreamStatus: response.status, upstreamContentType: contentType, bodyLength: text.length }), { status: 200, headers: corsHeaders('application/json; charset=utf-8') });
    }

    if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
      const text = await response.text();
      const rewritten = text.split('\n').map(line => {
        if (!line.trim() || line.startsWith('#')) return line;
        try { return url.origin + '/?url=' + encodeURIComponent(new URL(line.trim(), targetUrl).href); } catch { return line; }
      }).join('\n');
      const headers = corsHeaders(response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl');
      headers.set('Cache-Control', 'public, max-age=3600');
      return new Response(rewritten, { status: response.status, headers });
    }

    const headers = corsHeaders();
    ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges', 'Cache-Control'].forEach(name => {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    });
    if (isVideo && !headers.has('Accept-Ranges')) headers.set('Accept-Ranges', 'bytes');
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'public, max-age=3600');
    return new Response(response.body, { status: response.status, headers });
  },
};
