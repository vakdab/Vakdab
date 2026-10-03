function escapeHtml3(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
function episodeLabel(state) {
  const start = Number(state?.episodeStart || 0);
  const end = Number(state?.episodeEnd || 0);
  const count = Number(state?.episodeCount || 0);
  if (start && end) return `\u0421\u0435\u0440\u0456\u0457 ${start}\u2013${end}${count ? ` \xB7 ${count} ${count === 1 ? "\u0441\u0435\u0440\u0456\u044F" : "\u0441\u0435\u0440\u0456\u0439"}` : ""}`;
  if (state?.isMovie) return "\u0424\u0456\u043B\u044C\u043C";
  return count ? `${count} ${count === 1 ? "\u0441\u0435\u0440\u0456\u044F" : "\u0441\u0435\u0440\u0456\u0439"}` : "\u0421\u0435\u0440\u0456\u0457 \u0449\u0435 \u043D\u0435 \u0432\u0438\u0431\u0440\u0430\u043D\u0456";
}
function formatRemaining(target) {
  const total = Math.max(0, Math.floor((Number(target || 0) - Date.now()) / 1e3));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const seconds = total % 60;
  return hours ? `${hours} \u0433\u043E\u0434 ${String(minutes).padStart(2, "0")} \u0445\u0432` : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
function statusLabel(status) {
  return { running: "\u0415\u0444\u0456\u0440 \u0442\u0440\u0438\u0432\u0430\u0454", ready: "\u0413\u043E\u0442\u043E\u0432\u043E \u0434\u043E \u0441\u0442\u0430\u0440\u0442\u0443", draft: "\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F", finished: "\u0415\u0444\u0456\u0440 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E" }[status] || "Live";
}
function stopVideo() {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  currentSource = "";
}
function mountVideo(video, source) {
  stopVideo();
  currentSource = source;
  if (!source) return;
  if (window.Hls?.isSupported?.() && /\.m3u8(?:[?#]|$)/i.test(source)) {
    hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: true });
    hlsInstance.loadSource(source);
    hlsInstance.attachMedia(video);
    hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {
    }));
  } else {
    video.src = source;
    video.play().catch(() => {
    });
  }
}
function renderLoading(container) {
  container.innerHTML = renderLiveSkeleton();
}
function renderIdle(container) {
  stopVideo();
  container.innerHTML = `<section class="anime-live-page anime-live-page--empty"><div class="anime-live-topbar"><button type="button" class="anime-live-back" data-live-back aria-label="\u041D\u0430 \u0433\u043E\u043B\u043E\u0432\u043D\u0443">\u2190</button><div><span class="anime-live-kicker">VAKDAB LIVE</span><h1>\u0410\u043D\u0456\u043C\u0435 \u0415\u0444\u0456\u0440</h1></div></div><div class="anime-live-empty-card"><span class="anime-live-empty-icon">\u25CF</span><h2>\u0415\u0444\u0456\u0440 \u0437\u0430\u0440\u0430\u0437 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E</h2><p>\u0412\u043B\u0430\u0441\u043D\u0438\u043A VakDab \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0454 \u043D\u0430\u0441\u0442\u0443\u043F\u043D\u0443 \u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0446\u0456\u044E \u0432 Telegram.</p><button type="button" class="anime-live-primary" data-live-back>\u041D\u0430 \u0433\u043E\u043B\u043E\u0432\u043D\u0443</button></div></section>`;
  bindBackButtons(container);
}
function renderPage(container, state) {
  stopVideo();
  const poster = escapeHtml3(state.poster || "");
  const rawSource = String(state.videoUrl || "");
  const source = /\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(rawSource) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(rawSource) ? rawSource : "";
  const countdownTarget = state.status === "running" ? state.endsAt : state.startsAt;
  container.innerHTML = `<section class="anime-live-page${state.status === "running" ? " is-running" : ""}" aria-labelledby="animeLiveTitle">
        <div class="anime-live-topbar">
            <button type="button" class="anime-live-back" data-live-back aria-label="\u041D\u0430 \u0433\u043E\u043B\u043E\u0432\u043D\u0443">\u2190</button>
            <div><span class="anime-live-kicker">VAKDAB LIVE</span><h1 id="animeLiveTitle">\u0410\u043D\u0456\u043C\u0435 \u0415\u0444\u0456\u0440</h1></div>
            <span class="anime-live-status"><i></i>${escapeHtml3(statusLabel(state.status))}</span>
        </div>
        <div class="anime-live-layout">
            <main class="anime-live-main">
                <div class="anime-live-video-wrap">
                    ${source ? `<video id="animeLiveVideo" class="anime-live-video" autoplay muted playsinline preload="auto"${poster ? ` poster="${poster}"` : ""}></video>` : '<div class="anime-live-video-missing">\u0412\u0456\u0434\u0435\u043E \u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0446\u0456\u0457 \u0433\u043E\u0442\u0443\u0454\u0442\u044C\u0441\u044F\u2026</div>'}
                    <div class="anime-live-live-badge"><i></i> LIVE</div>
                    <div class="anime-live-video-caption"><strong data-live-title>${escapeHtml3(state.animeTitle || "VakDab")}</strong><span data-live-episode>${escapeHtml3(episodeLabel(state))} \xB7 ${escapeHtml3(state.dub || "\u041E\u0437\u0432\u0443\u0447\u043A\u0430")}</span></div>
                </div>
                <section class="anime-live-info-card">
                    <div class="anime-live-info-heading"><div><span class="anime-live-kicker">\u0417\u0410\u0420\u0410\u0417 \u0412 \u0415\u0424\u0406\u0420\u0406</span><h2 data-live-info-title>${escapeHtml3(state.animeTitle || "\u0421\u043F\u0456\u043B\u044C\u043D\u0438\u0439 \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434")}</h2></div><span class="anime-live-viewer-dot">\u25CF \u043D\u0430\u0436\u0438\u0432\u043E</span></div>
                    <p data-live-info-meta>${escapeHtml3(episodeLabel(state))} \xB7 ${escapeHtml3(state.dub || "\u041E\u0437\u0432\u0443\u0447\u043A\u0430 \u043D\u0435 \u0432\u043A\u0430\u0437\u0430\u043D\u0430")}${state.season ? ` \xB7 ${escapeHtml3(state.season)}` : ""}</p>
                    ${state.availableEpisodeCount ? `<small>\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u0441\u0435\u0440\u0456\u0439: ${escapeHtml3(state.availableEpisodeCount)}</small>` : ""}
                    <div class="anime-live-countdown" data-live-countdown>${countdownTarget ? `${state.status === "running" ? "\u0414\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044F" : "\u0414\u043E \u0441\u0442\u0430\u0440\u0442\u0443"}: <strong data-target="${countdownTarget}">${formatRemaining(countdownTarget)}</strong>` : ""}</div>
                </section>
            </main>
            <aside class="anime-live-chat" aria-label="\u0427\u0430\u0442 \u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0446\u0456\u0457">
                <div class="anime-live-chat-heading"><strong>\u0427\u0430\u0442 \u0442\u0440\u0430\u043D\u0441\u043B\u044F\u0446\u0456\u0457</strong><span>\u0421\u043F\u0456\u043B\u044C\u043D\u043E\u0442\u0430 VakDab</span></div>
                <div class="anime-live-chat-messages"><p><b>VakDab:</b> \u041F\u0440\u0438\u0454\u043C\u043D\u043E\u0433\u043E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443!</p><p><b>\u041B\u0443\u043D\u0430:</b> \u0415\u0444\u0456\u0440 \u0456\u0434\u0435 \u043D\u0430\u0436\u0438\u0432\u043E \u2014 \u043F\u0440\u0438\u0454\u0434\u043D\u0443\u0439\u0441\u044F.</p><p><b>\u0421\u0438\u0441\u0442\u0435\u043C\u0430:</b> ${escapeHtml3(state.animeTitle || "\u0410\u043D\u0456\u043C\u0435")} \xB7 ${escapeHtml3(state.dub || "\u043E\u0437\u0432\u0443\u0447\u043A\u0430")}</p></div>
                <div class="anime-live-chat-input" aria-hidden="true">\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u0438 \u0432 \u0447\u0430\u0442 <span>\u263A</span></div>
            </aside>
        </div>
    </section>`;
  bindBackButtons(container);
  const video = container.querySelector("#animeLiveVideo");
  if (video && source) mountVideo(video, source);
}
function updatePage(container, state) {
  if (!state || state.status === "idle") {
    renderIdle(container);
    return;
  }
  const rawSource = String(state.videoUrl || "");
  const source = /\.(?:m3u8|mp4)(?:[?#].*)?$/i.test(rawSource) || /[?&]url=[^&]*(?:m3u8|mp4)/i.test(rawSource) ? rawSource : "";
  const video = container.querySelector("#animeLiveVideo");
  if (source && (!video || currentSource !== source)) {
    renderPage(container, state);
    return;
  }
  container.querySelector("[data-live-title]")?.replaceChildren(document.createTextNode(state.animeTitle || "VakDab"));
  container.querySelector("[data-live-info-title]")?.replaceChildren(document.createTextNode(state.animeTitle || "\u0421\u043F\u0456\u043B\u044C\u043D\u0438\u0439 \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434"));
  container.querySelector("[data-live-episode]")?.replaceChildren(document.createTextNode(`${episodeLabel(state)} \xB7 ${state.dub || "\u041E\u0437\u0432\u0443\u0447\u043A\u0430"}`));
  const target = state.status === "running" ? state.endsAt : state.startsAt;
  const countdown = container.querySelector("[data-live-countdown]");
  if (countdown) countdown.innerHTML = target ? `${state.status === "running" ? "\u0414\u043E \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044F" : "\u0414\u043E \u0441\u0442\u0430\u0440\u0442\u0443"}: <strong data-target="${target}">${formatRemaining(target)}</strong>` : "";
}
function bindBackButtons(container) {
  container.querySelectorAll("[data-live-back]").forEach((button) => button.addEventListener("click", () => {
    window.location.hash = "main";
  }));
}
function destroyLivePage() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  refreshTimer = null;
  countdownTimer = null;
  const video = document.getElementById("animeLiveVideo");
  video?.pause();
  stopVideo();
}
function renderLivePage() {
  const container = document.getElementById("livePageContainer");
  if (!container) return;
  if (refreshTimer) clearInterval(refreshTimer);
  if (countdownTimer) clearInterval(countdownTimer);
  renderLoading(container);
  loadLiveState().then((state) => {
    if (window.location.hash.slice(1).split("?")[0] !== "live") return;
    if (!state || state.status === "idle") {
      renderIdle(container);
      return;
    }
    renderPage(container, state);
    refreshTimer = window.setInterval(() => loadLiveState().then((next) => updatePage(container, next)).catch(() => {
    }), 15e3);
    countdownTimer = window.setInterval(() => {
      const target2 = container.querySelector("[data-live-countdown] strong");
      if (!target2) return;
      const stateTarget = Number(target2.dataset.target || 0);
      if (stateTarget) target2.textContent = formatRemaining(stateTarget);
    }, 1e3);
    const target = state.status === "running" ? state.endsAt : state.startsAt;
    container.querySelector("[data-live-countdown] strong")?.setAttribute("data-target", String(target || 0));
  }).catch(() => renderIdle(container));
}
var refreshTimer, countdownTimer, hlsInstance, currentSource;
var init_livePage = __esm({
  "src/js/pages/live/livePage.js?v=20260827-live-screen-v1"() {
    init_liveStream();
    init_skeleton();
    refreshTimer = null;
    countdownTimer = null;
    hlsInstance = null;
    currentSource = "";
  }
});
