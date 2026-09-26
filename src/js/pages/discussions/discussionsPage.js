import { openPlayerPage } from '../player/animePlayerPage.js?v=20260924-discussions-v1';
import { escapeHtml, showToast } from '../../legacy/app-legacy.js?v=20260923-catalog-declutter-v2';
import { renderCommentsSkeleton } from '../../utils/skeleton.js';
import { Router } from '../../core/compat/router.js?v=20260901-home-recs-v3';
import { auth } from '../../services/firebase/client.js';
import {
    fetchRecentComments, fetchPopularComments, toggleCommentLike,
    timeAgoUk, countReplies, isSignedInUser
} from '../../services/comments/commentService.js?v=20260924-discussions-v1';

        // ====================================================================
        //  ОБГОВОРЕННЯ І КОМЕНТАРІ (стрічка останніх коментарів спільноти)
        // ====================================================================
        const FEED_PAGE_SIZE = 30;
        const discussionsState = {
            mode: 'recent',            // recent | popular
            search: '',
            loading: false,
            loaded: [],
            likeBusy: new Set()
        };

        function commentAvatarHtml(comment) {
            const media = String(comment.avatar || '');
            if (media) {
                const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(media);
                if (isVideo) return `<video class="dsc-avatar__media" src="${escapeHtml(media)}" autoplay muted loop playsinline aria-hidden="true"></video>`;
                return `<img class="dsc-avatar__media" src="${escapeHtml(media)}" alt="" loading="lazy">`;
            }
            return `<span class="dsc-avatar__letter">${escapeHtml((comment.nickname || '?').charAt(0).toUpperCase())}</span>`;
        }

        function commentCardHtml(comment, options = {}) {
            const liked = Boolean(options.currentUid && Array.isArray(comment.likedBy) && comment.likedBy.includes(options.currentUid));
            const replies = options.repliesCount ?? countReplies(discussionsState.loaded, comment.id);
            const poster = comment.animePoster || '';
            return `
            <article class="dsc-card" data-comment-id="${escapeHtml(comment.id)}">
                <button type="button" class="dsc-card__anime" data-anime-url="${escapeHtml(comment.animeUrl || '')}" title="${escapeHtml(comment.animeTitle || '')}" ${comment.animeUrl ? '' : 'disabled'}>
                    ${poster ? `<img class="dsc-card__poster" src="${escapeHtml(poster)}" alt="" loading="lazy" onerror="this.style.opacity=0">` : `<span class="dsc-card__poster dsc-card__poster--empty"><i class="fas fa-film"></i></span>`}
                    <span class="dsc-card__anime-title">${escapeHtml(comment.animeTitle || 'Аніме')}</span>
                </button>
                <div class="dsc-card__body">
                    <header class="dsc-card__head">
                        <div class="dsc-avatar">${commentAvatarHtml(comment)}</div>
                        <div class="dsc-card__author">
                            <span class="dsc-card__nickname">${escapeHtml(comment.nickname || 'Користувач')}</span>
                            <span class="dsc-card__time">${escapeHtml(timeAgoUk(comment.createdAt))}</span>
                        </div>
                        ${replies > 0 ? `<span class="dsc-card__replies" title="Відповіді"><i class="fas fa-reply" aria-hidden="true"></i> ${replies}</span>` : ''}
                    </header>
                    <p class="dsc-card__text">${escapeHtml(comment.text)}</p>
                    <footer class="dsc-card__actions">
                        <button type="button" class="dsc-like${liked ? ' is-liked' : ''}" data-like-id="${escapeHtml(comment.id)}" aria-label="Подобається">
                            <i class="fas fa-thumbs-up" aria-hidden="true"></i>
                            <span class="dsc-like__count">${comment.likes || 0}</span>
                        </button>
                        <button type="button" class="dsc-card__open" data-anime-url="${escapeHtml(comment.animeUrl || '')}" ${comment.animeUrl ? '' : 'disabled'}>
                            Обговорити <i class="fas fa-arrow-right" aria-hidden="true"></i>
                        </button>
                    </footer>
                </div>
            </article>`;
        }

        function applyFeedFilter(list) {
            const q = discussionsState.search.trim().toLowerCase();
            if (!q) return list;
            return list.filter(c =>
                String(c.text || '').toLowerCase().includes(q) ||
                String(c.nickname || '').toLowerCase().includes(q) ||
                String(c.animeTitle || '').toLowerCase().includes(q)
            );
        }

        function renderFeedList() {
            const wrap = document.getElementById('discussionsList');
            if (!wrap) return;
            const filtered = applyFeedFilter(discussionsState.loaded);
            if (!filtered.length) {
                wrap.innerHTML = `
                    <div class="dsc-empty">
                        <i class="fas fa-comments" aria-hidden="true"></i>
                        <p>${discussionsState.search ? 'Нічого не знайдено за цим запитом' : 'Ще немає коментарів'}</p>
                        <p class="sub">Відкрийте будь-яке аніме і напишіть перший відгук — він з’явиться тут.</p>
                    </div>`;
                return;
            }
            const uid = auth?.currentUser?.uid || null;
            wrap.innerHTML = filtered.map(c => commentCardHtml(c, { currentUid: uid })).join('');
        }

        async function loadFeed(reset = false) {
            if (discussionsState.loading) return;
            const listEl = document.getElementById('discussionsList');
            if (reset && listEl) listEl.innerHTML = renderCommentsSkeleton(5);
            discussionsState.loading = true;
            try {
                const fetcher = discussionsState.mode === 'popular' ? fetchPopularComments : fetchRecentComments;
                const loaded = await fetcher(FEED_PAGE_SIZE);
                discussionsState.loaded = loaded || [];
                renderFeedList();
            } catch (e) {
                console.warn('[discussions] load error:', e);
                if (listEl) listEl.innerHTML = '';
                showToast('Обговорення тимчасово недоступне');
            } finally {
                discussionsState.loading = false;
            }
        }

        export function renderDiscussionsPage() {
            const container = document.getElementById('discussionsPageContainer');
            if (!container) return;
            if (container.querySelector('.discussions-page')) {
                // Сторінка вже збудована — лише оновлюємо дані.
                syncFeedTabs();
                loadFeed(true);
                return;
            }
            container.innerHTML = `
            <section class="discussions-page" aria-label="Обговорення">
                <div class="discussions-toolbar">
                    <div class="discussions-tabs" role="tablist" aria-label="Сортування">
                        <button type="button" class="discussions-tab is-active" data-discussions-mode="recent" role="tab" aria-selected="true">Останні</button>
                        <button type="button" class="discussions-tab" data-discussions-mode="popular" role="tab" aria-selected="false">Популярні</button>
                    </div>
                    <div class="discussions-search">
                        <i class="fas fa-search" aria-hidden="true"></i>
                        <input type="text" id="discussionsSearchInput" placeholder="Пошук у коментарях..." autocomplete="off" value="${escapeHtml(discussionsState.search)}">
                        <button type="button" class="discussions-search__clear" id="discussionsSearchClear" aria-label="Очистити"><i class="fas fa-times-circle"></i></button>
                    </div>
                </div>
                <div id="discussionsList" class="discussions-list">${renderCommentsSkeleton(5)}</div>
            </section>`;

            container.querySelectorAll('[data-discussions-mode]').forEach(tab => {
                tab.addEventListener('click', () => {
                    discussionsState.mode = tab.dataset.discussionsMode;
                    syncFeedTabs();
                    loadFeed(true);
                });
            });

            const searchInput = document.getElementById('discussionsSearchInput');
            const searchClear = document.getElementById('discussionsSearchClear');
            let searchDebounce;
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value;
                    discussionsState.search = q;
                    if (searchClear) searchClear.classList.toggle('visible', q.length > 0);
                    clearTimeout(searchDebounce);
                    searchDebounce = setTimeout(renderFeedList, 250);
                });
            }
            if (searchClear) {
                searchClear.addEventListener('click', () => {
                    discussionsState.search = '';
                    if (searchInput) {
                        searchInput.value = '';
                        searchInput.focus();
                    }
                    searchClear.classList.remove('visible');
                    renderFeedList();
                });
            }

            // Делегування: лайк / перехід до аніме.
            container.addEventListener('click', async e => {
                const likeBtn = e.target.closest?.('[data-like-id]');
                if (likeBtn) {
                    e.preventDefault();
                    const id = likeBtn.dataset.likeId;
                    if (discussionsState.likeBusy.has(id)) return;
                    if (!isSignedInUser()) {
                        showToast('Увійдіть, щоб оцінювати коментарі');
                        Router.goTo('profile');
                        return;
                    }
                    const comment = discussionsState.loaded.find(c => c.id === id);
                    if (!comment) return;
                    discussionsState.likeBusy.add(id);
                    const res = await toggleCommentLike(comment);
                    if (res.ok) {
                        const uid = auth?.currentUser?.uid;
                        if (uid) {
                            const i = (comment.likedBy || []).indexOf(uid);
                            if (i >= 0) comment.likedBy.splice(i, 1); else (comment.likedBy = comment.likedBy || []).push(uid);
                            comment.likes = comment.likedBy.length;
                        }
                        renderFeedList();
                    } else {
                        showToast('Не вдалося оцінити коментар');
                    }
                    discussionsState.likeBusy.delete(id);
                    return;
                }
                const openBtn = e.target.closest?.('[data-anime-url]:not([disabled])');
                if (openBtn && openBtn.dataset.animeUrl) {
                    e.preventDefault();
                    openPlayerPage(openBtn.dataset.animeUrl);
                }
            });

            loadFeed(true);
        }

        function syncFeedTabs() {
            document.querySelectorAll('[data-discussions-mode]').forEach(tab => {
                const active = tab.dataset.discussionsMode === discussionsState.mode;
                tab.classList.toggle('is-active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });
        }
