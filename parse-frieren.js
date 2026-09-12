import fs from 'fs';
const data = JSON.parse(fs.readFileSync('frieren.json', 'utf8'));
console.log("Keys:", Object.keys(data));
if (data.urls) console.log("urls:", data.urls);
if (data.external_links) console.log("external_links:", data.external_links);
