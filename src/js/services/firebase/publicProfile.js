function normalizeProfile(uid, data = {}) {
    const profile = data.profile || {};
    const rawNickname = String(profile.nickname || profile.username || '').trim();
    const nicknameBase = rawNickname.replace(/^@+/, '').replace(/\s+/g, '_').replace(/[^\p{L}\p{N}._-]/gu, '').slice(0, 24);
    const normalizedNickname = nicknameBase ? `@${nicknameBase}` : '@user';
    const rawRealName = String(profile.realName || '').trim();
    const normalizedRealName = rawRealName.replace(/^@+/, '') || (rawNickname && rawNickname !== 'Користувач' ? rawNickname.replace(/^@+/, '') : '');

    return {
        uid,
        nickname: normalizedNickname,
        realName: normalizedRealName,
        bio: String(profile.bio || ''),
        bioBold: profile.bioBold === true,
        avatar: String(profile.avatar || ''),
        avatarVideo: String(profile.avatarVideo || ''),
        avatarVideoSettings: profile.avatarVideoSettings || {},
        banner: String(profile.banner || ''),
        bannerVideo: String(profile.bannerVideo || ''),
        bannerVideoSettings: profile.bannerVideoSettings || {},
        bannerFormat: profile.bannerFormat === 'wide' ? 'wide' : 'narrow',
        bannerEffect: String(profile.bannerEffect || 'none'),
        atmosphere: String(profile.atmosphere || 'none'),
        effect: String(profile.effect || 'none'),
        avatarDecoration: String(profile.avatarDecoration || 'none'),
        private: profile.private === true,
        hideHistory: profile.hideHistory === true,
        hideBookmarks: profile.hideBookmarks === true,
        history: Array.isArray(data.history) ? data.history.slice(-100).reverse() : [],
        bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks.slice(0, 100) : [],
        watchTime: Number(data.watchTime || 0),
        xp: Number(data.xp || 0),
        createdAt: data.createdAt || null
    };
}

export async function getPublicProfile(uid) {
    const targetUid = String(uid || '').trim();
    if (!targetUid) return null;

    try {
        const res = await fetch(`/api/users/${encodeURIComponent(targetUid)}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return normalizeProfile(data.uid || targetUid, data);
    } catch (e) {
        console.warn('[VakDab] getPublicProfile error:', e);
        return null;
    }
}
