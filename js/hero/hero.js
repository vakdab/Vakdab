import { fetchAnimeuaTop100, fetchAnimeuaMain, loadAnimeuaDetail } from "../api/animeua.js";
import { openPlayerPage } from "../player/player-page.js";

let heroItems = [], heroCurrentIndex = 0, heroRotationTimer = null, heroProgressInterval = null;
const HERO_SLIDE_DURATION = 6000;

export async function buildHeroBanner() {
  const wrapper = document.getElementById('heroWrapper');
  if (!wrapper) return;
  const [topResult, mainResult] = await Promise.allSettled([fetchAnimeuaTop100(), fetchAnimeuaMain(1)]);
  const topAnime = topResult.status === 'fulfilled' ? (topResult.value || []) : [];
  const ordinaryAnime = mainResult.status === 'fulfilled' ? (mainResult.value || []) : [];
  const getRandomItems = (arr, n) => {
    const valid = arr.filter(a => a.images?.jpg?.large_image_url);
    const shuffled = [...valid].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
  };
  heroItems = [...getRandomItems(topAnime, 4), ...getRandomItems(ordinaryAnime, 4)].sort(() => 0.5 - Math.random());
  if (!heroItems.length) { wrapper.style.display = 'none'; return; }
  if (window.Router?.currentRoute !== 'main') { wrapper.style.display = 'none'; return; }
  wrapper.style.display = 'block';
  heroCurrentIndex = 0;
  renderHeroSlide(heroItems[0]);
  buildHeroIndicators();
  startHeroRotation();
  loadHeroItemDetails(0).then(() => { if (heroCurrentIndex === 0) renderHeroSlide(heroItems[0]); }).catch(() => {});
  if (heroItems.length > 1) loadHeroItemDetails(1).catch(() => {});
}

async function loadHeroItemDetails(idx) {
  if (idx < 0 || idx >= heroItems.length) return;
  const item = heroItems[idx];
  if (item.detailsLoaded) return;
  try {
    const detail = await Promise.race([loadAnimeuaDetail(item.url), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))]);
    item.genres = detail.genres || [];
    item.totalEpisodes = detail.totalEpisodes || 0;
    item.synopsis = detail.synopsis || '';
    item.year = detail.year || item.year || '';
    item.detailsLoaded = true;
    item.rating = (7 + Math.random() * 2.5).toFixed(1);
  } catch (e) {
    item.genres = item.genres || ['Аніме'];
    item.totalEpisodes = item.totalEpisodes || 0;
    item.synopsis = item.synopsis || 'Натисніть «Дивитися», щоб перейти до перегляду.';
    item.rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
    item.detailsLoaded = true;
  }
}

function renderHeroSlide(item) {
  const container = document.getElementById('heroSlidesContainer');
  if (!container || !item) return;
  const poster = item.images?.jpg?.large_image_url || '';
  const title = (item.title || 'Без назви').length > 38 ? item.title.substring(0, 38) + '…' : item.title;
  const genres = item.genres || ['Аніме'];
  const rating = item.rating || (7 + Math.random() * 2.5).toFixed(1);
  const year = item.year || '';
  const episodes = item.totalEpisodes || 0;
  const synopsis = item.synopsis || '';
  const metaParts = [];
  if (year) metaParts.push(year);
  if (episodes > 0) metaParts.push(episodes + ' еп.');
  const metaHtml = metaParts.length > 0 ? `<div class="hero-meta">${metaParts.join(' <span class="hero-meta-dot"></span> ')}</div>` : '';
  const synopsisHtml = synopsis ? `<div class="hero-slide-desc">${synopsis.substring(0, 220)}${synopsis.length > 220 ? '…' : ''}</div>` : '';
  const slide = document.createElement('div');
  slide.className = 'hero-slide active';
  slide.dataset.url = item.url;
  const safePoster = poster || '';
  const bgStyle = safePoster ? `background-image: url('${safePoster}');` : 'background: linear-gradient(135deg, #1a1a1a, #2d2d2d);';
  slide.innerHTML = `
    <div class="hero-slide-bg" style="${bgStyle}"></div>
    <div class="hero-slide-overlay"></div>
    <div class="hero-slide-content">
      <div class="hero-slide-title">${title}</div>
      ${synopsisHtml}
      <div class="hero-slide-tags">${genres.slice(0, 4).map(g => `<span class="hero-tag genre-tag">${g}</span>`).join('')}</div>
      <div class="hero-slide-btn-row">
        <button class="hero-slide-btn"><span>Дивитися</span><span class="btn-icon"><i class="fas fa-play"></i></span></button>
        <div class="hero-rating-row"><div class="hero-rating-badge"><span class="star">★</span> ${rating}</div>${metaHtml}</div>
      </div>
    </div>
  `;
  container.innerHTML = '';
  container.appendChild(slide);
  slide.querySelector('.hero-slide-btn').addEventListener('click', (e) => { e.stopPropagation(); if (item.url) openPlayerPage(item.url); });
  slide.addEventListener('click', () => { if (item.url) openPlayerPage(item.url); });
  if (safePoster) {
    const img = new Image();
    img.onload = () => { const bg = slide.querySelector('.hero-slide-bg'); if (bg) bg.style.backgroundImage = `url('${safePoster}')`; };
    img.onerror = () => { const bg = slide.querySelector('.hero-slide-bg'); if (bg) bg.style.background = 'linear-gradient(135deg, #1a1a1a, #2d2d2d)'; };
    img.src = safePoster;
  }
}

function buildHeroIndicators() {
  const dots = document.getElementById('heroDots');
  if (!dots) return;
  dots.innerHTML = '';
  heroItems.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.className = 'hero-dot' + (idx === heroCurrentIndex ? ' active' : '');
    dot.addEventListener('click', () => goToSlide(idx));
    dots.appendChild(dot);
  });
}

function updateHeroIndicators() {
  document.querySelectorAll('.hero-dot').forEach((dot, idx) => dot.classList.toggle('active', idx === heroCurrentIndex));
}

async function goToSlide(idx) {
  if (idx < 0 || idx >= heroItems.length || idx === heroCurrentIndex) return;
  heroCurrentIndex = idx;
  renderHeroSlide(heroItems[idx]);
  updateHeroIndicators();
  resetHeroTimer();
  if (!heroItems[idx].detailsLoaded) loadHeroItemDetails(idx).then(() => { if (heroCurrentIndex === idx) renderHeroSlide(heroItems[idx]); }).catch(() => {});
  const nextIdx = (idx + 1) % heroItems.length;
  if (!heroItems[nextIdx].detailsLoaded) loadHeroItemDetails(nextIdx).catch(() => {});
}

function nextSlide() { goToSlide((heroCurrentIndex + 1) % heroItems.length); }
function prevSlide() { goToSlide((heroCurrentIndex - 1 + heroItems.length) % heroItems.length); }

function startHeroRotation() {
  stopHeroRotation();
  if (heroItems.length < 2) return;
  const fill = document.getElementById('heroProgressFill');
  let elapsed = 0;
  if (fill) fill.style.width = '0%';
  heroProgressInterval = setInterval(() => { elapsed += 50; if (fill) fill.style.width = (elapsed / HERO_SLIDE_DURATION * 100) + '%'; }, 50);
  heroRotationTimer = setTimeout(nextSlide, HERO_SLIDE_DURATION);
}
function stopHeroRotation() {
  if (heroRotationTimer) { clearTimeout(heroRotationTimer); heroRotationTimer = null; }
  if (heroProgressInterval) { clearInterval(heroProgressInterval); heroProgressInterval = null; }
  const fill = document.getElementById('heroProgressFill');
  if (fill) fill.style.width = '0%';
}
function resetHeroTimer() { stopHeroRotation(); startHeroRotation(); }

document.getElementById('heroPrevBtn').addEventListener('click', prevSlide);
document.getElementById('heroNextBtn').addEventListener('click', nextSlide);
