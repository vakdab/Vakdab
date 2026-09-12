import https from 'https';
https.get('https://api.mikai.me/v1/search?q=frieren', (res) => {
  let data = ''; res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
