import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker, {
  getContentType,
  contentTypeLabel,
  validateContentUrl,
  extractContentId,
  isUnsafeRouletteText,
  extractRelayMedia,
  isBotOwner,
  formatBotUsageReport,
  scheduleWebAppKeyboard,
  liveWebAppKeyboard,
  vakdabWatchUrl,
  getAIProviderConfig,
  callCompatibleChat,
  getLunaDirectReply,
  getLunaTemporaryReply,
  isMemoryRequest,
  isWarRequest,
  formatLunaMemory,
  buildRecentHistory,
  repairMojibake,
  aboutUsText,
  liveStageDefinitions
} from '../../backend/telegram/worker.js';

test('about us help explains VakDab usage and links back to the site', () => {
  const text = aboutUsText();
  assert.match(text, /Про нас — VakDab/);
  assert.match(text, /Як користуватися ботом/);
  assert.match(text, /Популярні/);
  assert.match(text, /Випадкове/);
  assert.match(text, /Пошук/);
  assert.match(text, /Чат-Рулетка/);
  assert.match(text, /Запитати Луну/);
  assert.match(text, /<a href="https:\/\/[^\"]+">https:\/\/[^\"]+<\/a>/);
});

test('main menu contains the about button and removed features stay absent', () => {
  const source = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(source, /text: 'Про нас', callback_data: 'about'/);
  assert.doesNotMatch(source, /text: 'Shazam'/);
  assert.doesNotMatch(source, /text: 'Аніме Live'/);
});

test('Groq configuration takes priority when both providers are configured', () => {
  const config = getAIProviderConfig({
    GROQ_API_KEY: 'test-groq-key',
    OPENAI_API_KEY: 'test-openai-key',
    BAZAARLINK_API_KEY: 'test-bazaarlink-key'
  });
  assert.equal(config.provider, 'Groq');
  assert.equal(config.baseUrl, 'https://api.groq.com/openai/v1');
  assert.equal(config.model, 'qwen/qwen3.6-27b');
  assert.equal(config.apiKey, 'test-groq-key');
});

test('Luna persona is a concise all-topic companion rather than a service assistant', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /цифрова компанйонка VakDab/);
  assert.match(workerSource, /Спочатку відповідай прямо на запитання/);
  assert.match(workerSource, /просте питання — 1–3 речення/);
  assert.match(workerSource, /Не погоджуйся автоматично/);
  assert.match(workerSource, /Не розбирай фразу по словах/);
  assert.match(workerSource, /не вигадуй «аніме-тропи»/s);
  assert.match(workerSource, /не видаєш себе за справжню людину/);
  assert.match(workerSource, /\/memory/);
  assert.match(workerSource, /Відповідай на запитання не лише про аніме/);
  assert.match(workerSource, /Не закінчуй кожну відповідь штучним/);
  assert.match(workerSource, /Це продовження вже наявного чату/);
  assert.match(workerSource, /Не вітайся повторно/);
  assert.match(workerSource, /не службова помічниця/);
  assert.doesNotMatch(workerSource, /Кожен користувач повинен відчувати.*подругою-помічницею/s);
});

test('Luna direct replies handle casual companion greetings without assistant boilerplate', () => {
  assert.equal(getLunaDirectReply('Тобою 😊🌸'), 'Та просто зі мною 😊 Можемо побалакати про що завгодно. Як твій вечір?');
  assert.equal(getLunaDirectReply('Чим зможеш допомогти'), 'Та багато чим, але без офіціозу 🙂 Кажи, що в тебе на думці.');
  assert.equal(getLunaDirectReply('Хто ти'), 'Я Луна — AI-співрозмовниця VakDab. Можу поговорити нормально, без офіціозу, і не лише про аніме 🙂');
  assert.equal(getLunaDirectReply('А я страшний?'), 'Та ні 🙂 Не вигадуй. Ти просто питаєш напряму.');
  assert.equal(getLunaDirectReply('Тююююююююю'), 'Тююю 😄');
  assert.equal(getLunaDirectReply('Що таке аніме?'), '');
});

test('Luna accepts broad adult topics while deterministically declining war topics', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /стосунки, кохання, флірт, секс, тіло/);
  assert.match(workerSource, /Не моралізуй і не відштовхуй користувача/);
  assert.equal(isWarRequest('Розкажи про війну'), true);
  assert.equal(isWarRequest('Що подивитись сьогодні?'), false);
  assert.equal(getLunaDirectReply('Розкажи про війну'), 'Про війну я не говорю. Давай краще про будь-що інше.');
});

test('Luna commands clear visible chat without using the memory wipe commands', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /if \(\/\^\\\/clear/);
  assert.match(workerSource, /clearVisibleConversation\(chatId, memoryKey, env\)/);
  assert.match(workerSource, /await clearVisibleConversation\(chatId, memoryKey, env\)/);
  assert.match(workerSource, /Один KV-ключ на повідомлення/);
  assert.doesNotMatch(workerSource, /Видимі повідомлення прибрані/);
  assert.doesNotMatch(workerSource, /Пам’ять про тебе залишилася/);
  assert.match(workerSource, /if \(\/\^\\\/luna/);
  assert.match(workerSource, /Луна активна/);
  assert.match(workerSource, /\{ command: 'start'/);
  assert.match(workerSource, /\{ command: 'next'/);
  assert.match(workerSource, /\{ command: 'report'/);
  assert.match(workerSource, /await sendTrackedMessage\(chatId, memoryKey, escapeHtml\(responseText\), \{\}, env\)/);
  assert.doesNotMatch(workerSource, /sendTrackedMessage\(chatId, memoryKey, escapeHtml\(responseText\), \{ reply_markup:/);
});

test('Luna exposes transparent memory controls without an AI round trip', () => {
  assert.equal(isMemoryRequest('Що ти про мене пам’ятаєш?'), true);
  assert.equal(isMemoryRequest('покажи мою пам’ять'), true);
  assert.equal(isMemoryRequest('Що ти пам’ятаєш про аніме?'), false);
  assert.match(formatLunaMemory({ name: 'Олег', hobbies: ['музика'] }), /Олег/);
  assert.match(formatLunaMemory({}), /нічого важливого/);
});

test('Luna context keeps recent valid messages and clips oversized entries', () => {
  const history = [
    { role: 'system', content: 'must not be forwarded' },
    { role: 'user', content: 'a'.repeat(5000) },
    { role: 'assistant', content: 'Коротка відповідь' }
  ];
  const recent = buildRecentHistory(history);
  assert.deepEqual(recent.map(message => message.role), ['user', 'assistant']);
  assert.ok(recent[0].content.length <= 3200);
});

test('BazaarLink configuration is used when OpenAI is absent', () => {
  const config = getAIProviderConfig({ BAZAARLINK_API_KEY: 'test-bazaarlink-key' });
  assert.equal(config.provider, 'BazaarLink');
  assert.equal(config.baseUrl, 'https://api.bazaarlink.ai/v1');
  assert.equal(config.model, 'qwen/qwen3.7-flash:free');
  assert.equal(config.apiKey, 'test-bazaarlink-key');
});

test('legacy Groq configuration remains a fallback when BazaarLink is absent', () => {
  const config = getAIProviderConfig({ GROQ_API_KEY: 'test-groq-key', GROQ_MODEL: 'test-model' });
  assert.equal(config.provider, 'Groq');
  assert.equal(config.baseUrl, 'https://api.groq.com/openai/v1');
  assert.equal(config.model, 'test-model');
});

test('missing AI credentials fails with a clear Groq configuration error', () => {
  assert.throws(() => getAIProviderConfig({}), /GROQ_API_KEY is not configured/);
});

test('repairMojibake restores Ukrainian UTF-8 text and preserves valid text', () => {
  const original = 'Тест: українською';
  const mojibake = String.fromCharCode(...new TextEncoder().encode(original));
  assert.equal(repairMojibake(mojibake), original);
  assert.equal(repairMojibake('Привіт, Луна!'), 'Привіт, Луна!');
  assert.equal(repairMojibake('Hello, world!'), 'Hello, world!');
});

test('Luna gives a conversational temporary reply when the provider is unavailable', () => {
  assert.match(getLunaTemporaryReply('Привіт'), /підвисла/);
  assert.match(getLunaTemporaryReply('Ахахах'), /настрій зрозуміла/);
  assert.equal(getLunaTemporaryReply('Розкажи про війну'), 'Про війну я не говорю. Давай краще про будь-що інше.');
});

test('Compatible chat retries transient provider failures before succeeding', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls < 2) return new Response('busy', { status: 503 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Повернулась 🙂' } }] }), { status: 200 });
  };

  try {
    const result = await callCompatibleChat([{ role: 'user', content: 'Продовжимо' }], { GROQ_API_KEY: 'test-key' }, { maxTokens: 64 });
    assert.equal(result, 'Повернулась 🙂');
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(calls, 2);
});

test('Groq Qwen requests use completion tokens and disable reasoning output', async () => {
  const originalFetch = globalThis.fetch;
  let requestPayload;
  globalThis.fetch = async (_url, init) => {
    requestPayload = JSON.parse(init.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Привіт, я Луна!' } }] }), { status: 200 });
  };

  try {
    const result = await callCompatibleChat([{ role: 'user', content: 'Привіт' }], { GROQ_API_KEY: 'test-key' }, { maxTokens: 256 });
    assert.equal(result, 'Привіт, я Луна!');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestPayload.model, 'qwen/qwen3.6-27b');
  assert.equal(requestPayload.max_completion_tokens, 256);
  assert.equal(requestPayload.reasoning_effort, 'none');
  assert.equal(Object.hasOwn(requestPayload, 'max_tokens'), false);
});

test('BazaarLink retries through auto:free when the configured model fails', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(init.body);
    requests.push(payload);
    if (requests.length === 1) {
      return new Response(JSON.stringify({ error: { message: 'model unavailable' } }), { status: 400 });
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Привіт, я Луна!' } }] }), { status: 200 });
  };

  try {
    const result = await callCompatibleChat([{ role: 'user', content: 'Привіт' }], {
      BAZAARLINK_API_KEY: 'test-key',
      BAZAARLINK_MODEL: 'qwen/qwen3.7-flash:free'
    });
    assert.equal(result, 'Привіт, я Луна!');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].models, ['qwen/qwen3.7-flash:free', 'auto:free']);
  assert.equal(requests[1].model, 'auto:free');
  assert.equal(Object.hasOwn(requests[1], 'models'), false);
});

test('content type descriptor supports anime, manga and novel with anime fallback', () => {
  assert.equal(getContentType('anime').key, 'anime');
  assert.equal(getContentType('manga').endpoint, 'manga');
  assert.equal(getContentType('novel').label, 'Ранобе');
  assert.equal(getContentType('unknown').key, 'anime');
  assert.equal(contentTypeLabel('manga'), 'Манґа');
});

test('content URL validation only accepts the matching Hikka endpoint', () => {
  assert.equal(validateContentUrl('https://api.hikka.io/anime/naruto-123', 'anime'), 'https://api.hikka.io/anime/naruto-123');
  assert.equal(validateContentUrl('https://api.hikka.io/manga/berserk-fb9fbd', 'manga'), 'https://api.hikka.io/manga/berserk-fb9fbd');
  assert.equal(validateContentUrl('https://api.hikka.io/novel/guimi-zhi-zhu-7059fd', 'novel'), 'https://api.hikka.io/novel/guimi-zhi-zhu-7059fd');
  assert.equal(validateContentUrl('https://api.hikka.io/anime/naruto-123', 'manga'), '');
  assert.equal(validateContentUrl('https://evil.example/anime/naruto-123', 'anime'), '');
  assert.equal(validateContentUrl('javascript:alert(1)', 'anime'), '');
});

test('content id extraction works for the selected type and newsid deeplink', () => {
  assert.equal(extractContentId('https://api.hikka.io/manga/berserk-fb9fbd', 'manga'), 'berserk-fb9fbd');
  assert.equal(extractContentId('https://api.hikka.io/novel/guimi-zhi-zhu-7059fd', 'novel'), 'guimi-zhi-zhu-7059fd');
  assert.equal(extractContentId('https://api.hikka.io/anime/ignored?newsid=one-piece-123', 'anime'), 'one-piece-123');
  assert.equal(extractContentId('https://api.hikka.io/manga/berserk-fb9fbd', 'novel'), '');
});

test('roulette media extractor maps Telegram message variants to correct send methods', () => {
  assert.deepEqual(extractRelayMedia({ sticker: { file_id: 'sticker-file' } }), { method: 'sendSticker', field: 'sticker', fileId: 'sticker-file' });
  assert.deepEqual(extractRelayMedia({ animation: { file_id: 'gif-file' } }), { method: 'sendAnimation', field: 'animation', fileId: 'gif-file' });
  assert.deepEqual(extractRelayMedia({ photo: [{ file_id: 'small' }, { file_id: 'large' }] }), { method: 'sendPhoto', field: 'photo', fileId: 'large' });
  assert.deepEqual(extractRelayMedia({ video: { file_id: 'video-file' } }), { method: 'sendVideo', field: 'video', fileId: 'video-file' });
  assert.deepEqual(extractRelayMedia({ video_note: { file_id: 'round-video-file' } }), { method: 'sendVideoNote', field: 'video_note', fileId: 'round-video-file' });
  assert.deepEqual(extractRelayMedia({ audio: { file_id: 'audio-file' } }), { method: 'sendAudio', field: 'audio', fileId: 'audio-file' });
  assert.deepEqual(extractRelayMedia({ voice: { file_id: 'voice-file' } }), { method: 'sendVoice', field: 'voice', fileId: 'voice-file' });
  assert.deepEqual(extractRelayMedia({ document: { file_id: 'document-file' } }), { method: 'sendDocument', field: 'document', fileId: 'document-file' });
  assert.equal(extractRelayMedia({ location: { latitude: 1, longitude: 2 } }), null);
});

test('roulette moderation keeps permanent users, report reasons and three-day ban rules', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /CREATE TABLE IF NOT EXISTS bot_users/);
  assert.match(workerSource, /CREATE TABLE IF NOT EXISTS reports/);
  assert.match(workerSource, /CREATE TABLE IF NOT EXISTS roulette_bans/);
  assert.match(workerSource, /REPORT_REASONS/);
  assert.match(workerSource, /MAX_ROULETTE_REPORTS = 18/);
  assert.match(workerSource, /ROULETTE_BAN_MS = 3 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(workerSource, /reportReasonKeyboard/);
  assert.match(workerSource, /data\.startsWith\('roulette:report:'\)/);
  assert.match(workerSource, /reportCount >= MAX_ROULETTE_REPORTS/);
  assert.match(workerSource, /bannedUntil = now \+ ROULETTE_BAN_MS/);
  assert.doesNotMatch(workerSource, /DELETE FROM reports WHERE created_at/);
});

test('roulette safety filter blocks contact vectors but allows ordinary chat', () => {
  assert.equal(isUnsafeRouletteText('Привіт, як справи?'), false);
  assert.equal(isUnsafeRouletteText('Напиши мені в https://example.com'), true);
  assert.equal(isUnsafeRouletteText('Мій контакт @some_user'), true);
  assert.equal(isUnsafeRouletteText('Мій номер +380 67 123 45 67'), true);
  assert.equal(isUnsafeRouletteText('доксинг'), true);
});

test('private statistics access accepts only the configured owner username', () => {
  assert.equal(isBotOwner({ username: 'vaditx' }), true);
  assert.equal(isBotOwner({ username: 'VADITX' }), true);
  assert.equal(isBotOwner({ username: 'another_user' }), false);
  assert.equal(isBotOwner({}), false);
});

test('private statistics report presents users, reports and bans without user IDs', () => {
  const report = formatBotUsageReport({
    ok: true,
    total: 1,
    users: [{ username: 'example_user', first_name: 'Ім’я', last_name: 'Прізвище', last_seen_at: 1766311200000, user_id: '123456789', interaction_count: 4 }],
    reportedUsers: [{ username: 'bad_user', report_count: 18, last_reason: 'spam', user_id: '987654321' }],
    bans: [{ user_id: '987654321', banned_until: Date.now() + 86400000, report_count: 18, last_reason: 'spam' }]
  });
  assert.match(report, /Користувачів у базі: <b>1<\/b>/);
  assert.match(report, /@example_user/);
  assert.match(report, /@bad_user/);
  assert.match(report, /18\/18/);
  assert.match(report, /Спам або реклама/);
  assert.doesNotMatch(report, /123456789/);
  assert.match(report, /ID 987654321/);
});

test('production Worker declares the persistent Luna memory binding', () => {
  const wranglerSource = readFileSync(new URL('../../backend/telegram/wrangler.toml', import.meta.url), 'utf8');
  assert.match(wranglerSource, /binding = "MAKIMA_MEMORY"/);
  assert.match(wranglerSource, /id = "e895b4efdc7941c5915ca6af83879f96"/);
});

test('schedule fallback keyboard opens the dedicated Mini App page', () => {
  const button = scheduleWebAppKeyboard().inline_keyboard[0][0];
  assert.equal(button.text, 'Відкрити розклад');
  assert.equal(button.web_app.url, 'https://vakdab.github.io/Vakdab/app/schedule.html?v=mono-20260823-1540');
});

test('live keyboard opens the dedicated Telegram Web App page', () => {
  const button = liveWebAppKeyboard().inline_keyboard[0][0];
  assert.equal(button.text, 'Відкрити Аніме Ефір');
  assert.equal(button.web_app.url, 'https://vakdab.github.io/Vakdab/app/live.html?v=mono-20260827-live-6');
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  const liveAppSource = readFileSync(new URL('../../app/live.html', import.meta.url), 'utf8');
  assert.match(workerSource, /\[\{ text: 'Аніме Ефір', web_app: \{ url: LIVE_WEB_APP_URL \} \}\]/);
  assert.doesNotMatch(workerSource, /text: 'Live-опитування'/);
  assert.match(liveAppSource, /telegram-web-app\.js/);
  assert.match(liveAppSource, /https:\/\/vakdab\.animegran8\.workers\.dev\/api\/live/);
  assert.match(liveAppSource, /id="liveVideo" autoplay muted playsinline/);
  assert.match(liveAppSource, /const reuseVideo = Boolean\(previousVideo && source && currentSource === source\)/);
  assert.match(liveAppSource, /theme-color" content="#ffffff"/);
  assert.match(liveAppSource, /--bg:#ffffff/);
  assert.match(liveAppSource, /color:var\(--text\)/);
  assert.match(liveAppSource, /color:#fff; background:rgba\(8,8,10,.82\)/);
  assert.match(liveAppSource, /\.caption strong,\.caption span \{ display:block; color:#fff; \}/);
  assert.doesNotMatch(liveAppSource, /<p><b>VakDab:<\/b>/);
  assert.doesNotMatch(liveAppSource, /<p><b>Луна:<\/b>/);
  assert.doesNotMatch(liveAppSource, /<p><b>Система:<\/b>/);
  assert.match(liveAppSource, /setHeaderColor\?\.\('\#ffffff'\)/);
  assert.match(liveAppSource, /setBackgroundColor\?\.\('\#ffffff'\)/);
  assert.doesNotMatch(liveAppSource, /app\.innerHTML = `\\<div class="topbar"/);
  assert.doesNotMatch(liveAppSource, /app\.innerHTML = `[^`]*class="info"/);
  assert.match(liveAppSource, /app\.innerHTML = `\<div class="stage"/);
  assert.match(liveAppSource, /<aside class="chat"/);
  assert.match(liveAppSource, /min-width:700px.*max-height:600px.*\.chat \{ display:none; \}/s);
  assert.match(liveAppSource, /max-width:699px.*\.chat \{ display:block; \}/s);
  assert.doesNotMatch(liveAppSource, /app\.innerHTML = `[^`]*class="wide"/);
  assert.doesNotMatch(liveAppSource, /<video[^>]+controls/);
});

test('VakDab links support anime, manga and novels', () => {
  assert.equal(vakdabWatchUrl('test-anime', 'anime'), 'https://vakdab.github.io/Vakdab/#anime/test-anime');
  assert.equal(vakdabWatchUrl('berserk-fb9fbd', 'manga'), 'https://vakdab.github.io/Vakdab/app/content.html?type=manga&slug=berserk-fb9fbd');
  assert.equal(vakdabWatchUrl('test-novel', 'novel'), 'https://vakdab.github.io/Vakdab/app/content.html?type=novel&slug=test-novel');
  assert.equal(vakdabWatchUrl('bad slug', 'manga'), '');
});

test('manga and novel details use VakDab reader routes and a concise bot button', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  const contentPage = readFileSync(new URL('../../app/content.html', import.meta.url), 'utf8');

  assert.match(workerSource, /\{ text: 'VakDab', url: watchUrl \}/);
  assert.match(contentPage, /resolveHoneyReaderUrl/);
  assert.match(contentPage, /resolveRanobeReader/);
  assert.match(contentPage, /https:\/\/vakdab\.github\.io\/Vakdab\/#\$\{type\}\?url=/);
  assert.match(contentPage, /type === 'novel' \? `&poster=\$\{encodeURIComponent\(item\.image \|\| ''\)\}` : ''/);
  assert.doesNotMatch(contentPage, /<a class="back"/);
  assert.doesNotMatch(contentPage, /href="\$\{escape\(externalReadUrl\)\}"/);
});


test('Luna routes Telegram photos through a multimodal vision request', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /if \(message\.photo\?\.length\)/);
  assert.match(workerSource, /handleLunaPhotoMessage\(chatId, memoryKey, message, env\)/);
  assert.match(workerSource, /telegram\('getFile'/);
  assert.match(workerSource, /type: 'image_url'/);
  assert.match(workerSource, /data:image\/jpeg;base64/);
  assert.match(workerSource, /const caption = String\(message\.caption \|\| ''\)/);
});

test('start flow gates the main menu behind @vakluna subscription', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /REQUIRED_CHANNEL_USERNAME = '@vakluna'/);
  assert.match(workerSource, /REQUIRED_CHANNEL_URL = 'https:\/\/t\.me\/vakluna'/);
  assert.match(workerSource, /getChatMember/);
  assert.match(workerSource, /subscription:check/);
  assert.match(workerSource, /await isSubscriptionSatisfied\(message\.from, env\)/);
  assert.match(workerSource, /if \(isBotOwner\(from\)\) return true/);
  assert.match(workerSource, /await sendTrackedMessage\(chatId, memoryKey, subscriptionGateText\(\)/);
  assert.match(workerSource, /Підписатися на канал/);
  assert.match(workerSource, /Підписався\(лась\)/);
  assert.match(workerSource, /return '&#8203;'/);
  assert.match(workerSource, /getChatMember request failed/);
});

test('live serial flow uses anime, season, episode count and dub stages without timers', () => {
  const stages = liveStageDefinitions({
    isMovie: false,
    animeOptions: [{ label: 'Anime', value: 'anime' }],
    seasonOptions: [{ label: 'Season 1', value: 'season-1' }],
    episodeCountOptions: [{ label: '3 серії', value: 3 }],
    dubOptions: [{ label: 'Team', value: 'Team' }],
    selected: { anime: { label: 'Anime' } }
  });
  assert.deepEqual(stages.map(stage => stage.stage), ['anime', 'season', 'episode_count', 'dub']);
  assert.ok(stages.every(stage => !Object.hasOwn(stage, 'closeSeconds')));
});

test('live movie flow skips season and episode count stages', () => {
  const stages = liveStageDefinitions({
    isMovie: true,
    animeOptions: [{ label: 'Movie', value: 'movie' }],
    dubOptions: [{ label: 'Team', value: 'Team' }]
  });
  assert.deepEqual(stages.map(stage => stage.stage), ['anime', 'dub']);
});

test('live worker uses manual next and owner-only broadcast controls', () => {
  const workerSource = readFileSync(new URL('../../backend/telegram/worker.js', import.meta.url), 'utf8');
  assert.match(workerSource, /\/livenext/);
  assert.match(workerSource, /\/livestart/);
  assert.match(workerSource, /stopPoll/);
  assert.match(workerSource, /status = 'ready'/);
  assert.doesNotMatch(workerSource, /open_period/);
  assert.match(workerSource, /sendLiveWinnerStats/);
});

test('live refresh preserves the active video element', () => {
  const liveSource = readFileSync(new URL('../../src/js/components/live/liveStream.js', import.meta.url), 'utf8');
  assert.match(liveSource, /const previousVideo = host\.querySelector\('#liveVideoElement'\)/);
  assert.match(liveSource, /if \(sameSource\) renderedVideo\.replaceWith\(previousVideo\)/);
  assert.match(liveSource, /autoplay muted playsinline/);
  assert.doesNotMatch(liveSource, /<video[^>]+controls/);
});

test('anime live screen is routed separately from the compact home widget', () => {
  const routerSource = readFileSync(new URL('../../src/js/core/compat/router.js', import.meta.url), 'utf8');
  const liveSource = readFileSync(new URL('../../src/js/components/live/liveStream.js', import.meta.url), 'utf8');
  const pageSource = readFileSync(new URL('../../src/js/pages/live/livePage.js', import.meta.url), 'utf8');
  assert.match(routerSource, /route === 'live'/);
  assert.match(routerSource, /showLive\(\)/);
  assert.match(liveSource, /data-live-expand/);
  assert.match(liveSource, /startapp=live/);
  assert.match(liveSource, /https:\/\/t\.me\/vakdabprobot/);
  assert.match(pageSource, /anime-live-page/);
  assert.match(pageSource, /id="animeLiveVideo"/);
  assert.match(pageSource, /destroyLivePage/);
});
