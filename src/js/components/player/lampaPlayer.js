function lpFmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor(total % 3600 / 60);
  const s = total % 60;
  return h > 0 ? h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") : m + ":" + String(s).padStart(2, "0");
}
var LP_ICONS, LampaPlayer;
var init_lampaPlayer = __esm({
  "src/js/components/player/lampaPlayer.js?v=20260927-senplayer-auto-v1"() {
    init_constants2();
    init_image();
    init_catalog();
    init_fullscreenPlayer();
    (function injectPlayerStyles() {
      if (document.getElementById("lampa-player-styles")) return;
      const s = document.createElement("style");
      s.id = "lampa-player-styles";
      s.textContent = `
                .lampa-player-container {
                    width: 100%; max-width: 100%; min-width: 0; aspect-ratio: 16/9;
                    background: #000; position: relative; box-sizing: border-box;
                    border-radius: 14px; overflow: hidden; cursor: pointer; user-select: none;
                    isolation: isolate; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                }
                .lampa-player-container *, .lampa-player-container *::before, .lampa-player-container *::after { box-sizing: border-box; }
                .lampa-player-container video { width: 100%; height: 100%; object-fit: contain; display: block; background: #000; position: relative; z-index: 0; pointer-events: none; }
                .lampa-player-container iframe { width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0; }

                .lp-spinner {
                    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                    background: rgba(0,0,0,.5); z-index: 10; pointer-events: none; transition: opacity .25s, visibility .25s;
                }
                .lp-spinner.hidden { opacity: 0; visibility: hidden; }
                .lp-spinner-loader {
                    --uib-size: 40px; --uib-color: #fff; --uib-speed: 1.5s;
                    --dot-size: calc(var(--uib-size) * .17); position: relative; display: flex;
                    align-items: center; justify-content: flex-start; height: var(--uib-size);
                    width: var(--uib-size); animation: lp-smooth-rotate calc(var(--uib-speed) * 1.8) linear infinite;
                }
                .lp-spinner-dot { position: absolute; inset: 0; display: flex; align-items: flex-start; justify-content: center; height: 100%; width: 100%; animation: lp-dot-rotate var(--uib-speed) ease-in-out infinite; }
                .lp-spinner-dot::before { content: ''; height: var(--dot-size); width: var(--dot-size); border-radius: 50%; background-color: var(--uib-color); transition: background-color .3s ease; }
                .lp-spinner-dot:nth-child(2), .lp-spinner-dot:nth-child(2)::before { animation-delay: calc(var(--uib-speed) * -.835 * .5); }
                .lp-spinner-dot:nth-child(3), .lp-spinner-dot:nth-child(3)::before { animation-delay: calc(var(--uib-speed) * -.668 * .5); }
                .lp-spinner-dot:nth-child(4), .lp-spinner-dot:nth-child(4)::before { animation-delay: calc(var(--uib-speed) * -.501 * .5); }
                .lp-spinner-dot:nth-child(5), .lp-spinner-dot:nth-child(5)::before { animation-delay: calc(var(--uib-speed) * -.334 * .5); }
                .lp-spinner-dot:nth-child(6), .lp-spinner-dot:nth-child(6)::before { animation-delay: calc(var(--uib-speed) * -.167 * .5); }
                @keyframes lp-dot-rotate { 0% { transform: rotate(0deg); } 65%, 100% { transform: rotate(360deg); } }
                @keyframes lp-smooth-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @media (prefers-reduced-motion: reduce) { .lp-spinner-loader, .lp-spinner-dot { animation: none !important; } }

                .lp-opening-skip {
                    position: absolute; z-index: 40 !important; left: 16px; bottom: 94px;
                    display: inline-flex !important; align-items: center; justify-content: center; gap: 4px;
                    width: fit-content !important; max-width: min(140px, calc(100% - 32px)); min-width: 0;
                    min-height: 22px; height: 22px; border: 1px solid rgba(255,255,255,.9);
                    border-radius: 999px; padding: 2px 8px; color: #111; background: rgba(255,255,255,.85);
                    -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
                    box-shadow: 0 4px 12px rgba(0,0,0,.25);
                    font: 600 9px/1.1 inherit; letter-spacing: 0; cursor: pointer; white-space: nowrap;
                    touch-action: manipulation; pointer-events: none; opacity: 0;
                    transform: translate3d(0, 6px, 0) scale(.96); transform-origin: left center;
                    visibility: hidden; transition: opacity .22s ease, transform .22s ease, visibility 0s linear .22s;
                }
                .lp-opening-skip.is-visible {
                    pointer-events: auto; opacity: 1; visibility: visible;
                    transform: translate3d(0, 0, 0) scale(1);
                    transition-delay: 0s;
                }
                .lp-opening-skip:hover { background: rgba(255,255,255,.95); transform: translate3d(0, -1px, 0) scale(1.02); }
                .lp-opening-skip:active { transform: translate3d(0, 0, 0) scale(.96); }
                .lp-opening-skip svg { width: 8px; height: 8px; flex: 0 0 8px; fill: currentColor; }
                @media (max-width: 600px) {
                    .lp-opening-skip { left: 12px; bottom: 82px; max-width: 130px; min-height: 20px; height: 20px; padding: 1px 7px; font-size: 8.5px; }
                    .lp-opening-skip svg { width: 7.5px; height: 7.5px; flex-basis: 7.5px; }
                }

                .lp-controls {
                    position: absolute; bottom: 0; left: 0; right: 0; padding: 14px 16px 14px;
                    background: linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,.45) 55%, transparent 100%);
                    z-index: 20; transition: opacity .25s; display: flex; flex-direction: column; gap: 10px;
                }
                .lp-controls.hidden { opacity: 0; pointer-events: none; }

                .lp-progress-wrap { width: 100%; height: 3px; background: rgba(255,255,255,.3); border-radius: 3px; cursor: pointer; position: relative; }
                .lp-progress-wrap:hover { height: 5px; }
                .lp-progress-fill { height: 100%; background: #fff; border-radius: 3px; pointer-events: none; transition: width .1s linear; position: relative; }
                .lp-progress-fill::after {
                    content: ''; position: absolute; right: -5px; top: 50%; transform: translateY(-50%);
                    width: 11px; height: 11px; background: #fff; border-radius: 50%; opacity: 0; transition: opacity .2s;
                    box-shadow: 0 0 0 3px rgba(0,0,0,.35);
                }
                .lp-progress-wrap:hover .lp-progress-fill::after { opacity: 1; }

                .lp-bottom-row { display: flex; align-items: center; gap: 14px; }
                .lp-btn {
                    background: none; border: none; color: #fff; cursor: pointer; padding: 4px;
                    display: flex; align-items: center; justify-content: center; opacity: .92;
                    transition: opacity .15s, transform .1s; flex-shrink: 0;
                }
                .lp-btn:hover { opacity: 1; transform: scale(1.08); }
                .lp-btn svg { width: 19px; height: 19px; fill: #fff; }
                .lp-main-btn svg { width: 22px; height: 22px; }
                .lp-select { background: rgba(0,0,0,.6); color: #fff; border: 1px solid rgba(255,255,255,.35); border-radius: 6px; padding: 4px 5px; font-size: 11px; min-height: 28px; }
                .lp-select:focus { outline: 1px solid rgba(255,255,255,.7); outline-offset: 1px; }

                .lampa-player-container:fullscreen, .lampa-player-container:-webkit-full-screen { width: 100vw; height: 100vh; max-width: none; max-height: none; aspect-ratio: auto; border-radius: 0; }
                .lampa-player-container:fullscreen video, .lampa-player-container:-webkit-full-screen video { object-fit: contain; }

                .lp-time { font-size: 12px; color: rgba(255,255,255,.9); font-variant-numeric: tabular-nums; white-space: nowrap; flex-shrink: 0; }
                .lp-spacer { flex: 1; }

                .lp-center-play {
                    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
                    z-index: 15; pointer-events: none;
                }
                .lp-center-play-btn {
                    width: 64px; height: 64px; background: rgba(0,0,0,.6); border: 1.5px solid rgba(255,255,255,.4);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    opacity: 0; transform: scale(.6); transition: opacity .2s ease-out, transform .2s ease-out;
                    pointer-events: none;
                    box-shadow: 0 4px 20px rgba(0,0,0,.5);
                }
                .lp-center-play-btn.show { opacity: 1; transform: scale(1); }
                .lp-center-play-btn svg { width: 28px; height: 28px; fill: #fff; }

                .lp-error {
                    position: absolute; inset: 0; z-index: 20; display: flex; flex-direction: column;
                    align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center;
                    color: #fff; background: rgba(0,0,0,.92); font-size: 13px;
                }
                .lp-error strong { font-size: 16px; }
                .lp-error span { max-width: 420px; opacity: .72; line-height: 1.45; }

                .lp-quality-rail {
                    position: absolute; z-index: 22; right: 16px; top: 16px; display: flex; flex-direction: column;
                    gap: 4px; background: rgba(0,0,0,.7); border: 1px solid rgba(255,255,255,.2); border-radius: 10px; padding: 6px;
                }
                .lp-quality-rail[hidden] { display: none; }
                .lp-quality-rail button {
                    background: none; border: none; color: #fff; opacity: .75; font-size: 12px; padding: 6px 10px;
                    border-radius: 6px; cursor: pointer; text-align: left;
                }
                .lp-quality-rail button.is-active, .lp-quality-rail button:hover { opacity: 1; background: rgba(255,255,255,.12); }

                @media (max-width: 600px) {
                    .lp-select { font-size: 10px; padding-inline: 2px; }
                    .lp-controls { padding: 10px 10px 12px; gap: 8px; }
                    .lp-bottom-row { gap: 10px; }
                }

                        `;
      document.head.appendChild(s);
    })();
    LP_ICONS = {
      play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
      pause: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
      volOn: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
      volOff: `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
      fsEnter: `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
      fsExit: `<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
      skipBack: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10a8 8 0 1 1 2.3 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4 4v6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="9" y="14.2" font-size="6.4" font-family="Arial,sans-serif" font-weight="700" fill="currentColor">10</text></svg>`,
      skipForward: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10a8 8 0 1 0-2.3 7.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 4v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><text x="5.4" y="14.2" font-size="6.4" font-family="Arial,sans-serif" font-weight="700" fill="currentColor">10</text></svg>`
    };
    LampaPlayer = class {
      constructor(container, options) {
        this.container = container;
        this.options = options || {};
        this.hls = null;
        this.state = { playing: false, currentTime: 0, duration: 0, volume: 0.8, muted: false, fullscreen: false, loading: true, src: null, speed: 1 };
        this.videoRef = null;
        this.containerRef = null;
        this._controlsTimer = null;
        this._centerTimer = null;
        this._sourceRequestId = 0;
        this._lastSourceRequest = null;
        this._playbackErrorTimer = null;
        this._spinnerHideTimer = null;
        this._spinnerStartedAt = 0;
        this._playLoaderTimer = null;
        this._playLoaderActive = false;
        this._progressMoveHandler = null;
        this._progressUpHandler = null;
        this._onFullscreenChange = null;
        this._userInteractedPlay = false;
        this._centerTogglePending = false;
        this._fullscreenPlayer = new VakdabFullscreenPlayer();
        this._init();
      }
      _init() {
        this.container.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "lampa-player-container";
        this.containerRef = wrap;
        const v = document.createElement("video");
        v.setAttribute("crossorigin", "anonymous");
        v.setAttribute("playsinline", "");
        v.controls = false;
        v.autoplay = false;
        v.defaultMuted = false;
        v.preload = "metadata";
        v.poster = normalizePosterUrl(this.options.poster);
        this.videoRef = v;
        wrap.appendChild(v);
        const spinner = document.createElement("div");
        spinner.className = "lp-spinner hidden";
        spinner.innerHTML = '<div class="lp-spinner-loader" aria-label="\u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F" role="status">' + '<div class="lp-spinner-dot"></div>'.repeat(6) + "</div>";
        this._spinner = spinner;
        wrap.appendChild(spinner);
        const centerPlay = document.createElement("div");
        centerPlay.className = "lp-center-play";
        centerPlay.innerHTML = `<div class="lp-center-play-btn" id="lpCenterBtn">${LP_ICONS.play}</div>`;
        this._centerBtn = centerPlay.querySelector("#lpCenterBtn");
        wrap.appendChild(centerPlay);
        const openingSkip = document.createElement("button");
        openingSkip.type = "button";
        openingSkip.className = "lp-opening-skip";
        openingSkip.setAttribute("aria-hidden", "true");
        openingSkip.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 4v16l13-8L5 4z"/></svg><span>\u041F\u0440\u043E\u043F\u0443\u0441\u0442\u0438\u0442\u0438 \u041E\u043F\u0435\u043D\u0456\u043D\u0433</span>';
        wrap.appendChild(openingSkip);
        this._openingSkip = openingSkip;
        const controls = document.createElement("div");
        controls.className = "lp-controls";
        controls.innerHTML = `
                    <div class="lp-progress-wrap" id="lpProgress">
                        <div class="lp-progress-fill" id="lpProgressFill" style="width:0%"></div>
                    </div>
                    <div class="lp-bottom-row">
                        <button class="lp-btn lp-main-btn" id="lpPlayBtn" title="\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438 / \u041F\u0430\u0443\u0437\u0430" aria-label="\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438 / \u041F\u0430\u0443\u0437\u0430">${LP_ICONS.play}</button>
                        <span class="lp-time" id="lpTime">0:00 / 0:00</span>
                        <div class="lp-spacer"></div>
                        <div class="lp-settings-wrap">
                            <div class="lp-menu-wrap">
                                <button type="button" class="lp-control-pill" id="lpEpisodeBtn" aria-expanded="false" aria-label="\u0412\u0438\u0431\u0440\u0430\u0442\u0438 \u0441\u0435\u0440\u0456\u044E"><span id="lpEpisodeLabel">\u0421\u0435\u0440\u0456\u044F</span><span class="lp-chevron">\u2303</span></button>
                                <div class="lp-popover lp-episode-menu" id="lpEpisodeMenu" role="menu" aria-hidden="true"></div>
                            </div>
                            <div class="lp-menu-wrap">
                                <button type="button" class="lp-control-pill lp-quality-pill" id="lpQualityBtn" aria-expanded="false" aria-label="\u0412\u0438\u0431\u0440\u0430\u0442\u0438 \u044F\u043A\u0456\u0441\u0442\u044C"><span id="lpQualityLabel">\u0410\u0432\u0442\u043E</span><span class="lp-chevron">\u2303</span></button>
                                <div class="lp-popover" id="lpQualityMenu" role="menu" aria-hidden="true"></div>
                            </div>
                            <div class="lp-volume-group">
                                <button class="lp-btn" id="lpVolBtn" title="\u0412\u0438\u043C\u043A\u043D\u0443\u0442\u0438 \u0437\u0432\u0443\u043A" aria-label="\u0412\u0438\u043C\u043A\u043D\u0443\u0442\u0438 \u0437\u0432\u0443\u043A">${LP_ICONS.volOn}</button>
                                <input class="lp-volume" id="lpVolume" type="range" min="0" max="1" step="0.05" value="0.8" aria-label="\u0413\u0443\u0447\u043D\u0456\u0441\u0442\u044C">
                            </div>
                        </div>
                    </div>
                `;
        this._controls = controls;
        wrap.appendChild(controls);
        const episodeMenu = controls.querySelector("#lpEpisodeMenu");
        const qualityMenu = controls.querySelector("#lpQualityMenu");
        episodeMenu?.classList.add("lp-floating-menu", "lp-floating-episode-menu");
        qualityMenu?.classList.add("lp-floating-menu", "lp-floating-quality-menu");
        if (episodeMenu) wrap.appendChild(episodeMenu);
        if (qualityMenu) wrap.appendChild(qualityMenu);
        const qualityRail = document.createElement("div");
        qualityRail.className = "lp-quality-rail";
        qualityRail.hidden = true;
        qualityRail.setAttribute("aria-label", "\u042F\u043A\u0456\u0441\u0442\u044C \u0432\u0456\u0434\u0435\u043E");
        wrap.appendChild(qualityRail);
        this._qualityRail = qualityRail;
        wrap.classList.add("is-native");
        this.container.appendChild(wrap);
        this._bindEvents();
        this._showControls();
      }
      _bindEvents() {
        const v = this.videoRef;
        const wrap = this.containerRef;
        if (!v || !wrap) return;
        v.addEventListener("play", () => {
          if (this.videoRef !== v) return;
          this._centerTogglePending = false;
          if (!this.options.autoplay && !this._userInteractedPlay) {
            try {
              v.pause();
            } catch (_) {
            }
            this.state.playing = false;
            this._updatePlayBtn();
            this._showControls();
            return;
          }
          this.state.playing = true;
          this._updatePlayBtn();
        });
        v.addEventListener("pause", () => {
          if (this.videoRef !== v) return;
          const pausedFromCenter = this._centerTogglePending;
          this._centerTogglePending = false;
          this.state.playing = false;
          this._updatePlayBtn();
          if (!pausedFromCenter) this._showControls();
        });
        const syncTimeState = () => {
          if (this.videoRef !== v) return;
          this.state.currentTime = Number.isFinite(v.currentTime) ? v.currentTime : 0;
          this.state.duration = Number.isFinite(v.duration) ? v.duration : 0;
          this._updateProgress();
        };
        v.addEventListener("loadedmetadata", () => {
          if (this.videoRef !== v) return;
          if (v.readyState >= 1) this._clearPlaybackError();
          syncTimeState();
        });
        v.addEventListener("durationchange", syncTimeState);
        v.addEventListener("timeupdate", syncTimeState);
        v.addEventListener("waiting", () => {
          if (this.videoRef !== v) return;
          this.state.loading = true;
          this._spinner?.classList.remove("hidden");
        });
        v.addEventListener("playing", () => {
          if (this.videoRef !== v) return;
          if (!this.options.autoplay && !this._userInteractedPlay) {
            try {
              v.pause();
            } catch (_) {
            }
            this.state.playing = false;
            this._updatePlayBtn();
            this._showControls();
            return;
          }
          this.state.loading = false;
          this._spinner?.classList.add("hidden");
          this._clearPlaybackError();
        });
        v.addEventListener("canplay", () => {
          if (this.videoRef !== v) return;
          if (!this.options.autoplay && !this._userInteractedPlay) {
            try {
              v.pause();
            } catch (_) {
            }
            this.state.playing = false;
            this._updatePlayBtn();
          }
          this.state.loading = false;
          this._spinner?.classList.add("hidden");
          this._clearPlaybackError();
        });
        v.addEventListener("error", () => {
          if (this.videoRef !== v) return;
          this.state.loading = false;
          this._spinner?.classList.add("hidden");
        });
        v.addEventListener("ended", () => {
          if (this.videoRef !== v) return;
          this.state.playing = false;
          this._updatePlayBtn();
        });
        wrap.addEventListener("click", (e) => {
          if (e.target.closest(".lp-controls, .lp-quality-rail, .lp-opening-skip, .video-overlay-topbar, .lp-popover")) return;
          const rect = wrap.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = rect.width > 0 ? clickX / rect.width : 0.5;
          if (ratio < 0.35 || ratio > 0.65) {
            const isHidden = this._controls?.classList.contains("hidden") || this.containerRef?.classList.contains("controls-hidden") || document.getElementById("playerVideoContainer")?.classList.contains("controls-hidden");
            if (isHidden) {
              this._showControls();
            } else {
              this._hideControls();
            }
          } else {
            this._userInteractedPlay = true;
            this._centerTogglePending = true;
            this.togglePlay();
            const isPlayingNow = this.videoRef ? !this.videoRef.paused : this.state.playing;
            this._flashCenter(isPlayingNow ? LP_ICONS.play : LP_ICONS.pause);
          }
        });
        wrap.addEventListener("dblclick", (e) => {
          if (e.target.closest(".lp-controls, .lp-quality-rail, .lp-opening-skip, .video-overlay-topbar, .lp-popover")) return;
          this.toggleFullscreen();
        });
        wrap.addEventListener("mousemove", () => this._showControls());
        const playBtn = wrap.querySelector("#lpPlayBtn");
        if (playBtn) playBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this._userInteractedPlay = true;
          this.togglePlay();
          const isPlayingNow = this.videoRef ? !this.videoRef.paused : this.state.playing;
          this._flashCenter(isPlayingNow ? LP_ICONS.play : LP_ICONS.pause);
          this._showControls();
        });
        const progress = wrap.querySelector("#lpProgress");
        if (progress) {
          const seek = (e) => {
            const rect = progress.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (v.duration) v.currentTime = pct * v.duration;
          };
          let dragging = false;
          progress.addEventListener("mousedown", (e) => {
            dragging = true;
            seek(e);
            e.preventDefault();
          });
          this._progressMoveHandler = (e) => {
            if (dragging) seek(e);
          };
          this._progressUpHandler = () => {
            dragging = false;
          };
          document.addEventListener("mousemove", this._progressMoveHandler);
          document.addEventListener("mouseup", this._progressUpHandler);
          progress.addEventListener("touchstart", (e) => {
            seek(e.touches[0]);
          }, { passive: true });
          progress.addEventListener("touchmove", (e) => {
            seek(e.touches[0]);
          }, { passive: true });
        }
        const volBtn = wrap.querySelector("#lpVolBtn");
        const volumeSlider = wrap.querySelector("#lpVolume");
        v.volume = this.state.volume ?? 0.8;
        if (volBtn) volBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          v.muted = !v.muted;
          this.state.muted = v.muted;
          this._updateVolBtn();
        });
        if (volumeSlider) volumeSlider.addEventListener("input", (e) => {
          e.stopPropagation();
          const value = Math.max(0, Math.min(1, Number(e.target.value)));
          v.volume = value;
          v.muted = value === 0;
          this.state.volume = value;
          this.state.muted = v.muted;
          this._updateVolBtn();
        });
        v.addEventListener("volumechange", () => this._updateVolBtn());
        const episodeBtn = wrap.querySelector("#lpEpisodeBtn");
        const episodeMenu = wrap.querySelector("#lpEpisodeMenu");
        const episodeLabel2 = wrap.querySelector("#lpEpisodeLabel");
        const renderEpisodeMenu = () => {
          if (!episodeMenu) return;
          const items = Array.isArray(this.options.episodeOptions) ? this.options.episodeOptions : [];
          const currentEp = String(this.options.episode || "1");
          episodeMenu.innerHTML = '<div class="lp-popover-label">\u0421\u0435\u0440\u0456\u0457</div>' + (items.length ? items.map((item) => {
            const isAct = String(item.episode) === currentEp;
            return `<button type="button" data-episode-value="${String(item.episode)}" class="${isAct ? "is-active" : ""}" role="menuitem"><span>\u0421\u0435\u0440\u0456\u044F ${String(item.episode)}</span></button>`;
          }).join("") : '<div class="lp-popover-label">\u0421\u0435\u0440\u0456\u0457 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0456</div>');
        };
        renderEpisodeMenu();
        const updateEpisodeLabel = (value) => {
          if (episodeLabel2) episodeLabel2.textContent = `\u0421\u0435\u0440\u0456\u044F ${value || this.options.episode || ""}`.trim();
        };
        updateEpisodeLabel(this.options.episode);
        const setEpisodeMenuOpen = (open) => {
          episodeMenu?.classList.toggle("is-open", open);
          episodeBtn?.classList.toggle("is-open", open);
          episodeMenu?.setAttribute("aria-hidden", String(!open));
          episodeBtn?.setAttribute("aria-expanded", String(open));
          syncMenuOverlayState();
        };
        episodeBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          const willOpen = !episodeMenu?.classList.contains("is-open");
          setEpisodeMenuOpen(willOpen);
          if (willOpen) {
            requestAnimationFrame(() => episodeMenu?.querySelector(".is-active")?.scrollIntoView({ block: "nearest" }));
          }
        });
        episodeMenu?.addEventListener("click", (e) => {
          const option = e.target.closest("[data-episode-value]");
          if (!option) return;
          e.stopPropagation();
          const item = (this.options.episodeOptions || []).find((entry) => String(entry.episode) === option.dataset.episodeValue);
          updateEpisodeLabel(item?.episode);
          setEpisodeMenuOpen(false);
          if (item && typeof this.options.onEpisodeSelect === "function") this.options.onEpisodeSelect(item);
        });
        const qualityBtn = wrap.querySelector("#lpQualityBtn");
        const qualityMenu = wrap.querySelector("#lpQualityMenu");
        const qualityLabel = wrap.querySelector("#lpQualityLabel");
        const qualityRail = this._qualityRail;
        const setMenuOpen = (menu, btn, open) => {
          if (!menu || !btn) return;
          menu.classList.toggle("is-open", open);
          menu.setAttribute("aria-hidden", String(!open));
          btn.setAttribute("aria-expanded", String(open));
          btn.classList.toggle("is-open", open);
        };
        const isMenuOpen = (menu) => menu && menu.classList.contains("is-open");
        const syncMenuOverlayState = () => {
          const open = isMenuOpen(qualityMenu) || episodeMenu?.classList.contains("is-open");
          this._controls?.classList.toggle("menu-overlay-open", open);
          wrap.classList.toggle("menu-overlay-open", open);
        };
        const closePlayerMenus = () => {
          setMenuOpen(qualityMenu, qualityBtn, false);
          setEpisodeMenuOpen(false);
        };
        if (qualityBtn && qualityMenu) qualityBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const willOpen = !isMenuOpen(qualityMenu);
          this._refreshQualityMenu();
          setMenuOpen(qualityMenu, qualityBtn, willOpen);
        });
        const applyQuality = (option) => {
          if (!option) return;
          const idx = Number(option.dataset.qualityIndex);
          if (this.hls) this.hls.currentLevel = idx;
          const label = option.dataset.qualityLabel || "\u0410\u0432\u0442\u043E";
          if (qualityLabel) qualityLabel.textContent = label;
          qualityMenu?.querySelectorAll("[data-quality-index]").forEach((item) => {
            const active = item === option || Number(item.dataset.qualityIndex) === idx;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-checked", String(active));
          });
          qualityRail?.querySelectorAll("[data-quality-index]").forEach((item) => {
            const active = item === option || idx >= 0 && Number(item.dataset.qualityIndex) === idx;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-checked", String(active));
          });
          closePlayerMenus();
        };
        qualityMenu?.addEventListener("click", (e) => {
          const option = e.target.closest("[data-quality-index]");
          if (!option) return;
          e.stopPropagation();
          applyQuality(option);
        });
        qualityRail?.addEventListener("click", (e) => {
          const option = e.target.closest("[data-quality-index]");
          if (!option) return;
          e.stopPropagation();
          applyQuality(option);
        });
        document.addEventListener("click", closePlayerMenus);
        this._closePlayerMenus = closePlayerMenus;
        this._refreshQualityMenu();
        this._onFullscreenChange = () => {
          this.state.fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || this.videoRef?.webkitDisplayingFullscreen);
          if (this.videoRef && !this.videoRef.webkitDisplayingFullscreen) {
            this.videoRef.controls = this.state.fullscreen;
          }
          const fullscreenButtons = [
            document.getElementById("playerFullscreenBtn"),
            this.containerRef?.querySelector("#lpFullscreenBtn")
          ].filter(Boolean);
          fullscreenButtons.forEach((button) => {
            button.innerHTML = this.state.fullscreen ? LP_ICONS.fsExit : LP_ICONS.fsEnter;
            button.title = this.state.fullscreen ? "\u0412\u0438\u0439\u0442\u0438 \u0437 \u043F\u043E\u0432\u043D\u043E\u0433\u043E \u0435\u043A\u0440\u0430\u043D\u0430" : "\u041F\u043E\u0432\u043D\u0438\u0439 \u0435\u043A\u0440\u0430\u043D";
            button.setAttribute("aria-label", button.title);
            button.classList.toggle("is-fullscreen", this.state.fullscreen);
          });
        };
        document.addEventListener("fullscreenchange", this._onFullscreenChange);
        document.addEventListener("webkitfullscreenchange", this._onFullscreenChange);
        this._onKeyDown = (e) => {
          const modal = document.getElementById("playerPageModal");
          if (!modal || modal.style.display === "none" || modal.style.display === "") return;
          if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
          if (e.code === "Space") {
            e.preventDefault();
            this._flashCenter();
            this.togglePlay();
            this._showControls();
          } else if (e.code === "ArrowRight") {
            e.preventDefault();
            if (v.duration) v.currentTime = Math.min(v.duration, v.currentTime + 10);
            this._showControls();
          } else if (e.code === "ArrowLeft") {
            e.preventDefault();
            v.currentTime = Math.max(0, v.currentTime - 10);
            this._showControls();
          } else if (e.code === "KeyF") {
            e.preventDefault();
            this.toggleFullscreen();
          } else if (e.code === "KeyM") {
            e.preventDefault();
            v.muted = !v.muted;
            this.state.muted = v.muted;
            this._updateVolBtn();
          }
        };
        document.addEventListener("keydown", this._onKeyDown);
      }
      _select1080Quality() {
        if (!this.hls?.levels?.length) return;
        const levels = this.hls.levels;
        const exact = levels.findIndex((level) => Number(level.height) === 1080);
        const underOrEqual = levels.map((level, index) => ({ index, height: Number(level.height) || 0 })).filter((level) => level.height > 0 && level.height <= 1080).sort((a, b) => b.height - a.height);
        const fallback = underOrEqual[0]?.index ?? levels.map((level, index) => ({ index, height: Number(level.height) || 0 })).sort((a, b) => b.height - a.height)[0]?.index;
        const selected = exact >= 0 ? exact : fallback;
        if (Number.isInteger(selected)) this.hls.currentLevel = selected;
      }
      _refreshQualityMenu(autoSelectMax = false) {
        const menu = this.containerRef?.querySelector("#lpQualityMenu");
        const labelEl = this.containerRef?.querySelector("#lpQualityLabel");
        if (!menu) return;
        const checkSvg = '<svg class="lp-check" viewBox="0 0 24 24" width="14" height="14"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const mkBtn = (idx, label, active) => `<button type="button" class="${active ? "is-active" : ""}" data-quality-index="${idx}" data-quality-label="${label}" role="menuitemradio" aria-checked="${active}"><span>${label}</span>${checkSvg}</button>`;
        const rail = this._qualityRail;
        const levels = this.hls?.levels || [];
        if (!levels.length) {
          menu.innerHTML = '<div class="lp-popover-label">\u042F\u043A\u0456\u0441\u0442\u044C</div>' + mkBtn(-1, "\u0410\u0432\u0442\u043E", true);
          if (rail) {
            rail.innerHTML = "";
            rail.hidden = true;
          }
          if (labelEl) labelEl.textContent = "\u0410\u0432\u0442\u043E";
          return;
        }
        const unique = [];
        levels.forEach((level, index) => {
          const label = level.height ? `${level.height}p` : `\u0420\u0456\u0432\u0435\u043D\u044C ${index + 1}`;
          if (!unique.some((item) => item.label === label)) {
            unique.push({ label, index, height: level.height || 0, bitrate: level.bitrate || 0 });
          }
        });
        unique.sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bitrate || 0) - (a.bitrate || 0));
        let currentIdx = this.hls ? this.hls.currentLevel : -1;
        if (autoSelectMax && unique.length > 0 && this.hls) {
          const maxLevel = unique[0];
          currentIdx = maxLevel.index;
          this.hls.currentLevel = currentIdx;
        }
        const activeItem = unique.find((item) => item.index === currentIdx);
        const activeLabel = activeItem ? activeItem.label : currentIdx === -1 ? "\u0410\u0432\u0442\u043E" : "\u041C\u0430\u043A\u0441";
        if (labelEl) labelEl.textContent = activeLabel;
        menu.innerHTML = '<div class="lp-popover-label">\u042F\u043A\u0456\u0441\u0442\u044C</div>' + mkBtn(-1, "\u0410\u0432\u0442\u043E", currentIdx === -1) + unique.map((item) => mkBtn(item.index, item.label, item.index === currentIdx)).join("");
        if (rail) {
          rail.innerHTML = unique.map((item) => mkBtn(item.index, item.label, item.index === currentIdx)).join("");
          rail.hidden = false;
        }
      }
      setQuality(qualityString) {
        if (!this.hls || !this.hls.levels?.length) return;
        const levels = this.hls.levels;
        const qStr = String(qualityString || "").toLowerCase().trim();
        if (qStr.includes("\u0430\u0432\u0442\u043E") || qStr.includes("auto")) {
          this.hls.currentLevel = -1;
          this._refreshQualityMenu(false);
          return;
        }
        if (qStr.includes("\u043C\u0430\u043A\u0441") || qStr.includes("max")) {
          this._refreshQualityMenu(true);
          return;
        }
        const matchNum = parseInt(qStr);
        if (Number.isFinite(matchNum)) {
          const found = levels.findIndex((lvl) => lvl.height === matchNum);
          if (found >= 0) {
            this.hls.currentLevel = found;
            this._refreshQualityMenu(false);
            return;
          }
        }
        this._refreshQualityMenu(true);
      }
      _updatePlayBtn() {
        const btn = this.containerRef?.querySelector("#lpPlayBtn");
        if (btn) {
          btn.innerHTML = this.state.playing ? LP_ICONS.pause : LP_ICONS.play;
          btn.title = this.state.playing ? "\u041F\u0430\u0443\u0437\u0430" : "\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438";
          btn.setAttribute("aria-label", this.state.playing ? "\u041F\u0430\u0443\u0437\u0430" : "\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438");
        }
      }
      _updateVolBtn() {
        const btn = this.containerRef?.querySelector("#lpVolBtn");
        const slider = this.containerRef?.querySelector("#lpVolume");
        const v = this.videoRef;
        const isMuted = !!(v && (v.muted || v.volume === 0));
        if (btn) {
          btn.innerHTML = isMuted ? LP_ICONS.volOff : LP_ICONS.volOn;
          btn.title = isMuted ? "\u0423\u0432\u0456\u043C\u043A\u043D\u0443\u0442\u0438 \u0437\u0432\u0443\u043A" : "\u0412\u0438\u043C\u043A\u043D\u0443\u0442\u0438 \u0437\u0432\u0443\u043A";
          btn.setAttribute("aria-label", btn.title);
        }
        if (slider && v) {
          slider.value = String(v.volume ?? 0);
          slider.setAttribute("aria-valuenow", String(Math.round((v.volume ?? 0) * 100)));
        }
      }
      _updateProgress() {
        const fill = this.containerRef?.querySelector("#lpProgressFill");
        const time = this.containerRef?.querySelector("#lpTime");
        const v = this.videoRef;
        if (fill && v && v.duration) {
          fill.style.width = v.currentTime / v.duration * 100 + "%";
        }
        if (time && v) {
          time.textContent = lpFmtTime(v.currentTime) + " / " + lpFmtTime(v.duration);
        }
      }
      _showControls() {
        const c = this._controls;
        if (!c) return;
        c.classList.remove("hidden");
        this.containerRef?.classList.remove("controls-hidden");
        document.getElementById("playerVideoContainer")?.classList.remove("controls-hidden");
        clearTimeout(this._controlsTimer);
        if (this.state.playing) {
          this._controlsTimer = setTimeout(() => {
            this._hideControls();
          }, 3200);
        }
      }
      _hideControls() {
        const c = this._controls;
        if (!c) return;
        if (this.containerRef?.querySelector(".lp-popover.is-open")) return;
        c.classList.add("hidden");
        this.containerRef?.classList.add("controls-hidden");
        document.getElementById("playerVideoContainer")?.classList.add("controls-hidden");
        clearTimeout(this._controlsTimer);
      }
      _flashCenter(customIcon = null) {
        const btn = this._centerBtn;
        if (!btn) return;
        if (customIcon) {
          btn.innerHTML = customIcon;
        } else {
          btn.innerHTML = this.state.playing ? LP_ICONS.pause : LP_ICONS.play;
        }
        btn.classList.add("show");
        clearTimeout(this._centerTimer);
        this._centerTimer = setTimeout(() => btn.classList.remove("show"), 650);
      }
      async loadSource(src, animeTitle, episodeTitle, options = {}) {
        const requestId = ++this._sourceRequestId;
        this._lastSourceRequest = { src, animeTitle, episodeTitle, options };
        const autoplay = typeof options?.autoplay === "boolean" ? options.autoplay : this.options.autoplay !== false;
        if (src && isEmbedUrl(src)) {
          try {
            const resolved = await resolveUniversalPlaybackUrl(src);
            if (requestId !== this._sourceRequestId) return;
            if (resolved && !isEmbedUrl(resolved)) {
              src = resolved;
            }
          } catch (e) {
            console.warn("[LampaPlayer embed resolution]", e);
          }
        }
        if (src && isEmbedUrl(src)) {
          const isMobileDevice2 = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
          const iframeSrc = src && !src.startsWith(PROXY_URL2) ? getProxyUrl(src, isMobileDevice2 ? "mobile" : "desktop") : src;
          this.container.innerHTML = "";
          const iframe = document.createElement("iframe");
          iframe.src = iframeSrc;
          iframe.setAttribute("allowfullscreen", "");
          iframe.setAttribute("allow", "autoplay; fullscreen");
          iframe.style.cssText = "width:100%;height:100%;border:none;position:absolute;top:0;left:0;";
          const wrap = document.createElement("div");
          wrap.className = "lampa-player-container";
          wrap.style.cssText = "width:100%;aspect-ratio:16/9;background:#000;position:relative;border-radius:12px;overflow:hidden;";
          wrap.appendChild(iframe);
          wrap.classList.add("is-loading");
          this.container.appendChild(wrap);
          this.containerRef = wrap;
          if (this.hls) {
            this.hls.destroy();
            this.hls = null;
          }
          this.videoRef = null;
          this.state.loading = false;
          window.setTimeout(() => {
            if (requestId === this._sourceRequestId) wrap.classList.remove("is-loading");
          }, 120);
          return;
        }
        if (!this.videoRef) this._init();
        const media = this.videoRef;
        if (media) {
          media.playsInline = true;
          media.setAttribute("playsinline", "");
          media.setAttribute("webkit-playsinline", "");
          media.preload = "metadata";
        }
        if (src && src.startsWith("http://")) src = "https://" + src.slice(7);
        this.state.src = src;
        this._clearPlaybackError();
        const v = this.videoRef;
        this.state.loading = true;
        this.state.playing = false;
        clearTimeout(this._spinnerHideTimer);
        clearTimeout(this._playLoaderTimer);
        this._playLoaderActive = false;
        this._spinner?.classList.add("hidden");
        this._updatePlayBtn();
        if (this.hls) {
          this.hls.destroy();
          this.hls = null;
        }
        try {
          v.pause();
        } catch (_) {
        }
        if (!src) {
          this.state.loading = false;
          return;
        }
        const isMobileDevice = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
        const proxyUrl = typeof getProxyUrl === "function" && !src.startsWith(PROXY_URL2) ? getProxyUrl(src, isMobileDevice ? "mobile" : "desktop") : src;
        const isHlsSource = /\.m3u8(?:[?#]|$)/i.test(src);
        const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
        const isSafariNativeHls = /Safari/i.test(ua) && !/(Chrome|CriOS|Chromium|Edg|Firefox|OPR)/i.test(ua);
        const isCurrentRequest = () => requestId === this._sourceRequestId && this.videoRef === v;
        const hideLoading = () => {
          if (!isCurrentRequest()) return;
          this.state.loading = false;
          this._spinner?.classList.add("hidden");
          this.containerRef?.classList.remove("is-loading");
        };
        const safePlay = () => {
          if (!isCurrentRequest()) return;
          if (!autoplay || !this._userInteractedPlay) {
            try {
              v.pause();
            } catch (_) {
            }
            this.state.playing = false;
            this._updatePlayBtn();
            this._showControls();
            return;
          }
          v.play().catch(() => {
            if (!isCurrentRequest()) return;
            v.muted = true;
            this.state.muted = true;
            this._updateVolBtn();
            v.play().catch(() => {
            });
          });
        };
        const _startHls = () => {
          const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            xhrSetup: function(xhr) {
              xhr.withCredentials = false;
            }
          });
          this.hls = hls;
          hls.loadSource(proxyUrl);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!isCurrentRequest()) return;
            this._select1080Quality();
            hideLoading();
            safePlay();
          });
          hls.on(Hls.Events.ERROR, (ev, ed) => {
            if (ed && ed.fatal) {
              console.warn("[HLS fatal]", ed.type, ed.details);
              if (!isCurrentRequest()) return;
              hls.destroy();
              this.hls = null;
              hideLoading();
              v.src = proxyUrl;
              v.load();
              safePlay();
            }
          });
          v.addEventListener("error", () => {
            if (isCurrentRequest()) this._schedulePlaybackError("\u041F\u043E\u0442\u0456\u043A \u043F\u043E\u0448\u043A\u043E\u0434\u0436\u0435\u043D\u0438\u0439, \u0437\u0430\u0431\u043B\u043E\u043A\u043E\u0432\u0430\u043D\u0438\u0439 \u0430\u0431\u043E \u043D\u0435\u0441\u0443\u043C\u0456\u0441\u043D\u0438\u0439 \u0456\u0437 \u0446\u0438\u043C \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0454\u043C.");
          }, { once: true });
        };
        if (!isHlsSource) {
          const onNativeError = () => {
            const detail = v.error?.code ? ` (\u043A\u043E\u0434 ${v.error.code})` : "";
            this._schedulePlaybackError(`\u0412\u0456\u0434\u0435\u043E\u0444\u0430\u0439\u043B \u043D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457${detail}.`);
          };
          v.addEventListener("error", onNativeError, { once: true });
          v.addEventListener("canplay", () => {
            hideLoading();
            safePlay();
          }, { once: true });
          v.src = proxyUrl;
          v.load();
          safePlay();
        } else if (typeof Hls !== "undefined" && Hls.isSupported()) {
          _startHls();
        } else if (isSafariNativeHls && (v.canPlayType("application/vnd.apple.mpegurl") !== "" || v.canPlayType("audio/mpegurl") !== "")) {
          const onNativeError = () => this._schedulePlaybackError("HLS-\u043F\u043E\u0442\u0456\u043A \u043D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457.");
          v.addEventListener("error", onNativeError, { once: true });
          v.addEventListener("canplay", () => {
            hideLoading();
            safePlay();
          }, { once: true });
          v.src = proxyUrl;
          v.load();
          safePlay();
        } else {
          const sc = document.createElement("script");
          sc.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js";
          sc.onload = () => {
            if (!isCurrentRequest()) return;
            if (Hls.isSupported()) _startHls();
            else {
              v.addEventListener("canplay", () => {
                hideLoading();
                safePlay();
              }, { once: true });
              v.src = proxyUrl;
              v.load();
              hideLoading();
              safePlay();
            }
          };
          sc.onerror = () => {
            if (!isCurrentRequest()) return;
            v.addEventListener("canplay", () => {
              hideLoading();
              safePlay();
            }, { once: true });
            v.src = proxyUrl;
            v.load();
            hideLoading();
            safePlay();
          };
          document.head.appendChild(sc);
        }
      }
      _clearPlaybackError() {
        clearTimeout(this._playbackErrorTimer);
        this._playbackErrorTimer = null;
        this.containerRef?.querySelector(".lp-error")?.remove();
      }
      _startPlayLoader() {
        if (!this._spinner || this._playLoaderActive) return;
        this._playLoaderActive = true;
        this._spinnerStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
        this._spinner?.classList.remove("hidden");
        clearTimeout(this._playLoaderTimer);
        this._playLoaderTimer = window.setTimeout(() => {
          this._playLoaderActive = false;
          this._spinner?.classList.add("hidden");
          this._playLoaderTimer = null;
          this._playNow();
        }, this._spinnerMinDuration);
      }
      _schedulePlaybackError(message, delay = 4500) {
        clearTimeout(this._playbackErrorTimer);
        const requestId = this._sourceRequestId;
        const video = this.videoRef;
        this._playbackErrorTimer = window.setTimeout(() => {
          this._playbackErrorTimer = null;
          if (requestId !== this._sourceRequestId || video !== this.videoRef) return;
          if (video && video.readyState >= 2 && !video.error) {
            this._clearPlaybackError();
            return;
          }
          this._showPlaybackError(message);
        }, delay);
      }
      _showPlaybackError(message) {
        this.state.loading = false;
        this._spinner?.classList.add("hidden");
        if (!this.containerRef || this.containerRef.querySelector(".lp-error")) return;
        const error = document.createElement("div");
        error.className = "lp-error";
        error.innerHTML = `<strong>\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0438 \u0432\u0456\u0434\u0435\u043E</strong><span>${message}</span><button type="button" class="lp-error-retry"><i class="fas fa-rotate-right"></i> \u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437</button>`;
        error.querySelector(".lp-error-retry")?.addEventListener("click", (event) => {
          event.stopPropagation();
          const last = this._lastSourceRequest;
          if (last?.src) this.loadSource(last.src, last.animeTitle, last.episodeTitle);
        });
        this.containerRef.appendChild(error);
      }
      _playNow() {
        if (!this.videoRef) return;
        const v = this.videoRef;
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            v.muted = true;
            this.state.muted = true;
            this._updateVolBtn();
            v.play().catch(() => {
            });
          });
        }
      }
      play(options = {}) {
        if (!this.videoRef) return;
        if (options.userInitiated && this.options.onBeforeUserPlay?.(this) === true) {
          this._centerTogglePending = false;
          return;
        }
        this._userInteractedPlay = true;
        this._playNow();
      }
      pause() {
        if (!this.videoRef) return;
        if (this._playLoaderActive) {
          this._playLoaderActive = false;
          clearTimeout(this._playLoaderTimer);
          this._spinner?.classList.add("hidden");
          this._playLoaderTimer = null;
        }
        this.videoRef.pause();
      }
      togglePlay() {
        if (!this.videoRef) return;
        const v = this.videoRef;
        if (v.paused) this.play({ userInitiated: true });
        else this.pause();
      }
      toggleFullscreen() {
        const video = this.videoRef;
        if (!video) return;
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || video.webkitDisplayingFullscreen;
        if (isFullscreen) {
          try {
            document.exitFullscreen?.();
          } catch (_) {
          }
          try {
            video.webkitExitFullscreen?.();
          } catch (_) {
          }
          if (!video.webkitDisplayingFullscreen) video.controls = false;
          return;
        }
        video.controls = true;
        try {
          if (typeof video.webkitEnterFullscreen === "function") {
            video.webkitEnterFullscreen();
          } else if (typeof video.requestFullscreen === "function") {
            video.requestFullscreen().catch(() => {
              video.controls = false;
            });
          } else if (typeof this.containerRef?.requestFullscreen === "function") {
            this.containerRef.requestFullscreen().catch(() => {
              video.controls = false;
            });
          }
        } catch (_) {
          video.controls = false;
        }
      }
      destroy() {
        this._fullscreenPlayer?.close();
        this._fullscreenPlayer = null;
        clearTimeout(this._spinnerHideTimer);
        clearTimeout(this._controlsTimer);
        clearTimeout(this._playbackErrorTimer);
        clearTimeout(this._playLoaderTimer);
        this._playbackErrorTimer = null;
        this._playLoaderTimer = null;
        if (this._progressMoveHandler) document.removeEventListener("mousemove", this._progressMoveHandler);
        if (this._progressUpHandler) document.removeEventListener("mouseup", this._progressUpHandler);
        this._progressMoveHandler = null;
        this._progressUpHandler = null;
        this._sourceRequestId += 1;
        if (this._onKeyDown) document.removeEventListener("keydown", this._onKeyDown);
        if (this._onFullscreenChange) {
          document.removeEventListener("fullscreenchange", this._onFullscreenChange);
          document.removeEventListener("webkitfullscreenchange", this._onFullscreenChange);
          this._onFullscreenChange = null;
        }
        if (this._closePlayerMenus) document.removeEventListener("click", this._closePlayerMenus);
        clearTimeout(this._centerTimer);
        if (this.hls) {
          this.hls.destroy();
          this.hls = null;
        }
        if (this.videoRef) {
          this.videoRef.pause();
          this.videoRef.removeAttribute("src");
          this.videoRef.load();
        }
        if (this.container) this.container.innerHTML = "";
        this.videoRef = null;
        this.containerRef = null;
        this._controls = null;
        this._spinner = null;
      }
    };
  }
});
