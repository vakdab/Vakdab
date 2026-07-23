// ===== XP / LEVEL SYSTEM =====
// Оригінальні рядки: L7711-L7856

import { Storage } from '../storage/storage.js';

        // === Rating list ===
        let ratingLoaded = false;

        // ====================================================================
        //  XP / LEVEL SYSTEM
        // ====================================================================
        export function _getDailyXPBonus() {
            try { return parseInt(localStorage.getItem('vakdab_daily_xp_total') || '0', 10) || 0; }
            catch { return 0; }
        }
        export function _addDailyXPBonus(amount) {
            const cur = _getDailyXPBonus();
            const next = cur + amount;
            try { localStorage.setItem('vakdab_daily_xp_total', String(next)); } catch {}
            return next;
        }
        export function calcTotalXP() {
            const history   = Storage.getHistory()   || [];
            const bookmarks = Storage.getBookmarks() || [];
            const watchSec  = Storage.getWatchTime() || 0;
            const watchHours = watchSec / 3600;
            const episodes  = history.length;
            const achStats  = { episodes, watchTime: watchSec, bookmarks: bookmarks.length };
            const earnedCount = ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need).length;
            const baseXP = Math.floor(episodes * 30 + watchHours * 15 + bookmarks.length * 10 + earnedCount * 100);
            return baseXP + _getDailyXPBonus();
        }
        export function getLevel(xp) {
            return Math.floor(Math.sqrt(xp / 50)) + 1;
        }
        export function getXPForLevel(level) {
            return Math.pow(level - 1, 2) * 50;
        }
        export function getXPProgress(xp) {
            const level = getLevel(xp);
            const currentLevelXP = getXPForLevel(level);
            const nextLevelXP = getXPForLevel(level + 1);
            const into = xp - currentLevelXP;
            const needed = nextLevelXP - currentLevelXP;
            return { level, pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100, into, needed };
        }

        const DAILY_TASK_POOL = [
            { id: 'dt1', field: 'episodesToday', target: 1, xp: 35, desc: 'Перегляньте 1 серію сьогодні' },
            { id: 'dt2', field: 'episodesToday', target: 2, xp: 50, desc: 'Подивіться 2 серії за день' },
            { id: 'dt3', field: 'episodesToday', target: 3, xp: 65, desc: 'Перегляньте 3 серії аніме' },
            { id: 'dt4', field: 'episodesToday', target: 4, xp: 80, desc: 'Марафон: 4 серії' },
            { id: 'dt5', field: 'episodesToday', target: 5, xp: 95, desc: 'Погляньте 5 серій' },
            { id: 'dt6', field: 'episodesToday', target: 6, xp: 110, desc: 'Продовжте перегляд: 6 серії' },
            { id: 'dt7', field: 'episodesToday', target: 7, xp: 125, desc: 'Наздожени тиждень: 7 серій' },
            { id: 'dt8', field: 'episodesToday', target: 8, xp: 140, desc: 'Занурся в аніме: 8 серій' },
            { id: 'dt9', field: 'episodesToday', target: 10, xp: 170, desc: 'Подвійна серія: 10 серії' },
            { id: 'dt10', field: 'episodesToday', target: 12, xp: 200, desc: 'Марафонець: 12 серій' },
            { id: 'dt11', field: 'episodesToday', target: 15, xp: 245, desc: 'Легенда дня: 15 серій' },
            { id: 'dt12', field: 'minutesToday', target: 10, xp: 23, desc: 'Дивіться аніме 10 хвилин' },
            { id: 'dt13', field: 'minutesToday', target: 15, xp: 27, desc: 'Проведіть за переглядом 15 хв' },
            { id: 'dt14', field: 'minutesToday', target: 20, xp: 31, desc: 'Насолоджуйтесь переглядом 20 хвилин' },
            { id: 'dt15', field: 'minutesToday', target: 30, xp: 39, desc: 'Півгодини аніме: 30 хв' },
            { id: 'dt16', field: 'minutesToday', target: 45, xp: 51, desc: 'Занурся на 45 хвилин' },
            { id: 'dt17', field: 'minutesToday', target: 60, xp: 63, desc: 'Годинка аніме: 60 хвилин' },
            { id: 'dt18', field: 'minutesToday', target: 75, xp: 75, desc: 'Довгий перегляд: 75 хвилин' },
            { id: 'dt19', field: 'minutesToday', target: 90, xp: 87, desc: 'Вечір аніме: 90 хвилин' },
            { id: 'dt20', field: 'minutesToday', target: 120, xp: 111, desc: 'Марафон часу: 120 хвилин' },
            { id: 'dt21', field: 'minutesToday', target: 150, xp: 135, desc: 'Справжній фанат: 150 хвилин' },
            { id: 'dt22', field: 'minutesToday', target: 180, xp: 159, desc: 'Аніме-день: 180 хвилин' },
            { id: 'dt23', field: 'bookmarksToday', target: 1, xp: 25, desc: 'Додайте 1 аніме в закладки' },
            { id: 'dt24', field: 'bookmarksToday', target: 2, xp: 35, desc: 'Збережіть 2 тайтли на потім' },
            { id: 'dt25', field: 'bookmarksToday', target: 3, xp: 45, desc: 'Поповніть закладки: 3 аніме' },
            { id: 'dt26', field: 'bookmarksToday', target: 4, xp: 55, desc: 'Знайдіть і збережіть 4 аніме' },
            { id: 'dt27', field: 'bookmarksToday', target: 5, xp: 65, desc: 'Складіть список: 5 закладок' },
            { id: 'dt28', field: 'bookmarksToday', target: 6, xp: 75, desc: 'Розширте бібліотеку: 6 закладок' },
            { id: 'dt29', field: 'bookmarksToday', target: 8, xp: 95, desc: 'Плануй перегляд: 8 закладок' },
            { id: 'dt30', field: 'bookmarksToday', target: 10, xp: 115, desc: 'Колекціонер: 10 закладок' },
            { id: 'dt31', field: 'postsToday', target: 1, xp: 32, desc: 'Напишіть 1 повідомлення в спільноті' },
            { id: 'dt32', field: 'postsToday', target: 2, xp: 44, desc: 'Поділіться думкою 2 раз(и)' },
            { id: 'dt33', field: 'postsToday', target: 3, xp: 56, desc: 'Будьте активні: 3 пост(и)' },
            { id: 'dt34', field: 'postsToday', target: 4, xp: 68, desc: 'Спілкуйтесь: 4 повідомлення' },
            { id: 'dt35', field: 'postsToday', target: 5, xp: 80, desc: 'Розкажіть про аніме: 5 пост(и)' },
            { id: 'dt36', field: 'postsToday', target: 6, xp: 92, desc: 'Станьте частиною спільноти: 6 пост(и)' },
            { id: 'dt37', field: 'postsToday', target: 8, xp: 116, desc: 'Голос спільноти: 8 повідомлення' },
            { id: 'dt38', field: 'postsToday', target: 10, xp: 140, desc: 'Активіст дня: 10 пост(и)' },
            { id: 'dt39', field: 'likesToday', target: 1, xp: 20, desc: 'Оцініть 1 аніме' },
            { id: 'dt40', field: 'likesToday', target: 2, xp: 28, desc: 'Постав лайк 2 тайтлам' },
            { id: 'dt41', field: 'likesToday', target: 3, xp: 36, desc: 'Поділись враженням: 3 оцінки' },
            { id: 'dt42', field: 'likesToday', target: 4, xp: 44, desc: 'Оціни перегляди: 4 аніме' },
            { id: 'dt43', field: 'likesToday', target: 5, xp: 52, desc: 'Критик дня: 5 оцінки' },
            { id: 'dt44', field: 'likesToday', target: 6, xp: 60, desc: 'Твоя думка важлива: 6 оцінки' },
            { id: 'dt45', field: 'likesToday', target: 8, xp: 76, desc: 'Рейтинг спільноти: 8 оцінки' },
            { id: 'dt46', field: 'likesToday', target: 10, xp: 92, desc: 'Знавець аніме: 10 оцінок' },
            { id: 'dt47', field: 'searchesToday', target: 1, xp: 17, desc: 'Знайдіть 1 аніме через пошук' },
            { id: 'dt48', field: 'searchesToday', target: 2, xp: 24, desc: 'Скористайтесь пошуком 2 раз(и)' },
            { id: 'dt49', field: 'searchesToday', target: 3, xp: 31, desc: 'Досліджуй каталог: 3 пошуки' },
            { id: 'dt50', field: 'searchesToday', target: 4, xp: 38, desc: 'Шукай нове: 4 запити' },
            { id: 'dt51', field: 'searchesToday', target: 5, xp: 45, desc: 'Знайди перлину: 5 пошуки' },
            { id: 'dt52', field: 'searchesToday', target: 6, xp: 52, desc: 'Розширюй горизонти: 6 пошуків' },
            { id: 'dt53', field: 'searchesToday', target: 8, xp: 66, desc: 'Дослідник дня: 8 пошуків' },
            { id: 'dt54', field: 'searchesToday', target: 10, xp: 80, desc: 'Мисливець за аніме: 10 пошуків' },
            { id: 'dt55', field: 'uniqueAnimeToday', target: 1, xp: 32, desc: 'Відкрийте 1 різних аніме' },
            { id: 'dt56', field: 'uniqueAnimeToday', target: 2, xp: 44, desc: 'Погляньте на 2 нових тайтли' },
            { id: 'dt57', field: 'uniqueAnimeToday', target: 3, xp: 56, desc: 'Дослідіть 3 різних аніме' },
            { id: 'dt58', field: 'uniqueAnimeToday', target: 4, xp: 68, desc: 'Спробуйте 4 нові тайтли' },
            { id: 'dt59', field: 'uniqueAnimeToday', target: 5, xp: 80, desc: 'Розширте кругозір: 5 аніме' },
            { id: 'dt60', field: 'uniqueAnimeToday', target: 6, xp: 92, desc: 'Різноманітність: 6 тайтли' },
            { id: 'dt61', field: 'uniqueAnimeToday', target: 8, xp: 116, desc: 'Гурман аніме: 8 тайтлів' },
            { id: 'dt62', field: 'uniqueAnimeToday', target: 10, xp: 140, desc: 'Колекція вражень: 10 тайтлів' },
            { id: 'dt63', field: 'uniqueAnimeToday', target: 15, xp: 200, desc: 'Всеїдний глядач: 15 тайтлів' },
            { id: 'dt64', field: 'loginToday', target: 1, xp: 10, desc: 'Заходь у застосунок сьогодні' },
            { id: 'dt65', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії' },
            { id: 'dt66', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій' },
            { id: 'dt67', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин' },
            { id: 'dt68', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв' },
            { id: 'dt69', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок' },
            { id: 'dt70', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень' },
            { id: 'dt71', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок' },
            { id: 'dt72', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків' },
            { id: 'dt73', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів' },
            { id: 'dt74', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії' },
            { id: 'dt75', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #2' },
            { id: 'dt76', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #2' },
            { id: 'dt77', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #2' },
            { id: 'dt78', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #2' },
            { id: 'dt79', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #2' },
            { id: 'dt80', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #2' },
            { id: 'dt81', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #2' },
            { id: 'dt82', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #2' },
            { id: 'dt83', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #2' },
            { id: 'dt84', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #2' },
            { id: 'dt85', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #3' },
            { id: 'dt86', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #3' },
            { id: 'dt87', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #3' },
            { id: 'dt88', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #3' },
            { id: 'dt89', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #3' },
            { id: 'dt90', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #3' },
            { id: 'dt91', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #3' },
            { id: 'dt92', field: 'searchesToday', target: 12, xp: 100, desc: 'Головний дослідник: 12 пошуків #3' },
            { id: 'dt93', field: 'uniqueAnimeToday', target: 20, xp: 280, desc: 'Енциклопедист аніме: 20 тайтлів #3' },
            { id: 'dt94', field: 'episodesToday', target: 2, xp: 40, desc: 'Розігрів: 2 серії #3' },
            { id: 'dt95', field: 'episodesToday', target: 3, xp: 55, desc: 'Легкий старт: 3 серії #4' },
            { id: 'dt96', field: 'episodesToday', target: 25, xp: 320, desc: 'Аніме-марафонець: 25 серій #4' },
            { id: 'dt97', field: 'minutesToday', target: 5, xp: 20, desc: 'Швидкий погляд: 5 хвилин #4' },
            { id: 'dt98', field: 'minutesToday', target: 240, xp: 210, desc: 'Аніме на весь вечір: 240 хв #4' },
            { id: 'dt99', field: 'bookmarksToday', target: 12, xp: 160, desc: 'Великий список: 12 закладок #4' },
            { id: 'dt100', field: 'postsToday', target: 12, xp: 180, desc: 'Душа компанії: 12 повідомлень #4' },
            { id: 'dt101', field: 'likesToday', target: 12, xp: 110, desc: 'Головний критик: 12 оцінок #4' },
        ];

