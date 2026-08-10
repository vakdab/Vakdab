const PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const ANIMEUA_BASE = 'https://animeua.club';
const PAGE_SIZE = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const TELEGRAM_WEBHOOK_PATH = '/telegram-webhook';
const TELEGRAM_SAFE_CHUNK = 3900; // запас під ліміт Telegram у 4096 символів

const userStates = new Map();
const searchCache = new Map(); // normalizedQuery -> { at, items }
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
        return textResponse('VakDab Telegram Worker is running.');
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
    await sendMessage(chatId, 'Привіт! Оберіть дію:', { reply_markup: mainKeyboard() }, env);
    return;
  }

  if (/^\/(?:makima|ask)(?:@\w+)?(?:\s|$)/i.test(text)) {
    const prompt = text.replace(/^\/(?:makima|ask)(?:@\w+)?\s*/i, '').trim();
    if (!prompt) {
      state.screen = 'waiting_for_makima';
      await sendMessage(chatId, 'Напишіть запит про аніме.', { reply_markup: backHomeKeyboard() }, env);
      return;
    }
    state.screen = 'makima';
    await handleMakimaMessage(chatId, prompt, env);
    return;
  }

  if (!text) return;

  // Пошук через кнопку має пріоритет над AI, щоб не ламати каталог VakDab.
  if (state.screen === 'waiting_for_search') {
    state.searchQuery = text;
    state.searchPage = 1;
    state.screen = 'search';
    await sendMessage(chatId, `Шукаю: <b>${escapeHtml(text)}</b>...`, {}, env);
    await renderSearch(chatId, 1, env);
    return;
  }

  // Після кнопки «Запитати Макіму» та для будь-якого звичайного тексту
  // запит одразу передається в Gemini.
  state.screen = 'makima';
  await handleMakimaMessage(chatId, text, env);
}

// ==========================================================
// Gemini / Makima integration
// ==========================================================
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const GEMINI_OUTPUT_TOKENS_CAP = 8192; // розумна верхня межа, щоб не робити абсурдно дорогі запити
let geminiModelCache = { expiresAt: 0, models: [], selected: '', outputTokenLimit: 2048 };
const modelsWithoutSearchSupport = new Set();

async function handleMakimaMessage(chatId, userMessage, env) {
  try {
    await telegram('sendChatAction', { chat_id: chatId, action: 'typing' }, env);
    const state = getState(chatId);
    await enrichMakimaStateFromCatalog(userMessage, state, env);
    const responseText = await callMakimaAI(userMessage, env, state);
    await sendLongMessage(chatId, responseText, { reply_markup: backHomeKeyboard() }, env);
  } catch (error) {
    console.error('[makima] failed:', safeError(error));
    await sendMessage(chatId, 'Макіма тимчасово не може відповісти. Спробуйте ще раз.', { reply_markup: backHomeKeyboard() }, env);
  }
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

function buildMakimaSystemInstruction(state) {
  return [
    'Ти — Макіма, інтелектуальна AI-помічниця Telegram-бота VakDab.',
    'Головна спеціалізація: аніме, манґа, ранобе, японська анімація, персонажі, студії, жанри, сезони, епізоди, сюжети, адаптації, рейтинги та рекомендації.',
    'Ти також універсальна помічниця і відповідаєш на питання про програмування, технології, ігри, фільми, музику, навчання, історію, географію та інші теми.',
    'Якщо питання не про аніме — не переводь розмову на аніме.',
    'Відповідай українською, якщо користувач не попросив іншу мову. Пиши природно, дружньо і зрозуміло.',
    'Не починай кожну відповідь зі слів «Звичайно», «Звісно» або «Як помічниця».',
    'КРИТИЧНО: якщо питання стосується конкретного аніме, спочатку використовуй перевірені дані каталогу VakDab, а потім доповнюй їх загальними знаннями.',
    'Дані каталогу VakDab мають пріоритет для назви, альтернативних назв, типу, року, жанрів, епізодів, тривалості, статусу, студії та опису.',
    'Якщо доступний інструмент пошуку в інтернеті — використовуй його для актуальних новин, дат виходу, нових сезонів, рейтингів, останніх епізодів та будь-яких фактів, які можуть змінюватися. Для стабільних, давно відомих фактів пошук не обов'.concat("'", 'язковий.'),
    'Чітко розділяй підтверджені дані каталогу, знайдені в інтернеті факти і загальні знання. Не вигадуй відсутні поля. Якщо факт невідомий або не підтверджений — напиши «Не можу підтвердити цей факт».',
    'Якщо джерела в інтернеті суперечать одне одному — прямо скажи про це користувачу.',
    'Якщо користувач просить «повну інформацію», «все про аніме», «розкажи все» або «детально» — дай розширену відповідь, а не короткий опис.',
    'Розширена відповідь про аніме повинна містити, якщо дані відомі: 1) основну інформацію; 2) альтернативні назви, тип, рік, статус, епізоди, тривалість і сезон; 3) жанри, теми та демографію; 4) студію, режисера, автора, сценариста і музику; 5) сюжет і світ без ключових спойлерів; 6) головних персонажів та їхні зв’язки; 7) манґу, ранобе, попередні й наступні сезони, фільми, OVA, ONA та спінофи; 8) порядок перегляду; 9) сильні та слабкі сторони; 10) цікаві факти та підсумок.',
    'Не потрібно заповнювати розділи, для яких немає надійних даних. Не перетворюй припущення на факти.',
    'Якщо питання просте «що це за аніме?» — відповідай стисло, але змістовно.',
    'Якщо питання про персонажа — розкажи про роль, характер, здібності, походження, зв’язки та розвиток, якщо відомо.',
    'Якщо просять рекомендації — враховуй жанр, сюжет, атмосферу і побажання користувача.',
    'Перед важливими сюжетними розкриттями напиши «⚠️ СПОЙЛЕРИ».',
    'Не використовуй Markdown. Використовуй звичайний текст Telegram, короткі заголовки, нумерацію та символи •.',
    'Не створюй суцільні величезні абзаци. Не став зайвих питань наприкінці.',
    'Якщо питають, хто ти, відповідай: «Я Макіма — помічниця VakDab. Моя головна спеціалізація — аніме, але я також можу допомогти з іншими питаннями.»',
    state?.lastAnimeDetails
      ? `ПІДТВЕРДЖЕНИЙ ПРОФІЛЬ VAKDAB: ${formatAnimeContext(state.lastAnimeDetails)}`
      : 'ПІДТВЕРДЖЕНИХ ДАНИХ VAKDAB ДЛЯ ПОТОЧНОГО АНІМЕ НЕМАЄ. Не стверджуй, що вони є.'
  ].join(' ');
}

async function callMakimaAI(prompt, env, state) {
  const apiKey = String(env.GEMINI_API_KEY || '').trim();
  console.log('[gemini] API key configured:', Boolean(apiKey));
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  let modelInfo = await selectGeminiModel(env, apiKey, false);
  let useSearch = !modelsWithoutSearchSupport.has(modelInfo.id);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    console.log('[gemini] selected model:', modelInfo.id, 'search:', useSearch);
    const endpoint = `${GEMINI_API_BASE}/models/${encodeURIComponent(modelInfo.id)}:generateContent`;
    const body = {
      systemInstruction: { parts: [{ text: buildMakimaSystemInstruction(state) }] },
      contents: [
        ...(Array.isArray(state?.aiHistory) ? state.aiHistory.slice(-20) : []),
        { role: 'user', parts: [{ text: String(prompt || '') }] }
      ],
      generationConfig: {
        temperature: 0.45,
        maxOutputTokens: Math.min(modelInfo.outputTokenLimit || GEMINI_OUTPUT_TOKENS_CAP, GEMINI_OUTPUT_TOKENS_CAP)
      }
    };
    if (useSearch) {
      body.tools = [{ google_search: {} }];
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body)
    });
    console.log('[gemini] response status:', response.status);
    const responseText = await response.text();

    if (!response.ok) {
      console.error('[gemini] API error status:', response.status);
      console.error('[gemini] API error body:', redactGeminiSecret(responseText, apiKey).slice(0, 3000));

      // Модель не підтримує google_search tool — прибрати інструмент і повторити разом
      if (useSearch && (response.status === 400)) {
        console.log('[gemini] retrying without google_search tool');
        modelsWithoutSearchSupport.add(modelInfo.id);
        useSearch = false;
        continue;
      }
      if (response.status === 404 && attempt < 2) {
        console.log('[gemini] selected model returned 404; refreshing model list');
        modelInfo = await selectGeminiModel(env, apiKey, true);
        useSearch = !modelsWithoutSearchSupport.has(modelInfo.id);
        continue;
      }
      throw new Error(`Gemini API error ${response.status}`);
    }

    let data;
    try { data = JSON.parse(responseText); } catch { throw new Error('Gemini returned invalid JSON'); }
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason || 'unknown';
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    let generatedText = parts.map(part => typeof part?.text === 'string' ? part.text : '').join('').trim();
    console.log('[gemini] finish reason:', finishReason);
    if (!generatedText) {
      console.error('[gemini] generated text missing:', JSON.stringify({ finishReason, candidates: Array.isArray(data?.candidates) ? data.candidates.length : 0 }));
      throw new Error('Gemini returned no text');
    }

    const sourcesFooter = formatGroundingSources(candidate?.groundingMetadata);
    if (sourcesFooter) generatedText = `${generatedText}\n\n${sourcesFooter}`;

    if (state) {
      if (!Array.isArray(state.aiHistory)) state.aiHistory = [];
      state.aiHistory.push({ role: 'user', parts: [{ text: String(prompt || '') }] });
      state.aiHistory.push({ role: 'model', parts: [{ text: generatedText }] });
      state.aiHistory = state.aiHistory.slice(-20);
    }
    return generatedText;
  }
  throw new Error('Gemini model selection failed');
}

function formatGroundingSources(groundingMetadata) {
  const chunks = Array.isArray(groundingMetadata?.groundingChunks) ? groundingMetadata.groundingChunks : [];
  const seen = new Set();
  const lines = [];
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri;
    const title = chunk?.web?.title || uri;
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    lines.push(`• ${title}: ${uri}`);
    if (lines.length >= 5) break;
  }
  return lines.length ? `Джерела:\n${lines.join('\n')}` : '';
}

async function selectGeminiModel(env, apiKey, forceRefresh) {
  const now = Date.now();
  if (!forceRefresh && geminiModelCache.expiresAt > now && geminiModelCache.selected) {
    return { id: geminiModelCache.selected, outputTokenLimit: geminiModelCache.outputTokenLimit };
  }

  console.log('[gemini] checking available models');
  const models = await fetchAvailableGeminiModels(apiKey);
  const stableTextModels = models.filter(model => {
    const id = geminiModelId(model.name);
    const methods = Array.isArray(model.supportedGenerationMethods) ? model.supportedGenerationMethods : [];
    return id && methods.includes('generateContent') && !/(preview|experimental|deprecated|embedding|image|audio|tts|veo|robot)/i.test(id);
  });
  const byId = new Map(stableTextModels.map(model => [geminiModelId(model.name), model]));
  const availableIds = [...byId.keys()];
  console.log('[gemini] available models:', availableIds.join(', ') || '(none)');

  const configured = String(env.GEMINI_MODEL || '').trim().replace(/^models\//, '');
  const pick = (id) => {
    const model = byId.get(id);
    const outputTokenLimit = Number(model?.outputTokenLimit) || 2048;
    geminiModelCache = { expiresAt: now + GEMINI_MODEL_CACHE_TTL_MS, models: stableTextModels, selected: id, outputTokenLimit };
    return { id, outputTokenLimit };
  };

  if (configured && availableIds.includes(configured)) return pick(configured);
  if (configured) console.log('[gemini] configured model is unavailable:', configured);

  const preferred = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite'
  ];
  const selected = preferred.find(id => availableIds.includes(id)) || availableIds[0];
  if (!selected) throw new Error('No available Gemini model supports generateContent');
  console.log('[gemini] selected available fallback:', selected);
  return pick(selected);
}

async function fetchAvailableGeminiModels(apiKey) {
  const models = [];
  let pageToken = '';
  for (let page = 0; page < 5; page += 1) {
    const url = new URL(`${GEMINI_API_BASE}/models`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { 'x-goog-api-key': apiKey } });
    const body = await response.text();
    if (!response.ok) {
      console.error('[gemini] API error status:', response.status);
      console.error('[gemini] API error body:', redactGeminiSecret(body, apiKey).slice(0, 3000));
      throw new Error(`Gemini models API error ${response.status}`);
    }
    let data;
    try { data = JSON.parse(body); } catch { throw new Error('Gemini models API returned invalid JSON'); }
    if (Array.isArray(data.models)) models.push(...data.models);
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  return models;
}

function geminiModelId(name) {
  return String(name || '').replace(/^models\//, '').trim();
}

function redactGeminiSecret(value, secret) {
  return String(value || '').replaceAll(secret, '[REDACTED_GEMINI_API_KEY]');
}

// ==========================================================
// Telegram callback handling
// ==========================================================
async function handleCallbackQuery(callback, env) {
  const callbackId = callback.id;
  const message = callback.message;
  const chatId = message?.chat?.id;
  const messageId = message?.message_id;
  const data = callback.data || '';
  if (!chatId || !messageId) {
    await answerCallback(callbackId, '', env);
    return;
  }

  await answerCallback(callbackId, '', env);
  const state = getState(chatId);

  try {
    if (data === 'home') {
      state.screen = 'home';
      state.previous = null;
      await replaceMessage(chatId, messageId, 'Оберіть дію:', false, { reply_markup: mainKeyboard() }, env);
      return;
    }

    if (data === 'makima:prompt') {
      state.screen = 'waiting_for_makima';
      await replaceMessage(chatId, messageId, 'Макіма готова допомогти.\n\nЗапитайте мене про аніме або будь-що інше.', false, { reply_markup: backHomeKeyboard() }, env);
      return;
    }

    if (data === 'popular:1') {
      state.screen = 'popular';
      await replaceMessage(chatId, messageId, 'Завантажую популярні аніме...', false, {}, env);
      await renderPopular(chatId, 1, messageId, env);
      return;
    }

    if (data.startsWith('popular:')) {
      const page = parsePage(data, 'popular:');
      await renderPopular(chatId, page, messageId, env);
      return;
    }

    if (data === 'random') {
      state.screen = 'random';
      state.previous = { kind: 'random' };
      await replaceMessage(chatId, messageId, 'Шукаю випадкове аніме...', false, {}, env);
      await renderRandom(chatId, messageId, env);
      return;
    }

    if (data === 'search:prompt') {
      state.screen = 'waiting_for_search';
      await replaceMessage(chatId, messageId, 'Введіть назву аніме.', false, { reply_markup: backHomeKeyboard() }, env);
      return;
    }

    if (data === 'search:1') {
      await renderSearch(chatId, 1, env, messageId);
      return;
    }

    if (data.startsWith('search:')) {
      const page = parsePage(data, 'search:');
      await renderSearch(chatId, page, env, messageId);
      return;
    }

    if (data.startsWith('item:')) {
      const [, kind, pageText, indexText] = data.split(':');
      const page = Number(pageText);
      const index = Number(indexText);
      const list = kind === 'popular' ? state.popularResults : state.searchResults;
      const item = Array.isArray(list) ? list[index] : null;
      if (!item?.url) {
        await replaceMessage(chatId, messageId, 'Це аніме більше недоступне. Спробуйте виконати запит ще раз.', false, { reply_markup: mainKeyboard() }, env);
        return;
      }
      state.previous = { kind, page };
      await replaceMessage(chatId, messageId, 'Завантажую деталі...', false, {}, env);
      await renderDetails(chatId, messageId, item.url, env);
      return;
    }

    if (data === 'back:list') {
      const previous = state.previous;
      if (previous?.kind === 'search') {
        await renderSearch(chatId, previous.page, env, messageId);
      } else if (previous?.kind === 'popular') {
        await renderPopular(chatId, previous.page, messageId, env);
      } else {
        state.screen = 'home';
        await replaceMessage(chatId, messageId, 'Оберіть дію:', false, { reply_markup: mainKeyboard() }, env);
      }
      return;
    }
  } catch (error) {
    console.error('[callback] failed:', safeError(error));
    await replaceMessage(chatId, messageId, 'Не вдалося отримати дані. Спробуйте ще раз.', false, { reply_markup: mainKeyboard() }, env);
  }
}

function formatAnimeContext(details) {
  if (!details) return '';
  const fields = [
    ['Назва', details.title],
    ['Оригінальна назва', details.originalTitle],
    ['Альтернативні назви', details.altTitle],
    ['Тип', details.type],
    ['Рік', details.year],
    ['Сезон виходу', details.releaseSeason],
    ['Жанри', Array.isArray(details.genres) ? details.genres.join(', ') : details.genres],
    ['Епізоди', details.episodes],
    ['Тривалість', details.duration],
    ['Статус', details.status],
    ['Студія', details.studio],
    ['Режисер', details.director],
    ['Автор', details.author],
    ['Оригінальне джерело', details.source],
    ['Опис', details.synopsis]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());
  return fields.map(([label, value]) => `${label}: ${String(value).slice(0, 1200)}`).join('; ').slice(0, 7000);
}

function getState(chatId) {
  let state = userStates.get(chatId);
  if (!state) {
    state = { screen: 'home', searchQuery: '', searchPage: 1, popularResults: [], searchResults: [], previous: null, aiHistory: [] };
    userStates.set(chatId, state);
  }
  return state;
}

// ==========================================================
// Catalog rendering
// ==========================================================
async function renderPopular(chatId, page, messageId, env) {
  const state = getState(chatId);
  const all = await fetchPopularAnime();
  const pageItems = paginate(all, page);
  if (!pageItems.length) {
    await updateOrSend(chatId, messageId, 'Популярні аніме поки недоступні.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }
  state.screen = 'popular';
  state.popularPage = page;
  state.popularResults = pageItems;
  userStates.set(chatId, state);
  await updateOrSend(chatId, messageId, `Популярні аніме — сторінка ${page}`, false, {
    reply_markup: listKeyboard(pageItems, page, 'popular', all.length)
  }, env);
}

async function renderSearch(chatId, page, env, messageId = null) {
  const state = getState(chatId);
  const query = (state.searchQuery || '').trim();
  if (!query) {
    await updateOrSend(chatId, messageId, 'Введіть назву аніме.', false, { reply_markup: backHomeKeyboard() }, env);
    return;
  }

  try {
    const result = await searchAnime(query, page);
    if (!result.items.length) {
      await updateOrSend(chatId, messageId, `За запитом «<b>${escapeHtml(query)}</b>» нічого не знайдено.`, false, {
        reply_markup: backHomeKeyboard()
      }, env);
      return;
    }
    state.screen = 'search';
    state.searchPage = page;
    state.searchResults = result.items;
    userStates.set(chatId, state);
    await updateOrSend(chatId, messageId, `Результати пошуку: <b>${escapeHtml(query)}</b> — сторінка ${page}`, false, {
      reply_markup: listKeyboard(result.items, page, 'search', result.total)
    }, env);
  } catch (error) {
    console.error('[search] failed:', safeError(error));
    await updateOrSend(chatId, messageId, 'Не вдалося отримати результати пошуку. Спробуйте ще раз.', false, {
      reply_markup: mainKeyboard()
    }, env);
  }
}

async function renderRandom(chatId, messageId, env) {
  try {
    let randomUrl = '';
    try {
      const randomPage = await fetchSource(`${ANIMEUA_BASE}/index.php?do=rand`);
      randomUrl = absoluteAnimeUrl(firstMatch(randomPage, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i))
        || absoluteAnimeUrl(firstMatch(randomPage, /property=["']og:url["'][^>]*content=["']([^"']+)["']/i));
    } catch (innerError) {
      console.warn('[random] do=rand unavailable:', safeError(innerError));
    }

    if (!randomUrl) {
      // Fallback: обрати випадкове аніме з популярних або каталогу
      const pool = await fetchRandomPool();
      if (pool.length) randomUrl = pool[Math.floor(Math.random() * pool.length)].url;
    }

    if (!randomUrl) throw new Error('RANDOM_UNAVAILABLE');
    await renderDetails(chatId, messageId, randomUrl, env);
  } catch (error) {
    console.error('[random] failed:', safeError(error));
    await updateOrSend(chatId, messageId, 'Не вдалося отримати випадкове аніме. Спробуйте ще раз.', false, {
      reply_markup: mainKeyboard()
    }, env);
  }
}

async function renderDetails(chatId, messageId, url, env) {
  try {
    const details = await fetchAnimeDetails(url);
    if (!details || !details.title) throw new Error('INVALID_ANIME');
    const text = detailsText(details);
    const watchUrl = vakdabWatchUrl(extractAnimeId(details.url));
    const state = getState(chatId);
    state.lastAnimeDetails = details;

    let keyboard;
    if (state.previous?.kind === 'random') {
      const row = [];
      if (watchUrl) row.push([{ text: 'Дивитись на VakDab', url: watchUrl }]);
      row.push([
        { text: 'Випадкове', callback_data: 'random' },
        { text: 'Назад', callback_data: 'home' }
      ]);
      keyboard = { inline_keyboard: row };
    } else {
      keyboard = {
        inline_keyboard: [
          ...(watchUrl ? [[{ text: 'Дивитись на VakDab', url: watchUrl }]] : []),
          [{ text: 'Назад', callback_data: 'back:list' }, { text: 'Головна', callback_data: 'home' }]
        ]
      };
    }

    await deleteMessage(chatId, messageId, env);

    let photoSent = false;
    if (details.image) {
      const photoResult = await sendPhoto(chatId, details.image, text, { reply_markup: keyboard }, env);
      photoSent = Boolean(photoResult?.ok);
      if (!photoSent) {
        // Фолбек: спробувати завантажити картинку через власний HTML-проксі,
        // якщо пряме посилання Telegram відхилив.
        const proxiedImage = `${PROXY_URL}?url=${encodeURIComponent(details.image)}&force_ua=desktop&raw=1`;
        const proxiedResult = await sendPhoto(chatId, proxiedImage, text, { reply_markup: keyboard }, env);
        photoSent = Boolean(proxiedResult?.ok);
      }
    }
    if (!photoSent) {
      await sendMessage(chatId, text, { reply_markup: keyboard }, env);
    }
  } catch (error) {
    console.error('[details] failed:', safeError(error));
    await updateOrSend(chatId, messageId, 'Не вдалося завантажити деталі аніме. Спробуйте ще раз.', false, {
      reply_markup: mainKeyboard()
    }, env);
  }
}

function mainKeyboard() {
  return { inline_keyboard: [
    [{ text: 'Популярні', callback_data: 'popular:1' }],
    [{ text: 'Випадкове', callback_data: 'random' }],
    [{ text: 'Пошук', callback_data: 'search:prompt' }],
    [{ text: 'Запитати Макіму', callback_data: 'makima:prompt' }]
  ] };
}

function backHomeKeyboard() {
  return { inline_keyboard: [[{ text: 'Головна', callback_data: 'home' }]] };
}

function listKeyboard(items, page, kind, total) {
  const keyboard = items.map((item, index) => [{
    text: truncate(item.title, 60),
    callback_data: `item:${kind}:${page}:${index}`
  }]);
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const nav = [];
  if (page > 1) nav.push({ text: 'Назад', callback_data: `${kind}:${page - 1}` });
  if (page < maxPage) nav.push({ text: 'Далі', callback_data: `${kind}:${page + 1}` });
  if (nav.length) keyboard.push(nav);
  keyboard.push([{ text: 'Головна', callback_data: 'home' }]);
  return { inline_keyboard: keyboard };
}

// ==========================================================
// Data fetching / caching
// ==========================================================
async function fetchPopularAnime() {
  if (popularCache && Date.now() - popularCacheAt < CACHE_TTL_MS) return popularCache;
  const html = await fetchSource(`${ANIMEUA_BASE}/top.html`);
  const items = parseCards(html);
  if (!items.length) throw new Error('POPULAR_EMPTY');
  popularCache = dedupe(items);
  popularCacheAt = Date.now();
  return popularCache;
}

async function fetchCatalogPage(page) {
  const html = await fetchSource(`${ANIMEUA_BASE}/page/${page}/`);
  return parseCards(html);
}

async function fetchRandomPool() {
  try {
    const popular = await fetchPopularAnime();
    if (popular.length) return popular;
  } catch (error) {
    console.warn('[random-pool] popular unavailable:', safeError(error));
  }
  if (catalogCache && Date.now() - catalogCacheAt < CACHE_TTL_MS) return catalogCache;
  catalogCache = dedupe(await fetchCatalogPage(1));
  catalogCacheAt = Date.now();
  return catalogCache;
}

// Пошук з правильною пагінацією: збираємо результати по кількох
// сторінках сайту (якщо він їх реально віддає), кешуємо повний
// список за нормалізованим запитом і вже локально ріжемо на
// сторінки по PAGE_SIZE, замість того щоб завжди повертати
// перші 10 елементів незалежно від запитаної сторінки.
async function searchAnime(query, page) {
  const cacheKey = normalizeQuery(query);
  const now = Date.now();
  const cached = searchCache.get(cacheKey);
  if (cached && now - cached.at < SEARCH_CACHE_TTL_MS) {
    return { items: paginate(cached.items, page), total: cached.items.length };
  }

  const items = [];
  for (let sitePage = 1; sitePage <= 5; sitePage += 1) {
    const url = `${ANIMEUA_BASE}/index.php?do=search&subaction=search&story=${encodeURIComponent(normalizeQuery(query))}&page=${sitePage}`;
    let html;
    try {
      html = await fetchSource(url);
    } catch (error) {
      console.warn('[search] fetch failed for page', sitePage, safeError(error));
      break;
    }
    const pageItems = parseCards(html);
    if (!pageItems.length) break;
    const sizeBefore = items.length;
    for (const item of pageItems) {
      if (!items.some(existing => existing.url === item.url)) items.push(item);
    }
    // Якщо сайт ігнорує параметр page і повертає ті самі елементи —
    // нових карток не з'явиться, і сенсу продовжувати немає.
    if (items.length === sizeBefore) break;
    if (pageItems.length < PAGE_SIZE) break;
  }

  searchCache.set(cacheKey, { at: now, items });
  return { items: paginate(items, page), total: items.length };
}

async function fetchAnimeDetails(url) {
  const safeUrl = validateAnimeUrl(url);
  const html = await fetchSource(safeUrl);
  return parseDetails(html, safeUrl);
}

async function fetchSource(targetUrl) {
  if (!isAllowedSourceUrl(targetUrl)) throw new Error('SOURCE_NOT_ALLOWED');
  const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(targetUrl)}&force_ua=desktop`;
  const response = await fetch(proxyUrl, {
    headers: { accept: 'text/html,application/xhtml+xml' },
    cf: { cacheTtl: 60, cacheEverything: true }
  });
  if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}`);
  const html = await response.text();
  if (!html || html.length < 100) throw new Error('SOURCE_EMPTY');
  return html;
}

// Захист від SSRF: через наш проксі можна ходити тільки на домен
// каталогу AnimeUA, а не на довільні адреси, які могли б потрапити
// сюди через змінені URL.
function isAllowedSourceUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    const base = new URL(ANIMEUA_BASE);
    return parsed.protocol === 'https:' && parsed.hostname === base.hostname;
  } catch {
    return false;
  }
}

// ==========================================================
// HTML parsing — картки каталогу
// ==========================================================
function parseCards(html) {
  const cards = [];
  const seen = new Set();
  const posterBlocks = html.match(/<a[^>]*class=["'][^"']*poster[^"']*["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const block of posterBlocks) {
    const url = absoluteAnimeUrl(firstMatch(block, /href=["']([^"']+)["']/i));
    const title = cleanText(firstMatch(block, /class=["'][^"']*poster__title[^"']*["'][^>]*>([\s\S]*?)<\//i) || firstMatch(block, /<h[1-6][^>]*>([\s\S]*?)<\//i));
    const image = extractImageUrl(block);
    if (url && title && !seen.has(url)) {
      seen.add(url);
      cards.push({ title, url, image });
    }
  }

  if (!cards.length) {
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<\/a>/gi;
    let match;
    while ((match = linkPattern.exec(html))) {
      const block = match[0];
      const url = absoluteAnimeUrl(match[1]);
      const title = cleanText(firstMatch(block, /class=["'][^"']*poster__title[^"']*["'][^>]*>([\s\S]*?)<\//i) || block.replace(/<[^>]+>/g, ' '));
      const image = extractImageUrl(block);
      if (url && title && !seen.has(url)) {
        seen.add(url);
        cards.push({ title, url, image });
      }
    }
  }

  return cards;
}

// Універсальний, надійний екстрактор зображень: перевіряє всі
// поширені варіанти lazy-loading та background-image, відкидає
// плейсхолдери й перетворює будь-який знайдений URL на абсолютний.
function extractImageUrl(block) {
  if (!block) return '';
  const isPlaceholder = (value) => /placeholder|blank\.gif|lazy(?:load)?\.(?:svg|png|gif)|1x1|data:image/i.test(value || '');

  const attrCandidates = ['data-src', 'data-original', 'data-lazy-src', 'data-image', 'data-lazy', 'src'];
  for (const attr of attrCandidates) {
    const pattern = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
    const value = decodeEntities(firstMatch(block, pattern));
    if (value && !isPlaceholder(value)) {
      const abs = absoluteUrl(value);
      if (abs) return abs;
    }
  }

  const srcset = decodeEntities(firstMatch(block, /srcset=["']([^"']+)["']/i));
  if (srcset) {
    const candidates = srcset.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean);
    const best = candidates[candidates.length - 1];
    if (best && !isPlaceholder(best)) {
      const abs = absoluteUrl(best);
      if (abs) return abs;
    }
  }

  const bgStyle = decodeEntities(firstMatch(block, /style=["'][^"']*background(?:-image)?\s*:\s*url\((['"]?)([^'")]+)\1\)/i));
  if (bgStyle && !isPlaceholder(bgStyle)) {
    const abs = absoluteUrl(bgStyle);
    if (abs) return abs;
  }
  // Другий шанс: інколи url() групa захоплюється інакше через regex вище.
  const bgMatch = block.match(/background(?:-image)?\s*:\s*url\((['"]?)([^'")]+)\1\)/i);
  if (bgMatch?.[2] && !isPlaceholder(bgMatch[2])) {
    const abs = absoluteUrl(decodeEntities(bgMatch[2]));
    if (abs) return abs;
  }

  return '';
}

// ==========================================================
// HTML parsing — сторінка деталей
// ==========================================================
function parseDetails(html, url) {
  // Звужуємо пошук характеристик до інформаційного блоку сторінки,
  // щоб не хапати випадкові числа/роки з інших частин HTML (футер,
  // реклама, сайдбар з іншими аніме тощо).
  const infoBlock = firstMatch(html, /<(?:div|ul|table)[^>]*class=["'][^"']*(?:pmovie__info|film-info|anime-info|info|sidebar)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|ul|table)>/i) || html;

  const textField = (source, patterns) => {
    for (const pattern of patterns) {
      const value = firstMatch(source, pattern);
      if (value) return cleanText(value);
    }
    return '';
  };

  const labeledField = (source, labels) => {
    const label = labels.map(escapeRegExp).join('|');
    const patterns = [
      new RegExp(`(?:${label})\\s*[:\\-]?\\s*(?:<[^>]+>\\s*){0,3}([^<\\n]{1,150})`, 'i'),
      new RegExp(`(?:${label})[\\s\\S]{0,120}?<[^>]*>([^<]{1,150})<`, 'i')
    ];
    let value = textField(source, patterns);
    if (!value) return '';
    // Обрізати значення, якщо воно ненавмисно "проковтнуло" наступний
    // лейбл (типова проблема жадібних regex на реальному HTML).
    const stopWords = ['Тип', 'Рік', 'Сезон', 'Статус', 'Епізоди', 'Серій', 'Тривалість', 'Студія', 'Режисер', 'Автор', 'Джерело', 'Жанри'];
    for (const stop of stopWords) {
      const idx = value.indexOf(stop);
      if (idx > 0) value = value.slice(0, idx).trim();
    }
    return value.replace(/[:\-–]+$/, '').trim();
  };

  const title = cleanText(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\//i) || firstMatch(html, /property=["']og:title["'][^>]*content=["']([^"']+)["']/i));
  const originalTitle = textField(html, [/class=["'][^"']*(?:original-title|original_name)[^"']*["'][^>]*>([\s\S]*?)<\//i]);
  const altTitle = textField(html, [/class=["'][^"']*(?:alternative-title|alt-title|other-title)[^"']*["'][^>]*>([\s\S]*?)<\//i]);

  const posterBlock = firstMatch(html, /class=["'][^"']*(?:pmovie__poster|anime__poster|full-poster)[^"']*["'][\s\S]{0,600}?<\/(?:div|a)>/i) || html;
  const image = extractImageUrl(posterBlock) || extractImageUrl(html) || absoluteUrl(firstMatch(html, /property=["']og:image["'][^>]*content=["']([^"']+)["']/i));

  const genreBlock = firstMatch(html, /<(?:div|section)[^>]*class=["'][^"']*(?:pmovie__genres|genres)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i) || '';
  const genres = [...new Set(
    [...genreBlock.matchAll(/<a[^>]*>([\s\S]*?)<\//gi)]
      .map(m => cleanText(m[1]))
      .filter(Boolean)
  )];

  const year = labeledField(infoBlock, ['Рік виходу', 'Рік', 'Year']) || firstMatch(infoBlock, /\b((?:19|20)\d{2})\b/);
  const episodes = labeledField(infoBlock, ['Епізоди', 'Кількість серій', 'Серій', 'Episodes']);
  const duration = labeledField(infoBlock, ['Тривалість', 'Продолжительность', 'Duration']);
  const status = labeledField(infoBlock, ['Статус', 'Status']);
  const studio = labeledField(infoBlock, ['Студія', 'Студия', 'Studio']);
  const director = labeledField(infoBlock, ['Режисер', 'Режиссёр', 'Director']);
  const author = labeledField(infoBlock, ['Автор', 'Author', 'Manga']);
  const source = labeledField(infoBlock, ['Джерело', 'Источник', 'Source']);
  const releaseSeason = labeledField(infoBlock, ['Сезон виходу', 'Сезон', 'Season']);
  const type = extractAnimeType(infoBlock, labeledField);

  const descriptionBlock = firstMatch(html, /class=["'][^"']*(?:full-text|pmovie__description|anime__description)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p)>/i);
  const synopsis = cleanSynopsis(descriptionBlock);

  return {
    title: title || 'Без назви', image, originalTitle, altTitle,
    genres, year, type, releaseSeason, episodes, duration,
    status, studio, director, author, source, synopsis, url
  };
}

// Визначення типу аніме за явним лейблом на сторінці, з fallback на
// нормалізацію значення до канонічних позначень. Якщо тип реально
// невідомий — повертається порожній рядок, а не вигадане "TV".
function extractAnimeType(infoBlock, labeledField) {
  const raw = labeledField(infoBlock, ['Тип', 'Type']);
  if (!raw) return '';
  const map = [
    [/серіал|сериал|tv[\s-]?серіал/i, 'TV'],
    [/фільм|фильм|movie|film/i, 'Movie'],
    [/\bova\b/i, 'OVA'],
    [/\bona\b/i, 'ONA'],
    [/спешл|special/i, 'Special'],
    [/музичне відео|музыкальное видео|\bmusic\b/i, 'Music'],
    [/веб|\bweb\b/i, 'Web']
  ];
  for (const [pattern, label] of map) {
    if (pattern.test(raw)) return label;
  }
  return cleanText(raw);
}

// Повне очищення опису: прибирає теги, декодує сутності, нормалізує
// пробіли/переноси та типові рекламні/службові фрази, не обрізаючи
// сам текст опису без причини.
const SYNOPSIS_NOISE_PATTERNS = [
  /дивіться?\s+онлайн[^.!?\n]*[.!?]?/gi,
  /читати\s+далі/gi,
  /підпишіться[^.!?\n]*[.!?]?/gi,
  /реклама[^.!?\n]*[.!?]?/gi,
  /перегляд\s+без\s+реклами[^.!?\n]*[.!?]?/gi,
  /залишити\s+коментар[^.!?\n]*[.!?]?/gi,
  /скачати\s+торрент[^.!?\n]*[.!?]?/gi
];

function cleanSynopsis(rawHtml) {
  if (!rawHtml) return '';
  let text = String(rawHtml)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  text = decodeEntities(text);
  for (const pattern of SYNOPSIS_NOISE_PATTERNS) text = text.replace(pattern, ' ');
  text = text
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function extractAnimeId(animeUrl) {
  try {
    const parsed = new URL(animeUrl);
    const newsId = parsed.searchParams.get('newsid');
    if (/^\d+$/.test(newsId || '')) return newsId;
    const match = parsed.pathname.match(/\/(\d+)(?:-|\.html(?:$|\/))/i);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

function vakdabWatchUrl(animeId) {
  return /^\d+$/.test(String(animeId || ''))
    ? `https://vakdab.github.io/Vakdab/#anime/${animeId}`
    : '';
}

function detailsText(details) {
  let text = `<b>${escapeHtml(details.title)}</b>`;
  const rows = [
    ['Оригінальна назва', details.originalTitle], ['Альтернативні назви', details.altTitle],
    ['Тип', details.type], ['Рік', details.year], ['Сезон', details.releaseSeason],
    ['Статус', details.status], ['Епізоди', details.episodes], ['Тривалість', details.duration],
    ['Студія', details.studio], ['Режисер', details.director], ['Автор', details.author],
    ['Жанри', details.genres?.length ? details.genres.join(', ') : 'Не знайдено в каталозі']
  ];
  for (const [label, value] of rows) if (value) text += `\n${label}: ${escapeHtml(value)}`;
  if (details.synopsis) {
    const synopsis = details.synopsis.slice(0, 1200);
    text += `\n\nОпис:\n${escapeHtml(synopsis)}${details.synopsis.length > 1200 ? '…' : ''}`;
  }
  return text;
}

function paginate(items, page) {
  const start = (page - 1) * PAGE_SIZE;
  return items.slice(start, start + PAGE_SIZE);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter(item => item?.url && !seen.has(item.url) && seen.add(item.url));
}

function normalizeQuery(value) {
  return String(value || '').toLocaleLowerCase('uk-UA').replace(/\s+/g, ' ').trim();
}

function cleanText(value = '') {
  return decodeEntities(String(value).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'");
}

function firstMatch(value, pattern) {
  const match = String(value || '').match(pattern);
  return match?.[1] || '';
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function absoluteUrl(value) {
  if (!value) return '';
  try { return new URL(value, ANIMEUA_BASE).href; } catch { return ''; }
}

function absoluteAnimeUrl(value) {
  const url = absoluteUrl(value);
  return /^https:\/\/animeua\.club\//i.test(url) && !/^https:\/\/animeua\.club\/?$/i.test(url) ? url : '';
}

function validateAnimeUrl(value) {
  const url = absoluteAnimeUrl(value);
  if (!url) throw new Error('INVALID_ANIME_URL');
  return url;
}

function escapeHtml(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function truncate(value, max) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function parsePage(value, prefix) {
  const page = Number(value.slice(prefix.length));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

// ==========================================================
// Telegram helpers
// ==========================================================
async function updateOrSend(chatId, messageId, text, isPhoto, extra, env) {
  if (messageId) {
    const result = await replaceMessage(chatId, messageId, text, isPhoto, extra, env);
    if (result?.ok) return result;
  }
  return sendMessage(chatId, text, extra, env);
}

async function replaceMessage(chatId, messageId, text, isPhoto, extra, env) {
  return isPhoto
    ? telegram('editMessageCaption', { chat_id: chatId, message_id: messageId, caption: text, parse_mode: 'HTML', ...extra }, env)
    : telegram('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra }, env);
}

async function sendMessage(chatId, text, extra, env) {
  return telegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra }, env);
}

async function sendPhoto(chatId, photo, caption, extra, env) {
  // Telegram обрізає підпис фото значно жорсткіше (1024 символи), ніж
  // звичайне повідомлення — тому підпис теж потрібно безпечно різати.
  const safeCaption = caption.length > 1000 ? `${caption.slice(0, 997)}…` : caption;
  return telegram('sendPhoto', { chat_id: chatId, photo, caption: safeCaption, parse_mode: 'HTML', ...extra }, env);
}

async function deleteMessage(chatId, messageId, env) {
  return telegram('deleteMessage', { chat_id: chatId, message_id: messageId }, env);
}

async function answerCallback(callbackQueryId, text, env) {
  return telegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text }, env);
}

// Розбиває довільно довгий текст на Telegram-safe частини, по
// можливості на межах абзаців/речень, без розриву слів. reply_markup
// показується тільки в останньому повідомленні, щоб кнопки не
// дублювалися.
async function sendLongMessage(chatId, rawText, extra, env) {
  const chunks = splitTextForTelegram(rawText, TELEGRAM_SAFE_CHUNK);
  let lastResult = null;
  for (let i = 0; i < chunks.length; i += 1) {
    const isLast = i === chunks.length - 1;
    const payload = isLast ? extra : {};
    lastResult = await sendMessage(chatId, escapeHtml(chunks[i]), payload, env);
  }
  return lastResult;
}

function splitTextForTelegram(text, limit) {
  const value = String(text || '');
  if (value.length <= limit) return [value];

  const chunks = [];
  let remaining = value;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf('\n\n', limit);
    if (cut < limit * 0.4) cut = remaining.lastIndexOf('\n', limit);
    if (cut < limit * 0.4) cut = remaining.lastIndexOf('. ', limit);
    if (cut < limit * 0.4) cut = remaining.lastIndexOf(' ', limit);
    if (cut < limit * 0.4) cut = limit; // жорсткий розріз як останній варіант
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function telegram(method, params, env) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    console.error(`[telegram] ${method} failed with status ${response.status}`);
  }
  return data;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error);
}
