import { ACHIEVEMENTS } from "../config/constants.js";
export function getAchievements(stats) {
  return ACHIEVEMENTS.map(a => {
    const val = stats[a.field] || 0;
    return { id: a.id, name: a.name, description: a.req, unlocked: val >= a.need, progress: Math.min(Math.floor(val / a.need * 100), 100), icon: a.icon };
  });
}
