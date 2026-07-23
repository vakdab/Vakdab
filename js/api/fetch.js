import { getProxyUrl } from "../utils/helpers.js";

export async function fetchUA(url, retries = 2) {
  if (url && url.startsWith('http://')) url = 'https://' + url.slice(7);
  const proxyUrl = getProxyUrl(url);
  const doFetch = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const resp = await fetch(proxyUrl, { mode: 'cors', credentials: 'omit', cache: 'no-cache', signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const html = await resp.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc._rawHtml = html;
      return doc;
    } catch (e) {
      clearTimeout(timer);
      if (e && (e.name === 'AbortError' || (e.message && (e.message.includes('aborted') || e.message.includes('Fetch is aborted'))))) {
        throw new Error('Час очікування вичерпано. Перевірте з\'єднання.');
      }
      throw e;
    }
  };
  try {
    return await doFetch();
  } catch (e) {
    if (retries > 0 && !(e && e._playerAborted)) {
      await new Promise(r => setTimeout(r, 800));
      return fetchUA(url, retries - 1);
    }
    throw e;
  }
}
