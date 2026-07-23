// ===== ДОСЯГНЕННЯ =====
// Оригінальні рядки: L9556-L9607, L8389-L8399

import { auth, db } from '../config/firebase.js';
import { doc, getDoc } from "firebase/firestore";
import { Storage } from '../storage/storage.js';

        export function getMyEarnedAchievements() {
            const history   = Storage.getHistory()   || [];
            const bookmarks = Storage.getBookmarks() || [];
            const watchSec  = Storage.getWatchTime() || 0;
            const episodes  = history.length;
            const totalXP   = calcTotalXP();
            const xpLvl     = getLevel(totalXP);
            const achStats  = { episodes, watchTime: watchSec, bookmarks: bookmarks.length, xp: totalXP, level: xpLvl, posts: DailyStats.getTotalPosts(), ratings: DailyStats.getTotalRatings() };
            return ACHIEVEMENTS.filter(a => achStats[a.field] >= a.need);
        }


        export function getProfileStats() {
            const history = Storage.getHistory();
            const bookmarks = Storage.getBookmarks();
            const uniqueAnime = new Set(history.map(h => h.animeId || h.title));
            const totalEpisodes = history.length;
            const totalWatchTime = Storage.getWatchTime() || history.reduce((sum, h) => sum + (h.duration || 0), 0);
            const hours = Math.floor(totalWatchTime / 3600);
            const minutes = Math.floor((totalWatchTime % 3600) / 60);
            const achievements = getAchievements(history, bookmarks, uniqueAnime.size, totalEpisodes, totalWatchTime);
            return {
                viewed: totalEpisodes,
                bookmarks: bookmarks.length,
                achievements: achievements.filter(a => a.unlocked).length,
                totalAchievements: achievements.length,
                watchHours: hours,
                watchMinutes: minutes,
                totalWatchTime: totalWatchTime,
                uniqueAnime: uniqueAnime.size,
                achievementsList: achievements,
                history: history.slice(0, 50),
                bookmarksList: bookmarks
            };
        }

        export function getAchievements(history, bookmarks, uniqueCount, totalEpisodes, totalWatchTime) {
            const xp = calcTotalXP();
            const lvl = getLevel(xp);
            const stats = {
                episodes: totalEpisodes,
                watchTime: totalWatchTime,
                bookmarks: bookmarks.length,
                xp: xp,
                level: lvl,
                posts: DailyStats.getTotalPosts(),
                ratings: DailyStats.getTotalRatings()
            };
            return ACHIEVEMENTS.map(a => {
                const val = stats[a.field] || 0;
                return {
                    id: a.id,
                    name: a.name,
                    description: a.req,
                    unlocked: val >= a.need,
                    progress: Math.min(Math.floor(val / a.need * 100), 100),
                    icon: a.icon
                };
            });
        }

        
        // Стиснення зображення перед збереженням (щоб Firestore не падав)
        // Upload image to Cloudinary, return URL
