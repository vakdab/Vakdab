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
  const idx = (variant % faces.length + faces.length) % faces.length;
  return `<svg viewBox="0 0 64 56" style="width:100%;height:100%;">${faces[idx]}</svg>`;
}
function getOwnedStickerVariants(data) {
  const set = /* @__PURE__ */ new Set();
  (data.singles || []).forEach((s) => {
    if (s.variant !== void 0 && s.variant !== null) set.add(s.variant);
  });
  (data.sets || []).forEach((st) => (st.variants || []).forEach((v) => set.add(v)));
  return Array.from(set).sort((a, b) => a - b);
}
function stickerKeyFor(s) {
  return s.image ? "img:" + s.id : "v:" + s.variant;
}
function renderStickerVisual(s, color) {
  if (s && s.image) return `<img src="${escapeHtml2(s.image)}" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain;border-radius:8px;background:transparent;">`;
  const safeColor = color || s?.color || "var(--text)";
  return `<span class="sticker-svg-visual" style="color:${escapeHtml2(safeColor)};display:block;width:100%;height:100%;">${stickerFaceSvg(s ? s.variant : 0)}</span>`;
}
function resolveStickerByKey(data, key) {
  const safeKey = String(key || "");
  const singles = Array.isArray(data?.singles) ? data.singles : [];
  const direct = singles.find((single) => stickerKeyFor(single) === safeKey);
  if (direct) return direct;
  if (safeKey.startsWith("v:")) {
    const variant = Number(safeKey.slice(2));
    if (!Number.isNaN(variant)) return { variant };
    return null;
  }
  if (safeKey.startsWith("img:")) return singles.find((single) => `img:${single.id}` === safeKey) || null;
  return null;
}
function renderStickerFaceByKey(data, key) {
  const sticker = resolveStickerByKey(data, key);
  return sticker ? renderStickerVisual(sticker, data?.colors?.[key]) : "";
}
async function fetchEveryoneStickers() {
  if (_everyoneStickersCache) return _everyoneStickersCache;
  try {
    const { collection: collection2, query: query2, limit: limit2, getDocs: getDocs3 } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js");
    const q = query2(collection2(db, "users"), limit2(500));
    const snap = await getDocs3(q);
    let sets = [];
    let singles = [];
    const users = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (!d.stickers) return;
      const ownerId = docSnap.id;
      const ownerNickname = d.profile?.nickname || "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447";
      const ownerAvatar = d.profile?.avatar || "";
      const source = Object.assign(getDefaultStickers(), d.stickers);
      const sourceSingles = (Array.isArray(source.singles) ? source.singles : []).filter((single) => single && single.image);
      const sourceColors = source.colors || {};
      sourceSingles.forEach((single) => singles.push({
        ...single,
        _public: true,
        _ownerId: ownerId,
        _ownerNickname: ownerNickname,
        _ownerAvatar: ownerAvatar,
        _sourceColor: sourceColors[stickerKeyFor(single)] || ""
      }));
      (Array.isArray(source.sets) ? source.sets : []).forEach((set) => {
        const imageIds = (Array.isArray(set.images) ? set.images : []).filter((id) => sourceSingles.some((single) => single.id === id));
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
    const uniqueSets = [];
    const setIds = /* @__PURE__ */ new Set();
    sets.forEach((s) => {
      if (s.id && !setIds.has(s.id)) {
        setIds.add(s.id);
        uniqueSets.push(s);
      }
    });
    const uniqueSingles = [];
    const singleIds = /* @__PURE__ */ new Set();
    singles.forEach((s) => {
      if (s.id && !singleIds.has(s.id)) {
        singleIds.add(s.id);
        uniqueSingles.push(s);
      }
    });
    _everyoneStickersCache = { sets: uniqueSets, singles: uniqueSingles, users };
    return _everyoneStickersCache;
  } catch (e) {
    console.error("[Stickers] Global fetch failed:", e);
    _everyoneStickersCache = { sets: [], singles: [], users: [] };
    return _everyoneStickersCache;
  }
}
var STICKER_VARIANT_COUNT, _everyoneStickersCache;
var init_stickersLegacy = __esm({
  "src/js/pages/profile/stickersLegacy.js?v=20260905-stickers-sync-v1"() {
    init_storage();
    init_client();
    init_router();
    init_app_legacy();
    init_homeLegacy();
    STICKER_VARIANT_COUNT = 14;
    _everyoneStickersCache = null;
    window.renderStickersPage = function() {
      const container = document.getElementById("stickersPageContainer");
      if (!container) return;
      if (!window.stickersUI) {
        window.stickersUI = {
          activeFilter: "\u0423\u0441\u0456",
          view: "grid",
          search: "",
          step: null,
          // null | 'choose' | 'single' | 'pack' | 'actions' | 'setView'
          pickedSingle: null,
          pickedForPack: [],
          packName: "",
          actionsTarget: null
          // { type: 'single'|'set', id }
        };
      }
      const ui = window.stickersUI;
      let stickersDataSanitized = false;
      function data() {
        const current = Storage.getStickers();
        if (!stickersDataSanitized) {
          stickersDataSanitized = true;
          const legacyKeys = new Set((current.singles || []).filter((s) => s && !s.image && s.variant !== void 0).map(stickerKeyFor));
          current.singles = (current.singles || []).filter((s) => s && s.image);
          current.sets = (current.sets || []).map((st) => ({ ...st, variants: [], images: (st.images || []).filter((id) => current.singles.some((s) => s.id === id)) })).filter((st) => st.images.length);
          current.medals = (current.medals || []).filter((key) => !legacyKeys.has(key));
          if (current.colors) legacyKeys.forEach((key) => delete current.colors[key]);
          if (legacyKeys.size) Storage.setStickers(current);
        }
        return current;
      }
      function saveData(d) {
        Storage.setStickers(d);
        render();
        if (Router.currentRoute === "profile") renderProfilePage();
      }
      function Tile(variant, opts = {}) {
        const { selected = false, size = "" } = opts;
        return `
                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all ${size}"
                        style="background:${selected ? "var(--accent)" : "var(--tag-bg)"};border-color:${selected ? "var(--accent)" : "var(--border)"};color:${selected ? "var(--accent-text)" : "var(--text)"};"
                        data-variant="${variant}">
                        ${stickerFaceSvg(variant)}
                        ${selected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ""}
                    </button>
                `;
      }
      const FILTERS = ["\u0423\u0441\u0456", "\u041E\u0434\u0438\u043D\u043E\u0447\u043D\u0456", "\u0423\u043B\u044E\u0431\u043B\u0435\u043D\u0456", "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456"];
      function render() {
        const d = data();
        const owned = getOwnedStickerVariants(d);
        const showUsers = ui.activeFilter === "\u041A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456";
        const showSingles = !showUsers && (ui.activeFilter === "\u0423\u0441\u0456" || ui.activeFilter === "\u041E\u0434\u0438\u043D\u043E\u0447\u043D\u0456" || ui.activeFilter === "\u0423\u043B\u044E\u0431\u043B\u0435\u043D\u0456");
        let visibleSingles = d.singles.slice();
        if (ui.activeFilter === "\u0423\u043B\u044E\u0431\u043B\u0435\u043D\u0456") visibleSingles = visibleSingles.filter((s) => s.favorite);
        if (ui.activeFilter === "\u0423\u0441\u0456") {
          const everyone = _everyoneStickersCache || { sets: [], singles: [] };
          const mySingleIds = new Set(d.singles.map((s) => s.id));
          everyone.singles.forEach((s) => {
            if (!mySingleIds.has(s.id)) {
              visibleSingles.push(s);
            }
          });
          if (!_everyoneStickersCache) {
            fetchEveryoneStickers().then(() => render());
          }
        }
        const everyoneUsers = _everyoneStickersCache?.users || [];
        const usersSection = showUsers ? everyoneUsers.length ? everyoneUsers.map((u) => {
          const us = u.stickers || getDefaultStickers();
          const userSingles = us.singles || [];
          const userSets = us.sets || [];
          const userStickers = userSingles.length ? userSingles : userSets.flatMap((st) => (st.variants || []).map((v) => ({ variant: v }))).slice(0, 28);
          return `<article class="sticker-user-card">
                        <div class="sticker-user-card__head"><div class="sticker-user-avatar">${u.avatar ? `<img src="${escapeHtml2(u.avatar)}" alt="">` : `<span>${escapeHtml2(u.nickname.charAt(0).toUpperCase())}</span>`}</div><div><strong>${escapeHtml2(u.nickname)}</strong><small>${userStickers.length} \u043D\u0430\u043B\u0456\u043F\u043E\u043A</small></div></div>
                        <div class="sticker-user-card__grid">${userStickers.slice(0, 28).map((st) => `<div class="sticker-user-card__item">${renderStickerVisual(st, us.colors?.[stickerKeyFor(st)])}</div>`).join("") || '<span class="sticker-empty-note">\u041D\u0430\u043B\u0456\u043F\u043E\u043A \u0449\u0435 \u043D\u0435\u043C\u0430\u0454</span>'}</div>
                    </article>`;
        }).join("") : '<div class="sticker-empty-note">\u0406\u043D\u0448\u0438\u0445 \u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432 \u0456\u0437 \u043D\u0430\u043B\u0456\u043F\u043A\u0430\u043C\u0438 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454.</div>' : "";
        if (showUsers && !_everyoneStickersCache) fetchEveryoneStickers().then(() => render());
        const nothingAtAll = !showUsers && visibleSingles.length === 0;
        const nothingVisible = !showUsers && visibleSingles.length === 0;
        container.innerHTML = `
                    <div class="stickers-page" style="max-width:480px;margin:0 auto;color:var(--text);font-family:inherit;">
                        <div class="filter-page__header" style="margin-bottom:0.9rem;">
                            <button class="filter-page__back" id="stickersBackBtn" aria-label="\u041D\u0430\u0437\u0430\u0434"><i class="fas fa-arrow-left"></i></button>
                            <div style="flex:1;">
                                <div class="filter-page__title">\u041D\u0430\u043B\u0456\u043F\u043A\u0438</div>
                            </div>
                            <button id="stickersToggleView" class="filter-page__back" aria-label="\u0412\u0438\u0433\u043B\u044F\u0434">
                                <i class="fas ${ui.view === "grid" ? "fa-list" : "fa-table-cells"}"></i>
                            </button>
                        </div>

                        <div style="display:flex;gap:0.5rem;overflow-x:auto;margin-bottom:1rem;padding-bottom:2px;">
                            ${FILTERS.map((f) => `
                                <button class="sticker-filter-btn" data-filter="${f}" style="flex-shrink:0;padding:0.5rem 1rem;border-radius:999px;font-size:0.8rem;font-weight:700;border:1px solid ${ui.activeFilter === f ? "var(--accent)" : "var(--border)"};background:${ui.activeFilter === f ? "var(--accent)" : "var(--surface)"};color:${ui.activeFilter === f ? "var(--accent-text)" : "var(--text-secondary)"};white-space:nowrap;transition:all var(--transition);">
                                    ${f === "\u0423\u043B\u044E\u0431\u043B\u0435\u043D\u0456" ? '<i class="fas fa-star" style="font-size:0.7rem;margin-right:0.3rem;"></i>' : ""}${f}
                                </button>
                            `).join("")}
                        </div>

                        <button id="stickersOpenAdd" style="width:100%;margin-bottom:1.1rem;border:2px dashed var(--border-hover);border-radius:16px;padding:1.3rem;display:flex;flex-direction:column;align-items:center;gap:0.5rem;background:none;cursor:pointer;color:var(--text);transition:all var(--transition);">
                            <div style="width:44px;height:44px;border-radius:50%;border:2px solid var(--text);display:flex;align-items:center;justify-content:center;">
                                <i class="fas fa-plus"></i>
                            </div>
                            <span style="font-size:0.88rem;font-weight:700;">\u0414\u043E\u0434\u0430\u0442\u0438 \u043D\u0430\u043B\u0456\u043F\u043A\u0443</span>
                            <span style="font-size:0.75rem;color:var(--text-muted);">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0432\u043B\u0430\u0441\u043D\u0443 \u043D\u0430\u043B\u0456\u043F\u043A\u0443</span>
                        </button>

                        ${showUsers ? `<section class="stickers-users-section"><div class="stickers-section-heading"><h2>\u0423\u0441\u0456 \u043D\u0430\u043B\u0456\u043F\u043A\u0438 \u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432</h2><span>${everyoneUsers.length}</span></div>${usersSection}</section>` : ""}

                        ${nothingAtAll ? `
                            <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted);">
                                <i class="fas fa-icons" style="font-size:2rem;margin-bottom:0.8rem;display:block;"></i>
                                \u0423 \u0432\u0430\u0441 \u043F\u043E\u043A\u0438 \u043D\u0435\u043C\u0430\u0454 \u043D\u0430\u043B\u0456\u043F\u043E\u043A. \u0414\u043E\u0434\u0430\u0439\u0442\u0435 \u043F\u0435\u0440\u0448\u0443!
                            </div>
                        ` : nothingVisible ? `
                            <div style="text-align:center;padding:2rem 1rem;color:var(--text-muted);">\u041D\u0456\u0447\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0439\u0434\u0435\u043D\u043E</div>
                        ` : `
                            ${showSingles && visibleSingles.length ? `
                                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.7rem;">
                                    <h2 style="font-size:0.95rem;font-weight:800;">${ui.activeFilter === "\u0423\u0441\u0456" ? "\u0423\u0441\u0456 \u043D\u0430\u043B\u0456\u043F\u043A\u0438" : "\u041E\u0434\u0438\u043D\u043E\u0447\u043D\u0456 \u043D\u0430\u043B\u0456\u043F\u043A\u0438"}</h2>
                                    <span style="font-size:0.72rem;color:var(--text-muted);background:var(--tag-bg);border-radius:999px;padding:0.15rem 0.6rem;">${visibleSingles.length}</span>
                                </div>
                                <div style="display:grid;grid-template-columns:${ui.view === "grid" ? "repeat(4,1fr)" : "1fr"};gap:0.6rem;margin-bottom:1.5rem;">
                                                                            ${visibleSingles.map((s) => {
          const sKey = stickerKeyFor(s);
          const sLabel = s.image ? "\u0412\u043B\u0430\u0441\u043D\u0430 \u043D\u0430\u043B\u0456\u043F\u043A\u0430" : "\u041D\u0430\u043B\u0456\u043F\u043A\u0430 #" + (s.variant + 1);
          return ui.view === "grid" ? `
                                        <button class="sticker-single-tile${s._public ? " sticker-public-single-add" : ""}" data-single-id="${s.id}" ${s._public ? `data-public-owner="${escapeHtml2(s._ownerId || "")}"` : ""} style="aspect-ratio:1;border-radius:14px;border:${s.image ? "none" : "1px solid var(--border)"};background:${s.image ? "transparent" : "var(--tag-bg)"};padding:${s.image ? "0" : "0.6rem"};position:relative;cursor:pointer;transition:all var(--transition);overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${s.favorite ? `<i class="fas fa-star" style="position:absolute;top:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ""}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:6px;right:6px;font-size:0.65rem;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.6);"></i>` : ""}
                                        </button>
                                    ` : `
                                        <button class="sticker-single-tile" data-single-id="${s.id}" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:14px;padding:0.6rem 0.8rem;background:var(--surface);cursor:pointer;text-align:left;">
                                            <div style="width:42px;height:42px;flex-shrink:0;background:${s.image ? "transparent" : "var(--tag-bg)"};border-radius:10px;padding:${s.image ? "0" : "0.4rem"};overflow:hidden;">${renderStickerVisual(s)}</div>
                                            <div style="flex:1;">
                                                <div style="font-size:0.85rem;font-weight:700;">${sLabel}</div>
                                                <div style="font-size:0.72rem;color:var(--text-muted);">
                                                    ${s.favorite ? '<i class="fas fa-star"></i> \u0423\u043B\u044E\u0431\u043B\u0435\u043D\u0430' : ""}
                                                    ${d.medals.includes(sKey) ? " \xB7 \u041C\u0435\u0434\u0430\u043B\u044C" : ""}
                                                </div>
                                            </div>
                                            <i class="fas fa-chevron-right" style="color:var(--text-muted);"></i>
                                        </button>
                                    `;
        }).join("")}
                                </div>
                            ` : ""}
                        `}

                        ${ui.step ? renderOverlay(d, owned) : ""}
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
        if (ui.step === "choose") {
          return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <h3 style="font-size:1.05rem;font-weight:800;">\u0429\u043E \u0434\u043E\u0434\u0430\u0442\u0438?</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.7rem;">
                            <button id="stickersChooseSingle" style="display:flex;align-items:center;gap:0.8rem;border:1px solid var(--border);border-radius:16px;padding:0.9rem;background:var(--tag-bg);cursor:pointer;text-align:left;color:var(--text);">
                                <div style="width:44px;height:44px;border-radius:12px;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-face-smile"></i></div>
                                <div><div style="font-weight:700;font-size:0.88rem;">\u0412\u043B\u0430\u0441\u043D\u0435 \u0444\u043E\u0442\u043E</div><div style="font-size:0.75rem;color:var(--text-muted);">\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u043E\u0434\u043D\u0435 \u0444\u043E\u0442\u043E \u044F\u043A \u043D\u0430\u043B\u0456\u043F\u043A\u0443</div></div>
                            </button>
                        </div>
                    `;
        }
        if (ui.step === "single") {
          return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u043D\u0430\u043B\u0456\u043F\u043A\u0443</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;">
                            ${Array.from({ length: STICKER_VARIANT_COUNT }, (_, i) => i).map((v) => Tile(v, { selected: ui.pickedSingle === v })).join("")}
                        </div>
                        <button id="stickersConfirmSingle" ${ui.pickedSingle === null ? "disabled" : ""} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${ui.pickedSingle === null ? 0.5 : 1};transition:all var(--transition);">
                            \u0414\u043E\u0434\u0430\u0442\u0438 \u043D\u0430\u043B\u0456\u043F\u043A\u0443
                        </button>
                    `;
        }
        if (ui.step === "pack") {
          const allOwned = d.singles.filter(Boolean);
          return `
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
                            <button id="stickersBackToChoose" style="color:var(--text-muted);background:none;border:none;font-size:1rem;cursor:pointer;"><i class="fas fa-arrow-left"></i></button>
                            <h3 style="font-size:1rem;font-weight:800;">\u041D\u043E\u0432\u0438\u0439 \u043D\u0430\u0431\u0456\u0440</h3>
                            <button id="stickersCloseOverlay" style="color:var(--text-muted);background:none;border:none;font-size:1.1rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                        </div>
                        <div style="margin-bottom:1rem;">
                            <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.4rem;">\u041D\u0430\u0437\u0432\u0430 \u043D\u0430\u0431\u043E\u0440\u0443</label>
                            <input id="stickersPackNameInput" type="text" maxlength="30" placeholder="\u041D\u0430\u043F\u0440\u0438\u043A\u043B\u0430\u0434: \u041C\u043E\u0457 \u0443\u043B\u044E\u0431\u043B\u0435\u043D\u0456" value="${escapeHtml2(ui.packName)}"
                                style="width:100%;background:var(--tag-bg);border:1.5px solid var(--border);border-radius:12px;padding:0.75rem 0.9rem;color:var(--text);font-family:inherit;font-size:0.9rem;outline:none;">
                        </div>
                        <label style="display:block;font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;">\u0412\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u0441\u0432\u043E\u0457 \u043E\u0434\u0438\u043D\u043E\u0447\u043D\u0456 \u043D\u0430\u043B\u0456\u043F\u043A\u0438 (${ui.pickedForPack.length})</label>
                        ${allOwned.length ? "" : '<div style="padding:1rem;border:1px dashed var(--border);border-radius:14px;color:var(--text-muted);text-align:center;margin-bottom:1rem;">\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0434\u043E\u0434\u0430\u0439\u0442\u0435 \u0432\u043B\u0430\u0441\u043D\u0435 \u0444\u043E\u0442\u043E \u044F\u043A \u043E\u0434\u0438\u043D\u043E\u0447\u043D\u0443 \u043D\u0430\u043B\u0456\u043F\u043A\u0443.</div>'}
                        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.6rem;margin-bottom:1.2rem;max-height:300px;overflow-y:auto;padding:2px;">
                            ${allOwned.map((s) => {
            const v = s.variant !== void 0 ? s.variant : null;
            const isSelected = v !== null ? ui.pickedForPack.includes(v) : ui.pickedForPack.includes("img:" + s.id);
            return `
                                    <button type="button" class="aspect-square rounded-xl border flex items-center justify-center p-2.5 shrink-0 relative transition-all"
                                        style="background:${isSelected ? "var(--accent)" : "var(--tag-bg)"};border-color:${isSelected ? "var(--accent)" : "var(--border)"};color:${isSelected ? "var(--accent-text)" : "var(--text)"};"
                                        data-pack-sticker="${v !== null ? v : "img:" + s.id}">
                                        <div style="width:100%;height:100%;padding:${s.image ? "0" : "0.2rem"};">${renderStickerVisual(s)}</div>
                                        ${isSelected ? `<span class="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style="background:var(--accent-text);color:var(--accent);"><i class="fas fa-check" style="font-size:9px;"></i></span>` : ""}
                                    </button>
                                `;
          }).join("")}
                        </div>
                        <button id="stickersConfirmPack" ${!ui.packName.trim() || ui.pickedForPack.length === 0 ? "disabled" : ""} style="width:100%;padding:0.9rem;border-radius:14px;border:none;font-weight:800;font-size:0.9rem;cursor:pointer;background:var(--accent);color:var(--accent-text);opacity:${!ui.packName.trim() || ui.pickedForPack.length === 0 ? 0.5 : 1};transition:all var(--transition);">
                            \u0421\u0442\u0432\u043E\u0440\u0438\u0442\u0438 \u043D\u0430\u0431\u0456\u0440
                        </button>
                    `;
        }
        if (ui.step === "actions" && ui.actionsTarget) {
          const t = ui.actionsTarget;
          if (t.type === "single") {
            const s = d.singles.find((x) => x.id === t.id);
            if (!s) return "";
            const sKey = stickerKeyFor(s);
            const isMedal = d.medals.includes(sKey);
            const isNickBadge = d.nickBadge === sKey;
            return `
                            <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem;">
                                <div style="width:56px;height:56px;background:var(--tag-bg);border-radius:14px;padding:${s.image ? "0" : "0.6rem"};flex-shrink:0;overflow:hidden;">${renderStickerVisual(s)}</div>
                                <div style="font-size:1rem;font-weight:800;">${s.image ? "\u0412\u043B\u0430\u0441\u043D\u0430 \u043D\u0430\u043B\u0456\u043F\u043A\u0430" : "\u041D\u0430\u043B\u0456\u043F\u043A\u0430 #" + (s.variant + 1)}</div>
                            </div>
                            <label class="sticker-color-control">\u041A\u043E\u043B\u0456\u0440 \u0441\u0442\u0456\u043A\u0435\u0440\u0430 \u0442\u0430 blur <input id="stickerColorInput" type="color" value="${escapeHtml2(d.colors?.[sKey] || "#7c8494")}" title="\u0417\u043C\u0456\u043D\u0438\u0442\u0438 \u043A\u043E\u043B\u0456\u0440 \u0441\u0442\u0456\u043A\u0435\u0440\u0430"><span>\u0444\u043E\u043D \u2014 \u0442\u0456\u043B\u044C\u043A\u0438 \u0440\u043E\u0437\u043C\u0438\u0442\u0442\u044F</span></label>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                ${s.image ? '<button class="sticker-action-btn" data-act="remove-bg" data-single-id="' + s.id + '">' + sIconRow("fa-wand-magic-sparkles", "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0444\u043E\u043D AI") + "</button>" : ""}
                                <button class="sticker-action-btn" data-act="favorite" data-single-id="${s.id}">${sIconRow(s.favorite ? "fa-star" : "fa-star", s.favorite ? "\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0437 \u0443\u043B\u044E\u0431\u043B\u0435\u043D\u0438\u0445" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u0443\u043B\u044E\u0431\u043B\u0435\u043D\u0456")}</button>
                                <button class="sticker-action-btn" data-act="medal" data-single-id="${s.id}">${sIconRow("fa-medal", isMedal ? "\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u043C\u0435\u0434\u0430\u043B\u044C" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u044F\u043A \u043C\u0435\u0434\u0430\u043B\u044C")}</button>
                                <button class="sticker-action-btn" data-act="nick-badge" data-single-id="${s.id}">${sIconRow("fa-tag", isNickBadge ? "\u0417\u043D\u044F\u0442\u0438 \u0431\u0456\u043B\u044F \u043D\u0456\u043A\u0443" : "\u0412\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0438 \u0431\u0456\u043B\u044F \u043D\u0456\u043A\u0443")}</button>
                                <button class="sticker-action-btn" data-act="delete" data-single-id="${s.id}" style="border-style:dashed;">${sIconRow("fa-trash", "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043D\u0430\u043B\u0456\u043F\u043A\u0443")}</button>
                            </div>
                        `;
          }
          if (t.type === "set") {
            const st = d.sets.find((x) => x.id === t.id);
            if (!st) return "";
            return `
                            <div style="margin-bottom:1rem;">
                                <div style="font-size:1rem;font-weight:800;margin-bottom:0.7rem;">${escapeHtml2(st.title)}</div>
                                <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.5rem;margin-bottom:1rem;">
                                    ${[...(st.variants || []).map((v) => ({ variant: v })), ...(st.images || []).map((id) => d.singles.find((s) => s.id === id))].filter(Boolean).map((s) => {
              const sKey = stickerKeyFor(s);
              return `<div style="aspect-ratio:1;background:${s.image ? "transparent" : "var(--tag-bg)"};border:${s.image ? "none" : "1px solid var(--border)"};border-radius:10px;padding:${s.image ? "0" : "0.35rem"};position:relative;overflow:hidden;">
                                            ${renderStickerVisual(s)}
                                            ${d.medals.includes(sKey) ? `<i class="fas fa-medal" style="position:absolute;bottom:2px;right:2px;font-size:0.55rem;color:#fff;text-shadow:0 0 2px #000;"></i>` : ""}
                                        </div>`;
            }).join("")}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:0.5rem;">
                                <button class="sticker-action-btn" data-act="favorite-set" data-set-id="${st.id}">${sIconRow("fa-star", st.favorite ? "\u041F\u0440\u0438\u0431\u0440\u0430\u0442\u0438 \u0437 \u0443\u043B\u044E\u0431\u043B\u0435\u043D\u0438\u0445" : "\u0414\u043E\u0434\u0430\u0442\u0438 \u0432 \u0443\u043B\u044E\u0431\u043B\u0435\u043D\u0456")}</button>
                                <button class="sticker-action-btn" data-act="delete-set" data-set-id="${st.id}" style="border-style:dashed;">${sIconRow("fa-trash", "\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u043D\u0430\u0431\u0456\u0440")}</button>
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.8rem;">\u0429\u043E\u0431 \u0432\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0438 \u043A\u043E\u043D\u043A\u0440\u0435\u0442\u043D\u0443 \u043D\u0430\u043B\u0456\u043F\u043A\u0443 \u0437 \u043D\u0430\u0431\u043E\u0440\u0443 \u0431\u0456\u043B\u044F \u043D\u0456\u043A\u0443 \u0447\u0438 \u044F\u043A \u043C\u0435\u0434\u0430\u043B\u044C \u2014 \u0441\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u0434\u043E\u0434\u0430\u0439\u0442\u0435 \u0457\u0457 \u043E\u043A\u0440\u0435\u043C\u043E \u0447\u0435\u0440\u0435\u0437 \xAB\u0414\u043E\u0434\u0430\u0442\u0438 \u043D\u0430\u043B\u0456\u043F\u043A\u0443 \u2192 \u041E\u0434\u0438\u043D\u043E\u0447\u043D\u0430\xBB.</div>
                        `;
          }
        }
        return "";
      }
      function sIconRow(icon, label) {
        return `<span style="display:flex;align-items:center;gap:0.7rem;padding:0.85rem 1rem;border:1px solid var(--border);border-radius:14px;background:var(--tag-bg);color:var(--text);font-size:0.85rem;font-weight:600;"><i class="fas ${icon}" style="width:18px;"></i>${label}</span>`;
      }
      function closeOverlay() {
        ui.step = null;
        ui.pickedSingle = null;
        ui.pickedForPack = [];
        ui.packName = "";
        ui.actionsTarget = null;
        render();
      }
      function makeLocalStickerId(prefix = "sng_") {
        return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      }
      function importPublicSingle(remoteId) {
        const remote = _everyoneStickersCache?.singles?.find((s) => s.id === remoteId);
        if (!remote) return;
        const cur = data();
        if (remote.variant !== void 0 && cur.singles.some((s) => s.variant === remote.variant)) {
          showToast("\u0426\u044F \u043D\u0430\u043B\u0456\u043F\u043A\u0430 \u0432\u0436\u0435 \u0454 \u0443 \u0432\u0430\u0448\u0456\u0439 \u043A\u043E\u043B\u0435\u043A\u0446\u0456\u0457");
          return;
        }
        const copy = { ...remote, id: makeLocalStickerId(), _public: void 0, _ownerId: void 0, _ownerNickname: void 0, _ownerAvatar: void 0, _sourceColor: void 0, favorite: false, addedAt: Date.now() };
        delete copy._public;
        delete copy._ownerId;
        delete copy._ownerNickname;
        delete copy._ownerAvatar;
        delete copy._sourceColor;
        cur.singles.unshift(copy);
        saveData(cur);
        showToast("\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0434\u043E\u0434\u0430\u043D\u043E \u0434\u043E \u0432\u0430\u0448\u043E\u0457 \u043A\u043E\u043B\u0435\u043A\u0446\u0456\u0457");
        render();
      }
      function importPublicSet(remoteId) {
        const remote = _everyoneStickersCache?.sets?.find((s) => s.id === remoteId);
        if (!remote) return;
        const cur = data();
        const already = cur.sets.some((s) => s.sourceSetId === remote.id && s.sourceOwnerId === remote._ownerId);
        if (already) {
          showToast("\u0426\u0435\u0439 \u043D\u0430\u0431\u0456\u0440 \u0432\u0436\u0435 \u0454 \u0443 \u0432\u0430\u0448\u0456\u0439 \u043A\u043E\u043B\u0435\u043A\u0446\u0456\u0457");
          return;
        }
        const sourceSingles = remote._sourceSingles || [];
        const imageIdMap = {};
        sourceSingles.filter((s) => (remote.images || []).includes(s.id)).forEach((source) => {
          if (!source.image) return;
          const copy = { ...source, id: makeLocalStickerId(), favorite: false, addedAt: Date.now() };
          delete copy._public;
          delete copy._ownerId;
          delete copy._ownerNickname;
          delete copy._ownerAvatar;
          delete copy._sourceColor;
          cur.singles.unshift(copy);
          imageIdMap[source.id] = copy.id;
        });
        cur.sets.unshift({
          id: makeLocalStickerId("set_"),
          title: remote.title || "\u041D\u0430\u0431\u0456\u0440 \u043D\u0430\u043B\u0456\u043F\u043E\u043A",
          variants: [...remote.variants || []],
          images: (remote.images || []).map((id) => imageIdMap[id]).filter(Boolean),
          favorite: false,
          addedAt: Date.now(),
          sourceSetId: remote.id,
          sourceOwnerId: remote._ownerId || ""
        });
        saveData(cur);
        showToast("\u041D\u0430\u0431\u0456\u0440 \u0434\u043E\u0434\u0430\u043D\u043E \u0434\u043E \u0432\u0430\u0448\u043E\u0457 \u043A\u043E\u043B\u0435\u043A\u0446\u0456\u0457");
        render();
      }
      function bindEvents(d, owned) {
        document.getElementById("stickersBackBtn")?.addEventListener("click", () => {
          if (history.length > 1) history.back();
          else Router.goTo("profile");
        });
        document.getElementById("stickersToggleView")?.addEventListener("click", () => {
          ui.view = ui.view === "grid" ? "list" : "grid";
          render();
        });
        document.querySelectorAll(".sticker-filter-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            ui.activeFilter = btn.dataset.filter;
            render();
          });
        });
        document.getElementById("stickersOpenAdd")?.addEventListener("click", () => {
          ui.step = "choose";
          render();
        });
        document.getElementById("stickersOverlayBg")?.addEventListener("click", closeOverlay);
        document.getElementById("stickersCloseOverlay")?.addEventListener("click", closeOverlay);
        document.getElementById("stickersBackToChoose")?.addEventListener("click", () => {
          ui.step = "choose";
          render();
        });
        document.getElementById("stickersChooseSingle")?.addEventListener("click", () => {
          ui.step = null;
          render();
          document.getElementById("stickerFileInput")?.click();
        });
        document.getElementById("stickersChooseUpload")?.addEventListener("click", () => {
          ui.step = null;
          render();
          document.getElementById("stickerFileInput")?.click();
        });
        if (ui.step === "single") {
          document.querySelectorAll("[data-variant]").forEach((btn) => {
            btn.addEventListener("click", () => {
              ui.pickedSingle = parseInt(btn.dataset.variant, 10);
              render();
            });
          });
        }
        if (ui.step === "pack") {
          document.querySelectorAll("[data-pack-sticker]").forEach((btn) => {
            btn.addEventListener("click", () => {
              const val = btn.dataset.packSticker;
              const stickerVal = val.startsWith("img:") ? val : parseInt(val, 10);
              if (ui.pickedForPack.includes(stickerVal)) {
                ui.pickedForPack = ui.pickedForPack.filter((x) => x !== stickerVal);
              } else {
                ui.pickedForPack.push(stickerVal);
              }
              render();
            });
          });
        }
        document.getElementById("stickersPackNameInput")?.addEventListener("input", (e) => {
          ui.packName = e.target.value;
          const btn = document.getElementById("stickersConfirmPack");
          if (btn) {
            btn.disabled = !ui.packName.trim() || ui.pickedForPack.length === 0;
            btn.style.opacity = btn.disabled ? "0.5" : "1";
          }
        });
        document.getElementById("stickersConfirmSingle")?.addEventListener("click", () => {
          if (ui.pickedSingle === null) return;
          const cur = data();
          const stickerId = "sng_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const stickerKey = "v:" + ui.pickedSingle;
          cur.singles.unshift({ id: stickerId, variant: ui.pickedSingle, favorite: false, addedAt: Date.now() });
          if (!Array.isArray(cur.medals)) cur.medals = [];
          if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
          if (!cur.colors) cur.colors = {};
          if (!cur.colors[stickerKey]) cur.colors[stickerKey] = "#7c8494";
          saveData(cur);
          showToast(cur.medals.includes(stickerKey) ? "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0434\u043E\u0434\u0430\u043D\u043E \u0432 \u043F\u0440\u043E\u0444\u0456\u043B\u044C" : "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0434\u043E\u0434\u0430\u043D\u043E");
          closeOverlay();
        });
        document.getElementById("stickersConfirmPack")?.addEventListener("click", () => {
          if (!ui.packName.trim() || ui.pickedForPack.length === 0) return;
          const cur = data();
          const packVariants = ui.pickedForPack.filter((x) => typeof x === "number");
          const packImages = ui.pickedForPack.filter((x) => typeof x === "string" && x.startsWith("img:"));
          cur.sets.unshift({
            id: "set_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            title: ui.packName.trim(),
            variants: packVariants,
            images: packImages.map((x) => x.slice(4)),
            // зберігаємо тільки ID
            favorite: false,
            addedAt: Date.now()
          });
          saveData(cur);
          showToast("\u041D\u0430\u0431\u0456\u0440 \u0441\u0442\u0432\u043E\u0440\u0435\u043D\u043E");
          closeOverlay();
        });
        document.querySelectorAll(".sticker-public-single-add").forEach((el) => {
          el.addEventListener("click", () => importPublicSingle(el.dataset.singleId));
        });
        document.querySelectorAll(".sticker-public-set-add").forEach((el) => {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            importPublicSet(el.dataset.setId);
          });
        });
        document.querySelectorAll(".sticker-single-tile:not(.sticker-public-single-add)").forEach((el) => {
          el.addEventListener("click", () => {
            ui.step = "actions";
            ui.actionsTarget = { type: "single", id: el.dataset.singleId };
            render();
          });
        });
        document.querySelectorAll(".sticker-set-actions:not(.sticker-public-set-add)").forEach((el) => {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            ui.step = "actions";
            ui.actionsTarget = { type: "set", id: el.dataset.setId };
            render();
          });
        });
        document.getElementById("stickerColorInput")?.addEventListener("change", (e) => {
          const target = ui.actionsTarget;
          const cur = data();
          const sticker = target && cur.singles.find((x) => x.id === target.id);
          if (sticker) {
            if (!cur.colors) cur.colors = {};
            cur.colors[stickerKeyFor(sticker)] = e.target.value;
            saveData(cur);
            render();
          }
        });
        document.querySelectorAll(".sticker-action-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const act = btn.dataset.act;
            const cur = data();
            if (act === "remove-bg") {
              const s = cur.singles.find((x) => x.id === btn.dataset.singleId);
              if (!s?.image) return;
              btn.disabled = true;
              showToastProgress("AI \u0433\u043E\u0442\u0443\u0454 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F \u0444\u043E\u043D\u0443\u2026");
              try {
                const response = await fetch(s.image, { mode: "cors", cache: "no-store" });
                if (!response.ok) throw new Error("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u043D\u044F \u043D\u0430\u043B\u0456\u043F\u043A\u0438");
                const sourceBlob = await response.blob();
                const processedBlob = await removeStickerBackground(sourceBlob);
                showToast("\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0443\u044E \u043D\u0430\u043B\u0456\u043F\u043A\u0443 \u0431\u0435\u0437 \u0444\u043E\u043D\u0443...");
                s.image = await uploadBlobToCloudinary(processedBlob, "sticker-no-bg.png");
                s.updatedAt = Date.now();
                saveData(cur);
                showToast("\u0424\u043E\u043D \u043D\u0430\u043B\u0456\u043F\u043A\u0438 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
                render();
              } catch (error) {
                console.error("Sticker reprocess error:", error);
                showToast("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0444\u043E\u043D: " + (error.message || "\u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430"));
                btn.disabled = false;
              }
              return;
            }
            if (act === "favorite") {
              const s = cur.singles.find((x) => x.id === btn.dataset.singleId);
              if (s) s.favorite = !s.favorite;
              saveData(cur);
            } else if (act === "medal") {
              const s = cur.singles.find((x) => x.id === btn.dataset.singleId);
              if (s) {
                const sKey = stickerKeyFor(s);
                if (cur.medals.includes(sKey)) {
                  cur.medals = cur.medals.filter((k) => k !== sKey);
                } else {
                  if (cur.medals.length >= PROFILE_STICKER_SLOTS) {
                    showToast("\u041C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 8 \u043D\u0430\u043B\u0456\u043F\u043E\u043A \u0443 \u043F\u0440\u043E\u0444\u0456\u043B\u0456 \u2014 \u0441\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043F\u0440\u0438\u0431\u0435\u0440\u0456\u0442\u044C \u043E\u0434\u043D\u0443");
                    return;
                  }
                  cur.medals.push(sKey);
                }
              }
              saveData(cur);
              showToast("\u041C\u0435\u0434\u0430\u043B\u0456 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
            } else if (act === "nick-badge") {
              const s = cur.singles.find((x) => x.id === btn.dataset.singleId);
              if (s) {
                const sKey = stickerKeyFor(s);
                cur.nickBadge = cur.nickBadge === sKey ? null : sKey;
                saveData(cur);
                showToast(cur.nickBadge ? "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0432\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0431\u0456\u043B\u044F \u043D\u0456\u043A\u0443" : "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0431\u0456\u043B\u044F \u043D\u0456\u043A\u0443 \u0437\u043D\u044F\u0442\u043E");
              }
            } else if (act === "delete") {
              cur.singles = cur.singles.filter((x) => x.id !== btn.dataset.singleId);
              saveData(cur);
              showToast("\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
              closeOverlay();
              return;
            } else if (act === "favorite-set") {
              const st = cur.sets.find((x) => x.id === btn.dataset.setId);
              if (st) st.favorite = !st.favorite;
              saveData(cur);
            } else if (act === "delete-set") {
              cur.sets = cur.sets.filter((x) => x.id !== btn.dataset.setId);
              saveData(cur);
              showToast("\u041D\u0430\u0431\u0456\u0440 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
              closeOverlay();
              return;
            }
            render();
          });
        });
      }
      render();
    };
  }
});
