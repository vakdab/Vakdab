import { escapeHtml, showToast } from '../../legacy/app-legacy.js?v=20260926-comments-auth-v1';
import { Router } from '../../core/compat/router.js?v=20260926-comments-auth-v1';
import { auth } from '../../services/firebase/client.js';
import { getProfile, getProfileDisplayName } from '../../services/profile/profileStorage.js';
import {
    subscribeAnimeComments, postComment, toggleCommentLike, deleteComment,
    timeAgoUk, groupComments, isSignedInUser, COMMENTS_MAX_LENGTH
} from '../../services/comments/commentService.js?v=20260926-comments-auth-v1';

        // ====================================================================
        //  ОБГОВОРЕННЯ І КОМЕНТАРІ (секція на сторінці аніме)
        // ====================================================================
        let authUiListenerBound = false;

        function bindAuthUiRefresh() {
            if (authUiListenerBound) return;
            authUiListenerBound = true;
            window.addEventListener('vakdab:auth-changed', () => {
                refreshComposerFromAuth();
                renderCommentsList();
            });
        }

        async function refreshComposerFromAuth() {
            try {
                if (typeof auth?.authStateReady === 'function') await auth.authStateReady();
            } catch (error) {
                console.warn('[comments] auth state restore failed:', error?.code || error);
            }
            const wrap = document.getElementById('cmtComposerWrap');
            if (!wrap) return;
            const shouldShowComposer = isSignedInUser();
            const hasComposer = Boolean(wrap.querySelector('.cmt-composer'));
            if (shouldShowComposer === hasComposer) return;
            wrap.innerHTML = composerHtml();
            bindComposer();
        }

        const sectionState = {
            animeUrl: '',
            animeTitle: '',
            animePoster: '',
            comments: [],
            unsubscribe: null,
            replyTo: null,          // id коментаря, на який пишемо відповідь
            likeBusy: new Set(),
            composerDirty: false
        };

        function avatarHtml(comment) {
            const media = String(comment?.avatar || '');
            if (media) {
                const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(media);
                if (isVideo) return `<video class="cmt-avatar__media" src="${escapeHtml(media)}" autoplay muted loop playsinline aria-hidden="true"></video>`;
                return `<img class="cmt-avatar__media" src="${escapeHtml(media)}" alt="" loading="lazy">`;
            }
            return `<span class="cmt-avatar__letter">${escapeHtml((comment?.nickname || '?').charAt(0).toUpperCase())}</span>`;
        }

        function composerHtml() {
            if (isSignedInUser()) {
                const profile = getProfile();
                const author = { nickname: getProfileDisplayName(profile), avatar: profile.avatar || profile.avatarVideo || '' };
                return `
                <div class="cmt-composer">
                    <div class="cmt-avatar">${avatarHtml(author)}</div>
                    <div class="cmt-composer__main">
                        <textarea id="cmtInput" class="cmt-composer__input" rows="2" maxlength="${COMMENTS_MAX_LENGTH}" placeholder="Долучайтеся до обговорення..."></textarea>
                        <div class="cmt-composer__bar">
                            <span class="cmt-composer__counter" id="cmtCounter">0 / ${COMMENTS_MAX_LENGTH}</span>
                            <button type="button" class="cmt-composer__send" id="cmtSendBtn">
                                <i class="fas fa-paper-plane" aria-hidden="true"></i> Надіслати
                            </button>
                        </div>
                    </div>
                </div>`;
            }
            return `
            <div class="cmt-signin">
                <span class="cmt-signin__icon" aria-hidden="true"><i class="fas fa-comments"></i></span>
                <div class="cmt-signin__copy">
                    <strong>Долучайтеся до обговорення</strong>
                    <p>Увійдіть, щоб залишати коментарі та відповідати глядачам.</p>
                </div>
                <button type="button" class="cmt-signin__btn" id="cmtSigninBtn">
                    Увійти <i class="fas fa-arrow-right" aria-hidden="true"></i>
                </button>
            </div>`;
        }

        function commentCardHtml(comment, replies, options = {}) {
            const liked = Boolean(options.currentUid && Array.isArray(comment.likedBy) && comment.likedBy.includes(options.currentUid));
            const isOwn = Boolean(options.currentUid && comment.uid === options.currentUid);
            const isReplyTarget = sectionState.replyTo === comment.id;
            return `
            <div class="cmt-card${options.isReply ? ' cmt-card--reply' : ''}" data-comment-id="${escapeHtml(comment.id)}">
                <div class="cmt-avatar">${avatarHtml(comment)}</div>
                <div class="cmt-card__body">
                    <header class="cmt-card__head">
                        <span class="cmt-card__nickname">${escapeHtml(comment.nickname || 'Користувач')}</span>
                        <span class="cmt-card__dot" aria-hidden="true">•</span>
                        <span class="cmt-card__time">${escapeHtml(timeAgoUk(comment.createdAt))}</span>
                    </header>
                    <p class="cmt-card__text">${escapeHtml(comment.text)}</p>
                    <footer class="cmt-card__actions">
                        <button type="button" class="cmt-like${liked ? ' is-liked' : ''}" data-like-id="${escapeHtml(comment.id)}" aria-label="Подобається">
                            <i class="fas fa-thumbs-up" aria-hidden="true"></i>
                            <span class="cmt-like__count">${comment.likes || 0}</span>
                        </button>
                        ${!options.isReply ? `
                        <button type="button" class="cmt-action-btn" data-reply-id="${escapeHtml(comment.id)}">
                            <i class="fas fa-reply" aria-hidden="true"></i> Відповісти
                        </button>` : ''}
                        ${isOwn ? `
                        <button type="button" class="cmt-action-btn cmt-action-btn--danger" data-delete-id="${escapeHtml(comment.id)}">
                            <i class="fas fa-trash" aria-hidden="true"></i>
                        </button>` : ''}
                    </footer>
                    ${!options.isReply && isReplyTarget ? replyComposerHtml(comment) : ''}
                    ${!options.isReply && replies.length ? `
                    <div class="cmt-replies">
                        ${replies.map(r => commentCardHtml(r, [], { ...options, isReply: true })).join('')}
                    </div>` : ''}
                </div>
            </div>`;
        }

        function replyComposerHtml(parent) {
            return `
            <div class="cmt-reply-composer" data-reply-composer-for="${escapeHtml(parent.id)}">
                <div class="cmt-avatar">${avatarHtml({ nickname: auth?.currentUser ? getProfileDisplayName(getProfile()) : '?', avatar: getProfile().avatar || getProfile().avatarVideo || '' })}</div>
                <div class="cmt-composer__main">
                    <textarea class="cmt-reply-input" rows="1" maxlength="${COMMENTS_MAX_LENGTH}" placeholder="Відповісти ${escapeHtml(parent.nickname || '')}..."></textarea>
                    <div class="cmt-composer__bar">
                        <button type="button" class="cmt-reply-cancel" data-cancel-reply="1">Скасувати</button>
                        <button type="button" class="cmt-composer__send cmt-reply-send" data-send-reply="${escapeHtml(parent.id)}">
                            <i class="fas fa-paper-plane" aria-hidden="true"></i> Відповісти
                        </button>
                    </div>
                </div>
            </div>`;
        }

        function commentsListHtml() {
            const uid = auth?.currentUser?.uid || null;
            const { top, replies } = groupComments(sectionState.comments);
            if (!top.length) {
                return `
                <div class="cmt-empty">
                    <i class="fas fa-comments" aria-hidden="true"></i>
                    <p>Ще немає коментарів</p>
                    <p class="sub">Станьте першим, хто поділиться враженням про це аніме</p>
                </div>`;
            }
            return top.map(c => commentCardHtml(c, replies.filter(r => r.parentId === c.id).sort((a, b) => a.createdAt - b.createdAt), { currentUid: uid })).join('');
        }

        function renderCommentsList() {
            const list = document.getElementById('cmtList');
            if (!list) return;
            list.innerHTML = commentsListHtml();
        }

        function bindComposer() {
            const input = document.getElementById('cmtInput');
            const counter = document.getElementById('cmtCounter');
            const sendBtn = document.getElementById('cmtSendBtn');
            if (input && counter) {
                input.addEventListener('input', () => {
                    counter.textContent = `${input.value.length} / ${COMMENTS_MAX_LENGTH}`;
                    sectionState.composerDirty = input.value.trim().length > 0;
                });
                input.addEventListener('keydown', e => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitComment();
                });
            }
            if (sendBtn) sendBtn.addEventListener('click', () => submitComment());
            const signinBtn = document.getElementById('cmtSigninBtn');
            if (signinBtn) signinBtn.addEventListener('click', async () => {
                await refreshComposerFromAuth();
                if (isSignedInUser()) {
                    showToast('Ви вже увійшли — можете залишити коментар');
                    return;
                }
                Router.goTo('profile');
            });
        }

        async function submitComment(parentId = '') {
            if (!isSignedInUser()) {
                showToast('Увійдіть, щоб залишити коментар');
                Router.goTo('profile');
                return;
            }
            const input = parentId
                ? document.querySelector(`[data-reply-composer-for="${parentId}"] .cmt-reply-input`)
                : document.getElementById('cmtInput');
            if (!input) return;
            const text = input.value.trim();
            if (!text) {
                showToast('Коментар не може бути порожнім');
                return;
            }
            const btn = parentId
                ? document.querySelector(`[data-send-reply="${parentId}"]`)
                : document.getElementById('cmtSendBtn');
            if (btn) btn.disabled = true;
            const res = await postComment({
                animeUrl: sectionState.animeUrl,
                animeTitle: sectionState.animeTitle,
                animePoster: sectionState.animePoster,
                text,
                parentId
            });
            if (btn) btn.disabled = false;
            if (res.ok) {
                input.value = '';
                if (!parentId) {
                    const counter = document.getElementById('cmtCounter');
                    if (counter) counter.textContent = `0 / ${COMMENTS_MAX_LENGTH}`;
                } else {
                    sectionState.replyTo = null;
                }
                // renderCommentsList() спрацює автоматично через onSnapshot.
            } else if (res.error === 'auth') {
                showToast('Увійдіть, щоб залишити коментар');
                Router.goTo('profile');
            } else {
                showToast('Не вдалося надіслати коментар. Спробуйте пізніше.');
            }
        }

        function bindList(container) {
            container.addEventListener('click', async e => {
                const likeBtn = e.target.closest?.('[data-like-id]');
                if (likeBtn) {
                    e.preventDefault();
                    const id = likeBtn.dataset.likeId;
                    if (sectionState.likeBusy.has(id)) return;
                    if (!isSignedInUser()) {
                        showToast('Увійдіть, щоб оцінювати коментарі');
                        Router.goTo('profile');
                        return;
                    }
                    const comment = sectionState.comments.find(c => c.id === id);
                    if (!comment) return;
                    sectionState.likeBusy.add(id);
                    const res = await toggleCommentLike(comment);
                    if (res.ok) {
                        const uid = auth?.currentUser?.uid;
                        if (uid) {
                            const i = (comment.likedBy || []).indexOf(uid);
                            if (i >= 0) comment.likedBy.splice(i, 1); else (comment.likedBy = comment.likedBy || []).push(uid);
                            comment.likes = comment.likedBy.length;
                        }
                        renderCommentsList();
                    } else {
                        showToast('Не вдалося оцінити коментар');
                    }
                    sectionState.likeBusy.delete(id);
                    return;
                }
                const replyBtn = e.target.closest?.('[data-reply-id]');
                if (replyBtn) {
                    e.preventDefault();
                    sectionState.replyTo = sectionState.replyTo === replyBtn.dataset.replyId ? null : replyBtn.dataset.replyId;
                    renderCommentsList();
                    const textarea = document.querySelector(`[data-reply-composer-for="${sectionState.replyTo}"] .cmt-reply-input`);
                    if (textarea) textarea.focus();
                    return;
                }
                const cancelBtn = e.target.closest?.('[data-cancel-reply]');
                if (cancelBtn) {
                    e.preventDefault();
                    sectionState.replyTo = null;
                    renderCommentsList();
                    return;
                }
                const sendReplyBtn = e.target.closest?.('[data-send-reply]');
                if (sendReplyBtn) {
                    e.preventDefault();
                    submitComment(sendReplyBtn.dataset.sendReply);
                    return;
                }
                const deleteBtn = e.target.closest?.('[data-delete-id]');
                if (deleteBtn) {
                    e.preventDefault();
                    const comment = sectionState.comments.find(c => c.id === deleteBtn.dataset.deleteId);
                    if (!comment) return;
                    const res = await deleteComment(comment);
                    if (res.ok) showToast('Коментар видалено');
                    else showToast(res.error === 'forbidden' ? 'Можна видаляти лише свої коментарі' : 'Не вдалося видалити коментар');
                    return;
                }
            });
        }

        export function resetPlayerCommentsSection() {
            if (sectionState.unsubscribe) {
                try { sectionState.unsubscribe(); } catch {}
                sectionState.unsubscribe = null;
            }
            const section = document.getElementById('commentsSection');
            if (section) section.style.display = 'none';
            sectionState.replyTo = null;
            sectionState.comments = [];
        }

        // Викликається зі сторінки плеєра, коли аніме завантажено.
        export function renderPlayerCommentsSection(animeUrl, anime = {}) {
            const section = document.getElementById('commentsSection');
            if (!section || !animeUrl) return;
            if (sectionState.unsubscribe) {
                try { sectionState.unsubscribe(); } catch {}
                sectionState.unsubscribe = null;
            }
            bindAuthUiRefresh();
            sectionState.animeUrl = animeUrl;
            sectionState.animeTitle = String(anime.title || anime.originalTitle || '');
            sectionState.animePoster = anime.image?.original
                || anime.image?.preview
                || anime.images?.jpg?.large_image_url
                || anime.poster
                || '';
            sectionState.comments = [];
            sectionState.replyTo = null;

            section.style.display = '';
            section.innerHTML = `
                <div class="section-heading-row">
                    <div class="cmt-heading-copy">
                        <div class="section-title"><i class="fas fa-comments" aria-hidden="true"></i> Обговорення</div>
                        <p class="cmt-heading-note">Діліться враженнями про це аніме</p>
                    </div>
                    <span class="cmt-count-badge" id="cmtCountBadge"></span>
                </div>
                <div id="cmtComposerWrap">${composerHtml()}</div>
                <div id="cmtList" class="cmt-list">${renderCommentsList()}</div>`;

            bindComposer();
            // The persisted-user callback may have fired before this player section
            // existed; re-check after Firebase finishes its initial restore.
            refreshComposerFromAuth();
            const listEl = document.getElementById('cmtList');
            if (listEl) listEl.innerHTML = '<div class="cmt-loading"><i class="fas fa-spinner fa-pulse" aria-hidden="true"></i> Завантаження коментарів...</div>';
            bindList(listEl);

            sectionState.unsubscribe = subscribeAnimeComments(animeUrl, comments => {
                if (comments === null) {
                    const el = document.getElementById('cmtList');
                    // Приховуємо невдале завантаження без окремої порожньої картки-помилки.
                    if (el) el.innerHTML = '';
                    return;
                }
                sectionState.comments = comments;
                renderCommentsList();
                const badge = document.getElementById('cmtCountBadge');
                if (badge) badge.textContent = comments.length ? `${comments.length}` : '';
            });
        }
