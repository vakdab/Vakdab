import https from 'https';
https.get('https://api.hikka.io/anime?search=frieren', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
