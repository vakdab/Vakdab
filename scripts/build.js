import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to ensure target dir exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Order of CSS files matching the original architecture
const cssFiles = [
  'src/styles/base/reset.css',
  'src/styles/base/variables.css',
  'src/styles/base/typography.css',
  'src/styles/themes/light.css',
  'src/styles/themes/dark.css',
  'src/styles/utils/animations.css',
  'src/styles/utils/glassmorphism.css',
  'src/styles/utils/utilities.css',
  'src/styles/components/hero.css',
  'src/styles/components/home-quick-filter.css',
  'src/styles/components/left-menu.css',
  'src/styles/components/toast.css',
  'src/styles/components/back-to-top.css',
  'src/styles/components/anime-card.css',
  'src/styles/components/genre-section.css',
  'src/styles/components/pagination.css',
  'src/styles/components/loader.css',
  'src/styles/pages/search.css',
  'src/styles/pages/profile.css',
  'src/styles/pages/settings.css',
  'src/styles/pages/genre.css',
  'src/styles/pages/genres.css',
  'src/styles/pages/schedule.css',
  'src/styles/pages/rating.css',
  'src/styles/pages/stickers.css',
  'src/styles/pages/manga.css',
  'src/styles/player/player-modal.css',
  'src/styles/player/anime-info.css',
  'src/styles/player/video-player.css',
  'src/styles/player/episodes.css',
  'src/styles/pages/main.css',
  'src/styles/player/player-polish.css',
  'src/styles/player/video-overlay.css',
  'src/styles/pages/design-polish.css',
  'src/styles/pages/ux-2026.css',
  'src/styles/pages/live.css',
  'src/styles/layout-polish.css',
  'src/styles/components/mobile-adaptive.css',
  'src/styles/bundle-entry.css'
];

export function buildCSS() {
  console.log('[Build] Compiling CSS modules...');
  const parts = [];
  for (const relPath of cssFiles) {
    const fullPath = path.join(rootDir, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const header = `/* ${relPath.replace(/^src\//, 'src/')} */\n`;
      parts.push(header + content);
    }
  }

  const output = parts.join('\n\n') + '\n';
  const outPath = path.join(rootDir, 'css/style.css');
  const rootOutPath = path.join(rootDir, 'style.css');
  ensureDir(outPath);
  fs.writeFileSync(outPath, output, 'utf8');
  fs.writeFileSync(rootOutPath, output, 'utf8');
  console.log(`[Build] Wrote ${output.length} bytes to css/style.css and style.css`);
}

export function buildJS() {
  console.log('[Build] Verifying and assembling JS modules...');
  // Ensure runtime preamble exists
  const preamblePath = path.join(rootDir, 'src/js/core/runtime-preamble.js');
  const preamble = fs.existsSync(preamblePath) ? fs.readFileSync(preamblePath, 'utf8') + '\n\n' : '';
  
  // Note: js/script.js is the active tested runtime bundle
  const activeScriptPath = path.join(rootDir, 'js/script.js');
  const rootScriptPath = path.join(rootDir, 'script.js');
  if (fs.existsSync(activeScriptPath)) {
    const content = fs.readFileSync(activeScriptPath, 'utf8');
    fs.writeFileSync(rootScriptPath, content, 'utf8');
    console.log(`[Build] Synced js/script.js to root script.js (${content.length} bytes)`);
  }
}

export function buildAll() {
  console.log('=== Building VakDab Modules ===');
  buildCSS();
  buildJS();
  console.log('=== Build Complete ===');
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAll();
}
