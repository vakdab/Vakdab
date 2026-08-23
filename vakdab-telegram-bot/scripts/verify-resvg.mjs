import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@cf-wasm/resvg';

const font = await readFile(new URL('../../schedule-font.ttf', import.meta.url));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1125" height="420" viewBox="0 0 1125 420">
  <rect width="1125" height="420" fill="#16151b"/>
  <text x="56" y="100" fill="#f5f1ea" font-family="DejaVu Sans" font-size="46" font-weight="700">Тижневий розклад аніме</text>
  <text x="56" y="170" fill="#c8c1b6" font-family="DejaVu Sans" font-size="28">Понеділок · 05:00 · Безсмертний Відступник</text>
</svg>`;

const renderer = await Resvg.async(svg, { font: { fontBuffers: [font], defaultFontFamily: 'DejaVu Sans' } });
await writeFile(new URL('../../schedule-render-smoke-test.png', import.meta.url), renderer.render().asPng());
console.log('PNG_RENDER_OK');
