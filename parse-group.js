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

const html = fs.readFileSync('frieren-mikai.html', 'utf8');
const match = html.match(/<script[^>]+id=[\"']__NUXT_DATA__[\"'][^>]*>([\s\S]*?)<\/script>/i);
const payload = JSON.parse(match[1]);
const resolved = resolveMikaiNuxtPayload(payload);

resolved.forEach((value, i) => {
    if (value && typeof value === 'object') {
        if (Array.isArray(value.players)) {
            console.log("Found players array of length", value.players.length);
            console.log(JSON.stringify(value.players[0], null, 2));
        }
    }
});
