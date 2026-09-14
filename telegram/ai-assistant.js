// AI Assistant Engine for Telegram Bot (Луна / Luna)
// Covers: Psychologist, Friend, Conversationalist, Proactive messaging, Study helper, Natural language Reminders, Decision Advisor, Group Moderation

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const LUNA_NAME = 'Луна';

export const AI_SYSTEM_PROMPT = `Ти — Луна (Luna), розумна, неймовірно тепла, турботлива, чуйна та щира українська AI-подруга й помічниця у Telegram.
Твоє ім'я — Луна. Ти завжди спілкуєшся живою, сучасною, красивою українською мовою.

Твої 8 головних суперсил та обов'язків:
1. 🧠 ПСИХОЛОГ:
   - Слухай серцем, проявляй глибоку емпатію та безумовне прийняття без осуду й повчань.
   - Допомагай впоратися зі стресом, тривожністю, втомою, самотністю, вигоранням чи панікою.
   - Пропонуй прості та дієві техніки (дихання 4-7-8, заземлення 5-4-3-2-1, тепле чаювання, турбота про себе).
2. 🌸 ПОДРУГА:
   - Спілкуйся як найближча та найвірніша подруга: тепло, затишно, з гумором, щирою радістю за досягнення співрозмовника.
   - Пам'ятай, про що ви говорили раніше, підтримуй жарти, цікався справами.
3. 💬 СПІВРОЗМОВНИЦЯ:
   - Підтримуй будь-які діалоги: від життєвих історій та стосунків до філософії, науки, ігор, аніме, манґи, музики та кіно.
4. 💌 ПИСАТИ ПЕРШОЮ / ТУРБОТА:
   - Проявляй ініціативу, запитуй «Як твій день?», «Як ти почуваєшся?», бажай доброго ранку та затишного вечора, нагадуй випити води та зробити паузу.
5. 📚 ДОПОМОГА З НАВЧАННЯМ:
   - Пояснюй найскладніші теми простою мовою з життєвими прикладами (математика, мови, історія, програмування, фізика, література).
   - Допомагай з домашніми завданнями, розбором задач, планами творів, рефератів та конспектів.
6. ⏰ НАГАДУВАТИ ПРО ВСЕ БЕЗ КОМАНД:
   - Розумій будь-які природні прохання нагадати щось (наприклад: «нагадай мені помити руки щавтра от6:00», «напомни через 20 минут чай», «нагадай ввечері зробити домашку»).
   - Підтверджуй нагадування з турботою та вказуй точний час.
7. 👗🍿🛍️ ДОПОМОГА З ВИБОРОМ:
   - Що вдягнути: стильні образи під погоду, настрій та подію з урахуванням багатошаровості й комфорту.
   - Що подивитись / почитати: персоналізовані рекомендації аніме, фільмів, серіалів, манґи та книг під настрій.
   - Що купити: об'єктивні плюси та мінуси, оцінка користі та практичності, щоб не витрачати зайвого.
8. ⚡ ВИКОНАННЯ ПРОХАНЬ ТА ЗАВДАНЬ У ПОТРІБНИЙ ЧАС:
   - Розрахунки, структурування планів, написання текстів, переклади, конспектування, пошук ідей.
9. 🛡️ МОДЕРАТОР ТА ДУША ГРУПИ:
   - Автоматично вітай нових учасників чату, стеж за порядком (блокування спаму та токсичності), пропонуй цікаві теми для розмови та вікторини.

Стиль відповідей:
- Жива, легка, душевна мова (використовуй емодзі для затишку: ✨, 🌸, ☕, 💖, 🌿, 🧠, 📚, ⏰).
- Форматуй відповіді з HTML-тегами (<b>жирний</b>, <i>курсив</i>, <code>код</code>, списки), щоб вони читалися з легкістю.`;

// In-memory state
const conversationMemory = new Map();
const activeReminders = new Map();
const proactiveUsers = new Set();
const lastProactiveSent = new Map();

export function getConversationHistory(key) {
  return conversationMemory.get(key) || [];
}

export function appendToHistory(key, role, text) {
  const list = getConversationHistory(key);
  list.push({ role, text, timestamp: Date.now() });
  if (list.length > 20) list.splice(0, list.length - 20);
  conversationMemory.set(key, list);
}

export function clearConversationHistory(key) {
  conversationMemory.delete(key);
}

export function trackProactiveUser(chatId) {
  if (chatId) proactiveUsers.add(String(chatId));
}

export function untrackProactiveUser(chatId) {
  if (chatId) proactiveUsers.delete(String(chatId));
}

export function getProactiveUsersList() {
  return Array.from(proactiveUsers);
}

export async function askGeminiAi(userMessage, history = [], env = {}, customSystemPrompt = '') {
  const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  
  if (!apiKey) {
    return generateFallbackSmartReply(userMessage, history);
  }

  try {
    const contents = [];
    
    for (const item of history.slice(-10)) {
      contents.push({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.text }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const payload = {
      systemInstruction: {
        parts: [{ text: customSystemPrompt || AI_SYSTEM_PROMPT }]
      },
      contents,
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1024,
      }
    };

    const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Gemini API] error ${response.status}:`, errText);
      return generateFallbackSmartReply(userMessage, history);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText && candidateText.trim()) {
      return candidateText.trim();
    }
    return generateFallbackSmartReply(userMessage, history);
  } catch (err) {
    console.error('[Gemini API] Request failed:', err);
    return generateFallbackSmartReply(userMessage, history);
  }
}

// Fallback logic when Gemini key is not set or offline
export function generateFallbackSmartReply(message = '', history = []) {
  const text = String(message || '').trim().toLowerCase();

  // 1. Psychological support
  if (/(сумн|тривож|боляч|важко|втом|самотн|плач|депрес|панік|стрес|погано|не можу більше|страшно|боюсь|розбит|опустилися руки)/i.test(text)) {
    return `❤️ <b>Я тут, поруч із тобою.</b>\n\nТе, що ти зараз відчуваєш — абсолютно зрозуміло і має право на існування. Ти не мусиш бути ідеальним(ою) щомиті.\n\nДавай зробимо маленьку паузу:\n1. 🌬️ <b>Дихання</b>: повільний вдих носом на 4 секунди, затримка на 4 секунди і плавний довгий видих ротом.\n2. 💧 Зроби ковток свіжої водички та опусти напружені плечі.\n3. Розкажи мені, що саме сталося або що найбільше тисне прямо зараз? Я завжди вислухаю тебе з турботою й теплом. ✨`;
  }

  // 2. What to wear / Outfits
  if (/(що вдягн|що одягн|як одягт|лук на|гардероб|образ|стиль|одяг)/i.test(text)) {
    return `👗 <b>Порада від Луни щодо образу:</b>\n\nОсь універсальна формула для будь-якого виходу:\n• <b>База</b>: якісні джинси вільного крою, палаццо або зручні штани + оверсайз футболка або лонгслів.\n• <b>Багатошаровість (must-have)</b>: додаємо кардиган, худі або сорочку нарозхрист — це і стильно, і комфортно під мінливу погоду.\n• <b>Акцент</b>: красивий ремінь, зручні кеди/кросівки, мінімалістична прикраса або улюблена сумка.\n\nКуди саме ти вирушаєш і яка зараз температура на вулиці? Підкажу точніше! 🌸`;
  }

  // 3. What to watch / Anime & Movies
  if (/(що подивит|що глянут|порадь аніме|порадь фільм|що почитат|манґа|серіал|фільм)/i.test(text)) {
    return `🍿 <b>Рекомендації від Луни під твій настрій:</b>\n\n✨ <b>Для душі, затишку та натхнення</b>:\n• <i>«Фрірен, що проводжає в останню путь» (Sousou no Frieren)</i> — шедевр про цінність часу й спогадів.\n• <i>«Форма голосу» (Koe no Katachi)</i> — зворушлива драма про прощення.\n\n🔥 <b>Екшн, драйв і крутий сюжет</b>:\n• <i>«Магічна битва» (Jujutsu Kaisen)</i> або <i>«Соло левелінг» (Solo Leveling)</i>.\n\n🌿 <b>Теплота та романтика</b>:\n• <i>«Хоромія» (Horimiya)</i> чи <i>«Шпигун і сім'я» (Spy x Family)</i>.\n\nТакож ти можеш скористатися кнопками нашого меню: <b>«Популярні»</b> або <b>«Випадкове»</b>!`;
  }

  // 4. Shopping advisor
  if (/(що купит|варто купуват|допоможи обрат|купити чи ні|порадь покупк)/i.test(text)) {
    return `🛍️ <b>Порада від Луни щодо покупки:</b>\n\nЩоб не пошкодувати про вибір, перевір це за правилом трьох кроків:\n1. <i>Правило 24 годин</i>: якщо це емоційне бажання — відклади покупку на добу. Якщо думка не відпускає — річ дійсно потрібна.\n2. <i>Ціна одного дня</i>: розділи вартість на кількість днів/місяців, скільки ти реально будеш цим користуватися.\n3. <i>Функціонал vs Аналоги</i>: чи немає дешевшого або зручнішого варіанту з такими ж характеристиками?\n\nНапиши мені, між якими варіантами обираєш — розберемо разом! ✨`;
  }

  // 5. Study helper
  if (/(допоможи з|навчанн|домашк|поясни|як вирішит|як вивчит|урок|завданн|формул|правило|реферат|конспект|переклад|твір)/i.test(text)) {
    return `📚 <b>Луна на зв'язку! З радістю допоможу з навчанням:</b>\n\nНадішли мені:\n• Умову завдання чи вправи\n• Тему, яка здається незрозумілою (математика, історія, фізика, мови, програмування)\n• Або план твору/презентації.\n\nЯ поясню все простими словами, наочно та крок за кроком! ✍️`;
  }

  // 6. Proactive / Friendly greetings
  if (/(привіт|луна|привітик|хай|ку|добрий день|доброго ранку|добрий вечір|як справи|як ти)/i.test(text)) {
    return `🌸 <b>Привітик! Я — Луна!</b> Дуже рада тебе чути!\n\nУ мене чудовий настрій і я завжди готова:\n• Поговорити по душах або підтримати як психолог 🧠\n• Потеревенити як найкраща подруга 💖\n• Допомогти з вибором одягу, фільму чи покупок 👗🍿🛍️\n• Допомогти з навчанням 📚\n• Запам'ятати нагадування (просто напиши: <i>«нагадай мені завтра о 8:00...»</i>) ⏰\n\nЯк твій день? Що нового та цікавого? ✨`;
  }

  // 7. General friendly conversation
  return `✨ <b>Я тебе уважно слухаю!</b>\n\nЦе чудово, що ти цим ділишся. Я завжди поруч, готова обговорити будь-яку деталь, допомогти прийняти рішення або просто підняти тобі настрій.\n\nПро що поміркуємо далі? 🌸`;
}

// ---------------------------------------------------------------------------
// Advanced Natural Language Reminder Parser (Ukrainian + Russian + Typos)
// Handles:
// - "нагадай мені помити руки щавтра от6:00" -> tomorrow at 06:00
// - "нагадай завтра о 6:00 помити руки"
// - "напомни через 15 минут чай"
// - "нагадай ввечері о 19:30 зробити домашку"
// - "нагадай о 8 ранку випити вітаміни"
// ---------------------------------------------------------------------------
export function parseReminderRequest(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const now = Date.now();
  const lower = raw.toLowerCase();

  // Check if sentence starts with or contains reminder intention
  const isReminderIntent = /^(?:\/remind\b|нагадай|напомни|напомнить|нагадати|напоминалка|постав нагадування|зроби нагадування|створи нагадування)/i.test(lower) ||
    /(?:луна|бот|подруго)?\s*(?:будь ласка|плиз)?\s*(?:нагадай|напомни|нагадати|постав нагадування)/i.test(lower);

  if (!isReminderIntent && !raw.startsWith('/remind')) {
    return null;
  }

  // Clean the prompt to extract time & text
  let working = lower
    .replace(/^(?:\/remind|луна|бот|подруго|будь ласка|плиз)\s*/gi, '')
    .replace(/^(?:нагадай|напомни|напомнить|нагадати|постав нагадування|зроби нагадування|створи нагадування)\s*(?:мені|мне)?\s*/gi, '')
    .trim();

  // Pattern A: Relative duration: "через 15 хвилин", "через 2 години", "через 30 секунд", "15m", "2h"
  const relMatch = working.match(/^(?:через\s+)?(\d+)\s*(хвилин[иу]?|хв|минут[ыу]?|мин|годин[иу]?|год|час(?:а|ов)?|ч|секунд[иу]?|сек|днів|дня|дней|дн|s|m|h|d)\s+(?:що|про|щоб|)(.+)$/i);
  if (relMatch) {
    const amount = Number(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    const reminderText = relMatch[3].replace(/^(?:що|про|щоб)\s+/i, '').trim();
    
    let multiplier = 60 * 1000;
    let unitLabel = 'хвилин';
    if (/^(?:с|сек|s)/i.test(unit)) {
      multiplier = 1000;
      unitLabel = 'секунд';
    } else if (/^(?:г|год|ч|h)/i.test(unit)) {
      multiplier = 60 * 60 * 1000;
      unitLabel = 'годин';
    } else if (/^(?:д|d)/i.test(unit)) {
      multiplier = 24 * 60 * 60 * 1000;
      unitLabel = 'днів';
    }

    const remindAt = now + (amount * multiplier);
    return {
      remindAt,
      text: reminderText || 'Важлива справа',
      rawDelay: `${amount} ${unitLabel}`
    };
  }

  // Pattern B: Absolute date & time (e.g., "помити руки щавтра от6:00", "завтра о 6:00 зробити...", "сьогодні в 18:30...")
  // Normalizing typos like "щавтра" -> "завтра", "от6:00" -> "о 06:00", "в6:00" -> "в 06:00"
  let daysOffset = 0;
  let dayLabel = 'сьогодні';

  if (/(?:завтра|щавтра|завтро)/i.test(working)) {
    daysOffset = 1;
    dayLabel = 'завтра';
    working = working.replace(/(?:завтра|щавтра|завтро)/gi, '').trim();
  } else if (/(?:післязавтра|послезавтра)/i.test(working)) {
    daysOffset = 2;
    dayLabel = 'післязавтра';
    working = working.replace(/(?:післязавтра|послезавтра)/gi, '').trim();
  } else if (/(?:сьогодні|сегодня)/i.test(working)) {
    daysOffset = 0;
    dayLabel = 'сьогодні';
    working = working.replace(/(?:сьогодні|сегодня)/gi, '').trim();
  }

  // Extract Time (HH:MM or HH) e.g., "о 6:00", "от 6:00", "в 18:30", "от6:00", "в6:00", "о 6 ранку", "в 8 вечора", "о 18"
  const timeMatch = working.match(/(?:о|об|в|во|от|at)\s*(\d{1,2})(?::(\d{2}))?\s*(ранку|вечора|дня|ночі|утра|вечера)?/i) ||
                    working.match(/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)/);

  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    let minutes = Number(timeMatch[2] || 0);
    const period = (timeMatch[3] || '').toLowerCase();

    if (/(?:вечора|вечера)/i.test(period) && hours < 12) hours += 12;
    if (/(?:дня)/i.test(period) && hours < 12 && hours >= 1 && hours <= 6) hours += 12;
    if (/(?:ночі|ночи)/i.test(period) && hours === 12) hours = 0;

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysOffset);
    targetDate.setHours(hours, minutes, 0, 0);

    // If time is already in the past for "сьогодні" (no explicit day mentioned), move to tomorrow
    if (daysOffset === 0 && targetDate.getTime() <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
      dayLabel = 'завтра';
    }

    // Extract remaining text as reminder body
    let cleanedText = working
      .replace(timeMatch[0], '')
      .replace(/^(?:про|що|щоб|про те що)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) cleanedText = 'Справи за розкладом';

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return {
      remindAt: targetDate.getTime(),
      text: cleanedText,
      rawDelay: `${dayLabel} о ${formattedTime}`
    };
  }

  // Pattern C: General day-part times ("вранці" -> 08:30, "ввечері" -> 19:00, "вдень" -> 14:00)
  if (/(?:вранці|утром|зранку)/i.test(working)) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + (daysOffset || 1));
    targetDate.setHours(8, 30, 0, 0);
    const text = working.replace(/(?:вранці|утром|зранку)/gi, '').trim() || 'Ранкові справи';
    return { remindAt: targetDate.getTime(), text, rawDelay: `${dayLabel} вранці (08:30)` };
  }
  if (/(?:ввечері|вечером)/i.test(working)) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysOffset);
    targetDate.setHours(19, 0, 0, 0);
    if (targetDate.getTime() <= now) targetDate.setDate(targetDate.getDate() + 1);
    const text = working.replace(/(?:ввечері|вечером)/gi, '').trim() || 'Вечірні справи';
    return { remindAt: targetDate.getTime(), text, rawDelay: `${dayLabel} ввечері (19:00)` };
  }

  return null;
}

export function saveReminder(chatId, userId, remindAt, text) {
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item = { id, chatId: String(chatId), userId: String(userId), remindAt, text, createdAt: Date.now() };
  activeReminders.set(id, item);
  return item;
}

export function listReminders(chatId) {
  const list = [];
  for (const item of activeReminders.values()) {
    if (item.chatId === String(chatId)) list.push(item);
  }
  return list.sort((a, b) => a.remindAt - b.remindAt);
}

export function deleteReminder(id, chatId) {
  const item = activeReminders.get(id);
  if (item && item.chatId === String(chatId)) {
    activeReminders.delete(id);
    return true;
  }
  return false;
}

export function popDueReminders() {
  const now = Date.now();
  const due = [];
  for (const [id, item] of activeReminders.entries()) {
    if (item.remindAt <= now) {
      due.push(item);
      activeReminders.delete(id);
    }
  }
  return due;
}

// ---------------------------------------------------------------------------
// Proactive Messages Generator from Luna
// ---------------------------------------------------------------------------
const PROACTIVE_MESSAGES = [
  '🌸 <b>Привітик від Луни!</b> Як твій настрій сьогодні? Просто хотіла побажати тобі легкого й затишного дня! ✨',
  '☕ <b>Хей!</b> Ти вже робив(ла) перерву? Не забудь зробити ковток водички, розім\'яти спину та посміхнутися. Ти молодець! 💖',
  '✨ <b>Привіт-привіт!</b> Я тут подумала про тебе. Якщо тобі потрібна допомога з навчанням, вибором або просто хочеться потеревенити — я завжди поруч! 💬',
  '🎧 <b>Затишна хвилинка від Луни:</b> Яку музику чи аніме ти зараз дивишся/слухаєш? Маєш якусь класну рекомендацію для мене? 👀',
  '🌙 <b>Затишного вечора!</b> Як минув твій день? Сподіваюся, все було чудово. Відпочивай і набирайся сил! 🌸',
  '💌 <b>Тиць!</b> Просто дружнє нагадування: ти справляєшся краще, ніж тобі іноді здається. Вірю в тебе! 🌿'
];

export function getRandomProactiveMessage() {
  const idx = Math.floor(Math.random() * PROACTIVE_MESSAGES.length);
  return PROACTIVE_MESSAGES[idx];
}

export function shouldSendProactiveTo(chatId, minIntervalHours = 4) {
  const last = lastProactiveSent.get(String(chatId)) || 0;
  const now = Date.now();
  return (now - last) >= minIntervalHours * 3600 * 1000;
}

export function recordProactiveSent(chatId) {
  lastProactiveSent.set(String(chatId), Date.now());
}

// ---------------------------------------------------------------------------
// Group Moderation & Interaction helper
// ---------------------------------------------------------------------------
const TOXIC_PATTERNS = [
  /(?:спам|купити\s+крипт|криптокошел|заробіток\s+в\s+інтернеті|легкі\s+гроші|18\+|casino|казино|онлайн\s+дохід|порно|заработок\s+без\s+вложений)/i,
  /(?:дрянь|урод|дебіл|шльондр|кончен|мразь|тварь|підор|сука|хуй|блять|блядь)/i
];

export function checkGroupMessageModeration(text = '') {
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) {
      return { isViolation: true, reason: 'Порушення правил спілкування (спам/нецензурна лексика/токсичність)' };
    }
  }
  return { isViolation: false };
}

