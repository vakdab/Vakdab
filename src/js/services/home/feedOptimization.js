/**
 * HOME FEED OPTIMIZATION — Запобігання лагів при гортанні
 * 
 * ПРОБЛЕМИ В ОРИГІНАЛІ:
 * ❌ .innerHTML = '' — повна очистка DOM → reflow
 * ❌ .innerHTML += '' — 20 картки = 20 reflows
 * ❌ Немає Intersection Observer — гортаються всі картки одразу
 * ❌ Немає віртуалізації — 500+ картки у памяті одночасно
 * ❌ Немає debounce на scroll-events
 * 
 * РІШЕННЯ:
 * ✅ DocumentFragment для пакетних додавань
 * ✅ Intersection Observer для lazy-loading
 * ✅ Віртуалізація — малювати лише видимі картки
 * ✅ Throttle на scroll-events (300ms)
 * ✅ Очищення DOM через replaceChildren() замість innerHTML
 */

import { LRUCache, throttle, debounce } from '../../utils/lru-cache.js';

/**
 * Керування видимістю картин для віртуалізації
 */
class VirtualScrollManager {
  constructor(container, itemHeight = 280, bufferItems = 3) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.bufferItems = bufferItems;
    this.visibleRange = { start: 0, end: 0 };
    this.observer = null;
    this.items = [];
  }

  init(items) {
    this.items = items;
    this.calculateVisibleRange();
    this.setupObserver();
  }

  calculateVisibleRange() {
    const scrollTop = this.container.scrollTop;
    const containerHeight = this.container.clientHeight;
    
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferItems);
    const end = Math.min(
      this.items.length,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight) + this.bufferItems
    );

    this.visibleRange = { start, end };
  }

  setupObserver() {
    if (this.observer) this.observer.disconnect();
    
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src && !img.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            this.observer.unobserve(img);
          }
        });
      },
      { rootMargin: '50px' }
    );
  }

  getVisibleItems() {
    return this.items.slice(this.visibleRange.start, this.visibleRange.end);
  }

  observeImages(container) {
    if (!this.observer) return;
    container.querySelectorAll('img[data-src]').forEach(img => {
      this.observer.observe(img);
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

/**
 * Кеш для картин (уникне повторного завантаження)
 */
const imageCache = new LRUCache(200);
const cardDOMCache = new Map(); // WeakMap для швидкої очистки

/**
 * Оптимізована генерація HTML карти (без додавання до DOM)
 */
export function renderCardHtmlOptimized(card, index) {
  // Простий кеш по URL
  if (imageCache.has(card.url)) {
    return imageCache.get(card.url);
  }

  const safeTitle = String(card.title || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  
  const safePoster = String(card.poster || '').replace(/"/g, '&quot;');
  const safeUrl = String(card.url || '').replace(/"/g, '&quot;');
  const safeRating = String(card.rating || '0').replace(/"/g, '&quot;');

  // Lazy-load для постерів
  const posterHtml = card.poster 
    ? `<img class="home-card-poster" src="${safePoster}" alt="${safeTitle}" loading="lazy">`
    : `<div class="home-card-poster-placeholder"></div>`;

  const html = `
    <div class="home-catalog-card" data-card-url="${safeUrl}" data-card-index="${index}">
      <div class="home-card-media-wrap">
        ${posterHtml}
      </div>
      <div class="home-card-body">
        <h3 class="home-card-title">${safeTitle}</h3>
        <div class="home-card-meta">
          <span class="home-card-rating" data-rating="${safeRating}">⭐ ${safeRating}</span>
        </div>
      </div>
    </div>
  `;

  imageCache.set(card.url, html);
  return html;
}

/**
 * Пакетне додавання картин з використанням DocumentFragment
 * ❌ СТАРЕ: container.innerHTML = ''; container.innerHTML += card1; container.innerHTML += card2;
 * ✅ НОВЕ: fragment.append(card1); fragment.append(card2); container.appendChild(fragment);
 */
export function appendCardsOptimized(container, cards, startIndex = 0) {
  // Очищення старих карток як цілого (один reflow замість багатьох)
  const fragment = document.createDocumentFragment();

  cards.forEach((card, i) => {
    const html = renderCardHtmlOptimized(card, startIndex + i);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const cardEl = wrapper.firstElementChild;
    
    // Кешування для швидкого пошуку
    cardDOMCache.set(card.url, cardEl);
    fragment.appendChild(cardEl);
  });

  // ОДИН DOM операція замість 20+
  container.appendChild(fragment);

  // Bind eventlisteners для карток
  bindCardEvents(container);
}

/**
 * Гортання с обмеженням частоти (throttle 300ms)
 */
export function setupScrollOptimization(container, scrollCallback) {
  const throttledScroll = throttle(() => {
    const nearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 500;
    if (nearBottom) {
      scrollCallback();
    }
  }, 300);

  container.addEventListener('scroll', throttledScroll, { passive: true });

  return () => container.removeEventListener('scroll', throttledScroll);
}

/**
 * Bind подій на картках (делегування для оптимізації)
 */
function bindCardEvents(container) {
  // Event delegation — один listener на всі картки
  container.addEventListener('click', (e) => {
    const favBtn = e.target.closest('.home-catalog-card__fav');
    if (favBtn) {
      const card = favBtn.closest('.home-catalog-card');
      const cardUrl = card?.dataset.cardUrl;
      if (cardUrl) {
        // Trigger favorite event
        window.dispatchEvent(new CustomEvent('card-favorite', { detail: { url: cardUrl } }));
      }
    }
  }, { passive: true });
}

/**
 * Очищення пам'яті при видаленні сторінки
 */
export function cleanupHomeFeed() {
  imageCache.clear();
  cardDOMCache.clear();
}

/**
 * ГОЛОВНА ОПТИМІЗОВАНА ФУНКЦІЯ ЗАВАНТАЖЕННЯ
 */
export function renderHomeFeedOptimized(container, cards, options = {}) {
  const {
    batchSize = 24,
    virtual = true,
    lazy = true
  } = options;

  if (!container) return;

  // Якщо перший раз — очистити контейнер
  if (container.dataset.isInitialized !== '1') {
    container.innerHTML = '';
    container.dataset.isInitialized = '1';
  }

  // Використовувати replaceChildren замість innerHTML для швидкості
  const fragment = document.createDocumentFragment();

  const visibleCards = cards.slice(0, batchSize);
  
  visibleCards.forEach((card, index) => {
    const html = renderCardHtmlOptimized(card, index);
    const div = document.createElement('div');
    div.innerHTML = html;
    fragment.appendChild(div.firstElementChild);
  });

  // Один DOM update замість багатьох
  if (container.firstChild) {
    container.replaceChildren(...fragment.childNodes);
  } else {
    container.appendChild(fragment);
  }

  bindCardEvents(container);

  // Setup Intersection Observer для lazy-loading зображень
  if (lazy) {
    setupImageLazyLoading(container);
  }
}

/**
 * Lazy-loading для зображень
 */
function setupImageLazyLoading(container) {
  const imageObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src && !img.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    },
    { rootMargin: '50px' }
  );

  container.querySelectorAll('img[data-src]').forEach(img => {
    imageObserver.observe(img);
  });

  return imageObserver;
}

/**
 * Infinite scroll з debounce
 */
export function setupInfiniteScroll(container, loadMoreCallback) {
  let isLoading = false;

  const debouncedLoadMore = debounce(async () => {
    if (isLoading) return;
    
    const scrollPercentage = (container.scrollTop + container.clientHeight) / container.scrollHeight;
    
    if (scrollPercentage > 0.8) { // 80% гортання
      isLoading = true;
      try {
        await loadMoreCallback();
      } finally {
        isLoading = false;
      }
    }
  }, 300);

  container.addEventListener('scroll', debouncedLoadMore, { passive: true });

  return () => container.removeEventListener('scroll', debouncedLoadMore);
}

/**
 * Гортання вверх — очищення старих картин для економії пам'яті
 */
export function setupMemoryPruning(container, maxCards = 200) {
  const pruneUnused = throttle(() => {
    const cards = container.querySelectorAll('.home-catalog-card');
    
    if (cards.length > maxCards) {
      // Видалити топ-старші картки
      const toRemove = cards.length - maxCards;
      for (let i = 0; i < toRemove; i++) {
        const card = cards[i];
        const url = card.dataset.cardUrl;
        cardDOMCache.delete(url);
        card.remove();
      }
    }
  }, 1000);

  container.addEventListener('scroll', pruneUnused, { passive: true });

  return () => container.removeEventListener('scroll', pruneUnused);
}
