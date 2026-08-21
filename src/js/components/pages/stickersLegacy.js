import { Storage } from '../../core/compat/storage.js?v=20260821-genres-compact-v10';
import { db } from '../../services/firebase/client.js';
import { Router } from '../../core/compat/router.js?v=20260821-genres-compact-v10';
import { PROFILE_STICKER_SLOTS, getDefaultStickers, showToast, showToastProgress, escapeHtml, removeStickerBackground } from '../../legacy/app-legacy.js?v=20260821-genres-compact-v10';
import { uploadBlobToCloudinary } from './homeLegacy.js?v=20260821-genres-compact-v10';

        function stickerFaceSvg(variant) {
            const s = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
            const faces = [
                `<g><circle cx="32" cy="30" r="16" ${s} /><path d="M18 24c2-8 8-12 14-12s12 4 14 12" ${s} /><path d="M25 30q3 3 6 0M33 30q3 3 6 0" ${s} /><path d="M27 39q5 4 10 0" ${s} /><path d="M46 44l6-4 3 3-7 6z" ${s} /></g>`,
                `<g><path d="M20 20l4-8 6 8M44 20l-4-8-6 8" ${s} /><circle cx="32" cy="30" r="15" ${s} /><path d="M25 29l3 2M39 29l-3 2" ${s} /><path d="M29 40q3 2 6 0" ${s} /><path d="M46 12l3 5M53 10l1 6M49 8l4 4" ${s} /></g>`,
                `<g><path d="M14 42c-3-16 5-28 18-28s21 12 18 28" ${s} /><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 38q5 4 10 0" ${s} /></g>`,
                `<g><circle cx="32" cy="28" r="14" ${s} /><path d="M20 34c8 6 16 6 24 0" ${s} /><path d="M26 27h2M36 27h2" ${s} /><path d="M28 34q4 2 8 0" ${s} /><path d="M44 46q6-2 8-8" ${s} /></g>`,
                `<g><circle cx="14" cy="26" r="6" ${s} /><circle cx="50" cy="26" r="6" ${s} /><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29l4 1" ${s} /><path d="M35 27q2 2 4 0" ${s} /><path d="M28 39q4 3 8 0" ${s} /></g>`,
                `<g><path d="M16 44c-4-18 4-30 16-30s20 12 16 30" ${s} /><circle cx="32" cy="29" r="13" ${s} /><path d="M26 29h3M35 29h3" ${s} /><path d="M29 37q3 2 6 0" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M18 15l6 4-6 4 6-4-6-4z" ${s} /><path d="M25 30q3 3 6 0M33 30q3 3 6 0" ${s} /><path d="M27 40q5 4 10 0" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M44 16l7-2-3 6z" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 39q5 3 10 0" ${s} /></g>`,
                `<g><path d="M18 18l6-8 4 8M46 18l-6-8-4 8" ${s} /><circle cx="32" cy="30" r="15" ${s} /><rect x="21" y="26" width="10" height="6" rx="2" ${s} /><rect x="33" y="26" width="10" height="6" rx="2" ${s} /><path d="M31 29h2" ${s} /><path d="M28 41q4 2 8 0" ${s} /></g>`,
                `<g><path d="M16 22l4-10 4 8 4-9 4 8 4-9 4 8 4-9 4 10" ${s} /><circle cx="32" cy="31" r="14" ${s} /><path d="M26 30q2-2 4 0M34 30q2-2 4 0" ${s} /><path d="M29 40q3-4 6 0" ${s} /><path d="M46 44l3 6M50 44l1 6M54 42l4 5" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M22 20q4-6 10-6M42 20q-4-6-10-6" ${s} /><path d="M26 40q6 4 12 0" ${s} /><path d="M24 30l-3 6M40 30l3 6" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M24 29q3 2 6 0M34 29q3 2 6 0" ${s} /><path d="M28 40q4 2 8 0" ${s} /><path d="M12 20q4-2 6 2M52 20q-4-2-6 2" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="14" ${s} /><path d="M25 29q2 2 4 0M35 29q2 2 4 0" ${s} /><path d="M27 39q5 3 10 0" ${s} /><circle cx="18" cy="17" r="3" ${s} /><circle cx="26" cy="12" r="3" ${s} /><circle cx="38" cy="12" r="3" ${s} /><circle cx="46" cy="17" r="3" ${s} /></g>`,
                `<g><circle cx="32" cy="30" r="15" ${s} /><path d="M25 28q2-2 4 0M35 28q2-2 4 0" ${s} /><path d="M25 38q7 6 14 0" ${s} /></g>`
            ];
            const idx = ((variant % faces.length) + faces.length) % faces.length;
            return `<svg viewBox="0 0 64 56" style="width:100%;height:100%;">${faces[idx]}</svg>`;
        }

        const STICKER_VARIANT_COUNT = 14;

        // Всі унікальні варіанти, якими юзер реально володіє (singles + все, що є всередині власних наборів)
        function getOwnedStickerVariants(data) {
            const set = new Set();
            (data.singles || []).forEach(s => { if (s.variant !== undefined && s.variant !== null) set.add(s.variant); });
            (data.sets || []).forEach(st => (st.variants || []).forEach(v => set.add(v)));
            return Array.from(set).sort((a, b) => a - b);
        }

        // Уніфікований ключ наліпки: вбудовані обличчя ідентифікуються номером варіанта,
        // власні завантажені фото — унікальним id (у них немає variant).
        function stickerKeyFor(s) {
            return s.image ? ('img:' + s.id) : ('v:' + s.variant);
        }
        function renderStickerVisual(s, color) {
            if (s && s.image) return `<img src="${escapeHtml(s.image)}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;border-radius:8px;background:transparent;">`;
            const safeColor = color || s?.color || 'var(--text)';
            return `<span class="sticker-svg-visual" style="color:${escapeHtml(safeColor)};display:block;width:100%;height:100%;">${stickerFaceSvg(s ? s.variant : 0)}</span>`;
        }

        let _everyoneStickersCache = null;
        async function fetchEveryoneStickers() {
            if (_everyoneStickersCache) return _everyoneStickersCache;
            try {
                const { collection, query, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js');
                const q = query(collection(db, 'users'), limit(500));
                const snap = await getDocs(q);
                let sets = [];
                let singles = [];
                const users = [];
                snap.forEach(docSnap => {
                    const d = docSnap.data();
                    if (!d.stickers) return;
                    const ownerId = docSnap.id;
                    const ownerNickname = d.profile?.nickname || 'Користувач';
                    const ownerAvatar = d.profile?.avatar || '';
                    const source = Object.assign(getDefaultStickers(), d.stickers);
                    const sourceSingles = (Array.isArray(source.singles) ? source.singles : []).filter(single => single && single.image);
                    const sourceColors = source.colors || {};
                    sourceSingles.forEach(single => singles.push({
                        ...single,
                        _public: true,
                        _ownerId: ownerId,
                        _ownerNickname: ownerNickname,
                        _ownerAvatar: ownerAvatar,
                        _sourceColor: sourceColors[stickerKeyFor(single)] || ''
                    }));
                    (Array.isArray(source.sets) ? source.sets : []).forEach(set => {
                        const imageIds = (Array.isArray(set.images) ? set.images : []).filter(id => sourceSingles.some(single => single.id === id));
                        if (!imageIds.length) return;
                        sets.push({
                        ...set,
                        variants: [],
                        images: imageIds,
                        _public: true,
                        _ownerId: ownerId,
                        _ownerNickname: ownerNickname,
                        _ownerAvatar: ownerAvatar,
                        _sourceSingles: sourceSingles,
                        _sourceColors: sourceColors
                        });
                    });
                    users.push({ id: ownerId, nickname: ownerNickname, avatar: ownerAvatar, stickers: source });
                });
                // Фільтруємо дублікати за ID
                const uniqueSets = [];
                const setIds = new Set();
                sets.forEach(s => { if (s.id && !setIds.has(s.id)) { setIds.add(s.id); uniqueSets.push(s); } });

                const uniqueSingles = [];
                const singleIds = new Set();
                singles.forEach(s => { if (s.id && !singleIds.has(s.id)) { singleIds.add(s.id); uniqueSingles.push(s); } });

                _everyoneStickersCache = { sets: uniqueSets, singles: uniqueSingles, users };
                return _everyoneStickersCache;
            } catch (e) {
                console.error('[Stickers] Global fetch failed:', e);
                return { sets: [], singles: [], users: [] };
            }
        }

        window.renderStickersPage = function() {
            const container = document.getElementById('stickersPageContainer');
            if (!container) return;

            if (!window.stickersUI) {
                window.stickersUI = {
                    activeFilter: 'Усі',
                    view: 'grid',
                    search: '',
                    step: null,           // null | 'choose' | 'single' | 'pack' | 'actions' | 'setView'
                    pickedSingle: null,
                    pickedForPack: [],
                    packName: '',
                    actionsTarget: null   // { type: 'single'|'set', id }
                };
            }
            const ui = window.stickersUI;

            let stickersDataSanitized = false;
            function data() {
                const current = Storage.getStickers();
                if (!stickersDataSanitized) {
                    stickersDataSanitized = true;
                    const legacyKeys = new Set((current.singles || []).filter(s => s && !s.image && s.variant !== undefined).map(stickerKeyFor));
                    current.singles = (current.singles || []).filter(s => s && s.image);
                    current.sets = (current.sets || []).map(st => ({ ...st, variants: [], images: (st.images || []).filter(id => current.singles.some(s => s.id === id)) })).filter(st => st.images.length);
                    current.medals = (current.medals || []).filter(key => !legacyKeys.has(key));
                    if (current.colors) legacyKeys.forEach(key => delete current.colors[key]);
                    if (legacyKeys.size) Storage.setStickers(current);
                }
                return current;
            }
            function saveData(d) {
                Storage.setStickers(d);
                if (Router.currentRoute === 'profile') renderProfilePage();
            }

            function Tile(variant, opts = {}) {
                const { selected = false, size = '' } = opts;
                return `
                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all ${size}"
                        style="background:${selected ? 'var(--accent)' : 'var(--tag-bg)'};border-color:${selected ? 'var(--accent)' : 'var(--border)'};color:${selected ? 'var(--accent-text)' : 'var(--text)'};"
                        data-variant="${variant}">
                        ${stickerFaceSvg(variant)}
                        ${selected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ''}
                    </button>
                `;
            }

            const FILTERS = ['Усі', 'Набори', 'Одиночні', 'Улюблені', 'Користувачі'];

                function matchesSearch(title) {
                    if (!ui.search.trim()) return true;
                    return title.toLowerCase().includes(ui.search.trim().toLowerCase());
                }

                function setStickerItems(st, localData) {
                    const sourceSingles = [...(localData.singles || []), ...(st._sourceSingles || [])];
                    const byId = id => sourceSingles.find(s => s.id === id);
                    return [
                        ...(st.variants || []).map(v => ({ variant: v, color: st._sourceColors?.['v:' + v] || '' })),
                        ...(st.images || []).map(id => byId(id)).filter(Boolean)
                    ];
                }

                function render() {
                const d = data();
                const owned = getOwnedStickerVariants(d);
                const showUsers = ui.activeFilter === 'Користувачі';
                const showSets = !showUsers && (ui.activeFilter === 'Усі' || ui.activeFilter === 'Набори' || (ui.activeFilter === 'Улюблені'));
                const showSingles = !showUsers && (ui.activeFilter === 'Усі' || ui.activeFilter === 'Одиночні' || (ui.activeFilter === 'Улюблені'));

                let visibleSets = (ui.activeFilter === 'Одиночні') ? [] : d.sets.filter(st => matchesSearch(st.title));
                if (ui.activeFilter === 'Улюблені') visibleSets = visibleSets.filter(st => st.favorite);

                let visibleSingles = (ui.activeFilter === 'Набори') ? [] : d.singles.filter(s => matchesSearch('наліпка ' + (s.variant + 1)));
                if (ui.activeFilter === 'Улюблені') visibleSingles = visibleSingles.filter(s => s.favorite);

                if (ui.activeFilter === 'Усі') {
                    const everyone = _everyoneStickersCache || { sets: [], singles: [] };
                    const mySetIds = new Set(d.sets.map(s => s.id));
                    everyone.sets.forEach(s => {
                        if (!mySetIds.has(s.id) && matchesSearch(s.title)) {
                            visibleSets.push(s);
                        }
                    });
                    const mySingleIds = new Set(d.singles.map(s => s.id));
                    everyone.singles.forEach(s => {
                        if (!mySingleIds.has(s.id) && matchesSearch(s.image ? 'власна' : 'наліпка ' + (s.variant + 1))) {
                            visibleSingles.push(s);
                        }
                    });
                    if (!_everyoneStickersCache) {
                        fetchEveryoneStickers().then(() => render());
                    }
                }

                const everyoneUsers = (_everyoneStickersCache?.users || []).filter(u => matchesSearch(u.nickname));
                const usersSection = showUsers ? (everyoneUsers.length ? everyoneUsers.map(u => {
                    const us = u.stickers || getDefaultStickers();
                    const userSingles = us.singles || [];
                    const userSets = us.sets || [];
                    const userStickers = userSingles.length ? userSingles : (userSets.flatMap(st => (st.variants || []).map(v => ({ variant: v }))).slice(0, 28));
                    return `<article class="sticker-user-card">
                        <div class="sticker-user-card__head"><div class="sticker-user-avatar">${u.avatar ? `<img src="${escapeHtml(u.avatar)}" alt="">` : `<span>${escapeHtml(u.nickname.charAt(0).toUpperCase())}</span>`}</div><div><strong>${escapeHtml(u.nickname)}</strong><small>${userStickers.length} наліпок</small></div></div>
                        <div class="sticker-user-card__grid">${userStickers.slice(0, 28).map(st => `<div class="sticker-user-card__item">${renderStickerVisual(st, us.colors?.[stickerKeyFor(st)])}</div>`).join('') || '<span class="sticker-empty-note">Наліпок ще немає</span>'}</div>
                    </article>`;
                }).join('') : '<div class="sticker-empty-note">Інших користувачів із наліпками поки немає.</div>') : '';
                if (showUsers && !_everyoneStickersCache) fetchEveryoneStickers().then(() => render());
                const nothingAtAll = !showUsers && d.singles.length === 0 && d.sets.length === 0;
                const nothingVisible = !showUsers && visibleSets.length === 0 && visibleSingles.length === 0;

                container.innerHTML = `
                    <div class="stickers-page" style="max-width:480px;margin:0 auto;color:var(--text);font-family:inherit;">
                        <div class="filter-page__header" style="margin-bottom:0.9rem;">
                            <button class="filter-page__back" id="stickersBackBtn" aria-label="Назад"><i class="fas fa-arrow-left"></i></button>
                            <div style="flex:1;">
                                <div class="filter-page__title">Наліпки</div>
                            </div>
                            <button id="stickersToggleView" class="filter-page__back" aria-label="Вигляд">
                                <i class="fas ${ui.view === 'grid' ? 'fa-list' : 'fa-table-cells'}"></i>
                            </button>
                        </div>

                        <div style="display:flex;align-items:center;gap:0.6rem;background:var(--tag-bg);border:1px solid var(--border);border-radius:14px;padding:0.7rem 0.9rem;margin-bottom:0.8rem;">
                            <i class="fas fa-search" style="color:var(--text-muted);"></i>
                            <input type="text" id="stickersSearchInput" placeholder="Пошук наборів і наліпок..." value="${escapeHtml(ui.search)}"
                                style="background:none;border:none;outline:none;color:var(--text);font-family:inherit;font-size:0.9rem;width:100%;">
                        </div>

                        <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1rem;padding-bottom:2px;">
                            ${FILTERS.map(f => `
                                <button class="sticker-filter-btn" data-filter="${f}" style="flex-shrink:0;padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;border:1px solid ${ui.activeFilter === f ? 'var(--accent)' : 'var(--border)'};background:${ui.activeFilter === f ? 'var(--accent)' : 'var(--surface)'};color:${ui.activeFilter === f ? 'var(--accent-text)' : 'var(--text-secondary)'};white-space:nowrap;transition:all var(--transition);">
                                    ${f === 'Улюблені' ? '<i class="fas fa-star" style="font-size:0.7rem;margin-right:0.3rem;"></i>' : ''}${f}
                                </button>
                            `).join('')}
                        </div>

                        <button id="stickersOpenAdd" style="width:100%;margin-bottom:1.1rem;border:2px dashed var(--border-hover);border-radius:16px;padding:1.3rem;display:flex;flex-direction:column;align-items:center;gap:0.5rem;background:none;cursor:pointer;color:var(--text);transition:all var(--transition);">
                            <div style="width:44px;height:44px;border-radius:50%;border:2px solid var(--text);display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-plus"></i>
                            </div>
                            <span style="font-size:0.88rem;font-weight:700;">Додати наліпку</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">Одну наліпку або цілий набір</span>
                        </button>

                        ${showUsers ? `<section class="stickers-users-section"><div class="stickers-section-heading"><h2>Усі наліпки користувачів</h2><span>${everyoneUsers.length}</span></div>${usersSection}</section>` : ''}

                        ${nothingAtAll ? `
                            <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
                                <i class="fas fa-icons" style="font-size:2rem;margin-bottom:0.8rem;display:block;"></i>
                                У вас поки немає наліпок. Додайте першу!
                            </div>
                        ` : nothingVisible ? `
                            <div style="text-align:center;padding:2rem 1rem;color:var(--text-muted);">Нічого не знайдено</div>
                        ` : `
                            ${showSets && visibleSets.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">Набори</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSets.length}</span>
                                </div>
                                <div style="display:flex;flex-direction:column;gap:0.7rem;margin-bottom:1.3rem;">
                                    ${visibleSets.map(st => `
                                        <div style="border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--surface);">
                                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                                <div>
                                                    <div style="font-size:0.92rem;font-weight:800;">${escapeHtml(st.title)}</div>
                                                    <div style="font-size:0.75rem;color:var(--text-muted);">${setStickerItems(st, d).length} наліпок${st._public ? ` · ${escapeHtml(st._ownerNickname || 'Користувач')}` : ''}</div>
                                                </div>
                                                <button class="sticker-set-actions${st._public ? ' sticker-public-set-add' : ''}" data-set-id="${st.id}" ${st._public ? `data-public-owner="${escapeHtml(st._ownerId || '')}"` : ''} style="width:32px;height:32px;border-radius:50%;border:1px solid var(--border);background:var(--tag-bg);color:var(--text);cursor:pointer;">
                                                    <i class="fas ${st._public ? 'fa-plus' : (st.favorite ? 'fa-star' : 'fa-ellipsis-vertical')}"></i>
                                                </button>
                                            </div>
                                            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.4rem;">
                                                ${setStickerItems(st, d).slice(0, 6).map(s => `<div style="aspect-ratio:1;border-radius:10px;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border:${s.image ? 'none' : '1px solid var(--border)'};padding:${s.image ? '0' : '0.35rem'};overflow:hidden;">${renderStickerVisual(s, s.color)}</div>`).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}

                            ${showSingles && visibleSingles.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">Одиночні наліпки</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSingles.length}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:${ui.view === 'grid' ? 'repeat(4,1fr)' : '1fr'};gap:0.6rem;margin-bottom:1.5rem;">
                                                                            ${visibleSingles.map(s => { const sKey = stickerKeyFor(s); const sLabel = s.image ? 'Власна наліпка' : ('Наліпка #' + (s.variant + 1)); return ui.view === 'grid' ? `
                                        <button class="sticker-single-tile${s._public ? ' sticker-public-single-add' : ''}" data-single-id="${s.id}" ${s._public ? `data-public-owner="${escapeHtml(s._ownerId || '')}"` : ''} style="aspect-ratio:1;border-radius:14px;border:${s.image ? 'none' : '1px solid var(--border)'};background:${s.image ? 'transparent' : 'var(--tag-bg)'};padding:${s.image ? '0' : '0.6rem'};position:relative;cursor:pointer;transition:all var(--transition);overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${s.favorite ? `<i class="fas fa-star" style="position:absolute;top:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ''}
                                        </button>
                                    ` : `
                                        <button class="sticker-single-tile" data-single-id="${s.id}" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:14px;padding:0.6rem 0.8rem;background:var(--surface);cursor:pointer;text-align:left;">
                                            <div style="width:42px;height:42px;flex-shrink:0;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border-radius:10px;padding:${s.image ? '0' : '0.4rem'};overflow:hidden;">${renderStickerVisual(s)}</div>
                                            <div style="flex:1;">
                                                <div style="font-size:0.85rem;font-weight:700;">${sLabel}</div>
                                                <div style="font-size:0.72rem;color:var(--text-muted);">
                                                    ${s.favorite ? '<i class="fas fa-star"></i> Улюблена' : ''}
                                                    ${d.medals.includes(sKey) ? ' · Медаль' : ''}
                                                </div>
                                            </div>
                                            <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
                                        </button>
                                    `; }).join('')}
                                </div>
                            ` : ''}
                        `}

                        ${ui.step ? renderOverlay(d, owned) : ''}
                    </div>
                `;
                bindEvents(d, owned);
            }

            function renderOverlay(d, owned) {
                return `
                    <div style="position:fixed;inset:0;z-index:1001;display:flex;align-items:flex-end;justify-content:center;">
                        <div id="stickersOverlayBg" style="position:absolute;inset:0;background:rgba(0,0,0,0.5);"></div>
                        <div style="position:relative;width:100%;max-width:480px;background:var(--surface);border-radius:24px 24px 0 0;padding:1rem 1.1rem 1.6rem;max-height:85%;overflow-y:auto;animation:fadeInUp 0.25s ease;">
                            <div style="width:40px;height:5px;background:var(--border-hover);border-radius:999px;margin:0 auto 1rem;"></div>
                            ${renderOverlayContent(d, owned)}
                        </div>
                    </div>
                `;
            }

            function renderOverlayContent(d, owned) {
                if (ui.step === 'choose') {
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <h3 style="font-size:1.05rem;font-weight:800;">Що додати?</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.7rem;">
                            <button id="stickersChooseSingle" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-face-smile"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">Власне фото</div><div style="font-size:0.75rem;color:var(--text-muted);">Завантажити одне фото як наліпку</div></div>
                            </button>
                            <button id="stickersChoosePack" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-layer-group"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">Набір наліпок</div><div style="font-size:0.75rem;color:var(--text-muted);">Створити іменований набір з кількох наліпок</div></div>
                            </button>
                        </div>
                    `;
                }
                if (ui.step === 'single') {
                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">Виберіть наліпку</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;">
                            ${Array.from({ length: STICKER_VARIANT_COUNT }, (_, i) => i).map(v => Tile(v, { selected: ui.pickedSingle === v })).join('')}
                        </div>
                        <button id="stickersConfirmSingle" ${ui.pickedSingle === null ? 'disabled' : ''} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${ui.pickedSingle === null ? 0.5 : 1};transition:all var(--transition);">
                            Додати наліпку
                        </button>
                    `;
                }
                if (ui.step === 'pack') {
                    const allOwned = d.singles.filter(Boolean);

                    return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">Новий набір</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="margin-bottom:1rem;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.4rem;">Назва набору</label>
                            <input id="stickersPackNameInput" type="text" maxlength="30" placeholder="Наприклад: Мої улюблені" value="${escapeHtml(ui.packName)}"
                                style="width:100%;background:var(--tag-bg);border:1.5px solid var(--border);border-radius:12px;padding:0.75rem 0.9rem;color:var(--text);font-family:inherit;font-size:0.9rem;outline:none;">
                        </div>
                        <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;">Виберіть свої одиночні наліпки (${ui.pickedForPack.length})</label>
                        ${allOwned.length ? '' : '<div style="padding:1rem;border:1px dashed var(--border);border-radius:14px;color:var(--text-muted);text-align:center;margin-bottom:1rem;">Спочатку додайте власне фото як одиночну наліпку.</div>'}
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;max-height:300px;overflow-y:auto;padding:2px;">
                            ${allOwned.map(s => {
                                const v = s.variant !== undefined ? s.variant : null;
                                const isSelected = v !== null ? ui.pickedForPack.includes(v) : ui.pickedForPack.includes('img:' + s.id);
                                return `
                                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all"
                                        style="background:${isSelected ? 'var(--accent)' : 'var(--tag-bg)'};border-color:${isSelected ? 'var(--accent)' : 'var(--border)'};color:${isSelected ? 'var(--accent-text)' : 'var(--text)'};"
                                        data-pack-sticker="${v !== null ? v : 'img:' + s.id}">
                                        <div style="width:100%;height:100%;padding:${s.image ? '0' : '0.2rem'};">${renderStickerVisual(s)}</div>
                                        ${isSelected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ''}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                        <button id="stickersConfirmPack" ${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 'disabled' : ''} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 0.5 : 1};transition:all var(--transition);">
                            Створити набір
                        </button>
                    `;
                }
                if (ui.step === 'actions' && ui.actionsTarget) {
                    const t = ui.actionsTarget;
                    if (t.type === 'single') {
                        const s = d.singles.find(x => x.id === t.id);
                        if (!s) return '';
                        const sKey = stickerKeyFor(s);
                        const isMedal = d.medals.includes(sKey);
                        return `
                            <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem;">
                                <div style="width:56px;height:56px;background:var(--tag-bg);border-radius:14px;padding:${s.image ? '0' : '0.6rem'};flex-shrink:0;overflow:hidden;">${renderStickerVisual(s)}</div>
                                <div style="font-size:1rem;font-weight:800;">${s.image ? 'Власна наліпка' : ('Наліпка #' + (s.variant + 1))}</div>
                            </div>
                            <label class="sticker-color-control">Колір стікера та blur <input id="stickerColorInput" type="color" value="${escapeHtml(d.colors?.[sKey] || '#7c8494')}" title="Змінити колір стікера"><span>фон — тільки розмиття</span></label>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                ${s.image ? '<button class="sticker-action-btn" data-act="remove-bg" data-single-id="' + s.id + '">' + sIconRow('fa-wand-magic-sparkles', 'Видалити фон AI') + '</button>' : ''}
                                <button class="sticker-action-btn" data-act="favorite" data-single-id="${s.id}">${sIconRow(s.favorite ? 'fa-star' : 'fa-star', s.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені')}</button>
                                <button class="sticker-action-btn" data-act="medal" data-single-id="${s.id}">${sIconRow('fa-medal', isMedal ? 'Прибрати медаль' : 'Додати як медаль')}</button>
                                <button class="sticker-action-btn" data-act="delete" data-single-id="${s.id}" style="border-style:dashed;">${sIconRow('fa-trash', 'Видалити наліпку')}</button>
                            </div>
                        `;
                    }
                    if (t.type === 'set') {
                        const st = d.sets.find(x => x.id === t.id);
                        if (!st) return '';
                        return `
                            <div style="margin-bottom:1rem;">
                                <div style="font-size:1rem;font-weight:800;margin-bottom:0.7rem;">${escapeHtml(st.title)}</div>
                                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;margin-bottom:1rem;">
                                    ${[...(st.variants || []).map(v => ({variant: v})), ...(st.images || []).map(id => d.singles.find(s => s.id === id))].filter(Boolean).map(s => {
                                        const sKey = stickerKeyFor(s);
                                        return `<div style="aspect-ratio:1;background:${s.image ? 'transparent' : 'var(--tag-bg)'};border:${s.image ? 'none' : '1px solid var(--border)'};border-radius:10px;padding:${s.image ? '0' : '0.35rem'};position:relative;overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:2px;right:2px;font-size:0.55rem;color:#fff;text-shadow:0 0 2px #000;"></i>` : ''}
                                        </div>`;
                                    }).join('')}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                <button class="sticker-action-btn" data-act="favorite-set" data-set-id="${st.id}">${sIconRow('fa-star', st.favorite ? 'Прибрати з улюблених' : 'Додати в улюблені')}</button>
                                <button class="sticker-action-btn" data-act="delete-set" data-set-id="${st.id}" style="border-style:dashed;">${sIconRow('fa-trash', 'Видалити набір')}</button>
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.8rem;">Щоб встановити конкретну наліпку з набору біля ніку чи як медаль — спочатку додайте її окремо через «Додати наліпку → Одиночна».</div>
                        `;
                    }
                }
                return '';
            }

            function sIconRow(icon, label) {
                return `<span style="display:flex;align-items:center;gap:0.7rem;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:14px;background:var(--tag-bg);color:var(--text);font-size:0.85rem;font-weight:600;"><i class="fas ${icon}" style="width:18px;"></i>${label}</span>`;
            }

            function closeOverlay() {
                ui.step = null;
                ui.pickedSingle = null;
                ui.pickedForPack = [];
                ui.packName = '';
                ui.actionsTarget = null;
                render();
            }

            function makeLocalStickerId(prefix = 'sng_') {
                return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            }

            function importPublicSingle(remoteId) {
                const remote = _everyoneStickersCache?.singles?.find(s => s.id === remoteId);
                if (!remote) return;
                const cur = data();
                if (remote.variant !== undefined && cur.singles.some(s => s.variant === remote.variant)) {
                    showToast('Ця наліпка вже є у вашій колекції');
                    return;
                }
                const copy = { ...remote, id: makeLocalStickerId(), _public: undefined, _ownerId: undefined, _ownerNickname: undefined, _ownerAvatar: undefined, _sourceColor: undefined, favorite: false, addedAt: Date.now() };
                delete copy._public; delete copy._ownerId; delete copy._ownerNickname; delete copy._ownerAvatar; delete copy._sourceColor;
                cur.singles.unshift(copy);
                saveData(cur);
                showToast('Наліпку додано до вашої колекції');
                render();
            }

            function importPublicSet(remoteId) {
                const remote = _everyoneStickersCache?.sets?.find(s => s.id === remoteId);
                if (!remote) return;
                const cur = data();
                const already = cur.sets.some(s => s.sourceSetId === remote.id && s.sourceOwnerId === remote._ownerId);
                if (already) {
                    showToast('Цей набір вже є у вашій колекції');
                    return;
                }
                const sourceSingles = remote._sourceSingles || [];
                const imageIdMap = {};
                sourceSingles.filter(s => (remote.images || []).includes(s.id)).forEach(source => {
                    if (!source.image) return;
                    const copy = { ...source, id: makeLocalStickerId(), favorite: false, addedAt: Date.now() };
                    delete copy._public; delete copy._ownerId; delete copy._ownerNickname; delete copy._ownerAvatar; delete copy._sourceColor;
                    cur.singles.unshift(copy);
                    imageIdMap[source.id] = copy.id;
                });
                cur.sets.unshift({
                    id: makeLocalStickerId('set_'),
                    title: remote.title || 'Набір наліпок',
                    variants: [...(remote.variants || [])],
                    images: (remote.images || []).map(id => imageIdMap[id]).filter(Boolean),
                    favorite: false,
                    addedAt: Date.now(),
                    sourceSetId: remote.id,
                    sourceOwnerId: remote._ownerId || ''
                });
                saveData(cur);
                showToast('Набір додано до вашої колекції');
                render();
            }

            function bindEvents(d, owned) {
                document.getElementById('stickersBackBtn')?.addEventListener('click', () => {
                    if (history.length > 1) history.back(); else Router.goTo('profile');
                });
                document.getElementById('stickersToggleView')?.addEventListener('click', () => {
                    ui.view = ui.view === 'grid' ? 'list' : 'grid';
                    render();
                });
                document.getElementById('stickersSearchInput')?.addEventListener('input', (e) => {
                    ui.search = e.target.value;
                    render();
                });
                document.querySelectorAll('.sticker-filter-btn').forEach(btn => {
                    btn.addEventListener('click', () => { ui.activeFilter = btn.dataset.filter; render(); });
                });
                document.getElementById('stickersOpenAdd')?.addEventListener('click', () => { ui.step = 'choose'; render(); });
                document.getElementById('stickersOverlayBg')?.addEventListener('click', closeOverlay);
                document.getElementById('stickersCloseOverlay')?.addEventListener('click', closeOverlay);
                document.getElementById('stickersBackToChoose')?.addEventListener('click', () => { ui.step = 'choose'; render(); });
                document.getElementById('stickersChooseSingle')?.addEventListener('click', () => {
                    ui.step = null;
                    render();
                    document.getElementById('stickerFileInput')?.click();
                });
                document.getElementById('stickersChoosePack')?.addEventListener('click', () => { ui.step = 'pack'; render(); });
                document.getElementById('stickersChooseUpload')?.addEventListener('click', () => {
                    ui.step = null;
                    render();
                    document.getElementById('stickerFileInput')?.click();
                });

                if (ui.step === 'single') {
                    document.querySelectorAll('[data-variant]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            ui.pickedSingle = parseInt(btn.dataset.variant, 10);
                            render();
                        });
                    });
                }
                if (ui.step === 'pack') {
                    document.querySelectorAll('[data-pack-sticker]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const val = btn.dataset.packSticker;
                            const stickerVal = val.startsWith('img:') ? val : parseInt(val, 10);
                            if (ui.pickedForPack.includes(stickerVal)) {
                                ui.pickedForPack = ui.pickedForPack.filter(x => x !== stickerVal);
                            } else {
                                ui.pickedForPack.push(stickerVal);
                            }
                            render();
                        });
                    });
                }

                document.getElementById('stickersPackNameInput')?.addEventListener('input', (e) => {
                    ui.packName = e.target.value;
                    const btn = document.getElementById('stickersConfirmPack');
                    if (btn) { btn.disabled = !ui.packName.trim() || ui.pickedForPack.length === 0; btn.style.opacity = btn.disabled ? '0.5' : '1'; }
                });

                document.getElementById('stickersConfirmSingle')?.addEventListener('click', () => {
                    if (ui.pickedSingle === null) return;
                    const cur = data();
                    const stickerId = 'sng_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                    const stickerKey = 'v:' + ui.pickedSingle;
                    cur.singles.unshift({ id: stickerId, variant: ui.pickedSingle, favorite: false, addedAt: Date.now() });
                    if (!Array.isArray(cur.medals)) cur.medals = [];
                    if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
                    if (!cur.colors) cur.colors = {};
                    if (!cur.colors[stickerKey]) cur.colors[stickerKey] = '#7c8494';
                    saveData(cur);
                    showToast(cur.medals.includes(stickerKey) ? 'Наліпку додано в профіль' : 'Наліпку додано');
                    closeOverlay();
                });

                document.getElementById('stickersConfirmPack')?.addEventListener('click', () => {
                    if (!ui.packName.trim() || ui.pickedForPack.length === 0) return;
                    const cur = data();
                    // Підтримка і варіантів (числа) і власних зображень (img:id)
                    const packVariants = ui.pickedForPack.filter(x => typeof x === 'number');
                    const packImages = ui.pickedForPack.filter(x => typeof x === 'string' && x.startsWith('img:'));

                    cur.sets.unshift({
                        id: 'set_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                        title: ui.packName.trim(),
                        variants: packVariants,
                        images: packImages.map(x => x.slice(4)), // зберігаємо тільки ID
                        favorite: false,
                        addedAt: Date.now()
                    });
                    saveData(cur);
                    showToast('Набір створено');
                    closeOverlay();
                });

                document.querySelectorAll('.sticker-public-single-add').forEach(el => {
                    el.addEventListener('click', () => importPublicSingle(el.dataset.singleId));
                });
                document.querySelectorAll('.sticker-public-set-add').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        importPublicSet(el.dataset.setId);
                    });
                });
                document.querySelectorAll('.sticker-single-tile:not(.sticker-public-single-add)').forEach(el => {
                    el.addEventListener('click', () => {
                        ui.step = 'actions';
                        ui.actionsTarget = { type: 'single', id: el.dataset.singleId };
                        render();
                    });
                });
                document.querySelectorAll('.sticker-set-actions:not(.sticker-public-set-add)').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        ui.step = 'actions';
                        ui.actionsTarget = { type: 'set', id: el.dataset.setId };
                        render();
                    });
                });

                document.getElementById('stickerColorInput')?.addEventListener('change', e => {
                    const target = ui.actionsTarget;
                    const cur = data();
                    const sticker = target && cur.singles.find(x => x.id === target.id);
                    if (sticker) {
                        if (!cur.colors) cur.colors = {};
                        cur.colors[stickerKeyFor(sticker)] = e.target.value;
                        saveData(cur);
                        render();
                    }
                });

                document.querySelectorAll('.sticker-action-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const act = btn.dataset.act;
                        const cur = data();
                        if (act === 'remove-bg') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (!s?.image) return;
                            btn.disabled = true;
                            showToastProgress('AI готує видалення фону…');
                            try {
                                const response = await fetch(s.image, { mode: 'cors', cache: 'no-store' });
                                if (!response.ok) throw new Error('Не вдалося завантажити зображення наліпки');
                                const sourceBlob = await response.blob();
                                const processedBlob = await removeStickerBackground(sourceBlob);
                                showToast('Завантажую наліпку без фону...');
                                s.image = await uploadBlobToCloudinary(processedBlob, 'sticker-no-bg.png');
                                s.updatedAt = Date.now();
                                saveData(cur);
                                showToast('Фон наліпки видалено');
                                render();
                            } catch (error) {
                                console.error('Sticker reprocess error:', error);
                                showToast('Не вдалося видалити фон: ' + (error.message || 'невідома помилка'));
                                btn.disabled = false;
                            }
                            return;
                        }
                        if (act === 'favorite') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) s.favorite = !s.favorite;
                            saveData(cur);
                        } else if (act === 'medal') {
                            const s = cur.singles.find(x => x.id === btn.dataset.singleId);
                            if (s) {
                                const sKey = stickerKeyFor(s);
                                if (cur.medals.includes(sKey)) {
                                    cur.medals = cur.medals.filter(k => k !== sKey);
                                } else {
                                    if (cur.medals.length >= PROFILE_STICKER_SLOTS) { showToast('Максимум 8 наліпок у профілі — спочатку приберіть одну'); return; }
                                    cur.medals.push(sKey);
                                }
                            }
                            saveData(cur);
                            showToast('Медалі оновлено');
                        } else if (act === 'delete') {
                            cur.singles = cur.singles.filter(x => x.id !== btn.dataset.singleId);
                            saveData(cur);
                            showToast('Наліпку видалено');
                            closeOverlay();
                            return;
                        } else if (act === 'favorite-set') {
                            const st = cur.sets.find(x => x.id === btn.dataset.setId);
                            if (st) st.favorite = !st.favorite;
                            saveData(cur);
                        } else if (act === 'delete-set') {
                            cur.sets = cur.sets.filter(x => x.id !== btn.dataset.setId);
                            saveData(cur);
                            showToast('Набір видалено');
                            closeOverlay();
                            return;
                        }
                        render();
                    });
                });
            }

            render();
        };
