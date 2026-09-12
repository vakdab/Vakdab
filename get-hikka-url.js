import fs from 'fs';
const d = JSON.parse(fs.readFileSync('frieren-detail.json', 'utf8'));
const external = Array.isArray(d.external) ? d.external : [];
const url = external.find(item => item?.type === 'watch' && /^https?:\/\/(?:www\.)?mikai\.me\/anime\//i.test(item.url || ''))?.url || '';
console.log('Mikai URL:', url);
