const PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const HIKKA_API = 'https://api.hikka.io';
const MIKAI_API_BASE = 'https://api.mikai.me/v1';
const SITE_BASE_URL = 'https://vakdab.github.io/Vakdab';
const PAGE_SIZE = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const TELEGRAM_WEBHOOK_PATH = '/telegram-webhook';

// Скільки останніх повідомлень йде в модель як "жива" пам'ять
const MAX_CONTEXT_MESSAGES_FOR_API = 50;

// Коли історія довша за це — старі повідомлення згортаються в summary
const SUMMARY_TRIGGER_MESSAGES = 60;
const SUMMARY_KEEP_RECENT = 30; // скільки останніх повідомлень залишаємо без згортання

const PROFILE_ARRAY_MAX_ITEMS = 25;

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
        if (env.ASSETS) return env.ASSETS.fetch(request);
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

  const memoryKey = getMemoryKey(message.from);
  const text = (message.text || '').trim();

  if (text === '/start') {
    const state = getState(chatId);
    state.screen = 'home';
    await sendMessage(chatId, 'Привіт! Оберіть дію:', { reply_markup: mainKeyboard() }, env);
    return;
  }

  if (/^\/forget(?:@\w+)?(?:\s|$)/i.test(text)) {
    await clearUserHistory(memoryKey, env);
    await clearUserSummary(memoryKey, env);
    await sendMessage(chatId, 'Гаразд, я забула нашу попередню розмову. Починаємо з чистого аркуша 🙂', { reply_markup: backHomeKeyboard() }, env);
    return;
  }

  if (/^\/forgetall(?:@\w+)?(?:\s|$)/i.test(text)) {
    await clearUserHistory(memoryKey, env);
    await clearUserSummary(memoryKey, env);
    await clearUserProfile(memoryKey, env);
    await sendMessage(chatId, 'Я повністю забула і нашу розмову, і все, що знала про тебе. Знайомимось заново 🙂', { reply_markup: backHomeKeyboard() }, env);
    return;
  }

  if (/^\/(?:makima|ask)(?:@\w+)?(?:\s|$)/i.test(text)) {
    const prompt = text.replace(/^\/(?:makima|ask)(?:@\w+)?\s*/i, '').trim();
    if (!prompt) {
      await sendMessage(chatId, 'Напиши запит після команди, наприклад: <code>/makima розкажи про останні новини аніме</code>.', {}, env);
      return;
    }
    await handleMakimaMessage(chatId, memoryKey, prompt, env);
    return;
  }

  if (text.toLowerCase().includes('макіма')) {
    const state = getState(chatId);
    state.screen = 'makima';
    await handleMakimaMessage(chatId, memoryKey, text, env);
    return;
  }

  if (!text) return;

  const state = getState(chatId);

  if (state.screen === 'waiting_for_makima') {
    await handleMakimaMessage(chatId, memoryKey, text, env);
    return;
  }

  if (state.screen === 'waiting_for_search') {
    state.searchQuery = text;
    state.searchPage = 1;
    state.screen = 'search';
    await sendMessage(chatId, `Шукаю: <b>${escapeHtml(text)}</b>...`, {}, env);
    await renderSearch(chatId, 1, env);
    return;
  }

  // За замовчуванням — вільна розмова з Макімою
  await handleMakimaMessage(chatId, memoryKey, text, env);
}

function getMemoryKey(from) {
  const username = String(from?.username || '').trim().toLowerCase();
  if (username) return `u:${username}`;
  const id = from?.id;
  return id ? `id:${id}` : 'unknown';
}

// ==================== GROQ / Makima ====================
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

const MAKIMA_SYSTEM_PROMPT = `Тебе звати Макіма. Ти — розумна, добра та сучасна AI-помічниця у Telegram-боті VakDab.
Ти дівчина, і коли доречно говориш про себе у жіночому роді (наприклад "я рада", "я подумала", "я знайшла").

Ти створена для того, щоб користувачі могли просто й невимушено спілкуватися з тобою на будь-які теми:
аніме, манґа, фільми, серіали, ігри, новини, погода, технології, програмування, навчання, подорожі та будь-які
повсякденні питання. Ти не просто відповідаєш на запити — ти підтримуєш приємну, живу та природну розмову, як
теплий і уважний співрозмовник, а не персонаж з аніме чи учасник рольової гри.

Твій характер:
- добра, уважна, ввічлива, мила у спілкуванні;
- спокійна та позитивна;
- завжди намагаєшся щиро допомогти користувачу.

Не грай роль персонажа.
Не використовуй опис дій або сценічні фрази на кшталт "*посміхається*", "*дивиться*" тощо.
Ти реальна AI-помічниця, яка просто тепло й по-людськи спілкується.

МОВА:
Завжди відповідай українською мовою.

СТИЛЬ ВІДПОВІДЕЙ:
Пиши природно, як людина. Відповіді можуть бути короткими або більшими — залежно від питання. Не обмежуй себе
кількістю тексту, якщо користувачу потрібне детальне пояснення, але:
- не додавай зайву воду;
- не повторюй одне й те саме;
- не використовуй непотрібні вступи чи службові фрази;
- не вставляй зайві символи.

ФОРМАТ ТЕКСТУ:
Створюй красиві та зручні для читання повідомлення Telegram.
Дозволено: звичайні абзаци, списки через тире, доречні емодзі.
Не використовуй: символи #, символи * для виділення, Markdown-оформлення, зайві декоративні знаки, незрозумілі
скорочення. Текст має виглядати чисто і красиво навіть без спеціального форматування.

АНІМЕ:
Ти добре розумієшся на аніме-культурі. Допомагай з рекомендаціями, описами, жанрами, персонажами, новинками та
обговореннями.

ІНШІ ТЕМИ:
Ти можеш допомагати з будь-якими питаннями: пояснювати складні речі простими словами, допомагати знайти рішення,
давати корисні поради, підтримувати дружню розмову.

АКТУАЛЬНІ ДАНІ:
Якщо питання залежить від поточного часу (погода, новини, свіжі події), не вигадуй інформацію. Чесно поясни
ситуацію і допоможи користувачу отримати правильну відповідь.

ПАМ'ЯТЬ:
Ти добре пам'ятаєш попередні повідомлення цього користувача і використовуєш цей контекст, щоб відповідати послідовно —
так, ніби добре знайома людина. Якщо користувач раніше розповідав про себе (ім'я, вподобання, плани), природно
врахуй це, коли це доречно, без зайвого нагадування "я пам'ятаю, що ти казав...".

ГОЛОВНЕ:
Кожен користувач повинен відчувати, що спілкується з розумною, доброю та уважною подругою-помічницею, яка
завжди готова допомогти.`;

async function handleMakimaMessage(chatId, memoryKey, userMessage, env) {
  try {
    await telegram('sendChatAction', { chat_id: chatId, action: 'typing' }, env);

    const fullHistory = await getUserHistory(memoryKey, env);
    const profile = await getUserProfile(memoryKey, env);
    let summary = await getUserSummary(memoryKey, env);

    // Якщо історія вже довга — оновлюємо summary (асинхронно, щоб не блокувати відповідь)
    if (fullHistory.length >= SUMMARY_TRIGGER_MESSAGES) {
      // Не чекаємо на summary, щоб відповідь була швидшою
      updateSummaryIfNeeded(memoryKey, fullHistory, summary, env).catch(err => {
        console.error('[summary] background update failed:', safeError(err));
      });
    }

    const responseText = await callMakimaAI(userMessage, fullHistory, profile, summary, env);

    fullHistory.push({ role: 'user', content: userMessage });
    fullHistory.push({ role: 'assistant', content: responseText });
    await saveUserHistory(memoryKey, fullHistory, env);

    await sendMessage(chatId, escapeHtml(responseText), { reply_markup: backHomeKeyboard() }, env);

    // Оновлення профілю після відповіді
    try {
      const extracted = await extractMemory(userMessage, profile, env);
      if (extracted && Object.keys(extracted).length > 0) {
        const mergedProfile = mergeProfile(profile, extracted);
        await saveUserProfile(memoryKey, mergedProfile, env);
      }
    } catch (memError) {
      console.error('[memory] extract/merge failed:', safeError(memError));
    }
  } catch (error) {
    console.error('[makima] failed:', safeError(error));
    await sendMessage(chatId, 'Макіма тимчасово не може відповісти. Спробуйте ще раз.', { reply_markup: backHomeKeyboard() }, env);
  }
}

async function callMakimaAI(prompt, fullHistory, profile, summary, env) {
  const apiKey = String(env.GROQ_API_KEY || '').trim();
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
  const model = String(env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();

  const recentHistory = fullHistory.slice(-MAX_CONTEXT_MESSAGES_FOR_API);
  const profileContext = buildProfileContext(profile);

  let memoryBlock = '';
  if (profileContext) {
    memoryBlock += `ІНФОРМАЦІЯ ПРО КОРИСТУВАЧА:\n${profileContext}\n\n`;
  }
  if (summary) {
    memoryBlock += `КОРОТКИЙ ПІДСУМОК РАНІШОЇ РОЗМОВИ:\n${summary}\n\n`;
  }

  const systemPrompt = memoryBlock
    ? `${MAKIMA_SYSTEM_PROMPT}\n\n${memoryBlock}ПРАВИЛА ВИКОРИСТАННЯ ЦІЄЇ ІНФОРМАЦІЇ:\nВикористовуй її тільки коли вона реально покращує відповідь і доречна за темою.\nНе згадуй випадкові факти, якщо вони не стосуються поточного питання.\nНе кажи "я пам'ятаю" або подібних фраз.\nГовори природно, ніби добре знайома людина.`
    : MAKIMA_SYSTEM_PROMPT;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: String(prompt || '') }
  ];

  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) throw new Error(`Groq API error ${response.status}`);
  const data = await response.json();
  const generatedText = data?.choices?.[0]?.message?.content?.trim();
  if (!generatedText) throw new Error('Groq returned no text');
  return generatedText;
}

// ==================== Summary (довготривала пам'ять розмови) ====================

async function getUserSummary(memoryKey, env) {
  if (!env.MAKIMA_MEMORY) return '';
  try {
    const raw = await env.MAKIMA_MEMORY.get(`summary:${memoryKey}`);
    return raw ? String(raw) : '';
  } catch (error) {
    console.error('[summary] read failed:', safeError(error));
    return '';
  }
}

async function saveUserSummary(memoryKey, summary, env) {
  if (!env.MAKIMA_MEMORY) return;
  try {
    await env.MAKIMA_MEMORY.put(`summary:${memoryKey}`, String(summary || ''));
  } catch (error) {
    console.error('[summary] write failed:', safeError(error));
  }
}

async function clearUserSummary(memoryKey, env) {
  if (!env.MAKIMA_MEMORY) return;
  try {
    await env.MAKIMA_MEMORY.delete(`summary:${memoryKey}`);
  } catch (error) {
    console.error('[summary] clear failed:', safeError(error));
  }
}

async function updateSummaryIfNeeded(memoryKey, fullHistory, currentSummary, env) {
  if (!env.MAKIMA_MEMORY || fullHistory.length < SUMMARY_TRIGGER_MESSAGES) return;

  // Беремо повідомлення, які вже "старі" (все крім останніх SUMMARY_KEEP_RECENT)
  const oldMessages = fullHistory.slice(0, -SUMMARY_KEEP_RECENT);
  if (oldMessages.length < 20) return;

  const apiKey = String(env.GROQ_API_KEY || '').trim();
  if (!apiKey) return;
  const model = String(env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();

  // Формуємо текст для summary (обмежуємо, щоб не перевищити контекст)
  const textForSummary = oldMessages
    .slice(-80) // беремо не більше 80 старих повідомлень
    .map(m => `${m.role === 'user' ? 'Користувач' : 'Макіма'}: ${m.content}`)
    .join('\n');

  const summaryPrompt = `Ти — модуль стиснення пам'яті.
Твоя задача: створити короткий, інформативний підсумок розмови українською мовою.

Поточний підсумок (якщо є):
${currentSummary || '(немає)'}

Нові повідомлення для врахування:
${textForSummary}

Правила:
- Збережи важливі факти про користувача, його вподобання, плани, теми, які обговорювали.
- Не включай дрібниці та одноразові питання.
- Пиши стисло, 1–3 абзаци.
- Відповідай ТІЛЬКИ текстом підсумку, без пояснень.`;

  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Ти стискаєш історію розмови в короткий корисний підсумок.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) return;

    const data = await response.json();
    const newSummary = data?.choices?.[0]?.message?.content?.trim();
    if (newSummary) {
      await saveUserSummary(memoryKey, newSummary, env);
    }
  } catch (error) {
    console.error('[summary] generation failed:', safeError(error));
  }
}

// ==================== Persistent memory (KV) ====================

async function getUserHistory(memoryKey, env) {
  if (!env.MAKIMA_MEMORY) return [];
  try {
    const raw = await env.MAKIMA_MEMORY.get(`history:${memoryKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[memory] read failed:', safeError(error));
    return [];
  }
}

async function saveUserHistory(memoryKey, fullHistory, env) {
  if (!env.MAKIMA_MEMORY) return;
  try {
    await env.MAKIMA_MEMORY.put(`history:${memoryKey}`, JSON.stringify(fullHistory));
  } catch (error) {
    console.error('[memory] write failed:', safeError(error));
  }
}

async function clearUserHistory(memoryKey, env) {
  if (!env.MAKIMA_MEMORY) return;
  try {
    await env.MAKIMA_MEMORY.delete(`history:${memoryKey}`);
  } catch (error) {
    console.error('[memory] clear failed:', safeError(error));
  }
}

function defaultProfile() {
  return {
    name: '',
    birthday: '',
    age: '',
    favoriteAnime: [],
    favoriteGenres: [],
    hobbies: [],
    projects: [],
    preferences: [],
    facts: []
  };
}

async function getUserProfile(memoryKey, env) {
  if (!env.MAKIMA_MEMORY) return defaultProfile();
  try {
    const raw = await env.MAKIMA_MEMORY.get(`profile:${memoryKey}`);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultProfile();
    return { ...defaultProfile(), ...parsed };
  } catch (error) {
    console.error('[profile] read failed:', safeError(error));
    return defaultProfile();
  }
}

async function saveUserProfile(memoryKey, profile, env) {
  if (!env.MAKIMA_MEMORY) return;
  try {
    const safeProfile = { ...defaultProfile(), ...(profile || {}) };
    await env.MAKIMA_MEMORY.put(`profile:${memoryKey}`, JSON.stringify(safeProfile));
  } catch (error) {
    console.error('[profile] write failed:', safeError(error));
  }
}

async function clearUserProfile(memoryKey, env) {
  if (!env.MAKIMA_MEMORY) return;
  try {
    await env.MAKIMA_MEMORY.delete(`profile:${memoryKey}`);
  } catch (error) {
    console.error('[profile] clear failed:', safeError(error));
  }
}

function buildProfileContext(profile) {
  if (!profile) return '';
  const lines = [];
  if (profile.name) lines.push(`Ім'я: ${profile.name}`);
  if (profile.birthday) lines.push(`День народження: ${profile.birthday}`);
  if (profile.age) lines.push(`Вік: ${profile.age}`);
  if (Array.isArray(profile.favoriteAnime) && profile.favoriteAnime.length) {
    lines.push(`Улюблені аніме: ${profile.favoriteAnime.join(', ')}`);
  }
  if (Array.isArray(profile.favoriteGenres) && profile.favoriteGenres.length) {
    lines.push(`Улюблені жанри: ${profile.favoriteGenres.join(', ')}`);
  }
  if (Array.isArray(profile.hobbies) && profile.hobbies.length) {
    lines.push(`Хобі: ${profile.hobbies.join(', ')}`);
  }
  if (Array.isArray(profile.projects) && profile.projects.length) {
    lines.push(`Проєкти: ${profile.projects.join(', ')}`);
  }
  if (Array.isArray(profile.preferences) && profile.preferences.length) {
    lines.push(`Вподобання: ${profile.preferences.join(', ')}`);
  }
  if (Array.isArray(profile.facts) && profile.facts.length) {
    lines.push(`Інші факти: ${profile.facts.join(', ')}`);
  }
  return lines.join('\n');
}

const MEMORY_EXTRACT_SYSTEM_PROMPT = `Ти — модуль аналізу пам'яті для AI-асистентки Макіми.
Твоя єдина задача: проаналізувати ОДНЕ повідомлення користувача і поточний профіль, та повернути ТІЛЬКИ JSON
з новими або оновленими довготривалими фактами про користувача.

Довготривалі факти — це стабільна інформація: ім'я, день народження, вік, улюблені аніме, улюблені жанри,
хобі, проєкти, над якими працює користувач, стійкі вподобання.

НЕ включай:
- випадкові одноразові питання;
- тимчасові емоції чи настрій;
- технічні питання без особистого контексту;
- інформацію, якої немає в повідомленні (нічого не вигадуй).

Якщо в повідомленні немає жодного нового довготривалого факту — поверни порожній об'єкт {}.

Формат відповіді — ТІЛЬКИ JSON, без пояснень, без markdown, без \`\`\`.
Можливі поля: name, birthday, age, favoriteAnime (масив), favoriteGenres (масив), hobbies (масив),
projects (масив), preferences (масив), facts (масив).
Включай лише ті поля, для яких дійсно є нова інформація.`;

async function extractMemory(userMessage, profile, env) {
  const apiKey = String(env.GROQ_API_KEY || '').trim();
  if (!apiKey) return {};
  const model = String(env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();

  const profileSnapshot = JSON.stringify({ ...defaultProfile(), ...(profile || {}) });

  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: MEMORY_EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: `Поточний профіль:\n${profileSnapshot}\n\nПовідомлення користувача:\n${String(userMessage || '')}` }
        ],
        temperature: 0.1,
        max_tokens: 400
      })
    });

    if (!response.ok) {
      console.error(`[memory] extract API error ${response.status}`);
      return {};
    }

    const data = await response.json();
    const rawText = data?.choices?.[0]?.message?.content?.trim();
    if (!rawText) return {};

    const cleaned = rawText.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[memory] extract JSON parse failed:', safeError(parseError));
      return {};
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    console.error('[memory] extract request failed:', safeError(error));
    return {};
  }
}

const PROFILE_ARRAY_FIELDS = ['favoriteAnime', 'favoriteGenres', 'hobbies', 'projects', 'preferences', 'facts'];
const PROFILE_STRING_FIELDS = ['name', 'birthday', 'age'];

function mergeProfile(oldProfile, extracted) {
  const base = { ...defaultProfile(), ...(oldProfile || {}) };
  if (!extracted || typeof extracted !== 'object') return base;

  const merged = { ...base };

  for (const field of PROFILE_STRING_FIELDS) {
    const value = extracted[field];
    if (typeof value === 'string' && value.trim()) {
      merged[field] = value.trim();
    }
  }

  for (const field of PROFILE_ARRAY_FIELDS) {
    const incoming = extracted[field];
    if (Array.isArray(incoming) && incoming.length) {
      const existing = Array.isArray(base[field]) ? base[field] : [];
      const cleanedIncoming = incoming
        .filter(item => typeof item === 'string' && item.trim())
        .map(item => item.trim());

      const combined = [...existing];
      for (const item of cleanedIncoming) {
        if (!combined.some(existingItem => existingItem.toLowerCase() === item.toLowerCase())) {
          combined.push(item);
        }
      }

      merged[field] = combined.length > PROFILE_ARRAY_MAX_ITEMS
        ? combined.slice(combined.length - PROFILE_ARRAY_MAX_ITEMS)
        : combined;
    }
  }

  return merged;
}

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
      await deleteMessage(chatId, messageId, env);
      await sendMessage(chatId, 'Оберіть дію:', { reply_markup: mainKeyboard() }, env);
      return;
    }

    if (data === 'makima:prompt') {
      state.screen = 'waiting_for_makima';
      await replaceMessage(chatId, messageId, 'Напишіть своє запитання Макімі.', false, { reply_markup: backHomeKeyboard() }, env);
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

    if (data === 'schedule') {
      state.screen = 'schedule';
      await replaceMessage(chatId, messageId, 'Завантажую розклад Mikai...', false, {}, env);
      await renderSchedule(chatId, messageId, env);
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

    if (data.startsWith('anime:')) {
      const slug = data.slice('anime:'.length).trim();
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{1,180}$/.test(slug)) {
        await replaceMessage(chatId, messageId, 'Некоректне посилання на аніме. Спробуйте виконати пошук ще раз.', false, { reply_markup: mainKeyboard() }, env);
        return;
      }
      state.previous = null;
      await replaceMessage(chatId, messageId, 'Завантажую деталі...', false, {}, env);
      await renderDetails(chatId, messageId, `${HIKKA_API}/anime/${slug}`, env);
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

function getState(chatId) {
  let state = userStates.get(chatId);
  if (!state) {
    state = { screen: 'home', searchQuery: '', searchPage: 1, popularResults: [], searchResults: [], previous: null };
    userStates.set(chatId, state);
  }
  return state;
}

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

async function renderSchedule(chatId, messageId, env) {
  try {
    const schedule = await fetchMikaiSchedule();
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const labels = { monday: 'Понеділок', tuesday: 'Вівторок', wednesday: 'Середа', thursday: 'Четвер', friday: 'Пʼятниця', saturday: 'Субота', sunday: 'Неділя' };
    const lines = [];
    for (const day of days) {
      const items = Array.isArray(schedule?.[day]) ? schedule[day] : [];
      if (!items.length) continue;
      lines.push(`<b>${labels[day]}</b>`);
      for (const item of items.slice(0, 12)) {
        const anime = item?.anime || {};
        const title = anime?.details?.names?.name || anime?.details?.names?.nameEnglish || anime?.slug || 'Без назви';
        const episode = item?.episode ? ` · серія ${item.episode}` : '';
        const time = item?.airing ? ` · ${String(item.airing).slice(11, 16)}` : '';
        lines.push(`• ${escapeHtml(title)}${escapeHtml(episode)}${escapeHtml(time)}`);
      }
      lines.push('');
    }
    const text = lines.join('\n').trim() || 'На найближчі дні розкладу немає.';
    const safeText = text.length > 3500 ? `${text.slice(0, 3490)}…` : text;
    await updateOrSend(chatId, messageId, `Розклад виходу з Mikai:\n\n${safeText}`, false, { reply_markup: backHomeKeyboard() }, env);
  } catch (error) {
    console.error('[schedule] failed:', safeError(error));
    await updateOrSend(chatId, messageId, 'Не вдалося завантажити розклад Mikai. Спробуйте ще раз.', false, { reply_markup: mainKeyboard() }, env);
  }
}

async function fetchMikaiSchedule() {
  const response = await fetch(`${MIKAI_API_BASE}/schedule`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`MIKAI_HTTP_${response.status}`);
  const payload = await response.json();
  if (payload?.ok === false) throw new Error(payload.error?.message || 'MIKAI_API_ERROR');
  return payload?.result || payload;
}

async function renderRandom(chatId, messageId, env) {
  try {
    const pool = await fetchRandomPool();
    const item = pool[Math.floor(Math.random() * pool.length)];
    if (!item?.url) throw new Error('RANDOM_EMPTY');
    await renderDetails(chatId, messageId, item.url, env);
  } catch (error) {
    console.error('[random] failed:', safeError(error));
    await updateOrSend(chatId, messageId, 'Не вдалося отримати випадкове аніме. Спробуйте ще раз.', false, { reply_markup: mainKeyboard() }, env);
  }
}

async function renderDetails(chatId, messageId, url, env) {
  try {
    const details = await fetchAnimeDetails(url);
    if (!details || !details.title) throw new Error('INVALID_ANIME');
    const text = detailsText(details);
    const watchUrl = vakdabWatchUrl(extractAnimeId(details.url));
    const state = getState(chatId);

    const buttons = [];
    const mikaiUrl = findMikaiWatchUrl(details);
    if (state.previous?.kind === 'random') {
      buttons.push({ text: 'Випадкове', callback_data: 'random' });
    }
    buttons.push({ text: 'Головна', callback_data: 'home' });

    let keyboard;
    if (watchUrl || mikaiUrl) {
      const watchButtons = [];
      if (watchUrl) watchButtons.push({ text: 'Дивитись на VakDab', url: watchUrl });
      if (mikaiUrl) watchButtons.push({ text: 'Джерело Mikai', url: mikaiUrl });
      keyboard = {
        inline_keyboard: [
          watchButtons,
          buttons
        ]
      };
    } else {
      keyboard = { inline_keyboard: [buttons] };
    }

    await deleteMessage(chatId, messageId, env);
    if (details.image && /^https:\/\//i.test(details.image)) {
      const photoResult = await sendPhoto(chatId, details.image, text, { reply_markup: keyboard }, env);
      if (!photoResult?.ok) {
        await sendMessage(chatId, text, { reply_markup: keyboard }, env);
      }
    } else {
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
    [{ text: 'Розклад', callback_data: 'schedule' }],
    [{ text: 'Запитати Макіму', callback_data: 'makima:prompt' }]
  ] };
}

function backHomeKeyboard() {
  return { inline_keyboard: [[{ text: 'Головна', callback_data: 'home' }]] };
}

function listKeyboard(items, page, kind, total) {
  const keyboard = items.map((item, index) => {
    const slug = item.slug || extractAnimeId(item.url);
    const callbackData = slug && `anime:${slug}`.length <= 64
      ? { text: truncate(item.title, 60), callback_data: `anime:${slug}` }
      : { text: truncate(item.title, 60), url: vakdabWatchUrl(slug) || SITE_BASE_URL };
    return [callbackData];
  });
  const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const nav = [];
  if (page > 1) nav.push({ text: 'Назад', callback_data: `${kind}:${page - 1}` });
  if (page < maxPage) nav.push({ text: 'Далі', callback_data: `${kind}:${page + 1}` });
  if (nav.length) keyboard.push(nav);
  keyboard.push([{ text: 'Головна', callback_data: 'home' }]);
  return { inline_keyboard: keyboard };
}

async function hikkaCatalog(page = 1, body = {}) {
  const response = await fetch(`${HIKKA_API}/anime?page=${Math.max(1, page)}&size=${PAGE_SIZE}`, {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`HIKKA_HTTP_${response.status}`);
  const data = await response.json();
  const items = (data.list || []).map(item => ({
    ...item,
    title: item.title_ua || item.title_en || item.title_ja || 'Без назви',
    slug: item.slug || '',
    id: item.id || item.hikka_id || item.mal_id || '',
    url: `${HIKKA_API}/anime/${encodeURIComponent(item.slug || item.id || '')}`, image: item.image || '',
    score: item.score, year: item.year, episodes: item.episodes_released,
    genres: normalizeHikkaGenres(item.genres)
  }));
  items.total = Number(data.total || data.count || data.pagination?.total || 0) || (items.length === PAGE_SIZE ? page * PAGE_SIZE + 1 : items.length);
  return items;
}

async function fetchPopularAnime() {
  if (popularCache && Date.now() - popularCacheAt < CACHE_TTL_MS) return popularCache;
  popularCache = await hikkaCatalog(1, { only_translated: true, sort: ['score:desc', 'scored_by:desc'] });
  popularCacheAt = Date.now();
  return popularCache;
}

async function fetchCatalogPage(page) { return hikkaCatalog(page, { only_translated: true }); }

async function fetchRandomPool() {
  const popular = await fetchPopularAnime();
  if (popular.length) return popular;
  return fetchCatalogPage(1);
}

async function searchAnime(query, page) {
  const items = await hikkaCatalog(page, { query: normalizeQuery(query), only_translated: true });
  return { items, total: items.total || items.length };
}

async function fetchAnimeDetails(url) {
  const safeUrl = validateHikkaUrl(url);
  const response = await fetch(safeUrl, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HIKKA_HTTP_${response.status}`);
  const item = await response.json();
  return { ...item, title: item.title_ua || item.title_en || item.title_ja || 'Без назви', url: safeUrl,
    image: item.image, synopsis: item.synopsis_ua || item.synopsis_en || '',
    genres: normalizeHikkaGenres(item.genres),
    year: item.year || '',
    episodes: item.episodes_released || item.episodes_total || '',
    episodesTotal: item.episodes_total || '',
    status: item.status || '' };
}

async function fetchSource(targetUrl) {
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

function parseCards(html) {
  const cards = [];
  const seen = new Set();
  const posterBlocks = html.match(/<a[^>]*class=["'][^"']*poster[^"']*["'][^>]*>[\s\S]*?<\/a>/gi) || [];
  for (const block of posterBlocks) {
    const url = absoluteAnimeUrl(firstMatch(block, /href=["']([^"']+)["']/i));
    const title = cleanText(firstMatch(block, /class=["'][^"']*poster__title[^"']*["'][^>]*>([\s\S]*?)<\//i) || firstMatch(block, /<h[1-6][^>]*>([\s\S]*?)<\//i));
    const image = absoluteUrl(firstMatch(block, /(?:data-src|src)=["']([^"']+)["']/i));
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
      const image = absoluteUrl(firstMatch(block, /(?:data-src|src)=["']([^"']+)["']/i));
      if (url && title && !seen.has(url)) {
        seen.add(url);
        cards.push({ title, url, image });
      }
    }
  }

  return cards;
}

function parseDetails(html, url) {
  const title = cleanText(firstMatch(html, /<h1[^>]*>([\s\S]*?)<\//i) || firstMatch(html, /property=["']og:title["'][^>]*content=["']([^"']+)["']/i));
  const image = absoluteUrl(firstMatch(html, /class=["'][^"']*(?:pmovie__poster|anime__poster|full-poster)[^"']*["'][\s\S]{0,500}?(?:data-src|src)=["']([^"']+)["']/i) || firstMatch(html, /property=["']og:image["'][^>]*content=["']([^"']+)["']/i));
  const genreBlock = firstMatch(html, /<(?:div|section)[^>]*class=["'][^"']*(?:pmovie__genres|genres)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i) || '';
  const genres = [...genreBlock.matchAll(/<a[^>]*>([\s\S]*?)<\//gi)].map(m => cleanText(m[1])).filter(Boolean);
  const year = firstMatch(html, /class=["'][^"']*(?:pmovie__year|release-year)[^"']*["'][^>]*>[\s\S]*?(\d{4})/i) || firstMatch(html, /\b(19|20)\d{2}\b/);
  const episodes = firstMatch(html, /(?:Епізод(?:ів|и)?|Серій)[^\d]{0,20}(\d+(?:\s*\/\s*\d+)?)/i) || firstMatch(html, /class=["'][^"']*(?:episodes|series-count)[^"']*["'][^>]*>[\s\S]*?(\d+(?:\s*\/\s*\d+)?)/i);
  const descriptionBlock = firstMatch(html, /class=["'][^"']*(?:full-text|pmovie__description|anime__description)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p)>/i);
  const synopsis = cleanText(descriptionBlock);
  return { title: title || 'Без назви', image, genres: [...new Set(genres)], year: year || '', episodes: episodes || '', synopsis, url };
}

function extractAnimeId(animeUrl) {
  try {
    const parsed = new URL(animeUrl);
    const newsId = parsed.searchParams.get('newsid');
    if (newsId && /^[A-Za-z0-9][A-Za-z0-9-]{1,180}$/.test(newsId)) return newsId;
    const match = parsed.pathname.match(/\/anime\/([^/?#]+)/i);
    return match?.[1] || '';
  } catch {
    return '';
  }
}

function vakdabWatchUrl(animeId) {
  const value = String(animeId || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9-]{1,180}$/.test(value)
    ? `${SITE_BASE_URL}/#anime/${encodeURIComponent(value)}`
    : '';
}

function normalizeHikkaGenres(genres) {
  return [...new Set((Array.isArray(genres) ? genres : []).map(item => {
    if (typeof item === 'string') return item.trim();
    return String(item?.name_ua || item?.name_en || item?.name || '').trim();
  }).filter(Boolean))];
}

function findMikaiWatchUrl(details = {}) {
  const candidates = [
    ...(Array.isArray(details.external) ? details.external : []),
    ...(Array.isArray(details.watch) ? details.watch : [])
  ];
  return candidates.map(item => typeof item === 'string' ? item : item?.url).find(url => /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i.test(String(url || ''))) || '';
}

function statusLabelUa(status) {
  const map = { ongoing: 'Онґоїнг', released: 'Вийшло', finished: 'Завершено', completed: 'Завершено', anons: 'Анонс' };
  return map[String(status || '').toLowerCase()] || String(status || '');
}

function detailsText(details) {
  let text = `<b>${escapeHtml(details.title)}</b>`;
  if (details.year) text += `\nРік: ${escapeHtml(details.year)}`;
  if (details.episodes) {
    const episodeText = details.episodesTotal && String(details.episodesTotal) !== String(details.episodes)
      ? `${details.episodes} / ${details.episodesTotal}`
      : details.episodes;
    text += `\nЕпізоди: ${escapeHtml(episodeText)}`;
  }
  if (details.status) text += `\nСтатус: ${escapeHtml(statusLabelUa(details.status))}`;
  if (details.genres.length) text += `\nЖанри: ${escapeHtml(details.genres.join(', '))}`;
  if (details.synopsis) {
    const synopsis = details.synopsis.slice(0, 900);
    text += `\n\nОпис:\n${escapeHtml(synopsis)}${details.synopsis.length > 900 ? '…' : ''}`;
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
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#039;|&#39;/gi, "'");
}

function firstMatch(value, pattern) {
  const match = String(value || '').match(pattern);
  return match?.[1] || '';
}

function absoluteUrl(value) {
  if (!value) return '';
  try { return new URL(value, HIKKA_API).href; } catch { return ''; }
}

function absoluteAnimeUrl(value) {
  const url = absoluteUrl(value);
  return /^https:\/\/api\.hikka\.io\/anime\//i.test(url) ? url : '';
}

function validateAnimeUrl(value) {
  const url = absoluteAnimeUrl(value);
  return /^https:\/\/api\.hikka\.io\/anime\//i.test(url) ? url : '';
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
  return telegram('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'HTML', ...extra }, env);
}

async function deleteMessage(chatId, messageId, env) {
  return telegram('deleteMessage', { chat_id: chatId, message_id: messageId }, env);
}

async function answerCallback(callbackQueryId, text, env) {
  return telegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text }, env);
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
