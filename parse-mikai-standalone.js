import fs from 'fs';

function resolveMikaiNuxtPayload(payload) {
    const memo = new Map();
    const resolving = new Set();
    const resolveRef = (index) => {
        if (!Number.isInteger(index) || index < 0 || index >= payload.length) return index;
        if (memo.has(index)) return memo.get(index);
        if (resolving.has(index)) return null;
        resolving.add(index);
        const raw = payload[index];
        let value;
        if (typeof raw === 'number') value = raw;
        else if (Array.isArray(raw)) {
            const tag = typeof raw[0] === 'string' ? raw[0] : '';
            if (['ShallowReactive', 'Reactive', 'Set', 'Date', 'URL'].includes(tag) && raw.length > 1) {
                value = resolveRef(raw[1]);
            } else {
                value = raw.map(item => typeof item === 'number' ? resolveRef(item) : item);
            }
        } else if (raw && typeof raw === 'object') {
            value = {};
            Object.entries(raw).forEach(([key, item]) => {
                value[key] = typeof item === 'number' ? resolveRef(item) : item;
            });
        } else value = raw;
        resolving.delete(index);
        memo.set(index, value);
        return value;
    };
    return payload.map((_, index) => resolveRef(index));
}

function parseMikaiSeasonsFromHtml(html) {
    const htmlText = String(html || '');
    const posterCandidates = [...htmlText.matchAll(/https?:\/\/images\.mikai\.me\/(?:ua_poster|poster)\/(?:big|medium|small)\/[^"'<>\s]+/gi)]
        .map(match => match[0].replace(/&amp;/gi, '&'));
    const mikaiPosterUrl = posterCandidates.find(url => /\/ua_poster\/big\//i.test(url)) ||
        posterCandidates.find(url => /\/ua_poster\/medium\//i.test(url)) ||
        posterCandidates.find(url => /\/poster\/big\//i.test(url)) ||
        posterCandidates.find(url => /\/poster\/medium\//i.test(url)) || '';
    const match = htmlText.match(/<script[^>]+id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) throw new Error('Mikai Nuxt payload не знайдено');
    let payload;
    try { payload = JSON.parse(match[1]); } catch { throw new Error('Mikai Nuxt payload пошкоджений'); }
    const resolved = resolveMikaiNuxtPayload(payload);
    const playerGroups = [];
    resolved.forEach(value => {
        if (Array.isArray(value?.players)) playerGroups.push(...value.players);
    });
    const dubs = new Map();
    const dubLogos = {};
    const subtitleLogos = {};
    playerGroups.forEach(group => {
        const team = group?.team;
        if (!team || !team.name) return;
        const dubName = team.name.trim();
        const eps = group.episodes;
        if (!Array.isArray(eps) || !eps.length) return;
        if (!dubs.has(dubName)) dubs.set(dubName, []);
        const targetArray = dubs.get(dubName);
        if (team.logo) {
            const logoPath = String(team.logo);
            const fullLogoUrl = logoPath.startsWith('http') ? logoPath : `https://images.mikai.me/team/small/${logoPath}`;
            dubLogos[dubName] = fullLogoUrl;
            if (/субтит/i.test(dubName) || /sub/i.test(dubName) || eps.some(ep => ep?.isSubs)) subtitleLogos[dubName] = fullLogoUrl;
        }
        eps.forEach(ep => {
            const rawSource = ep?.source || '';
            const epNum = String(ep?.number || '').trim();
            if (!epNum) return;
            const linkMatch = rawSource.match(/src="([^"]+)"/);
            const link = linkMatch ? linkMatch[1] : (rawSource.startsWith('http') ? rawSource : '');
            if (!link) return;
            const isAshdi = /ashdi\.vip|ukr\.stream/i.test(link);
            const isTortuga = /tortuga\.wtf/i.test(link);
            const isMoon = /moonanime/i.test(link);
            const provider = isAshdi ? 'ASHDI' : (isTortuga ? 'Tortuga' : (isMoon ? 'MoonAnime' : 'Інший'));
            targetArray.push({
                episode: epNum,
                file: link,
                dub: dubName,
                provider: provider,
                label: dubName,
                isSubs: ep?.isSubs === true,
                teamLogo: dubLogos[dubName] || ''
            });
        });
    });
    dubs.forEach((eps) => { eps.sort((a, b) => Number(a.episode) - Number(b.episode)); });
    const formatted = {};
    for (const [k, v] of dubs.entries()) if (v.length > 0) formatted[k] = v;
    return {
        seasons: Object.keys(formatted).length ? { '1': formatted } : {},
        dubLogos,
        subtitleLogos,
        mikaiPosterUrl
    };
}

const html = fs.readFileSync('frieren-mikai.html', 'utf8');
console.log(JSON.stringify(parseMikaiSeasonsFromHtml(html), null, 2));
