# Схема розділення `index.html` — Monoanime

> Репозиторій-джерело: [vadimgerij8-droid/Monoanime](https://github.com/vadimgerij8-droid/Monoanime)
> Файл: `index.html` (~495 KB, 11 316 рядків)
> Дата аналізу: 2026-07-22

---

## Огляд

`index.html` — монолітний односторінковий застосунок (SPA) аніме-каталогу VakDab. Містить:

| Частина | Рядки | Розмір |
|---------|-------|--------|
| `<head>` + метатеги + зовнішні бібліотеки | L1–L28 | ~28 рядків |
| `<style>` (весь CSS) | L29–L5473 | ~5 445 рядків |
| HTML-розмітка `<body>` | L5475–L5624 | ~150 рядків |
| `<script type="module">` (весь JS) | L5625–L11272 | ~5 648 рядків |
| Bottom nav (HTML) | L11274–L11316 | ~42 рядки |

### Зовнішні залежності
- **hls.js** v1.5.13 — стрімінг відео (HLS-протокол)
- **Firebase** v12.16.0 — auth, firestore (імпорти через importmap)
- **Font Awesome** 6.0.0-beta3 — іконки
- **Google Fonts** (Inter) — типографіка
- **Cloudinary** — завантаження зображень (аватари, банери)
- **Cloudflare Worker** (monoanime.animegran8.workers.dev) — проксі для API animeua.club

---

## Запропонована структура після розділення

```
src/
├── index.html                    ← голий HTML-каркас (L5475–L5624 + bottom nav)
├── styles/
│   ├── variables.css             ← CSS-змінні та теми
│   ├── base.css                  ← reset, body, layout
│   ├── hero.css                  ← Hero banner
│   ├── header.css                ← Header, burger, search
│   ├── components.css            ← Cards, buttons, pills, pagination
│   ├── player.css                ← Player modal, episode panel
│   ├── bottom-sheet.css          ← Bottom sheet (фільтри)
│   ├── rating.css                ← Rating panel, achievements, leaderboard
│   ├── community.css            ← Community chat
│   ├── profile.css               ← Profile, auth page
│   ├── settings.css              ← Settings page
│   ├── genres.css                ← Genre pages
│   ├── navigation.css            ← Bottom nav, leftdock, back-to-top
│   └── responsive.css            ← Медіа-запити
├── js/
│   ├── config/
│   │   ├── firebase.js           ← Firebase config + init
│   │   ├── api.js                ← PROXY_URL, ANIMEUA_BASE, Cloudinary
│   │   └── constants.js          ← GENRE_MAP, CATEGORY_MAP
│   ├── auth/
│   │   └── auth.js               ← Система авторизації
│   ├── storage/
│   │   └── storage.js            ← LocalStorage обгортка
│   ├── utils/
│   │   ├── dom.js                ← safeQuery, safeQueryAll
│   │   ├── helpers.js            ← escapeHtml, showToast, theme toggle
│   │   └── hashing.js            ← String.prototype.hashCode
│   ├── api/
│   │   ├── fetch.js               ← fetchUA, проксі-логіка
│   │   ├── animeua.js            ← Парсинг animeua.club (cards, detail, search)
│   │   ├── sources.js            ← extractPlayerIframeUrls, extractSourcesFromText
│   │   └── diagnostics.js        ← saveParseDiagnostic
│   ├── player/
│   │   ├── player.js             ← LampaPlayer class + HLS-логіка
│   │   ├── episodes.js           ← buildSeasonRow, episode views, playEpisode
│   │   ├── player-page.js        ← openPlayerPage, closePlayerPage, UI плеєра
│   │   └── bottom-sheet.js       ← Bottom sheet фільтри (джерело, якість, озвучка)
│   ├── hero/
│   │   └── hero.js               ← Hero banner (build, rotate, slides, indicators)
│   ├── ui/
│   │   ├── clock.js              ← Годинник в хедері
│   │   ├── leftdock.js            ← Ліве меню (sidebar)
│   │   ├── navigation.js         ← Bottom nav логіка
│   │   ├── back-to-top.js        ← Кнопка "вгору"
│   │   └── toast.js              ← Toast повідомлення
│   ├── features/
│   │   ├── xp-system.js          ← XP/Level system, daily XP bonus
│   │   ├── daily-tasks.js        ← Daily stats/tasks tracking
│   │   ├── rating.js            ← Rating page, leaderboard
│   │   ├── community.js         ← Community chat (повідомлення, реакції, mentions)
│   │   ├── bookmarks.js          ← Закладки, історія перегляду
│   │   ├── likes.js              ← Лайк/дизлайк
│   │   └── achievements.js       ← Досягнення
│   ├── pages/
│   │   ├── home.js               ← Основний контент, рендер карток, пагінація
│   │   ├── search.js             ← Сторінка пошуку
│   │   ├── settings.js           ← Сторінка налаштувань
│   │   ├── profile.js            ← Профіль, статистика, аватар, банер
│   │   ├── auth-page.js          ← Сторінка авторизації (login/register)
│   │   ├── genres.js             ← Сторінка жанрів + контент жанру
│   │   └── top100.js             ← ТОП 100
│   ├── router/
│   │   └── router.js             ← Роутер (showViewMode, handleNavVisibility)
│   └── app.js                    ← init() — головна точка входу
└── assets/
    └── favicon.ico
```

---

## Детальний розбив по розділах

### 1. `<head>` — Метатеги та зовнішні ресурси (L1–L28)

| Елемент | Рядки | Опис |
|---------|-------|------|
| Meta-теги (charset, viewport, OG) | L2–L8 | Базові метатеги |
| Google Fonts (Inter) | L5–L6 | preconnect + preload |
| Font Awesome 6.0.0 | L7 | Іконки |
| HLS.js | L15 | Стрімінг відео |
| Firebase importmap | L17–L26 | ES module imports для firebase-app, auth, firestore |
| favicon | L16 | favicon.ico |

**→ Вихідний файл:** `index.html` (розділ `<head>`)

---

### 2. `<style>` — CSS (L29–L5473)

#### 2.1. CSS-змінні та теми (L30–L100)
- `:root` — світла тема (кольори, тіні, радіуси, переходи)
- `.dark-mode` — темна тема (перевизначення всіх змінних)
- **→ `styles/variables.css`**

#### 2.2. Base / Reset (L101–L185)
- `*` box-sizing reset
- `html, body` — типографіка, шрифт Inter, плавний скрол
- `.app-container` — основний контейнер (max-width 1400px)
- Адаптивні padding через медіа-запити
- Keyframes анімації: fadeInUp, subtlePulse, scaleIn, spin, skeletonShimmer, heroFadeIn
- **→ `styles/base.css`**

#### 2.3. Hero Banner (L186–L4283)
- `.hero-wrapper` — повноекранний банер (100vh)
- `.hero-slide`, `.hero-slide-bg` — слайди з фоновими зображеннями
- `.hero-slide-overlay` — градієнтні шари (B&W glassmorphism)
- `.hero-content` — контент слайда (назва, опис, кнопка "Дивитись")
- `.hero-rating-badge` — бейдж рейтингу
- `.hero-nav` — стрілки навігації (prev/next)
- `.hero-dots` — індикатори-крапки
- `.hero-progress-bar` — індикатор авто-програвання
- Медіа-запити для мобільних
- **→ `styles/hero.css`**

#### 2.4. Header (L4284–L4390)
- `.header` — абсолютний заголовок (flex, прозорий фон)
- `.header-left`, `.logo`, `.logo-text`, `.logo-title-row`
- Логотип з blur-бекдропом
- `.header-actions` — контейнер для кнопок
- **→ `styles/header.css`**

#### 2.5. Burger & Search (L4356–L4390)
- `.search-circle-btn` — кругла кнопка пошуку (glassmorphism)
- Стилізація іконок, hover-стани
- **→ `styles/header.css`**

#### 2.6. Загальні компоненти (L4391–L4488)
- Кнопки, action-pills, cards, grids
- `.actions-row` — рядок дій (ТОП 100, Випадкове)
- `.anime-grid` — сітка аніме-карток
- Скелетон-завантаження
- Пагінація
- **→ `styles/components.css`**

#### 2.7. Повноекранні таби (L4501–L4549)
- `.fullscreen-tabs` — glass pill навігація
- **→ `styles/components.css`**

#### 2.8. Rating Panel (L4550–L4637)
- `.rating-panel` — панель рейтингу
- Контейнери для статистики
- **→ `styles/rating.css`**

#### 2.9. Achievements (L4638–L4771)
- `.achievement-card`, `.achievement-grid`
- Бейджі, іконки досягнень
- **→ `styles/rating.css`**

#### 2.10. Leaderboard (L4772–L4844)
- `.leaderboard-list`, `.leaderboard-item`
- Аватари, ранги, статистика
- **→ `styles/rating.css`**

#### 2.11. Community Chat (L4845–L5440)
- `.community-chat` — контейнер чату
- Date separator, message bubbles
- Type badges, media in messages
- Input area, media preview
- Attach button, type selector
- Filter tabs (Думка / Рекомендація / Досягнення)
- Message action buttons (edit/delete)
- Inline edit box
- Compose extra panel (anime/achievement picker)
- Rich anime/achievement cards in messages
- Chat header (Telegram-like)
- Reactions row, reply quotes
- @mentions, mention autocomplete
- Long-press context menu
- Login wall, empty feed
- **→ `styles/community.css`**

#### 2.12. Profile & Settings (інтегровано в загальний CSS)
- Стилі сторінки профілю, авторизації, налаштувань
- **→ `styles/profile.css`, `styles/settings.css`**

#### 2.13. Player (інтегровано в загальний CSS)
- `.modal`, `.modal-content`
- `.player-*` класи
- `.episode-*` класи
- **→ `styles/player.css`**

#### 2.14. Bottom Sheet (інтегровано)
- `.bottom-sheet-overlay`, `.bottom-sheet`
- Секції фільтрів
- **→ `styles/bottom-sheet.css`**

#### 2.15. Навігація (bottom nav, leftdock)
- `.bottom-nav`, `.bottom-nav-item`
- `.leftdock`
- `.back-to-top`
- **→ `styles/navigation.css`**

---

### 3. HTML `<body>` — Розмітка (L5475–L5624)

| Блок | Рядки | Опис |
|------|-------|------|
| `<body>` + `.app-container` | L5475–L5477 | Кореневий контейнер |
| `<header>` | L5479–L5500 | Логотип, кнопка пошуку, годинник |
| `.hero-wrapper` | L5504–L5510 | Контейнер hero-банера (слайди, стрілки, крапки, прогрес) |
| `.actions-row` | L5512–L5515 | Кнопки "ТОП 100" та "Випадкове" |
| Контейнери сторінок | L5517–L5527 | genreSections, animeContainer, searchPage, settingsPage, profilePage, genrePage, genresPage, ratingPage |
| `.pagination-row` | L5529 | Пагінація |
| `<footer>` | L5531 | Футер з хоткеями |
| `.back-to-top` | L5534–L5536 | Кнопка "вгору" |
| `.toast` | L5538 | Toast-повідомлення |
| `#playerPageModal` | L5540–L5595 | Модал плеєра (топбар, постер, відео, епізоди) |
| `#bottomSheetOverlay` | L5598–L5619 | Bottom sheet (джерело, якість, озвучка, сезон) |
| File inputs | L5622–L5623 | Приховані input для аватара і банера |

**→ Вихідний файл:** `index.html` (розділ `<body>`) — залишається в одному файлі як каркас

---

### 4. `<script type="module">` — JavaScript (L5625–L11272)

#### 4.1. Firebase конфігурація (L5626–L5638)
- `FIREBASE_CONFIG` — apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId
- **→ `js/config/firebase.js`**

#### 4.2. Firebase імпорти (L5640–L5673)
- `import { initializeApp } from "firebase/app"`
- Auth: getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile, setPersistence, browserLocalPersistence, signInAnonymously
- Firestore: getFirestore, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, collection, query, orderBy, limit, onSnapshot
- **→ `js/config/firebase.js`**

#### 4.3. Конфігурація проксі та API (L5675–L5703)
- `PROXY_URL` — Cloudflare Worker
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`
- `ANIMEUA_BASE` — базовий URL animeua.club
- `GENRE_MAP` — мапа жанрів (19 жанрів → slug)
- **→ `js/config/api.js` + `js/config/constants.js`**

#### 4.4. Утиліти (L5705–L5715)
- `String.prototype.hashCode` — хеш-функція
- `safeQuery`, `safeQueryAll` — безпечні DOM-запити
- **→ `js/utils/hashing.js` + `js/utils/dom.js`**

#### 4.5. Ініціалізація Firebase (L5728–L5748)
- `firebaseApp = initializeApp(FIREBASE_CONFIG)`
- `auth = getAuth(firebaseApp)`
- `db = getFirestore(firebaseApp)`
- **→ `js/config/firebase.js`**

#### 4.6. Система авторизації (L5749–L6163)
- Обробка стану автентифікації (onAuthStateChanged)
- Login/register/logout логіка
- Анонімна авторизація
- Google sign-in (signInWithPopup)
- Збереження профілю в Firestore
- **→ `js/auth/auth.js`**

#### 4.7. Сховище — LocalStorage (L6164–L6264)
- Обгортки для localStorage (get/set/remove)
- Збереження: історія перегляду, закладки, налаштування, статистика
- **→ `js/storage/storage.js`**

#### 4.8. Допоміжні функції (L6265–L6300)
- `applyTheme(theme)` — застосування теми
- `toggleTheme()` — перемикання теми
- `showToast(msg)` — toast-повідомлення
- **→ `js/utils/helpers.js` + `js/ui/toast.js`**

#### 4.9. API-функції — Діагностика (L6301–L6646)
- `saveParseDiagnostic()` — збереження діагностики парсингу в Firestore
- `fetchUA(url, retries)` — fetch через проксі з ретраями
- `parseAnimeuaCards(doc)` — парсинг карток аніме
- `fetchAnimeuaMain(page)` — головна сторінка
- `searchAnimeua(query, page)` — пошук
- `fetchAnimeuaByCategory(categorySlug, page)` — за категорією
- `fetchAnimeuaTop100()` — ТОП 100
- `fetchAnimeuaByGenre(genreSlug, page)` — за жанром
- `loadAnimeuaDetail(animeUrl)` — деталі аніме (парсинг постеру, опису, плеєрів)
- `extractPlayerIframeUrls(doc)` — витяг URL плеєрів
- `extractSourcesFromText(text, providerName)` — парсинг джерел (сезони, озвучки, якості)
- **→ `js/api/` (fetch.js, animeua.js, sources.js, diagnostics.js)**

#### 4.10. Плеєр — LampaPlayer (L6647–L7180)
- `class LampaPlayer` — кастомний відео-плеєр з контролами
  - Конструктор, ініціалізація контейнера
  - HLS-ініціалізація (hls.js)
  - Controls: play/pause, seek, volume, fullscreen
  - Обробка помилок, ретраї
  - Destroy / cleanup
- `lpFmtTime(sec)` — форматування часу
- **→ `js/player/player.js`**

#### 4.11. Hero Banner (L7181–L7423)
- `buildHeroBanner()` — побудова банера
- `getRandomItems(arr, n)` — випадкові елементи
- `loadHeroItemDetails(idx)` — завантаження деталей для слайда
- `renderHeroSlide(item)` — рендер слайда
- `buildHeroIndicators()` — індикатори (крапки)
- `updateHeroIndicators()` — оновлення індикаторів
- `goToSlide(idx)` — перехід до слайда
- `nextSlide()`, `prevSlide()` — навігація
- `startHeroRotation()`, `stopHeroRotation()`, `resetHeroTimer()` — авто-програвання
- **→ `js/hero/hero.js`**

#### 4.12. Годинник (L7424–L7441)
- `updateClock()` — оновлення часу
- `startClock()` — запуск інтервалу
- **→ `js/ui/clock.js`**

#### 4.13. Ліве меню — Leftdock (L7442–L7524)
- `toggleLeftdock()`, `showLeftdock()`, `hideLeftdock()`
- Іконки: `iconCircleLetter`, `iconHomeSvg`, `iconProfileSvg`, `iconSettingsSvg`
- `loadGenres()` — завантаження жанрів з GENRE_MAP
- `buildLeftdock()` — побудова меню
- `handleLeftdockAction(action)` — обробка дій
- `syncLeftdockActive()` — синхронізація активного стану
- **→ `js/ui/leftdock.js`**

#### 4.14. Роутер (L7525–L7710)
- Маршрутизація між сторінками (home, search, settings, profile, genres, rating, player)
- showViewMode + handleNavVisibility
- **→ `js/router/router.js`**

#### 4.15. XP / Level System (L7714–L7856)
- `_getDailyXPBonus()`, `_addDailyXPBonus(amount)`
- `calcTotalXP()` — розрахунок загального XP
- `getLevel(xp)` — визначення рівня
- `getXPForLevel(level)` — XP для рівня
- `getXPProgress(xp)` — прогрес до наступного рівня
- **→ `js/features/xp-system.js`**

#### 4.16. Daily Stats / Tasks (L7857–L9108)
- `_todayStr()`, `_loadDailyState()`, `_saveDailyState(st)`
- `_getTotalCounter(key)`, `_incTotalCounter(key, by)`
- `_renderDailyTasks()` — рендер щоденних завдань
- `getUserRankInfo(episodes, watchHours)` — ранг користувача
- `initRatingPage()` — ініціалізація сторінки рейтингу
- `loadMyStats()` — завантаження статистики
- `loadLeaderboard()` — таблиця лідерів (Firebase Firestore)
- `renderLeaderboard(lb, users, sortKey)` — рендер таблиці
- Community chat:
  - `_renderReplyBanner()`, `_setReplyTo(m)`, `_uniqueCommunityAuthors()`
  - `_highlightMentions(escapedText)`, `getMyEarnedAchievements()`
  - `initCommunity()`, `_setupCompose(user)`, `updateInputVisibility()`
  - `refreshExtra()`, `doSend()`, `_renderMediaPreview(media, container)`
  - `_sendMessage(user, extra, onSent)`, `_renderComMessages(currentUser)`
  - `_toggleReaction(msgId, emoji, currentUser)`
  - `_closeMsgContextMenu()`, `_showMsgContextMenu(m, currentUser, x, y)`
  - `_subscribeToChat(currentUser)` — real-time підписка на Firestore
- `loadRatingPage()`, `loadRatingList()`
- **→ `js/features/daily-tasks.js`, `js/features/rating.js`, `js/features/community.js`**

#### 4.17. Основний контент (L9109–L9224)
- `escapeHtml(str)` — екранування HTML
- `fetchContent()` — завантаження контенту
- `showSkeleton()` — скелетон-завантаження
- `loadContent()` — основне завантаження
- `renderCards(list)` — рендер карток аніме
- `renderPagination()` — пагінація
- `showTop100()` — ТОП 100
- `openRandomAnime()` — випадкове аніме
- **→ `js/pages/home.js`, `js/pages/top100.js`**

#### 4.18. Жанрові секції (L9225–L9310)
- `loadAndDisplayGenreSections()` — паралельне завантаження жанрових секцій
- **→ `js/pages/genres.js`**

#### 4.19. Сторінка пошуку (L9311–L9475)
- `renderSearchPage()` — рендер сторінки пошуку
- `performSearchPage()` — виконання пошуку
- **→ `js/pages/search.js`**

#### 4.20. Сторінка налаштувань (L9476–L9531)
- `renderSettingsPage()` — рендер налаштувань
- **→ `js/pages/settings.js`**

#### 4.21. Профіль (L9532–L9791)
- `getDefaultProfile()`, `getProfile()`, `saveProfile(data)`
- `getProfileStats()` — статистика профілю
- `getAchievements(...)` — розрахунок досягнень
- `uploadToCloudinary(file, maxW, maxH, quality)` — завантаження зображень
- `compressImage(file, maxW, maxH, quality, callback)` — стиснення
- `renderProfilePage()` — рендер сторінки профілю
- **→ `js/pages/profile.js`**

#### 4.22. Сторінка авторизації (L9792–L9987)
- `renderAuthPage()` — рендер форми входу/реєстрації
- `setAuthMode(mode)` — перемикання режиму (login/register)
- **→ `js/pages/auth-page.js`**

#### 4.23. Панелі профілю (L9988–L10115)
- `renderHistoryPanel(history)` — панель історії перегляду
- `renderBookmarksPanel(bookmarks)` — панель закладок
- `renderAchievementsPanel(achievements, totalWatchTime)` — панель досягнень
- **→ `js/pages/profile.js` (продовження)**

#### 4.24. Редагування профілю (L10116–L10232)
- `profileEditNick()`, `profileEditBio()` — редагування нікнейму та біо
- Збереження через Firestore
- **→ `js/pages/profile.js` (продовження)**

#### 4.25. Сторінка жанру (L10233–L10331)
- `renderGenresPage()` — список жанрів
- `renderGenrePage(slug, name)` — сторінка конкретного жанру
- `loadGenrePageContent()` — завантаження контенту жанру
- **→ `js/pages/genres.js` (продовження)**

#### 4.26. Плеєр — сторінка (L10332–L10740)
- `openPlayerPage(url)` — відкриття сторінки плеєра
- `updateSourceChip()`, `updateFilterChip()` — чіпи джерела та фільтра
- `buildSeasonRow(seasons)` — рядок сезонів
- `getCurrentEpisodes()` — поточні епізоди
- `getEpisodeProgress(episode)` — прогрес епізоду
- `buildEpisodeViews()` — режими перегляду (grid/compact/classic)
- `playEpisode(file, epNum)` — відтворення епізоду
- `closePlayerPage()` — закриття плеєра
- **→ `js/player/player-page.js`, `js/player/episodes.js`**

#### 4.27. Лайк / Дизлайк / Закладки (L10741–L10809)
- `updateBookmarkButton(url)`, `toggleBookmark()`
- `updateLikeButton()`, `updateDislikeButton()`
- `toggleLike()`, `toggleDislike()`
- Збереження в Firestore + localStorage
- **→ `js/features/likes.js`, `js/features/bookmarks.js`**

#### 4.28. Bottom Sheet (L10810–L10940)
- `buildBottomSheetData()` — побудова даних фільтрів
- `openBottomSheet(mode)`, `closeBottomSheet()` — керування bottom sheet
- Секції: джерело, якість, озвучка, сезон
- **→ `js/player/bottom-sheet.js`**

#### 4.29. Обробники подій (L10941–L11023)
- Обробники кліків для всіх кнопок (hero, search, top100, random, settings, profile, genres, rating)
- Scroll-обробники
- **→ `js/app.js` (частина)**

#### 4.30. Клавіатура (L11024–L11054)
- Хоткеї: `/` — пошук, `M` — меню, `T` — тема, `R` — випадкове, `Esc` — закрити
- **→ `js/app.js` (частина)**

#### 4.31. Кнопка "Вгору" (L11055–L11064)
- `updateBackToTop()` — показ/приховування кнопки при скролі
- **→ `js/ui/back-to-top.js`**

#### 4.32. Показ вигляду епізодів (L11065–L11081)
- `showViewMode(mode)` — перемикання grid/compact/classic
- **→ `js/player/episodes.js` (частина)**

#### 4.33. Ініціалізація (L11082–L11169)
- `init()` — головна функція ініціалізації
  - Перевірка стану авторизації
  - Завантаження контенту
  - Побудова hero-банера
  - Запуск годинника
  - Налаштування обробників подій
  - Ініціалізація leftdock
  - Запуск роутера
- **→ `js/app.js`**

#### 4.34. Bottom Nav (L11170–L11272)
- `updateBottomNav(route)` — оновлення активного стану навігації
- `handleNavVisibility(route)` — видимість навігації залежно від сторінки
- `isCommunityActive()` — перевірка активності чату
- **→ `js/ui/navigation.js`**

---

### 5. Bottom Nav — HTML (L11274–L11316)

- `<nav class="bottom-nav">` — фіксована нижня навігація
- Кнопки: Назад, Головна, Рейтинг, Профіль, Меню
- **→ залишається в `index.html`**

---

## Підсумок кількості файлів

| Категорія | Файлів |
|-----------|--------|
| HTML | 1 |
| CSS | 13 |
| JS — config | 3 |
| JS — auth | 1 |
| JS — storage | 1 |
| JS — utils | 3 |
| JS — api | 4 |
| JS — player | 4 |
| JS — hero | 1 |
| JS — ui | 4 |
| JS — features | 5 |
| JS — pages | 6 |
| JS — router | 1 |
| JS — root | 1 |
| **Разом** | **48** |

---

## Примітки

- Усі Firebase конфігураційні дані (apiKey, projectId тощо) винести в окремий `js/config/firebase.js` і за бажанням — у environment variables
- Проксі URL та Cloudinary налаштування винести в `js/config/api.js`
- JS використовує ES modules (import/export) — розділення на модулі не потребує бандлера для початку
- CSS можна об'єднати через `@import` або бандлер (PostCSS, Vite)
- Кожен модуль повинен імпортувати тільки те, що йому потрібно (tree-shaking)
- Для production-збірки рекомендується Vite або Rollup
