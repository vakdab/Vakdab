import https from 'https';
https.get('https://api.hikka.io/anime', (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(parsed.list?.filter(a => String(a.title_ua || a.title_en || '').toLowerCase().includes('frieren')).map(a => a.slug));
    } catch(e) {}
  });
});
