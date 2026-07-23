// ===== ДОСЯГНЕННЯ =====
// Оригінальні рядки: L9556-L9607, L8389-L8399

import { auth, db } from '../config/firebase.js';
import { doc, getDoc } from "firebase/firestore";
import { Storage } from '../storage/storage.js';
import { calcTotalXP, getLevel } from './xp-system.js';
// getProfileStats accessed via window (avoids circular import)

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
