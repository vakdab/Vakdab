import fs from 'fs';
const code = fs.readFileSync('src/js/services/catalog/catalog.js', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('export async function loadHikkaDetail'));
console.log(lines.slice(start, start + 50).join('\n'));
