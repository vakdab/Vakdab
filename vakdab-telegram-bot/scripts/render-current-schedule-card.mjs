import { readFile, writeFile } from 'node:fs/promises';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { PhotonImage, watermark } from '@cf-wasm/photon';
import { buildScheduleCardSvg } from '../worker.js';

const response = await fetch('https://api.mikai.me/v1/schedule');
if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
const payload = await response.json();
const schedule = payload?.result || payload;
const [wasm, font, header] = await Promise.all([
  readFile(new URL('../../resvg.wasm', import.meta.url)),
  readFile(new URL('../../schedule-font.ttf', import.meta.url)),
  readFile(new URL('../../schedule-header.png', import.meta.url))
]);

await initWasm(wasm);
const svg = buildScheduleCardSvg(schedule);
const renderer = new Resvg(svg, {
  background: '#151515',
  font: { fontBuffers: [font], defaultFontFamily: 'DejaVu Sans' },
  fitTo: { mode: 'width', value: 1125 }
});
const scheduleImage = PhotonImage.new_from_byteslice(renderer.render().asPng());
const headerImage = PhotonImage.new_from_byteslice(header);
watermark(scheduleImage, headerImage, 0n, 0n);
await writeFile(new URL('../../schedule-card-preview.png', import.meta.url), scheduleImage.get_bytes());
headerImage.free();
scheduleImage.free();
renderer.free();
console.log('SCHEDULE_CARD_RENDER_OK');
