import https from 'https';
https.get('https://api.mikai.me/v1/search?query=Frieren', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log(data));
});
