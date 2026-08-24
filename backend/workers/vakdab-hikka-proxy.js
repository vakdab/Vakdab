/**
 * VakDab Hikka API proxy.
 *
 * Пропускає лише GET/HEAD/POST-запити до api.hikka.io, зберігаючи JSON-тіло
 * POST-запитів. Це усуває CORS-обмеження без перетворення Worker на відкритий
 * проксі для довільних адрес.
 */
export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const incomingUrl = new URL(request.url);
    const target = incomingUrl.searchParams.get('url');
    if (!target) {
      return jsonError('Missing url parameter', 400, cors);
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return jsonError('Invalid url parameter', 400, cors);
    }

    if (targetUrl.protocol !== 'https:' || targetUrl.hostname !== 'api.hikka.io') {
      return jsonError('Only api.hikka.io is allowed', 403, cors);
    }
    if (!['GET', 'HEAD', 'POST'].includes(request.method)) {
      return jsonError('Method not allowed', 405, cors);
    }

    const body = request.method === 'POST' ? await request.text() : undefined;
    const headers = new Headers({ Accept: 'application/json' });
    const contentType = request.headers.get('Content-Type');
    if (body !== undefined && contentType) headers.set('Content-Type', contentType);

    let upstream;
    try {
      upstream = await fetch(targetUrl.href, {
        method: request.method,
        headers,
        ...(body !== undefined ? { body } : {}),
        cf: { cacheTtl: 0, cacheEverything: false }
      });
    } catch (error) {
      return jsonError(`Hikka upstream unavailable: ${String(error?.message || error)}`, 502, cors);
    }

    const responseHeaders = new Headers(cors);
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    const upstreamType = upstream.headers.get('Content-Type');
    if (upstreamType) responseHeaders.set('Content-Type', upstreamType);
    responseHeaders.set('Cache-Control', 'no-store');
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  }
};

function jsonError(error, status, cors) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
