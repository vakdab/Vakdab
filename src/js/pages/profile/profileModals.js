function renderAuthPage() {
  const container = document.getElementById("profilePageContainer");
  if (!container) return;
  const tgUser = globalThis.Telegram?.WebApp?.initDataUnsafe?.user;
  const tgBtnLabel = tgUser?.first_name ? `\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u044F\u043A ${escapeHtml4(tgUser.first_name)} (Telegram)` : "\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Telegram";
  container.innerHTML = `
    <div class="auth-card">
      <div class="mark"></div>
      <h1 id="authTitle">\u0412\u0445\u0456\u0434 \u0434\u043E \u0430\u043A\u0430\u0443\u043D\u0442\u0430</h1>
      <p class="sub" id="authSub">\u0423\u0432\u0456\u0439\u0434\u0456\u0442\u044C \u0437\u0430 \u0434\u043E\u043F\u043E\u043C\u043E\u0433\u043E\u044E Telegram, Google \u0430\u0431\u043E \u0432\u0430\u0448\u043E\u0457 \u043F\u043E\u0448\u0442\u0438.</p>

      <button class="telegram-btn" type="button" id="authTelegramBtn">
        <svg viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/>
        </svg>
        ${tgBtnLabel}
      </button>

      <button class="google-btn" type="button" id="authGoogleBtn">
        <svg viewBox="0 0 48 48">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
          <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
        </svg>
        \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Google
      </button>

      <div class="divider">\u0430\u0431\u043E \u0447\u0435\u0440\u0435\u0437 email</div>

      <div class="panel active" id="authPanel-login">
        <form id="authLoginForm" onsubmit="return false;">
          <div class="field">
            <label for="loginEmail">Email</label>
            <input id="loginEmail" type="email" placeholder="you@example.com" required autocomplete="email">
          </div>
          <div class="field">
            <label for="loginPass">\u041F\u0430\u0440\u043E\u043B\u044C</label>
            <input id="loginPass" type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required autocomplete="current-password">
          </div>
          <div class="row-between">
            <label class="remember"><input type="checkbox" id="loginRemember">\u0417\u0430\u043F\u0430\u043C'\u044F\u0442\u0430\u0442\u0438 \u043C\u0435\u043D\u0435</label>
            <a href="#" onclick="showToast('\u0421\u043A\u0438\u0434\u0430\u043D\u043D\u044F \u043F\u0430\u0440\u043E\u043B\u044F \u2014 \u0441\u043A\u043E\u0440\u0438\u0441\u0442\u0430\u0439\u0442\u0435\u0441\u044F \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F\u043C\u0438 \u043F\u0440\u043E\u0444\u0456\u043B\u044E');return false;">\u0417\u0430\u0431\u0443\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C?</a>
          </div>
          <div class="auth-error" id="authError"></div>
          <button class="submit-btn" type="submit" id="authLoginSubmit">\u0423\u0432\u0456\u0439\u0442\u0438</button>
        </form>
      </div>

      <button class="guest-btn" type="button" id="authGuestBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21a8 8 0 0 0-16 0"/>
          <circle cx="12" cy="8" r="4.5"/>
        </svg>
        \u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0438\u0442\u0438 \u044F\u043A \u0433\u0456\u0441\u0442\u044C
      </button>
    </div>
  `;
  document.getElementById("authLoginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPass").value;
    const errorEl = document.getElementById("authError");
    const submitBtn = document.getElementById("authLoginSubmit");
    errorEl.textContent = "";
    if (!email || !pass) {
      errorEl.textContent = "\u0411\u0443\u0434\u044C \u043B\u0430\u0441\u043A\u0430, \u0437\u0430\u043F\u043E\u0432\u043D\u0456\u0442\u044C \u0443\u0441\u0456 \u043F\u043E\u043B\u044F.";
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "\u0412\u0445\u0456\u0434...";
    const result = await Auth.login(email, pass);
    submitBtn.disabled = false;
    submitBtn.textContent = "\u0423\u0432\u0456\u0439\u0442\u0438";
    if (!result.success) {
      errorEl.textContent = result.error || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0432\u0445\u043E\u0434\u0443";
    } else {
      await Auth.waitForResolution();
      renderProfilePage2();
    }
  });
  const telegramBtn = document.getElementById("authTelegramBtn");
  if (telegramBtn) {
    telegramBtn.addEventListener("click", async function() {
      const errorEl = document.getElementById("authError");
      errorEl.textContent = "";
      this.disabled = true;
      const originalHtml = this.innerHTML;
      this.textContent = "\u0410\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0456\u044F \u0447\u0435\u0440\u0435\u0437 Telegram...";
      const result = await Auth.signInWithTelegram();
      this.disabled = false;
      this.innerHTML = originalHtml;
      if (!result.success) {
        errorEl.textContent = result.error || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0432\u0445\u043E\u0434\u0443 \u0447\u0435\u0440\u0435\u0437 Telegram";
      } else {
        await Auth.waitForResolution();
        renderProfilePage2();
      }
    });
  }
  document.getElementById("authGoogleBtn").addEventListener("click", async function() {
    const errorEl = document.getElementById("authError");
    errorEl.textContent = "";
    this.disabled = true;
    const originalHtml = this.innerHTML;
    this.textContent = "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F...";
    const result = await Auth.signInWithGoogle();
    this.disabled = false;
    this.innerHTML = originalHtml;
    if (!result.success) {
      errorEl.textContent = result.error || "\u041F\u043E\u043C\u0438\u043B\u043A\u0430 Google \u0432\u0445\u043E\u0434\u0443";
    } else {
      await Auth.waitForResolution();
      renderProfilePage2();
    }
  });
  document.getElementById("authGuestBtn").addEventListener("click", () => {
    Auth.setGuest(true);
    showToast("\u041F\u0440\u043E\u0434\u043E\u0432\u0436\u0443\u0454\u043C\u043E \u044F\u043A \u0433\u0456\u0441\u0442\u044C");
    Router.showProfile();
  });
  syncLeftdockActive();
}
function renderHistoryPanel(history2) {
  if (!history2 || !history2.length) {
    return `
      <div class="profile-empty">
        <i class="fas fa-history"></i>
        <p>\u0406\u0441\u0442\u043E\u0440\u0456\u044F \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0456\u0432 \u043F\u043E\u0440\u043E\u0436\u043D\u044F</p>
      </div>
    `;
  }
  const animeHistory = [];
  const seenAnime = /* @__PURE__ */ new Set();
  const watchedEpisodesByAnime = {};
  history2.forEach((item, index) => {
    const key = item.url || item.title || `history-${index}`;
    if (Number(item.progress) >= 88) watchedEpisodesByAnime[key] = (watchedEpisodesByAnime[key] || 0) + 1;
    if (!seenAnime.has(key)) {
      seenAnime.add(key);
      animeHistory.push(item);
    }
  });
  let html = `
    <div class="profile-panel-header">
      <span class="profile-panel-title">\u0406\u0441\u0442\u043E\u0440\u0456\u044F \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443</span>
      <span class="profile-panel-count">${animeHistory.length} \u0430\u043D\u0456\u043C\u0435</span>
    </div>
    <div class="profile-history-list">
  `;
  animeHistory.slice(0, 30).forEach((item) => {
    const poster = item.poster || "";
    const rawTitle = item.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
    const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + "\u2026" : rawTitle;
    const ep = item.episode || "?";
    const season = item.season || "";
    const time = item.timestamp ? new Date(item.timestamp).toLocaleDateString("uk-UA") : "\u043D\u0435\u0432\u0456\u0434\u043E\u043C\u043E";
    const progress = item.progress || 0;
    const animeKey = item.url || item.title || "";
    const watchedEpisodes = watchedEpisodesByAnime[animeKey] || 0;
    const currentEpisode = Math.max(1, Number(item.episodePosition) || Number(ep) || 1);
    const totalEpisodes = Math.max(currentEpisode, Number(item.totalEpisodes) || watchedEpisodes || currentEpisode);
    const animeProgress = Math.min(100, (currentEpisode - 1 + Math.min(Number(progress), 100) / 100) / totalEpisodes * 100);
    const progressPercent = Math.round(animeProgress);
    html += `
      <div class="profile-history-item" data-profile-url="${escapeHtml4(item.url || "")}" role="button" tabindex="0">
        <div class="profile-thumb">
          ${poster ? `<img src="${escapeHtml4(poster)}" alt="${escapeHtml4(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ""}
          <span class="profile-thumb-placeholder" style="${poster ? "display:none;" : ""}">
            <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
          </span>
        </div>
        <div class="profile-h-info">
          <div class="profile-h-title">${escapeHtml4(title)}</div>
          <div class="profile-h-sub">
            <span>${season ? `<b>\u0421\u0435\u0437\u043E\u043D ${escapeHtml4(String(season))}</b>, ` : ""}<b>\u0421\u0435\u0440\u0456\u044F ${escapeHtml4(String(ep))}</b></span>
            <span class="dot"></span>
            <span>${escapeHtml4(time)}</span>
          </div>
        </div>
        <div class="profile-h-progress">
          <span class="profile-h-watched-count">${progressPercent}%</span>
          <div class="profile-h-progress-fill" style="width:${animeProgress}%"></div>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  return html;
}
function renderBookmarksPanel(bookmarks) {
  if (!bookmarks || !bookmarks.length) {
    return `
      <div class="profile-empty">
        <i class="fas fa-bookmark"></i>
        <p>\u041D\u0435\u043C\u0430\u0454 \u0437\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u0438\u0445 \u0437\u0430\u043A\u043B\u0430\u0434\u043E\u043A</p>
      </div>
    `;
  }
  let html = `
    <div class="profile-panel-header">
      <span class="profile-panel-title">\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438</span>
      <span class="profile-panel-count">${bookmarks.length}</span>
    </div>
    <div class="profile-bookmark-grid">
  `;
  bookmarks.slice(0, 30).forEach((item) => {
    const poster = item.poster || "";
    const rawTitle = item.title || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
    const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + "\u2026" : rawTitle;
    const sub = item.episodes || "";
    html += `
      <div class="profile-bookmark-card" data-profile-url="${escapeHtml4(item.url || "")}" role="button" tabindex="0">
        <div class="profile-bm-thumb">
          ${poster ? `<img src="${escapeHtml4(poster)}" alt="${escapeHtml4(title)}" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ""}
          <span class="profile-bm-thumb-ph" style="${poster ? "display:none;" : ""}">
            <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
          </span>
        </div>
        <div class="profile-bm-info">
          <div class="profile-bm-title">${escapeHtml4(title)}</div>
          <div class="profile-bm-sub">${escapeHtml4(sub || "\u0417\u0431\u0435\u0440\u0435\u0436\u0435\u043D\u043E")}</div>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  return html;
}
function profileEditNick() {
  const nickEl = document.getElementById("profileNickText");
  if (!nickEl) return;
  const profile = getProfile();
  const current = getProfileDisplayName(profile);
  const input = document.createElement("input");
  input.type = "text";
  input.value = current;
  input.style.cssText = "font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:2px 8px;outline:none;width:180px;font-family:inherit;";
  if (document.body.classList.contains("dark-mode")) {
    input.style.background = "#1a1a1a";
    input.style.color = "#f7f7f7";
    input.style.borderColor = "#333";
  }
  nickEl.replaceWith(input);
  input.focus();
  input.select();
  const save = () => {
    const val = input.value.trim() || current;
    const span = document.createElement("span");
    span.className = "profile-nick";
    span.id = "profileNickText";
    span.textContent = val;
    input.replaceWith(span);
    profile.realName = stripNicknamePrefix(val);
    span.textContent = getProfileDisplayName(profile);
    saveProfile(profile);
    if (Router.currentRoute === "profile") renderProfilePage2();
  };
  input.addEventListener("blur", save);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      input.blur();
    }
    if (e.key === "Escape") {
      input.value = current;
      input.blur();
    }
  });
}
function profileEditBio() {
  const bioEl = document.getElementById("profileBioText");
  if (!bioEl) return;
  const current = bioEl.textContent;
  const textarea = document.createElement("textarea");
  textarea.value = current;
  textarea.style.cssText = "font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:6px 8px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;";
  if (document.body.classList.contains("dark-mode")) {
    textarea.style.background = "#1a1a1a";
    textarea.style.color = "#cfcfcf";
    textarea.style.borderColor = "#333";
  }
  bioEl.replaceWith(textarea);
  textarea.focus();
  textarea.select();
  const save = () => {
    const val = textarea.value.trim() || current;
    const div = document.createElement("div");
    div.className = "profile-bio";
    div.id = "profileBioText";
    div.textContent = val;
    textarea.replaceWith(div);
    const profile = getProfile();
    profile.bio = val;
    saveProfile(profile);
    if (Router.currentRoute === "profile") renderProfilePage2();
  };
  textarea.addEventListener("blur", save);
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      textarea.value = current;
      textarea.blur();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      textarea.blur();
    }
  });
}
function initProfileFileInputs() {
  const avatarInput = document.getElementById("avatarFileInput");
  if (avatarInput && !avatarInput.dataset.bound) {
    avatarInput.dataset.bound = "true";
    avatarInput.addEventListener("change", async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const isVideo = isVideoFile(file);
      const isGif = !isVideo && (file.type === "image/gif" || /\.gif$/i.test(file.name || ""));
      const maxSize = isVideo ? 50 * 1024 * 1024 : isGif ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(isVideo ? "\u0412\u0456\u0434\u0435\u043E \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 50 \u041C\u0411)" : isGif ? "GIF \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0438\u0439 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 50 \u041C\u0411) \u2014 \u0432\u0438\u0431\u0435\u0440\u0438 \u043A\u043E\u0440\u043E\u0442\u0448\u0438\u0439" : "\u0424\u0430\u0439\u043B \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0438\u0439 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 15 \u041C\u0411)");
        e.target.value = "";
        return;
      }
      const doUpload = async (blobOrFile, raw, mediaType = "image", mediaSettings = null) => {
        showToast(mediaType === "video" ? "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u0435\u043E-\u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438..." : mediaType === "gif" && blobOrFile?.size > CLOUDINARY_IMAGE_FILE_LIMIT ? "\u041F\u0435\u0440\u0435\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F \u0432\u0435\u043B\u0438\u043A\u043E\u0433\u043E GIF \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438 \u0443 \u0432\u0456\u0434\u0435\u043E..." : mediaType === "gif" ? "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F GIF-\u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438..." : "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438...");
        try {
          const imageUrl = mediaType === "video" ? await uploadVideoToCloudinary(blobOrFile, "avatar.mp4") : mediaType === "gif" ? await uploadGifToCloudinary(blobOrFile, "avatar.gif") : raw ? await uploadRawToCloudinary(blobOrFile, "avatar.gif") : await uploadBlobToCloudinary(blobOrFile, "avatar.jpg");
          const profile = getProfile();
          if (mediaType === "video" || mediaType === "gif") {
            profile.avatarVideo = imageUrl;
            profile.avatar = "";
            profile.avatarVideoSettings = mediaSettings || null;
          } else {
            profile.avatar = imageUrl;
            profile.avatarVideo = "";
            profile.avatarVideoSettings = null;
          }
          await saveProfile(profile);
          if (Router.currentRoute === "profile") renderProfilePage2();
          if (Router.currentRoute === "settings") renderSettingsPage();
          showToast("\u0410\u0432\u0430\u0442\u0430\u0440\u043A\u0443 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
        } catch (err) {
          console.error("Avatar upload error:", err);
          showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438: " + (err.message || "\u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430"));
        }
      };
      if (isVideo) {
        openImageEditor(file, "avatar", (settings) => doUpload(file, true, "video", settings));
      } else if (isGif) {
        openImageEditor(file, "avatar", (settings) => doUpload(file, true, "gif", settings));
      } else {
        openImageEditor(file, "avatar", (blob) => doUpload(blob, false));
      }
      e.target.value = "";
    });
  }
  const stickerInput = document.getElementById("stickerFileInput");
  if (stickerInput && !stickerInput.dataset.bound) {
    stickerInput.dataset.bound = "true";
    stickerInput.addEventListener("change", async function(e) {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const maxSize = 8 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast("\u0424\u0430\u0439\u043B \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0438\u0439 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 8 \u041C\u0411)");
        return;
      }
      openImageEditor(file, "avatar", async (blob) => {
        showToastProgress("AI \u0433\u043E\u0442\u0443\u0454 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F \u0444\u043E\u043D\u0443\u2026");
        try {
          const processedBlob = await removeStickerBackground(blob);
          showToast("\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043D\u0430\u043B\u0456\u043F\u043A\u0438...");
          const imageUrl = await uploadBlobToCloudinary(processedBlob, "sticker.png");
          const cur = Storage.getStickers();
          const stickerId = "sng_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
          const stickerKey = "img:" + stickerId;
          cur.singles.unshift({ id: stickerId, image: imageUrl, favorite: false, addedAt: Date.now() });
          if (!Array.isArray(cur.medals)) cur.medals = [];
          if (!cur.medals.includes(stickerKey) && cur.medals.length < PROFILE_STICKER_SLOTS) cur.medals.push(stickerKey);
          if (!cur.colors) cur.colors = {};
          if (!cur.colors[stickerKey]) cur.colors[stickerKey] = "#7c8494";
          Storage.setStickers(cur);
          showToast(cur.medals.includes(stickerKey) ? "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0434\u043E\u0434\u0430\u043D\u043E \u0432 \u043F\u0440\u043E\u0444\u0456\u043B\u044C" : "\u041D\u0430\u043B\u0456\u043F\u043A\u0443 \u0434\u043E\u0434\u0430\u043D\u043E");
          if (window.stickersUI) window.stickersUI.step = null;
          if (Router.currentRoute === "stickers") window.renderStickersPage?.();
          if (Router.currentRoute === "profile") renderProfilePage2();
          if (Router.currentRoute === "settings") renderSettingsPage();
        } catch (err) {
          console.error("Sticker upload error:", err);
          showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u043D\u0430\u043B\u0456\u043F\u043A\u0438: " + (err.message || "\u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430"));
        }
      });
    });
  }
  const bannerInput = document.getElementById("bannerFileInput");
  if (bannerInput && !bannerInput.dataset.bound) {
    bannerInput.dataset.bound = "true";
    bannerInput.addEventListener("change", async function(e) {
      const file = e.target.files[0];
      if (!file) return;
      const isVideo = isVideoFile(file);
      const isGif = !isVideo && (file.type === "image/gif" || /\.gif$/i.test(file.name || ""));
      const maxSize = isVideo ? 50 * 1024 * 1024 : isGif ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast(isVideo ? "\u0412\u0456\u0434\u0435\u043E \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 50 \u041C\u0411)" : isGif ? "GIF \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0438\u0439 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 50 \u041C\u0411) \u2014 \u0432\u0438\u0431\u0435\u0440\u0438 \u043A\u043E\u0440\u043E\u0442\u0448\u0438\u0439" : "\u0424\u0430\u0439\u043B \u0437\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0438\u0439 (\u043C\u0430\u043A\u0441\u0438\u043C\u0443\u043C 15 \u041C\u0411)");
        e.target.value = "";
        return;
      }
      const doUpload = async (blobOrFile, raw, mediaType = "image", mediaSettings = null, format = "narrow") => {
        showToast(mediaType === "video" ? "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0432\u0456\u0434\u0435\u043E-\u0431\u0430\u043D\u0435\u0440\u0430..." : mediaType === "gif" && blobOrFile?.size > CLOUDINARY_IMAGE_FILE_LIMIT ? "\u041F\u0435\u0440\u0435\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F \u0432\u0435\u043B\u0438\u043A\u043E\u0433\u043E GIF \u0431\u0430\u043D\u0435\u0440\u0430 \u0443 \u0432\u0456\u0434\u0435\u043E..." : mediaType === "gif" ? "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F GIF-\u0431\u0430\u043D\u0435\u0440\u0430..." : "\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0431\u0430\u043D\u0435\u0440\u0430...");
        try {
          const imageUrl = mediaType === "video" ? await uploadVideoToCloudinary(blobOrFile, "banner.mp4") : mediaType === "gif" ? await uploadGifToCloudinary(blobOrFile, "banner.gif") : raw ? await uploadRawToCloudinary(blobOrFile, "banner.gif") : await uploadBlobToCloudinary(blobOrFile, "banner.jpg");
          const profile = getProfile();
          if (mediaType === "video" || mediaType === "gif") {
            profile.bannerVideo = imageUrl;
            profile.banner = "";
            profile.bannerVideoSettings = mediaSettings || null;
          } else {
            profile.banner = imageUrl;
            profile.bannerVideo = "";
            profile.bannerVideoSettings = null;
          }
          profile.bannerFormat = mediaSettings?.bannerFormat === "wide" || format === "wide" ? "wide" : "narrow";
          await saveProfile(profile);
          if (Router.currentRoute === "profile") renderProfilePage2();
          if (Router.currentRoute === "settings") renderSettingsPage();
          showToast("\u0411\u0430\u043D\u0435\u0440 \u043E\u043D\u043E\u0432\u043B\u0435\u043D\u043E");
        } catch (err) {
          console.error("Banner upload error:", err);
          showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0431\u0430\u043D\u0435\u0440\u0430: " + (err.message || "\u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430"));
        }
      };
      const currentProfile = getProfile();
      if (isVideo) {
        openImageEditor(file, "banner", (settings) => doUpload(file, true, "video", settings, settings?.bannerFormat), currentProfile.bannerFormat || "narrow");
      } else if (isGif) {
        openImageEditor(file, "banner", (settings) => doUpload(file, true, "gif", settings, settings?.bannerFormat), currentProfile.bannerFormat || "narrow");
      } else {
        openImageEditor(file, "banner", (blob, editorState) => doUpload(blob, false, "image", null, editorState?.bannerFormat));
      }
      e.target.value = "";
    });
  }
}
var init_profileModals = __esm({
  "src/js/pages/profile/profileModals.js?v=20260927-persistence-v1"() {
    init_app_legacy();
    init_string();
    init_profileStorage();
    init_mediaUpload();
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initProfileFileInputs, { once: true });
      } else {
        initProfileFileInputs();
      }
    }
  }
});
