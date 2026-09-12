import https from 'https';
const req = https.request('https://api.hikka.io/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
req.write(JSON.stringify({
  query: `query { animes(search: "Frieren") { list { slug title_uk } } }`
}));
req.end();
