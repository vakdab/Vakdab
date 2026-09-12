import { Storage } from '../../core/compat/storage.js';
import { Auth } from '../../core/compat/auth.js';

export function normalizeNickname(value, fallback = '@user') {
    const raw = String(value || '').trim().replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^\p{L}\p{N}._-]/gu, '').slice(0, 24);
    return raw ? `@${raw}` : fallback;
}

export function stripNicknamePrefix(value) {
    return String(value || '').trim().replace(/^@+/, '');
}

export function getProfileDisplayName(profile) {
    const name = stripNicknamePrefix(profile?.realName);
    if (name) return name;
    return stripNicknamePrefix(profile?.nickname) || 'Користувач';
}

export function getProfileHandle(profile) {
    return normalizeNickname(profile?.nickname, '@user');
}

export function getDefaultProfile() {
    return {
        nickname: '@user',
        avatar: '',
        avatarVideo: '',
        banner: '',
        bannerVideo: '',
        bio: 'Аніме ентузіаст. Дивлюсь усе підряд — від слайс-оф-лайф до психологічного трилера.',
        bioBold: false,
        realName: '',
        birthdate: '',
        showBirthdate: true,
        private: false,
        hideHistory: false,
        hideBookmarks: false,
        effect: 'none',
        atmosphere: 'none',
        avatarDecoration: 'none',
        bannerEffect: 'none',
        bannerFormat: 'narrow'
    };
}

export function getProfile() {
    const p = Storage.getProfile();
    const def = getDefaultProfile();
    if (!p) { Storage.setProfile(def); return def; }
    // Мердж дефолтів і нормалізація старих/пошкоджених profile fields.
    const merged = { ...def, ...p };
    ['nickname', 'avatar', 'avatarVideo', 'banner', 'bannerVideo', 'bio', 'realName', 'birthdate', 'effect', 'atmosphere', 'avatarDecoration', 'bannerEffect', 'bannerFormat'].forEach(key => {
        if (typeof merged[key] !== 'string') merged[key] = def[key];
    });
    const legacyNickname = String(merged.nickname || '').trim();
    if (!merged.realName && legacyNickname && legacyNickname !== 'Користувач' && !legacyNickname.startsWith('@')) merged.realName = legacyNickname;
    merged.nickname = normalizeNickname(legacyNickname, def.nickname);
    merged.realName = stripNicknamePrefix(merged.realName);
    if (merged.bannerFormat !== 'narrow' && merged.bannerFormat !== 'wide') merged.bannerFormat = def.bannerFormat;
    merged.bioBold = merged.bioBold === true;
    merged.hideHistory = merged.hideHistory === true;
    merged.hideBookmarks = merged.hideBookmarks === true;
    return merged;
}

export function saveProfile(data) {
    Storage._setProfile(data);
    if (Auth.isAuthenticated()) {
        const syncPromise = Auth.syncUserData({ scope: 'profile' }).catch(error => {
            console.warn('[VakDab] profile sync failed:', error);
            return { ok: false, error: error?.message || 'Не вдалося зберегти профіль' };
        });
        Auth._lastProfileSync = syncPromise;
        return syncPromise;
    }
    return Promise.resolve({ ok: true, localOnly: true });
}

export function getProfileStats() {
    const history = Storage.getHistory();
    const bookmarks = Storage.getBookmarks();
    const uniqueAnime = new Set(history.map(h => h.animeId || h.title));
    const totalEpisodes = history.length;
    const totalWatchTime = Storage.getWatchTime() || history.reduce((sum, h) => sum + (h.duration || 0), 0);
    const minutes = Math.floor(totalWatchTime / 60);
    return {
        viewed: totalEpisodes,
        bookmarks: bookmarks.length,
        watchMinutes: minutes,
        totalWatchTime: totalWatchTime,
        uniqueAnime: uniqueAnime.size,
        history: history.slice(0, 50),
        historyCount: history.length,
        bookmarksList: bookmarks
    };
}
