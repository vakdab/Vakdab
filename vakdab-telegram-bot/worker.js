const PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const ANIMEUA_BASE = 'https://animeua.club';
const PAGE_SIZE = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const TELEGRAM_WEBHOOK_PATH = '/telegram-webhook';

// Скільки останніх повідомлень йде в модель як "жива" пам'ять
const MAX_CONTEXT_MESSAGES_FOR_API = 15;

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
  const firstName = String(message.from?.first_name || '').trim();
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
    await handleMakimaMessage(chatId, memoryKey, prompt, firstName, env);
    return;
  }

  if (text.toLowerCase().includes('макіма')) {
    const state = getState(chatId);
    state.screen = 'makima';
    await handleMakimaMessage(chatId, memoryKey, text, firstName, env);
    return;
  }

  if (!text) return;

  const state = getState(chatId);

  // Якщо користувач у стані вибору озвучки/сезону/серії – нагадуємо використовувати кнопки
  if (state.screen === 'waiting_for_voiceover' || state.screen === 'waiting_for_season' || state.screen === 'waiting_for_episode') {
    await sendMessage(chatId, 'Будь ласка, скористайтеся кнопками для вибору.', { reply_markup: backHomeKeyboard() }, env);
    return;
  }

  if (state.screen === 'waiting_for_makima') {
    await handleMakimaMessage(chatId, memoryKey, text, firstName, env);
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
  await handleMakimaMessage(chatId, memoryKey, text, firstName, env);
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

async function handleMakimaMessage(chatId, memoryKey, userMessage, firstName, env) {
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

    const responseText = await callMakimaAI(userMessage, fullHistory, profile, summary, firstName, env);

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

async function callMakimaAI(prompt, fullHistory, profile, summary, firstName, env) {
  const apiKey = String(env.GROQ_API_KEY || '').trim();
  if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
  const model = String(env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();

  const recentHistory = fullHistory.slice(-MAX_CONTEXT_MESSAGES_FOR_API);
  const profileContext = buildProfileContext(profile);

  let memoryBlock = '';
  if (firstName) {
    memoryBlock += `Ім'я користувача в Telegram: ${firstName}\n`;
  }
  if (profileContext) {
    memoryBlock += `ІНФОРМАЦІЯ ПРО КОРИСТУВАЧА:\n${profileContext}\n\n`;
  }
  if (summary) {
    memoryBlock += `КОРОТКИЙ ПІДСУМОК РАНІШОЇ РОЗМОВИ:\n${summary}\n\n`;
  }

  const systemPrompt = memoryBlock
    ? `${MAKIMA_SYSTEM_PROMPT}\n\n=== ПАМ'ЯТЬ ПРО КОРИСТУВАЧА ===\n${memoryBlock}=== КІНЕЦЬ ПАМ'ЯТІ ===\n\nПРАВИЛА ВИКОРИСТАННЯ ЦІЄЇ ІНФОРМАЦІЇ:\nВикористовуй її тільки коли вона реально покращує відповідь і доречна за темою.\nНе згадуй випадкові факти, якщо вони не стосуються поточного питання.\nНе кажи "я пам'ятаю" або подібних фраз.\nГовори природно, ніби добре знайома людина.`
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

    const parsed = extractJsonObject(rawText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (error) {
    console.error('[memory] extract request failed:', safeError(error));
    return {};
  }
}

// Надійно витягує перший валідний JSON-об'єкт {...} з тексту моделі,
// навіть якщо модель додала зайвий текст до/після нього або обгорнула у ```.
function extractJsonObject(rawText) {
  const text = String(rawText || '');

  // Спочатку прибираємо можливі markdown-огорожі ```json ... ```
  const withoutFences = text.replace(/```(?:json)?/gi, '').trim();

  // Пробуємо напряму, якщо текст вже чистий JSON
  try {
    const direct = JSON.parse(withoutFences);
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct;
  } catch {
    // ігноруємо, шукаємо підрядок нижче
  }

  // Шукаємо перший символ "{" і відповідний йому закриваючий "}" з урахуванням вкладеності
  const start = withoutFences.indexOf('{');
  if (start === -1) return {};

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < withoutFences.length; i++) {
    const char = withoutFences[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        const candidate = withoutFences.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
          return {};
        } catch (error) {
          console.error('[memory] extract JSON parse failed:', safeError(error));
          return {};
        }
      }
    }
  }

  return {};
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

// ============================================================
//  ОСНОВНІ ФУНКЦІЇ БОТА (каталог, пошук, деталі)
// ============================================================

function getState(chatId) {
  let state = userStates.get(chatId);
  if (!state) {
    state = {
      screen: 'home',
      searchQuery: '',
      searchPage: 1,
      popularResults: [],
      searchResults: [],
      previous: null,
      // Нові поля для вибору в телеграмі
      anime: null,
      animeUrl: null,
      chosenDub: null,
      chosenSeason: null
    };
    userStates.set(chatId, state);
  }
  return state;
}

// --- Додатковий парсинг для сезонів/озвучок/серій ---
async function fetchAnimeFullDetails(animeUrl) {
  const html = await fetchSource(animeUrl);
  const iframeUrls = extractIframeUrls(html);
  if (!iframeUrls.length) return { seasons: {} };

  const allSources = [];
  for (const url of iframeUrls) {
    try {
      const playerHtml = await fetchSource(url);
      const sources = extractSourcesFromText(playerHtml, 'Плеєр');
      allSources.push(...sources);
    } catch (e) {
      console.warn('Не вдалося завантажити плеєр:', url, e.message);
    }
  }

  const seasons = {};
  for (const s of allSources) {
    const season = s.season || '1';
    const dub = s.dub || 'UA';
    if (!seasons[season]) seasons[season] = {};
    if (!seasons[season][dub]) seasons[season][dub] = [];
    seasons[season][dub].push({ episode: s.episode, file: s.file });
  }
  for (const s in seasons) {
    for (const d in seasons[s]) {
      seasons[s][d].sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
    }
  }
  return { seasons };
}

function extractIframeUrls(html) {
  const urls = [];
  const regex = /<iframe[^>]+(?:src|data-src)=["']([^"']*(?:ashdi|vidmoly|player)[^"']*)["']/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let url = match[1];
    if (url.startsWith('//')) url = 'https:' + url;
    if (!url.startsWith('http')) url = ANIMEUA_BASE + url;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function extractSourcesFromText(text, provider) {
  const sources = [];
  let jsonMatch = null;
  let m = text.match(/Playerjs\s*\(\s*\{[\s\S]*?file\s*:\s*'(\[[\s\S]*?\])'\s*[,\n]/);
  if (m) jsonMatch = m[1];
  if (!jsonMatch) {
    m = text.match(/file\s*:\s*['"](\[[\s\S]+?\])['"]/i);
    if (m) jsonMatch = m[1];
  }
  if (!jsonMatch) {
    m = text.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);
    if (m) jsonMatch = m[1];
  }
  if (jsonMatch) {
    try {
      let raw = jsonMatch.trim();
      if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1);
      if (raw.startsWith('{') && raw.endsWith('}')) raw = `[${raw}]`;
      const arr = JSON.parse(raw);
      const walk = (items, dub, season) => {
        dub = dub || '';
        season = season || '1';
        for (const item of items) {
          if (item.folder || item.playlist) {
            let nd = dub, ns = season;
            const ft = item.title || '';
            const sm = ft.match(/[Сс]езон\s*(\d+)/);
            if (sm) { ns = sm[1]; nd = ft.replace(/[Сс]езон\s*\d+/g, '').replace(/\//g, '').trim() || dub; }
            else if (ft) nd = ft;
            walk(item.folder || item.playlist, nd, ns);
          } else if (item.file) {
            const epT = item.title || 'Серія';
            let fd = dub || provider || 'UA', fs = season;
            const esm = epT.match(/[Сс]езон\s*(\d+)/);
            if (esm) fs = esm[1];
            const epm = epT.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Еe]п\.?\s*(\d+)/);
            sources.push({
              label: epT,
              file: item.file,
              provider: provider,
              dub: fd.trim(),
              season: fs,
              episode: epm ? (epm[1] || epm[2] || epm[3]) : '1'
            });
          }
        }
      };
      if (Array.isArray(arr)) walk(arr);
      else if (arr.file) sources.push({ label: arr.title || 'Озвучка', file: arr.file, provider: provider, dub: provider || 'UA', season: '1', episode: '1' });
    } catch (e) {
      console.warn('JSON parse error in extractSourcesFromText:', e);
    }
  }
  if (sources.length === 0) {
    const urlMatches = [...text.matchAll(/https?:\/\/[^\s'"<>]+\.(?:m3u8|mp4)(?:\?[^\s'"<>]*)?/gi)];
    urlMatches.forEach((match, idx) => {
      const file = match[0].replace(/\\\//g, '/');
      if (!sources.some(s => s.file === file)) {
        sources.push({ label: `Потік ${idx+1}`, file, provider, dub: provider || 'UA', season: '1', episode: String(idx+1) });
      }
    });
  }
  const seen = new Set();
  return sources.filter(s => {
    const key = `${s.season}_${s.dub}_${s.episode}_${s.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --- Функції для вибору озвучки/сезону/серії ---
function getUniqueDubs(anime) {
  if (!anime || !anime.seasons) return [];
  const dubsSet = new Set();
  for (const season in anime.seasons) {
    for (const dub in anime.seasons[season]) {
      dubsSet.add(dub);
    }
  }
  return Array.from(dubsSet).sort();
}

function getSeasons(anime) {
  if (!anime || !anime.seasons) return [];
  return Object.keys(anime.seasons).sort((a, b) => parseInt(a) - parseInt(b));
}

function getEpisodes(anime, season, dub) {
  if (!anime || !anime.seasons || !anime.seasons[season] || !anime.seasons[season][dub]) return [];
  return anime.seasons[season][dub];
}

async function showVoiceoverSelection(chatId, messageId, env) {
  const state = getState(chatId);
  const anime = state.anime;
  if (!anime) {
    await replaceMessage(chatId, messageId, 'Помилка: аніме не знайдено.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }
  if (!anime.seasons) {
    try {
      const full = await fetchAnimeFullDetails(state.animeUrl);
      anime.seasons = full.seasons;
      state.anime = anime;
    } catch (e) {
      await replaceMessage(chatId, messageId, 'Не вдалося завантажити список озвучок. Спробуйте пізніше.', false, { reply_markup: mainKeyboard() }, env);
      return;
    }
  }

  const dubs = getUniqueDubs(anime);
  if (dubs.length === 0) {
    await replaceMessage(chatId, messageId, 'Немає доступних озвучок.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }

  const keyboard = {
    inline_keyboard: dubs.map(dub => [{ text: dub, callback_data: `vo:${dub}` }])
  };
  keyboard.inline_keyboard.push([{ text: 'Назад', callback_data: 'back_to_details' }]);
  await replaceMessage(chatId, messageId, `Оберіть озвучку для «${anime.title}»:`, false, { reply_markup: keyboard }, env);
  state.screen = 'waiting_for_voiceover';
}

async function showSeasonSelection(chatId, messageId, env) {
  const state = getState(chatId);
  const anime = state.anime;
  const dub = state.chosenDub;
  if (!anime || !dub) {
    await replaceMessage(chatId, messageId, 'Помилка: дані відсутні.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }
  const seasons = getSeasons(anime);
  if (seasons.length === 0) {
    await replaceMessage(chatId, messageId, 'Немає доступних сезонів.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }
  const keyboard = {
    inline_keyboard: seasons.map(season => [{ text: `Сезон ${season}`, callback_data: `season:${season}` }])
  };
  keyboard.inline_keyboard.push([{ text: 'Назад', callback_data: 'back_to_voiceover' }]);
  await replaceMessage(chatId, messageId, `Обрано озвучку: ${dub}. Оберіть сезон:`, false, { reply_markup: keyboard }, env);
  state.screen = 'waiting_for_season';
}

async function showEpisodeSelection(chatId, messageId, env) {
  const state = getState(chatId);
  const anime = state.anime;
  const dub = state.chosenDub;
  const season = state.chosenSeason;
  if (!anime || !dub || !season) {
    await replaceMessage(chatId, messageId, 'Помилка: дані відсутні.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }
  const episodes = getEpisodes(anime, season, dub);
  if (episodes.length === 0) {
    await replaceMessage(chatId, messageId, 'Немає доступних серій.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }
  const rows = [];
  for (let i = 0; i < episodes.length; i += 5) {
    const row = episodes.slice(i, i + 5).map(ep => ({
      text: `Серія ${ep.episode}`,
      callback_data: `ep:${ep.episode}`
    }));
    rows.push(row);
  }
  rows.push([{ text: 'Назад', callback_data: 'back_to_season' }]);
  await replaceMessage(chatId, messageId, `Обрано: ${dub}, сезон ${season}. Виберіть серію:`, false, { reply_markup: { inline_keyboard: rows } }, env);
  state.screen = 'waiting_for_episode';
}

async function sendVideoEpisode(chatId, messageId, episode, env) {
  const state = getState(chatId);
  const anime = state.anime;
  const dub = state.chosenDub;
  const season = state.chosenSeason;
  const fileUrl = episode.file;
  const epNum = episode.episode;
  if (!fileUrl) {
    await replaceMessage(chatId, messageId, 'Помилка: відеофайл не знайдено.', false, { reply_markup: mainKeyboard() }, env);
    return;
  }

  const isMp4 = /\.mp4(\?|$)/i.test(fileUrl);
  const caption = `${anime.title}\nОзвучка: ${dub}\nСезон: ${season}\nСерія: ${epNum}`;

  try {
    if (isMp4) {
      await sendVideo(chatId, fileUrl, caption, { reply_markup: mainKeyboard() }, env);
    } else {
      await sendDocument(chatId, fileUrl, caption, { reply_markup: mainKeyboard() }, env);
    }
    // Скидаємо стан
    state.screen = 'home';
    state.anime = null;
    state.chosenDub = null;
    state.chosenSeason = null;
  } catch (error) {
    console.error('[sendVideoEpisode] failed:', safeError(error));
    await replaceMessage(chatId, messageId, 'Не вдалося надіслати відео. Спробуйте скористатися кнопкою «Дивитись на сайті».', false, { reply_markup: mainKeyboard() }, env);
  }
}

async function sendVideo(chatId, videoUrl, caption, extra, env) {
  return telegram('sendVideo', { chat_id: chatId, video: videoUrl, caption, parse_mode: 'HTML', ...extra }, env);
}

async function sendDocument(chatId, documentUrl, caption, extra, env) {
  return telegram('sendDocument', { chat_id: chatId, document: documentUrl, caption, parse_mode: 'HTML', ...extra }, env);
}

// --- Основний обробник callback-запитів ---
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
    // --- НОВІ ОБРОБНИКИ ДЛЯ ПЕРЕГЛЯДУ В ТЕЛЕГРАМІ ---
    if (data === 'watch_telegram') {
      if (!state.anime) {
        await replaceMessage(chatId, messageId, 'Помилка: дані аніме відсутні. Поверніться до списку та виберіть аніме знову.', false, { reply_markup: mainKeyboard() }, env);
        return;
      }
      await showVoiceoverSelection(chatId, messageId, env);
      return;
    }

    if (data.startsWith('vo:')) {
      const dub = data.slice(3);
      state.chosenDub = dub;
      await showSeasonSelection(chatId, messageId, env);
      return;
    }

    if (data.startsWith('season:')) {
      const season = data.slice(7);
      state.chosenSeason = season;
      await showEpisodeSelection(chatId, messageId, env);
      return;
    }

    if (data.startsWith('ep:')) {
      const episodeNum = data.slice(3);
      const episodes = getEpisodes(state.anime, state.chosenSeason, state.chosenDub);
      const ep = episodes.find(e => e.episode === episodeNum);
      if (!ep) {
        await replaceMessage(chatId, messageId, 'Серію не знайдено.', false, { reply_markup: mainKeyboard() }, env);
        return;
      }
      await sendVideoEpisode(chatId, messageId, ep, env);
      return;
    }

    if (data === 'back_to_details') {
      state.screen = 'home';
      await renderDetails(chatId, messageId, state.animeUrl, env);
      return;
    }
    if (data === 'back_to_voiceover') {
      await showVoiceoverSelection(chatId, messageId, env);
      return;
    }
    if (data === 'back_to_season') {
      await showSeasonSelection(chatId, messageId, env);
      return;
    }

    // --- ІСНУЮЧІ ОБРОБНИКИ ---
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

// --- Рендеринг популярних, пошуку, випадкових, деталей ---
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
    const randomPage = await fetchSource(`${ANIMEUA_BASE}/index.php?do=rand`);
    const randomUrl = absoluteAnimeUrl(firstMatch(randomPage, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || firstMatch(randomPage, /property=["']og:url["'][^>]*content=["']([^"']+)["']/i));
    if (!randomUrl) throw new Error('RANDOM_INVALID');
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

    // Зберігаємо базову інформацію в стані
    state.anime = details;
    state.animeUrl = url;

    const buttons = [];
    if (state.previous?.kind === 'random') {
      buttons.push({ text: 'Випадкове', callback_data: 'random' });
    }
    buttons.push({ text: 'Головна', callback_data: 'home' });

    // Формуємо клавіатуру з двома кнопками перегляду
    let keyboard;
    const watchSiteBtn = watchUrl ? { text: 'Дивитись на сайті', url: watchUrl } : null;
    const watchTelegramBtn = { text: 'Дивитись в телеграмі', callback_data: 'watch_telegram' };

    if (watchSiteBtn) {
      keyboard = {
        inline_keyboard: [
          [watchSiteBtn, watchTelegramBtn],
          buttons
        ]
      };
    } else {
      keyboard = {
        inline_keyboard: [
          [watchTelegramBtn],
          buttons
        ]
      };
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

// --- Клавіатури ---
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

// --- Функції для роботи з джерелами даних ---
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
  const popular = await fetchPopularAnime();
  if (popular.length) return popular;
  if (catalogCache && Date.now() - catalogCacheAt < CACHE_TTL_MS) return catalogCache;
  catalogCache = dedupe(await fetchCatalogPage(1));
  catalogCacheAt = Date.now();
  return catalogCache;
}

async function searchAnime(query, page) {
  const url = `${ANIMEUA_BASE}/index.php?do=search&subaction=search&story=${encodeURIComponent(normalizeQuery(query))}&page=${page}`;
  const html = await fetchSource(url);
  const items = dedupe(parseCards(html));
  return { items: paginate(items, 1), total: items.length || (items.length ? items.length : 0) };
}

async function fetchAnimeDetails(url) {
  const safeUrl = validateAnimeUrl(url);
  const html = await fetchSource(safeUrl);
  return parseDetails(html, safeUrl);
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
  if (details.year) text += `\nРік: ${escapeHtml(details.year)}`;
  if (details.episodes) text += `\nЕпізоди: ${escapeHtml(details.episodes)}`;
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

// --- Допоміжні функції для оновлення/відправки повідомлень ---
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

// --- Основний виклик Telegram API ---
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
