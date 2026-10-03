# VakDab Modular Architecture (Архітектура Модулів)

Цей каталог містить вихідні розділені модулі сайту **ВакДаб**.

## Структура каталогів

```
src/
├── styles/                   # Модулі стилів CSS (39 модулів)
│   ├── base/                 # Скидання стилів, змінні, типографіка
│   │   ├── reset.css
│   │   ├── variables.css
│   │   └── typography.css
│   ├── themes/               # Світла та темна теми
│   │   ├── light.css
│   │   └── dark.css
│   ├── utils/                # Анімації, ефекти, допоміжні класи
│   │   ├── animations.css
│   │   ├── glassmorphism.css
│   │   └── utilities.css
│   ├── components/           # UI компоненти сайту
│   │   ├── hero.css          # Хіро-банер (постер, CTA, Discord/Telegram)
│   │   ├── anime-card.css    # Картки аніме
│   │   ├── left-menu.css     # Меню
│   │   ├── toast.css         # Сповіщення
│   │   ├── back-to-top.css   # Кнопка вгору
│   │   ├── loader.css        # Індикатори завантаження
│   │   └── pagination.css    # Пагінація
│   ├── pages/                # Стилі окремих сторінок
│   │   ├── main.css          # Головна стрічка
│   │   ├── search.css        # Пошук
│   │   ├── profile.css       # Профіль користувача
│   │   ├── settings.css      # Налаштування
│   │   ├── schedule.css      # Розклад релізів
│   │   ├── rating.css        # Топ та рейтинг
│   │   ├── stickers.css      # Стікери
│   │   ├── manga.css         # Каталог та рідер манґи
│   │   └── live.css          # Стріми
│   └── player/               # Відеоплеєр
│       ├── video-player.css  # Основний контейнер плеєра
│       ├── episodes.css      # Список серій
│       ├── anime-info.css    # Інформація про тайтл
│       └── video-overlay.css # Оверлеї та керування плеєром
│
└── js/                       # Модулі JavaScript (63 модулі)
    ├── config/               # Конфігурації
    │   ├── firebase.js       # Firebase SDK config
    │   └── constants.js      # Константи та мапи жанрів
    ├── services/             # Сервіси та API
    │   ├── firebase/         # Auth, Firestore, Public Profile
    │   ├── catalog/          # Каталог аніме та пагінація
    │   ├── api/              # API манґи (Hikka, манґа-проксі)
    │   ├── tmdb.js           # Метадані TMDB
    │   └── player/aniSkip.js # Пропуск опенингів та ендингів
    ├── components/           # Компоненти
    │   ├── home/heroBanner.js # Слайдер та логіка хіро-банера
    │   ├── player/           # SenPlayer, LampaPlayer, Fullscreen
    │   ├── manga/            # Рідер манґи, сторінки, прелоад
    │   └── navigation/       # Нижня навігаційна панель
    ├── pages/                # Логіка екранів
    │   ├── home/             # Головна та фільтри
    │   ├── player/           # Сторінка плеєра
    │   ├── profile/          # Профіль та налаштування
    │   ├── search/           # Пошук
    │   ├── schedule/         # Розклад
    │   └── live/             # Стрім-сторінка
    ├── utils/                # Допоміжні утиліти (DOM, Image, String)
    └── core/                 # Роутер, шина подій, бутстрап
```

## Команди збірки

- `npm run build` — оновлює `css/style.css` та `js/script.js` з модулів `src/`.
- `npm run lint` — перевіряє синтаксис JS та валідність файлів.
- `npm start` або `npm run dev` — запускає вебсервер сайту.
