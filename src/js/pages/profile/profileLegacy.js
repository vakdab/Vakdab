function primeProfileMediaPlayback(container) {
  if (!container) return;
  const playVideos = () => {
    container.querySelectorAll("video.is-animated-media").forEach((video) => {
      video.muted = true;
      video.defaultMuted = true;
      video.setAttribute("muted", "");
      const attemptPlay = () => {
        const promise = video.play();
        if (promise && typeof promise.catch === "function") promise.catch(() => {
        });
      };
      if (video.readyState >= 1) attemptPlay();
      else video.addEventListener("loadedmetadata", attemptPlay, { once: true });
      video.addEventListener("canplay", attemptPlay, { once: true });
    });
  };
  playVideos();
  if (!window.__vakdabProfileMediaPlaybackBound) {
    const resume = () => document.querySelectorAll("#profilePageContainer video.is-animated-media").forEach((video) => {
      video.muted = true;
      video.play().catch(() => {
      });
    });
    document.addEventListener("visibilitychange", resume, { passive: true });
    window.addEventListener("pageshow", resume, { passive: true });
    document.addEventListener("pointerdown", resume, { passive: true, once: true });
    window.__vakdabProfileMediaPlaybackBound = true;
  }
}
function renderProfilePage3() {
  const container = document.getElementById("profilePageContainer");
  if (!container) return;
  if (!Auth.isAuthenticated() && !Auth.isGuest()) {
    renderAuthPage();
    return;
  }
  const isGuestMode = Auth.isGuest();
  const profile = getProfile();
  const renderKey = JSON.stringify(profile);
  if (container.dataset.profileRenderKey === renderKey && container.querySelector(".profile-wrapper")) return;
  container.dataset.profileRenderKey = renderKey;
  const stats = getProfileStats();
  const profileXP = calcTotalXP();
  const profileWatchMinutes = stats.watchMinutes;
  const activeBanner = profile.bannerVideo || profile.banner || "";
  const activeAvatar = profile.avatarVideo || profile.avatar || "";
  const isGifBanner = isGifUrl(activeBanner);
  const isGifAvatar = isGifUrl(activeAvatar);
  const bannerEffectClass = profile.bannerEffect && profile.bannerEffect !== "none" ? ` banner-effect-${profile.bannerEffect}` : "";
  const decorationClass = profile.avatarDecoration && profile.avatarDecoration !== "none" ? ` avatar-decoration-${profile.avatarDecoration}` : "";
  const isWide = profile.bannerFormat === "wide";
  const bannerFormatClass = isWide ? "profile-banner--wide" : "profile-banner--narrow";
  const wrapperFormatClass = isWide ? "profile-wrapper--wide" : "profile-wrapper--narrow";
  const bannerClass = (isGifBanner ? "profile-banner is-gif" : "profile-banner") + ` ${bannerFormatClass}` + bannerEffectClass;
  const avatarClass = isGifAvatar ? "profile-avatar is-gif" : "profile-avatar";
  const profileNickname = escapeHtml2(getProfileDisplayName(profile));
  const profileHandle = escapeHtml2(getProfileHandle(profile));
  const profileBioText = escapeHtml2(profile.bio);
  const stickerData = Storage.getStickers();
  container.innerHTML = `
            <div class="profile-wrapper ${wrapperFormatClass}">
              <div class="${bannerClass}">
                ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, "profile-banner-media", "video banner", profile.bannerVideoSettings) : profile.banner ? profileMediaMarkup(profile.banner, "profile-banner-media", "banner") : ""}
                ${profile.atmosphere && profile.atmosphere !== "none" ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ""}
                ${profile.effect && profile.effect !== "none" ? buildEffectOverlayHtml(profile.effect) : ""}
              </div>
              <div class="profile-info">
                <div class="profile-head-row">
                  <div class="profile-avatar-wrap${decorationClass}">
                    <div class="${avatarClass}">
                      ${profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, "profile-avatar-media", "video avatar", profile.avatarVideoSettings) : profile.avatar ? profileMediaMarkup(profile.avatar, "profile-avatar-media", "avatar") : ""}
                      <span class="avatar-placeholder" style="display:${profile.avatarVideo || profile.avatar ? "none" : "flex"};">${escapeHtml2(getProfileDisplayName(profile).charAt(0).toUpperCase())}</span>
                    </div>
                  </div>
                </div>
                <div class="profile-header-actions">
                  <span class="profile-stat-action" title="\u0414\u043E\u0441\u0432\u0456\u0434 \u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0430">
                    <i class="fas fa-star" aria-hidden="true"></i>
                    <strong>${profileXP.toLocaleString("uk-UA")}</strong><small>XP</small>
                  </span>
                  <span class="profile-stat-action" title="\u0427\u0430\u0441 \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443">
                    <i class="fas fa-clock" aria-hidden="true"></i>
                    <strong>${profileWatchMinutes.toLocaleString("uk-UA")}</strong><small>\u0445\u0432</small>
                  </span>
                  <button type="button" class="profile-edit-trigger" id="profileEditTrigger" aria-label="\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u043F\u0440\u043E\u0444\u0456\u043B\u044C">
                    <i class="fas fa-pen" aria-hidden="true"></i>
                    <span>\u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438</span>
                  </button>
                </div>
                <div class="profile-nick-row">
                  <span class="profile-nick" id="profileNickText">${profileNickname}</span>
                  ${stickerData.nickBadge ? `<span class="profile-nick-badge" title="\u041D\u0430\u043B\u0456\u043F\u043A\u0430 \u043F\u0440\u043E\u0444\u0456\u043B\u044E" aria-label="\u041D\u0430\u043B\u0456\u043F\u043A\u0430 \u043F\u0440\u043E\u0444\u0456\u043B\u044E">${renderStickerFaceByKey(stickerData, stickerData.nickBadge)}</span>` : ""}
                </div>
                <div class="profile-meta">
                  <span>${profileHandle}</span>
                </div>
                <div class="profile-bio-section">
                  <div class="profile-bio-label">\u041E\u041F\u0418\u0421</div>
                  <div class="profile-bio-row">
                    <div class="profile-bio${profile.bioBold ? " is-bold" : ""}" id="profileBioText">${profileBioText}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="profile-tabs" id="profileTabs">
              <button class="profile-tab active" data-tab="history">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                \u0406\u0441\u0442\u043E\u0440\u0456\u044F
              </button>
              <button class="profile-tab" data-tab="bookmarks">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
                \u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438
              </button>

            </div>
            <div id="profilePanels">
              <div class="profile-panel active" id="profilePanel-history">
                ${renderHistoryPanel(stats.history)}
              </div>
              <div class="profile-panel" id="profilePanel-bookmarks">
                ${renderBookmarksPanel(stats.bookmarksList)}
              </div>
            </div>
          `;
  primeProfileMediaPlayback(container);
  document.getElementById("profileEditTrigger")?.addEventListener("click", () => {
    Router.goTo("settings", { tab: "appearance" });
  });
  document.querySelectorAll("#profilePageContainer .profile-avatar-media").forEach((media) => {
    media.addEventListener("error", () => {
      media.style.display = "none";
      const placeholder = media.parentElement?.querySelector(".avatar-placeholder");
      if (placeholder) placeholder.style.display = "flex";
    });
  });
  document.querySelectorAll("#profilePageContainer .profile-banner-media").forEach((media) => {
    media.addEventListener("error", () => {
      media.style.display = "none";
    });
  });
  document.querySelectorAll("[data-profile-url]").forEach((card) => {
    const openCard = () => {
      const url = card.dataset.profileUrl;
      if (url) openPlayerPage2(url);
    };
    card.addEventListener("click", openCard);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard();
      }
    });
  });
  document.querySelectorAll(".profile-tab").forEach((tab) => {
    tab.addEventListener("click", function() {
      const target = this.dataset.tab;
      document.querySelectorAll(".profile-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".profile-panel").forEach((p) => p.classList.remove("active"));
      this.classList.add("active");
      document.getElementById("profilePanel-" + target).classList.add("active");
    });
  });
  const profileSlots = document.querySelectorAll(".profile-medal-slot");
  let selectedMedalIndex = null;
  let draggedMedalIndex = null;
  let touchDrag = null;
  let holdTimer = null;
  let suppressNextClick = false;
  const clearTouchDrag = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    document.querySelectorAll(".profile-medal-slot.is-touch-dragging,.profile-medal-slot.is-drag-over").forEach((el) => el.classList.remove("is-touch-dragging", "is-drag-over"));
    touchDrag = null;
  };
  const slotAtPoint = (x, y) => document.elementFromPoint(x, y)?.closest(".profile-medal-slot");
  const dropTouchSticker = (event) => {
    clearTimeout(holdTimer);
    if (!touchDrag) return clearTouchDrag();
    const target = slotAtPoint(event.clientX, event.clientY);
    const to = target ? Number(target.dataset.medalIndex) : null;
    const from = touchDrag.from;
    if (to !== null && to !== from) {
      suppressNextClick = true;
      moveProfileMedal(from, to);
    }
    clearTouchDrag();
  };
  const moveProfileMedal = (from, to) => {
    if (from === to || from === null || to === null) return;
    const current = Storage.getStickers();
    const keys = (current.medals || []).slice(0, PROFILE_STICKER_SLOTS);
    if (!keys[from]) return;
    while (keys.length < PROFILE_STICKER_SLOTS) keys.push(null);
    const targetWasFilled = Boolean(keys[to]);
    [keys[from], keys[to]] = [keys[to], keys[from]];
    current.medals = keys.filter(Boolean).slice(0, PROFILE_STICKER_SLOTS);
    Storage.setStickers(current);
    renderProfilePage3();
    showToast(targetWasFilled ? "\u041D\u0430\u043B\u0456\u043F\u043A\u0438 \u0437\u0430\u043C\u0456\u043D\u0435\u043D\u043E" : "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u043F\u0435\u0440\u0435\u043C\u0456\u0449\u0435\u043D\u043E");
  };
  profileSlots.forEach((slot) => {
    slot.addEventListener("pointerdown", (event) => {
      const index = Number(slot.dataset.medalIndex);
      if (!slot.classList.contains("is-filled")) return;
      holdTimer = setTimeout(() => {
        touchDrag = { from: index };
        slot.classList.add("is-touch-dragging");
        try {
          slot.setPointerCapture(event.pointerId);
        } catch {
        }
      }, 300);
    });
    slot.addEventListener("pointermove", (event) => {
      if (!touchDrag) return;
      const target = slotAtPoint(event.clientX, event.clientY);
      document.querySelectorAll(".profile-medal-slot.is-drag-over").forEach((el) => el.classList.remove("is-drag-over"));
      if (target && target.dataset.medalIndex !== String(touchDrag.from)) target.classList.add("is-drag-over");
    });
    slot.addEventListener("pointerup", dropTouchSticker);
    slot.addEventListener("pointercancel", clearTouchDrag);
    slot.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      const index = Number(slot.dataset.medalIndex);
      if (!slot.classList.contains("is-filled")) {
        Router.goTo("stickers");
        return;
      }
      if (selectedMedalIndex === null) {
        if (slot.classList.contains("is-filled")) {
          selectedMedalIndex = index;
          slot.classList.add("is-selected");
        }
        return;
      }
      moveProfileMedal(selectedMedalIndex, index);
      selectedMedalIndex = null;
    });
    slot.addEventListener("dragstart", (e) => {
      draggedMedalIndex = Number(slot.dataset.medalIndex);
      e.dataTransfer.effectAllowed = "move";
      slot.classList.add("is-dragging");
    });
    slot.addEventListener("dragend", () => {
      draggedMedalIndex = null;
      slot.classList.remove("is-dragging");
    });
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      slot.classList.add("is-drag-over");
    });
    slot.addEventListener("dragleave", () => slot.classList.remove("is-drag-over"));
    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("is-drag-over");
      moveProfileMedal(draggedMedalIndex, Number(slot.dataset.medalIndex));
    });
  });
  if (typeof isGuestMode !== "undefined" && isGuestMode) {
    const syncBtn = document.getElementById("profileSyncBtn");
    if (syncBtn) syncBtn.style.display = "none";
  }
  syncLeftdockActive();
}
var init_profileLegacy = __esm({
  "src/js/pages/profile/profileLegacy.js?v=20260906-remove-thought-v1"() {
    init_app_legacy();
    init_storage();
    init_stickersLegacy();
    init_settingsLegacy();
    init_skeleton();
    if (!window.__vakdabProfileStickerRefreshBound) {
      window.__vakdabProfileStickerRefreshBound = true;
      window.addEventListener("vakdab:stickers-changed", () => {
        if (Router.currentRoute === "profile" && document.getElementById("profilePageContainer")) renderProfilePage3();
      });
    }
  }
});
