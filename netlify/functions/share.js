const ALLOWED_HOSTS = new Set(['animeua.club', 'www.animeua.club']);

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function meta(html, property) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i');
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["'][^>]*>`, 'i');
  return (html.match(re) || html.match(reverse))?.[1]?.trim() || '';
}

function absoluteUrl(value, base) {
  if (!value) return '';
  try { return new URL(value, base).href; } catch { return ''; }
}

function isCrawler(userAgent = '') {
  return /bot|crawler|spider|telegram|facebookexternalhit|whatsapp|twitter|slack|discord|linkedin/i.test(userAgent);
}

exports.handler = async (event) => {
  const source = event.queryStringParameters?.url || '';
  let sourceUrl;
  try { sourceUrl = new URL(source); } catch { return { statusCode: 400, body: 'Invalid anime URL' }; }
  if (sourceUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(sourceUrl.hostname)) {
    return { statusCode: 400, body: 'Unsupported anime URL' };
  }

  const appUrl = `https://vakdab.netlify.app/index.html#anime?url=${encodeURIComponent(sourceUrl.href)}`;
  let title = 'VakDab — аніме';
  let description = 'Дивись аніме на VakDab.';
  let image = 'https://vakdab.netlify.app/og-image.png';

  try {
    const response = await fetch(sourceUrl.href, {
      headers: { 'user-agent': 'VakDab share preview bot/1.0', accept: 'text/html' }
    });
    if (response.ok) {
      const html = await response.text();
      title = meta(html, 'og:title') || (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim() || title;
      description = meta(html, 'og:description') || (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || '').trim() || description;
      image = absoluteUrl(meta(html, 'og:image'), sourceUrl.href) || image;
    }
  } catch (_) { /* use safe fallback preview */ }

  const crawler = isCrawler(event.headers?.['user-agent'] || event.headers?.['User-Agent']);
  const html = `<!doctype html><html lang="uk"><head>
<meta charset="utf-8"><title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="video.other"><meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(event.rawUrl || appUrl)}"><meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${escapeHtml(image)}">
${crawler ? '' : `<meta http-equiv="refresh" content="0;url=${escapeHtml(appUrl)}"><script>location.replace(${JSON.stringify(appUrl)});</script>`}
</head><body><p><a href="${escapeHtml(appUrl)}">Відкрити ${escapeHtml(title)} у VakDab</a></p></body></html>`;
  return { statusCode: 200, headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'public, max-age=300' }, body: html };
};
