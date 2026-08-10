const PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const ANIMEUA_BASE = 'https://animeua.club';
const PAGE_SIZE = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const TELEGRAM_WEBHOOK_PATH = '/telegram-webhook';

const userStates = new Map();
let popularCache = null;
let popularCacheAt = 0;
let catalogCache = null;
let catalogCacheAt = 0;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === 'GET') {
        if (url.pathname === '/set_webhook') {
          return await setWebhook(request, env, url);
        }
        return textResponse('Mikima Telegram Worker is running.');
      }

      if (request.method === 'POST' && url.pathname === TELEGRAM_WEBHOOK_PATH) {
        const update = await request.json();
        await processUpdate(update, env);
        return textResponse('OK');
      }

      return textResponse('Not Found', 404);
    } catch (error) {
      console.error('[worker] request failed:', safeError(error));
      return textResponse('Internal Server Error', 500);
    }
  }
};

function textResponse(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

async function setWebhook(request, env, url) {
  const setupSecret = env.WEBHOOK_SETUP_SECRET;
  const suppliedSecret = url.searchParams.get('secret');
  const webhookUrl = url.searchParams.get('url');

  if (!setupSecret || suppliedSecret !== setupSecret) {
    return new Response(JSON.stringify({ ok: false, description: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  if (!webhookUrl || !/^https:\/\//i.test(webhookUrl)) {
    return new Response(JSON.stringify({ ok: false, description: 'A valid HTTPS webhook URL is required.' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }

  return jsonResponse(await telegram('setWebhook', { url: webhookUrl }, env));
}

async function processUpdate(update, env) {
  if (update?.message) {
    await handleMessage(update.message, env);
  } else if (update?.callback_query) {
    await handleCallbackQuery(update.callback_query, env);
  }
}

async function handleMessage(message, env) {
  const chatId = message.chat?.id;
  if (!chatId) return;

  const text = (message.text || '').trim();
  const state = getState(chatId);

  if (text === '/start') {
    state.screen = 'home';
    state.aiHistory = [];
    await sendMessage(chatId, 'Привіт! Я Макіма. Оберіть дію:', { reply_markup: mainKeyboard() }, env);
    return;
  }

  if (/^\/(?:makima|ask)(?:@\w+)?(?:\s|$)/i.test(text)) {
    const prompt = text.replace(/^\/(?:makima|ask)(?:@\w+)?\s*/i, '').trim();
    if (!prompt) {
      state.screen = 'waiting_for_makima';
      await sendMessage(chatId, 'Напишіть ваш запит. Я можу знайти інформацію про аніме або відповісти на будь-яке інше питання, використовуючи пошук в інтернеті.', { reply_markup: backHomeKeyboard() }, env);
      return;
    }
    state.screen = 'makima';
    await handleMakimaMessage(chatId, prompt, env);
    return;
  }

  if (!text) return;

  if (state.screen === 'waiting_for_search') {
    state.searchQuery = text;
    state.searchPage = 1;
    state.screen = 'search';
    await sendMessage(chatId, `Шукаю: <b>${escapeHtml(text)}</b>...`, {}, env);
    await renderSearch(chatId, 1, env);
    return;
  }

  state.screen = 'makima';
  await handleMakimaMessage(chatId, text, env);
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
let geminiModelCache = { expiresAt: 0, models: [], selected: '' };

async function handleMakimaMessage(chatId, userMessage, env) {
  try {
    await telegram('sendChatAction', { chat_id: chatId, action: 'typing' }, env);
    const state = getState(chatId);
    await enrichMakimaStateFromCatalog(userMessage, state, env);
    const responseText = await callMakimaAI(userMessage, env, state);
    
    // Telegram limit is 4096. We slice at 4000 to be safe.
    const parts = splitMessage(responseText, 4000);
    for (let i = 0; i < parts.length; i++) {
      await sendMessage(chatId, escapeHtml(parts[i]), { reply_markup: i === parts.length - 1 ? backHomeKeyboard() : undefined }, env);
    }
  } catch (error) {
    console.error('[makima] failed:', safeError(error));
    await sendMessage(chatId, 'Макіма тимчасово не може відповісти. Спробуйте ще раз.', { reply_markup: backHomeKeyboard() }, env);
  }
}

function splitMessage(text, limit) {
  const parts = [];
  let current = text;
  while (current.length > limit) {
    let splitAt = current.lastIndexOf('\n', limit);
    if (splitAt === -1) splitAt = limit;
    parts.push(current.slice(0, splitAt));
    current = current.slice(splitAt).trim();
  }
  if (current) parts.push(current);
  return parts;
}

async function enrichMakimaStateFromCatalog(prompt, state, env) {
  if (!looksLikeAnimeRequest(prompt)) return;
  try {
    const query = extractAnimeQuery(prompt);
    if (!query || query.length < 2) return;
    const result = await searchAnime(query, 1);
    const candidate = result.items?.[0];
    if (!candidate?.url) return;
    const details = await fetchAnimeDetails(candidate.url);
    if (details?.title) {
      state.lastAnimeDetails = details;
      state.lastAnimeQuery = query;
    }
  } catch (error) {
    console.warn('[makima] catalog context unavailable:', safeError(error));
  }
}

function looksLikeAnimeRequest(prompt) {
  return /аніме|аниме|манґа|манга|ранобе|сезон|епізод|серіал|фільм|персонаж|студі|озвуч|повна інформація|розкажи про|що це за/i.test(String(prompt || ''));
}

function extractAnimeQuery(prompt) {
  const value = String(prompt || '').trim();
  const match = value.match(/(?:про|щодо|стосовно|розкажи про|інформація про|все про|що це за)\s+(.+?)(?:\?|$)/i);
  if (match?.[1]) return match[1].replace(/^(аніме|аниме)\s+/i, '').trim();
  return value.replace(/^(повна інформація|розкажи детально|розкажи все)\s*/i, '').trim();
}

async function callMakimaAI(prompt, env, state) {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  let selectedModel = await selectGeminiModel(env, apiKey, false);
  // Prefer flash or pro models that support grounding
  if (!selectedModel.includes('flash') && !selectedModel.includes('pro')) {
    selectedModel = 'gemini-1.5-flash';
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(selectedModel)}:generateContent`;
    const body = {
      systemInstruction: {
        parts: [{ text: [
          'Ти — Макіма, інтелектуальна AI-помічниця Telegram-бота VakDab з повним доступом до інтернету через Google Search.',
          'Твоя спеціалізація: аніме, манґа, японська культура, але ти також експерт у будь-яких інших темах.',
          'ВИКОРИСТОВУЙ GOOGLE SEARCH для отримання актуальної інформації про новини, дати виходу, рейтинги та будь-які факти, яких немає в твоїй базі.',
          'Відповідай українською. Пиши природно, без зайвих формальностей.',
          'КРИТИЧНО: якщо питання про конкретне аніме з каталогу VakDab, використовуй наданий контекст, але доповнюй його свіжими даними з інтернету.',
          'Не обмежуй довжину відповіді, якщо користувач просить детально.',
          'Не використовуй Markdown або HTML. Використовуй звичайний текст, списки та символи •.',
          state?.lastAnimeDetails
            ? `КОНТЕКСТ З КАТАЛОГУ VAKDAB: ${formatAnimeContext(state.lastAnimeDetails)}`
            : ''
        ].join(' ') }]
      },
      contents: [
        ...(Array.isArray(state?.aiHistory) ? state.aiHistory.slice(-40) : []),
        { role: 'user', parts: [{ text: String(prompt || '') }] }
      ],
      tools: [
        {
          google_search_retrieval: {
            dynamic_retrieval_config: {
              mode: "dynamic",
              dynamic_threshold: 0.1
            }
          }
        }
      ],
      generationConfig: { 
        temperature: 0.7, 
        maxOutputTokens: 4000 
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body)
    });
    
    const responseText = await response.text();
    if (!response.ok) {
      if (response.status === 404 && attempt === 0) {
        selectedModel = await selectGeminiModel(env, apiKey, true);
        continue;
      }
      throw new Error(`Gemini API error ${response.status}: ${responseText}`);
    }

    let data = JSON.parse(responseText);
    const candidate = data?.candidates?.[0];
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    const generatedText = parts.map(part => part.text || '').join('').trim();
    
    if (!generatedText) throw new Error('Gemini returned no text');

    if (state) {
      if (!Array.isArray(state.aiHistory)) state.aiHistory = [];
      state.aiHistory.push({ role: 'user', parts: [{ text: String(prompt || '') }] });
      state.aiHistory.push({ role: 'model', parts: [{ text: generatedText }] });
      state.aiHistory = state.aiHistory.slice(-40);
    }
    return generatedText;
  }
  throw new Error('Gemini failed');
}

async function selectGeminiModel(env, apiKey, forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && geminiModelCache.expiresAt > now && geminiModelCache.selected) {
    return geminiModelCache.selected;
  }
  const models = await fetchAvailableGeminiModels(apiKey);
  const availableIds = models.map(model => geminiModelId(model.name));
  
  // Prefer gemini-1.5-flash for speed and grounding support
  const preferred = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  let selected = availableIds.find(id => preferred.includes(id)) || availableIds[0] || 'gemini-1.5-flash';
  
  geminiModelCache = { expiresAt: now + GEMINI_MODEL_CACHE_TTL_MS, models, selected };
  return selected;
}

async function renderDetails(chatId, messageId, url, env) {
  try {
    const details = await fetchAnimeDetails(url);
    if (!details || !details.title) throw new Error('INVALID_ANIME');
    const text = detailsText(details);
    const watchUrl = vakdabWatchUrl(extractAnimeId(details.url));
    const state = getState(chatId);
    state.lastAnimeDetails = details;

    let keyboard = {
      inline_keyboard: [
        ...(watchUrl ? [[{ text: 'Дивитись на VakDab', url: watchUrl }]] : []),
        [{ text: 'Назад', callback_data: 'back:list' }, { text: 'Головна', callback_data: 'home' }]
      ]
    };

    await deleteMessage(chatId, messageId, env);
    
    if (details.image) {
      // Proxy the image to ensure Telegram can load it
      const proxiedImage = `${PROXY_URL}?url=${encodeURIComponent(details.image)}`;
      const photoResult = await sendPhoto(chatId, proxiedImage, text, { reply_markup: keyboard }, env);
      if (!photoResult?.ok) {
        // Fallback to direct URL if proxy fails
        const secondTry = await sendPhoto(chatId, details.image, text, { reply_markup: keyboard }, env);
        if (!secondTry?.ok) await sendMessage(chatId, text, { reply_markup: keyboard }, env);
      }
    } else {
      await sendMessage(chatId, text, { reply_markup: keyboard }, env);
    }
  } catch (error) {
    console.error('[details] failed:', safeError(error));
    await updateOrSend(chatId, messageId, 'Не вдалося завантажити деталі аніме.', false, { reply_markup: mainKeyboard() }, env);
  }
}

function parseCards(html) {
  const cards = [];
  const seen = new Set();
  // Improved regex for cards
  const posterBlocks = html.match(/<a[^>]*class=["'][^"']*(?:poster|grid-item)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const block of posterBlocks) {
    const url = absoluteAnimeUrl(firstMatch(block, /href=["']([^"']+)["']/i));
    const title = cleanText(firstMatch(block, /class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\//i) || firstMatch(block, /<h[1-6][^>]*>([\s\S]*?)<\//i));
    const image = absoluteUrl(firstMatch(block, /(?:data-src|src)=["']([^"']+)["']/i));
    if (url && title && !seen.has(url)) {
      seen.add(url);
      cards.push({ title, url, image });
    }
  }
  return cards;
}

function parseDetails(html, url) {
  const textField = (patterns) => {
    for (const pattern of patterns) {
      const value = firstMatch(html, pattern);
      if (value) return cleanText(value);
    }
    return '';
  };
  const labeledField = (labels) => {
    const label = labels.join('|');
    return textField([
      new RegExp(`(?:${label})\\s*[:\\-]?\\s*(?:<[^>]+>\\s*){0,5}([^<]{1,200})`, 'i'),
      new RegExp(`(?:${label})[\\s\\S]{0,200}?<[^>]*>([^<]{1,200})<`, 'i')
    ]);
  };

  const title = cleanText(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\//i) || firstMatch(html, /property=["']og:title["'][^>]*content=["']([^"']+)["']/i));
  const originalTitle = textField([/class=["'][^"']*original-title[^"']*["'][^>]*>([\s\S]*?)<\//i, /pmovie__original-title[^>]*>([\s\S]*?)<\/div>/i]);
  const image = absoluteUrl(firstMatch(html, /class=["'][^"']*pmovie__poster[^"']*[\s\S]{0,500}?(?:data-src|src)=["']([^"']+)["']/i) || firstMatch(html, /property=["']og:image["'][^>]*content=["']([^"']+)["']/i));
  
  const genreBlock = firstMatch(html, /class=["'][^"']*pmovie__genres[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) || '';
  const genres = [...genreBlock.matchAll(/<a[^>]*>([\s\S]*?)<\//gi)].map(m => cleanText(m[1])).filter(Boolean);
  
  const year = firstMatch(html, /pmovie__year[^>]*>[\s\S]*?(\d{4})/i) || labeledField(['Рік', 'Year', 'Прем\'єра']);
  const episodes = labeledField(['Епізодів', 'Серій', 'Episodes']);
  const status = labeledField(['Статус', 'Status']);
  const studio = labeledField(['Студія', 'Studio']);
  const director = labeledField(['Режисер', 'Director']);
  const translator = labeledField(['Переклад', 'Озвучка']);
  
  // Improved synopsis extraction
  const descriptionBlock = firstMatch(html, /class=["'][^"']*(?:full-text|page__text|pmovie__description)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const synopsis = cleanText(descriptionBlock);

  return {
    title: title || 'Без назви', image, originalTitle,
    genres: [...new Set(genres)], year, episodes,
    status, studio, director, translator, synopsis, url
  };
}

function detailsText(details) {
  let text = `<b>${escapeHtml(details.title)}</b>`;
  if (details.originalTitle) text += `\n<i>${escapeHtml(details.originalTitle)}</i>`;
  
  const rows = [
    ['📅 Рік', details.year],
    ['🎭 Жанри', details.genres?.join(', ')],
    ['🎬 Студія', details.studio],
    ['🎥 Режисер', details.director],
    ['🔊 Переклад', details.translator],
    ['📊 Статус', details.status],
    ['🎞 Епізоди', details.episodes]
  ];
  
  for (const [label, value] of rows) {
    if (value && value !== 'Невідомо') text += `\n${label}: ${escapeHtml(value)}`;
  }
  
  if (details.synopsis) {
    const synopsis = details.synopsis.slice(0, 3000);
    text += `\n\n<b>Опис:</b>\n${escapeHtml(synopsis)}${details.synopsis.length > 3000 ? '...' : ''}`;
  }
  
  return text;
}

function formatAnimeContext(d) {
  return `Назва: ${d.title}, Рік: ${d.year}, Жанри: ${d.genres?.join(', ')}, Студія: ${d.studio}, Опис: ${d.synopsis?.slice(0, 500)}`;
}

// Rest of helper functions...
function getState(chatId) {
  if (!userStates.has(chatId)) userStates.set(chatId, { screen: 'home', aiHistory: [] });
  return userStates.get(chatId);
}
function safeError(e) { return e instanceof Error ? e.message : String(e); }
function jsonResponse(data) { return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } }); }
async function fetchAvailableGeminiModels(apiKey) {
  const res = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`);
  const data = await res.json();
  return data.models || [];
}
function geminiModelId(name) { return name.replace(/^models\//, ''); }
function mainKeyboard() {
  return { inline_keyboard: [
    [{ text: '🔥 Популярні', callback_data: 'popular:1' }],
    [{ text: '🎲 Випадкове', callback_data: 'random' }],
    [{ text: '🔍 Пошук', callback_data: 'search:prompt' }],
    [{ text: '🤖 Запитати Макіму', callback_data: 'makima:prompt' }]
  ] };
}
function backHomeKeyboard() {
  return { inline_keyboard: [[{ text: '🏠 Головна', callback_data: 'home' }]] };
}
async function telegram(method, params, env) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params)
  });
  return await res.json();
}
async function sendMessage(chatId, text, extra, env) {
  return telegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra }, env);
}
async function sendPhoto(chatId, photo, caption, extra, env) {
  return telegram('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'HTML', ...extra }, env);
}
async function deleteMessage(chatId, messageId, env) {
  return telegram('deleteMessage', { chat_id: chatId, message_id: messageId }, env);
}
async function firstMatch(str, reg) {
  const m = String(str || '').match(reg);
  return m ? m[1] : '';
}
function cleanText(v = '') {
  return String(v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function escapeHtml(v = '') {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function absoluteUrl(v) {
  if (!v) return '';
  if (v.startsWith('http')) return v;
  return ANIMEUA_BASE + (v.startsWith('/') ? '' : '/') + v;
}
function absoluteAnimeUrl(v) {
  const url = absoluteUrl(v);
  return url.includes('animeua.club') ? url : '';
}
async function fetchSource(targetUrl) {
  const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}&force_ua=desktop`;
  const response = await fetch(proxyUrl);
  return await response.text();
}
async function searchAnime(query, page) {
  const html = await fetchSource(`${ANIMEUA_BASE}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`);
  const items = parseCards(html);
  return { items, total: items.length };
}
async function fetchAnimeDetails(url) {
  const html = await fetchSource(url);
  return parseDetails(html, url);
}
function extractAnimeId(url) {
  const m = url.match(/\/(\d+)-/);
  return m ? m[1] : '';
}
function vakdabWatchUrl(id) {
  return id ? `https://vakdab.github.io/Vakdab/#anime/${id}` : '';
}
async function handleCallbackQuery(callbackQuery, env) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const state = getState(chatId);

  if (data === 'home') {
    state.screen = 'home';
    await telegram('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Привіт! Я Макіма. Оберіть дію:', reply_markup: mainKeyboard() }, env);
  } else if (data === 'makima:prompt') {
    state.screen = 'waiting_for_makima';
    await telegram('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Напишіть ваш запит.', reply_markup: backHomeKeyboard() }, env);
  } else if (data === 'search:prompt') {
    state.screen = 'waiting_for_search';
    await telegram('editMessageText', { chat_id: chatId, message_id: messageId, text: 'Напишіть назву аніме для пошуку.', reply_markup: backHomeKeyboard() }, env);
  } else if (data === 'random') {
    await renderDetails(chatId, messageId, `${ANIMEUA_BASE}/index.php?do=rand`, env);
  }
}
