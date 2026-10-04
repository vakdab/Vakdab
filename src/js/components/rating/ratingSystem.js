function escapeRatingHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function isVideoUrl2(url) {
  return typeof url === "string" && (/\/video\/upload\//i.test(url) || /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(url));
}
function ratingProfileMediaMarkup(profile, className) {
  const url = profile.avatarVideo || profile.avatar || "";
  const fallback = escapeRatingHtml((profile.nickname || "?").slice(0, 1).toUpperCase());
  if (!url) return `<span>${fallback}</span>`;
  const safeUrl2 = escapeRatingHtml(url);
  if (isVideoUrl2(url)) return `<video class="${className}" src="${safeUrl2}" autoplay muted loop playsinline preload="metadata" aria-label="\u0410\u0432\u0430\u0442\u0430\u0440\u043a\u0430" onerror="this.remove();this.parentElement.textContent='${fallback}'"></video>`;
  const gifClass = isGifUrl2(url) ? " is-gif" : "";
  return `<img class="${className}${gifClass}" src="${safeUrl2}" alt="" loading="lazy" onerror="this.remove();this.parentElement.textContent='${fallback}'">`;
}
function ratingNickBadgeMarkup(profile) {
  const stickers = profile?.stickers;
  if (!stickers || !stickers.nickBadge) return "";
  try {
    const visual = renderStickerFaceByKey(stickers, stickers.nickBadge);
    return visual ? `<span class="rg-nick-badge" title="\u041D\u0430\u043B\u0456\u043F\u043A\u0430 \u043F\u0440\u043E\u0444\u0456\u043B\u044E" aria-label="\u041D\u0430\u043B\u0456\u043F\u043A\u0430 \u043F\u0440\u043E\u0444\u0456\u043B\u044E">${visual}</span>` : "";
  } catch (e) {
    return "";
  }
}
function ratingNameMarkup(profile, suffix = "") {
  const displayName = profile.realName || profile.name || profile.fullName || profile.nickname || "\u0413\u0456\u0441\u0442\u044C";
  return `<span class="rg-profile-name-row"><span>${escapeRatingHtml(displayName).replace(/^@+/, "")}</span>${ratingNickBadgeMarkup(profile)}${suffix}</span>`;
}
function getProfile2() {
  const profile = Storage.getProfile() || {};
  return {
    realName: typeof profile.realName === "string" && profile.realName.trim() ? profile.realName.trim() : "",
    name: typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : "",
    fullName: typeof profile.fullName === "string" && profile.fullName.trim() ? profile.fullName.trim() : "",
    nickname: typeof profile.nickname === "string" && profile.nickname.trim() ? profile.nickname.trim() : "\u0413\u0456\u0441\u0442\u044C",
    stickers: Storage.getStickers() || {},
    avatar: typeof profile.avatar === "string" ? profile.avatar : "",
    avatarVideo: typeof profile.avatarVideo === "string" ? profile.avatarVideo : "",
    avatarVideoSettings: profile.avatarVideoSettings || {}
  };
}
function isGifUrl2(url) {
  if (typeof url !== "string" || !url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".gif") || lower.includes(".gif?") || lower.includes(".gif/");
}
function getUserRankInfo(episodes, watchMinutes) {
  if (watchMinutes >= 2e3) return { label: "\u041B\u0435\u0433\u0435\u043D\u0434\u0430 \u0430\u043D\u0456\u043C\u0435", color: "var(--accent)", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><path d="M5 16h14"/></svg>' };
  if (watchMinutes >= 1e3) return { label: "\u041C\u0430\u0439\u0441\u0442\u0435\u0440", color: "var(--text)", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>' };
  if (watchMinutes >= 500) return { label: "\u0412\u0435\u0442\u0435\u0440\u0430\u043D", color: "var(--text-secondary)", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>' };
  if (watchMinutes >= 200) return { label: "\u0414\u043E\u0441\u0432\u0456\u0434\u0447\u0435\u043D\u0438\u0439", color: "var(--text-secondary)", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L12 3 4 7m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 0v10M4 7v10l8 4"/></svg>' };
  if (watchMinutes >= 60) return { label: "\u041F\u043E\u0447\u0430\u0442\u043A\u0456\u0432\u0435\u0446\u044C", color: "var(--text-muted)", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' };
  return { label: "\u041D\u043E\u0432\u0430\u0447\u043E\u043A", color: "var(--text-muted)", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' };
}
function calculateBaseXP({ episodes = 0, watchSeconds = 0, bookmarks = 0 } = {}) {
  const safeEpisodes = Math.max(0, Math.floor(Number(episodes) || 0));
  const watchMinutes = Math.max(0, Math.floor((Number(watchSeconds) || 0) / 60));
  const safeBookmarks = Math.max(0, Math.floor(Number(bookmarks) || 0));
  return safeEpisodes * 250 + watchMinutes * 100 + safeBookmarks * 50;
}
function calcTotalXP() {
  const history2 = Storage.getHistory() || [];
  const bookmarks = Storage.getBookmarks() || [];
  return calculateBaseXP({ episodes: history2.length, watchSeconds: Storage.getWatchTime() || 0, bookmarks: bookmarks.length });
}
function getLevel(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}
function getXPForLevel(level) {
  return Math.pow(level - 1, 2) * 50;
}
function getXPProgress(xp) {
  const level = getLevel(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const into = xp - currentLevelXP;
  const needed = nextLevelXP - currentLevelXP;
  return { level, pct: needed > 0 ? Math.min(100, Math.round(into / needed * 100)) : 100, into, needed };
}
function initRatingPage() {
  const wrap = document.getElementById("ratingPageContainer");
  if (!wrap || wrap.dataset.init) return;
  wrap.dataset.init = "1";
  wrap.innerHTML = `
                <div class="rg-tab-panel active" id="rgPanelRating">
                    <section class="rg-global-section rg-global-first" aria-labelledby="rgGlobalTitle">
                        <div class="rg-lb-title" id="rgGlobalTitle">ГЛОБАЛЬНИЙ РЕЙТИНГ</div>
                        <div class="rg-sort-tabs" role="tablist" aria-label="Сортування рейтингу">
                            <button class="rg-sort-tab active" data-sort="xp" role="tab">XP</button>
                            <button class="rg-sort-tab" data-sort="episodes" role="tab">Перегляди</button>
                            <button class="rg-sort-tab" data-sort="minutes" role="tab">Час перегляду</button>
                            <button class="rg-sort-tab" data-sort="bookmarks" role="tab">Закладки</button>
                        </div>
                        <div id="rgLeaderboard">${renderLeaderboardSkeleton()}</div>
                    </section>
                    <div id="rgAchievements"></div>
                    <div id="rgMyStats">${renderRatingStatsSkeleton()}</div>
                </div>
            `;
  wrap.querySelectorAll(".rg-sort-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("active")) return;
      wrap.querySelectorAll(".rg-sort-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      _lbSortKey = btn.dataset.sort;
      const lb = document.getElementById("rgLeaderboard");
      if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
    });
  });
  loadMyStats();
  loadLeaderboard();
  if (!window.__vakdabRatingStickerRefreshBound) {
    window.__vakdabRatingStickerRefreshBound = true;
    window.addEventListener("vakdab:stickers-changed", () => {
      if (Router.currentRoute !== "rating") return;
      loadMyStats();
      const lb = document.getElementById("rgLeaderboard");
      if (lb && _lbUsersCache.length) renderLeaderboard(lb, _lbUsersCache, _lbSortKey);
    });
  }
}
function renderAchievementCard({ icon, title, subtitle, value, goal, accent = "" }) {
  const safeValue = Math.max(0, Number(value) || 0);
  const safeGoal = Math.max(1, Number(goal) || 1);
  const pct = Math.min(100, Math.round(safeValue / safeGoal * 100));
  const remaining = Math.max(0, safeGoal - safeValue);
  return `<article class="rg-achievement-card ${accent ? `is-${accent}` : ""}">
    <div class="rg-achievement-icon">${icon}</div>
    <div class="rg-achievement-copy"><h3>${title}</h3><p>${subtitle}</p></div>
    <div class="rg-achievement-progress"><div class="rg-progress-track"><span style="width:${pct}%"></span></div><div class="rg-achievement-foot"><span>${safeValue.toLocaleString("uk-UA")} / ${safeGoal.toLocaleString("uk-UA")}</span><strong>${remaining ? `Залишилось: ${remaining.toLocaleString("uk-UA")}` : "Отримано"}</strong></div></div>
  </article>`;
}
function renderAchievements({ watchedEpisodes, watchMinutes, bookmarks, level }) {
  const trophy = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 21h8M12 17v4M6 3h12v6a6 6 0 0 1-12 0V3Z"/><path d="M6 5H3v2a4 4 0 0 0 4 4M18 5h3v2a4 4 0 0 1-4 4"/></svg>';
  const clock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>';
  const bookmark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h7A2.5 2.5 0 0 1 18 4.5V21l-6-3.6L6 21V4.5Z"/></svg>';
  const levelIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>';
  const chips = [
    ["Усі", 7, true], ["У процесі", 5], ["Отримано", 2], ["Час із нами", 1], ["Час перегляду", 1], ["Закладки", 1], ["Підборки", 1], ["Перегляди", 1], ["Драми", 1], ["Мелодрама", 1]
  ].map(([label, count, active]) => `<button class="rg-achievement-chip${active ? " active" : ""}" type="button"><span>${label}</span><small>${count}</small></button>`).join("");
  return `<section class="rg-achievements-section"><div class="rg-achievements-heading"><h2>Досягнення</h2></div><div class="rg-achievement-chips" role="tablist" aria-label="Фільтр досягнень">${chips}</div><div class="rg-achievements-grid">
    ${renderAchievementCard({ icon: trophy, title: "Цінитель", subtitle: "Переглянуті епізоди", value: watchedEpisodes, goal: 40 })}
    ${renderAchievementCard({ icon: clock, title: "Постійний глядач", subtitle: "Хвилини перегляду", value: watchMinutes, goal: 365, accent: "blue" })}
    ${renderAchievementCard({ icon: bookmark, title: "Колекціонер", subtitle: "Тайтли у закладках", value: bookmarks, goal: 10, accent: "cyan" })}
    ${renderAchievementCard({ icon: levelIcon, title: `Рівень ${level}`, subtitle: "XP та активність", value: level, goal: 10, accent: "purple" })}
  </div>`;
}
function loadMyStats() {
  const statsEl = document.getElementById("rgMyStats");
  if (!statsEl) return;
  const profile = getProfile2();
  const history2 = Storage.getHistory() || [];
  const bookmarks = Storage.getBookmarks() || [];
  const watchSec = Storage.getWatchTime() || 0;
  const watchMinutes = Math.floor(watchSec / 60);
  const episodes = history2.length;
  const watchedEpisodes = history2.filter((item) => Number(item?.progress) >= 88).length;
  const rankInfo = getUserRankInfo(episodes, watchMinutes);
  const totalXP = calcTotalXP();
  const xpLvl = getLevel(totalXP);
  const xpProg = getXPProgress(totalXP);
  const achievementsEl = document.getElementById("rgAchievements");
  if (achievementsEl) achievementsEl.innerHTML = renderAchievements({ watchedEpisodes, watchMinutes, bookmarks: bookmarks.length, level: xpProg.level });
  const avHtml = ratingProfileMediaMarkup(profile, "rg-stats-avatar-media");
  statsEl.innerHTML = `
                <div class="rg-my-stats">
                    <div class="rg-stats-top">
                        <div class="rg-stats-avatar">${avHtml}</div>
                        <div>
                            <div class="rg-stats-name">${ratingNameMarkup(profile)}</div>
                            <div class="rg-stats-rank-badge" style="background:var(--accent);color:var(--accent-text);">${rankInfo.icon || ""}${rankInfo.label} \xB7 Lv.${xpProg.level}</div>
                        </div>
                    </div>
                    <div class="rg-xp-bar-wrap" style="margin:10px 0 4px;">
                        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                            <span>${totalXP} XP</span><span>Lv.${xpProg.level + 1} \u0437\u0430 ${xpProg.needed - xpProg.into} XP</span>
                        </div>
                        <div style="height:6px;border-radius:3px;background:var(--border,rgba(128,128,128,.2));overflow:hidden;">
                            <div style="height:100%;width:${xpProg.pct}%;background:var(--accent);border-radius:3px;transition:width .3s;"></div>
                        </div>
                    </div>
                    <div class="rg-stats-grid">
                        <div class="rg-stat-cell"><div class="rg-stat-val">${watchedEpisodes}</div><div class="rg-stat-label">\u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u043E</div></div>
                        <div class="rg-stat-cell"><div class="rg-stat-val">${watchMinutes}</div><div class="rg-stat-label">\u0425\u0432\u0438\u043B\u0438\u043D</div></div>
                                            </div>
                    <div class="rg-xp-rules-title">\u0417\u0430 \u0449\u043E \u043C\u043E\u0436\u043D\u0430 \u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 XP</div>
                    <div class="rg-xp-rules-list">
                        <div class="rg-xp-rule-item">
                            <div class="rg-xp-rule-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg></div>
                            <div class="rg-xp-rule-text">1 \u0445\u0432\u0438\u043B\u0438\u043D\u0430 \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443</div>
                            <div class="rg-xp-rule-value">+100 XP</div>
                        </div>
                        <div class="rg-xp-rule-item">
                            <div class="rg-xp-rule-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg></div>
                            <div class="rg-xp-rule-text">\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0430</div>
                            <div class="rg-xp-rule-value">+50 XP</div>
                        </div>
                        <div class="rg-xp-rule-item">
                            <div class="rg-xp-rule-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7 16 12l7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg></div>
                            <div class="rg-xp-rule-text">\u041F\u0435\u0440\u0435\u0433\u043B\u044F\u0434 \u0441\u0435\u0440\u0456\u0457</div>
                            <div class="rg-xp-rule-value">+250 XP</div>
                        </div>
                    </div>
                </div>`;
}
async function loadLeaderboard() {
  const lb = document.getElementById("rgLeaderboard");
  if (!lb) return;
  lb.className = "";
  lb.innerHTML = renderLeaderboardSkeleton();
  const showFallback = (msg) => {
    const profile = getProfile2();
    const xp = calcTotalXP();
    const lv = getLevel(xp);
    const av = ratingProfileMediaMarkup(profile, "rg-lb-avatar-media");
    lb.innerHTML = `
                    <div class="rg-lb-list">
                        <div class="rg-lb-item is-me">
                            <div class="rg-lb-num" style="color:var(--accent);font-weight:800;">#1</div>
                            <div class="rg-lb-avatar">${av}</div>
                            <div class="rg-lb-info">
                                <div class="rg-lb-name">${ratingNameMarkup(profile, '<span class="rg-you-badge">YOU</span>')}</div>
                                <div class="rg-lb-rank">Lv.${lv}</div>
                            </div>
                            <div class="rg-lb-score">${xp} <span class="unit">XP</span></div>
                        </div>
                    </div>
                    <p style="text-align:center;font-size:11px;color:var(--text-muted);margin-top:8px;">${msg}</p>`;
  };
  let waited = 0;
  while ((!initialized || !db) && waited < 6e3) {
    await new Promise((res) => setTimeout(res, 250));
    waited += 250;
  }
  if (!initialized || !db) {
    showFallback("Firebase \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439. \u041F\u0435\u0440\u0435\u0432\u0456\u0440\u0442\u0435 \u0437'\u0454\u0434\u043D\u0430\u043D\u043D\u044F.");
    return;
  }
  waited = 0;
  while (!Auth._authResolved && waited < 4e3) {
    await new Promise((res) => setTimeout(res, 150));
    waited += 150;
  }
  if (!Auth.isAuthenticated() && !auth?.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn("Anonymous guest auth unavailable; trying public leaderboard read:", e.code || e);
    }
  }
  try {
    const { collection: collection2, query: query2, limit: limit2, getDocs: getDocs3, onSnapshot: onSnapshot2 } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js");
    const q = query2(collection2(db, "users"), limit2(500));
    const tp = new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 1e4));
    const snap = await Promise.race([getDocs3(q), tp]);
    const thisUid = Auth._user?.uid || auth?.currentUser?.uid || null;
    const mapUsers = (snapshot) => {
      let arr = [];
      snapshot.forEach((d) => {
        const data = d.data();
        arr.push({
          uid: d.id,
          realName: data.profile?.realName || "",
          name: data.profile?.name || data.profile?.fullName || data.displayName || data.name || "",
          fullName: data.profile?.fullName || "",
          nickname: data.profile?.nickname || "\u0410\u043D\u0456\u043C\u0430\u0442\u043E\u0440",
          avatar: data.profile?.avatar || "",
          avatarVideo: data.profile?.avatarVideo || "",
          avatarVideoSettings: data.profile?.avatarVideoSettings || {},
          // Поки Firebase snapshot доганяє локальний запис, не показуємо власну стару наліпку.
          stickers: thisUid && d.id === thisUid ? Storage.getStickers() : data.stickers || {},
          episodes: thisUid && d.id === thisUid ? Storage.getHistory().filter((item) => Number(item?.progress) >= 88).length : Array.isArray(data.history) ? data.history.filter((item) => Number(item?.progress) >= 88).length : 0,
          minutes: Math.floor((thisUid && d.id === thisUid ? Storage.getWatchTime() : data.watchTime || 0) / 60),
          bookmarks: thisUid && d.id === thisUid ? Storage.getBookmarks().length : Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
          xp: calculateBaseXP({ episodes: thisUid && d.id === thisUid ? Storage.getHistory().filter((item) => Number(item?.progress) >= 88).length : Array.isArray(data.history) ? data.history.filter((item) => Number(item?.progress) >= 88).length : 0, watchSeconds: thisUid && d.id === thisUid ? Storage.getWatchTime() : data.watchTime || 0, bookmarks: thisUid && d.id === thisUid ? Storage.getBookmarks().length : Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }),
          level: getLevel(calculateBaseXP({ episodes: thisUid && d.id === thisUid ? Storage.getHistory().filter((item) => Number(item?.progress) >= 88).length : Array.isArray(data.history) ? data.history.filter((item) => Number(item?.progress) >= 88).length : 0, watchSeconds: thisUid && d.id === thisUid ? Storage.getWatchTime() : data.watchTime || 0, bookmarks: thisUid && d.id === thisUid ? Storage.getBookmarks().length : Array.isArray(data.bookmarks) ? data.bookmarks.length : 0 }))
        });
      });
      return arr;
    };
    let users = mapUsers(snap);
    if (!users.length) {
      showFallback("\u0420\u0435\u0439\u0442\u0438\u043D\u0433 \u0437'\u044F\u0432\u0438\u0442\u044C\u0441\u044F \u043F\u0456\u0441\u043B\u044F \u0440\u0435\u0454\u0441\u0442\u0440\u0430\u0446\u0456\u0457 \u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456\u0432.");
      return;
    }
    _lbUsersCache = users;
    renderLeaderboard(lb, users, _lbSortKey);
    if (window._lbUnsub) {
      window._lbUnsub();
      window._lbUnsub = null;
    }
    window._lbUnsub = onSnapshot2(q, (snap2) => {
      const u = mapUsers(snap2);
      if (u.length) {
        _lbUsersCache = u;
        renderLeaderboard(lb, u, _lbSortKey);
      }
    }, (err) => console.warn("LB snapshot error:", err));
  } catch (e) {
    console.warn("loadLeaderboard error:", e.message);
    showFallback("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F: " + e.message);
  }
}
function renderLeaderboard(lb, users, sortKey) {
  sortKey = sortKey || _lbSortKey || "xp";
  const cfg = LB_SORT_CONFIG[sortKey] || LB_SORT_CONFIG.xp;
  const sorted = [...users].sort((a, b) => cfg.getVal(b) - cfg.getVal(a));
  const myUid = Auth._user?.uid || auth?.currentUser?.uid || null;
  let html = "";
  if (sorted.length >= 3) {
    const order = [sorted[1], sorted[0], sorted[2]];
    const cls = ["p2", "p1", "p3"];
    html += '<div class="rg-podium">';
    order.forEach((u, i) => {
      const av = ratingProfileMediaMarkup(u, "rg-podium-avatar-media");
      const podiumProfileAttrs = u.uid ? ` data-profile-uid="${escapeRatingHtml(u.uid)}" role="link" tabindex="0" title="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043F\u0440\u043E\u0444\u0456\u043B\u044C"` : "";
      html += `<div class="rg-podium-item ${cls[i]}"${podiumProfileAttrs} style="animation-delay:${i * 0.08}s">
                        <img class="rg-podium-badge" src="${TOP_BADGES[cls[i]]}" alt="" aria-hidden="true" loading="lazy">
                        <div class="rg-podium-rank-label">\u0422\u043E\u043F ${cls[i].slice(1)}</div>
                        <div class="rg-podium-avatar">${av}</div>
                        <div class="rg-podium-name">${ratingNameMarkup(u)}</div>
                        <div class="rg-podium-score">${cfg.getVal(u)} ${cfg.unit}</div>
                        <div class="rg-podium-bar"></div>
                    </div>`;
    });
    html += "</div>";
  }
  html += '<div class="rg-lb-list">';
  sorted.slice(3).forEach((u, i) => {
    const isMe = u.uid === myUid;
    const av = ratingProfileMediaMarkup(u, "rg-lb-avatar-media");
    const ri = getUserRankInfo(u.episodes, u.minutes);
    const listProfileAttrs = u.uid ? ` data-profile-uid="${escapeRatingHtml(u.uid)}" role="link" tabindex="0" title="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043F\u0440\u043E\u0444\u0456\u043B\u044C"` : "";
    html += `<div class="rg-lb-item ${isMe ? "is-me" : ""}"${listProfileAttrs} style="animation-delay:${Math.min(i * 0.02, 0.4)}s">
                    <div class="rg-lb-num">${i + 4}</div>
                    <div class="rg-lb-avatar">${av}</div>
                    <div class="rg-lb-info">
                        <div class="rg-lb-name">${ratingNameMarkup(u, isMe ? '<span class="rg-you-badge">YOU</span>' : "")}</div>
                        <div class="rg-lb-rank" style="color:${ri.color}">Lv.${u.level} \xB7 ${ri.label}</div>
                    </div>
                    <div class="rg-lb-score">${cfg.getVal(u)} <span class="unit">${cfg.unit}</span></div>
                </div>`;
  });
  html += "</div>";
  lb.className = "";
  lb.innerHTML = html;
  lb.querySelectorAll("[data-profile-uid]").forEach((card) => {
    const openProfile = () => Router.goTo("profile", { uid: card.dataset.profileUid });
    card.addEventListener("click", openProfile);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openProfile();
      }
    });
  });
}
async function loadRatingPage() {
  initRatingPage();
}
async function loadRatingList() {
  initRatingPage();
}
var _lbSortKey, _lbUsersCache, TOP_BADGES, LB_SORT_CONFIG;
var init_ratingSystem = __esm({
  "src/js/components/rating/ratingSystem.js?v=20260921-podium-medals-v2"() {
    init_auth();
    init_router();
    init_storage();
    init_client();
    init_firebase();
    init_stickersLegacy();
    init_skeleton();
    _lbSortKey = "xp";
    _lbUsersCache = [];
    TOP_BADGES = Object.freeze({ p1: "./assets/rating/top-1.png", p2: "./assets/rating/top-2.png", p3: "./assets/rating/top-3.png" });
    LB_SORT_CONFIG = {
      xp: { unit: "XP", getVal: (u) => u.xp },
      episodes: { unit: "\u0441\u0435\u0440.", getVal: (u) => u.episodes },
      minutes: { unit: "\u0445\u0432", getVal: (u) => u.minutes },
      bookmarks: { unit: "\u0437\u0430\u043A.", getVal: (u) => u.bookmarks }
    };
  }
});
