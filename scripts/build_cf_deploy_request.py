import json
from pathlib import Path

script = Path('/home/ubuntu/Vakdab/backend/telegram/worker.js').read_text()
code = """async () => {
  const script = %SCRIPT%;
  const boundary = `----manus${Date.now()}`;
  const metadata = JSON.stringify({ main_module: 'worker.js' });
  const body = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="metadata"',
    'Content-Type: application/json',
    '',
    metadata,
    `--${boundary}`,
    'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
    'Content-Type: application/javascript+module',
    '',
    script,
    `--${boundary}--`,
    ''
  ].join('\\r\\n');
  return cloudflare.request({ method: 'PUT', path: `/accounts/${accountId}/workers/scripts/vakdab/content`, body, contentType: `multipart/form-data; boundary=${boundary}`, rawBody: true });
}""".replace('%SCRIPT%', json.dumps(script))
Path('/tmp/cloudflare-deploy-input.json').write_text(json.dumps({'code': code}))
print('/tmp/cloudflare-deploy-input.json')
