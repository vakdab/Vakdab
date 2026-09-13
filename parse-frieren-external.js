import fs from 'fs';
const data = JSON.parse(fs.readFileSync('frieren.json', 'utf8'));
console.log("External:", data.external);
