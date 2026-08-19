import { PROXY_URL } from '../../config/constants.js';
import { getProxyUrl, isEmbedUrl } from '../../utils/image.js';
import { normalizePosterUrl } from '../../services/catalog.js';

        // ====================================================================
        //  ПЛЕЄР — ПОВНИЙ КАСТОМНИЙ ПЛЕЄР З КОНТРОЛЯМИ
        // ====================================================================
        (function injectPlayerStyles() {
            if (document.getElementById('lampa-player-styles')) return;
            const s = document.createElement('style');
            s.id = 'lampa-player-styles';
            s.textContent = `
                .lampa-player-container {
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: #000;
                    position: relative;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    user-select: none;
                }
                .lampa-player-container video {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    display: block;
                }
                .lampa-player-container iframe {
                    width: 100%;
                    height: 100%;
                    border: none;
                    position: absolute;
                    top: 0; left: 0;
                }
                .lp-spinner {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(0,0,0,0.45);
                    z-index: 10;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                .lp-spinner.hidden { opacity: 0; pointer-events: none; }
                .lp-spinner-ring {
                    width: 48px;
                    height: 48px;
                    border: 4px solid rgba(255,255,255,0.2);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: lp-spin 0.8s linear infinite;
                }
                @keyframes lp-spin { to { transform: rotate(360deg); } }
                .lp-controls {
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    padding: 10px 14px 12px;
                    background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
                    z-index: 20;
                    transition: opacity 0.3s;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .lp-controls.hidden { opacity: 0; pointer-events: none; }
                .lp-progress-wrap {
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.25);
                    border-radius: 4px;
                    cursor: pointer;
                    position: relative;
                }
                .lp-progress-wrap:hover { height: 6px; }
                .lp-progress-fill {
                    height: 100%;
                    background: #fff;
                    border-radius: 4px;
                    pointer-events: none;
                    transition: width 0.1s linear;
                    position: relative;
                }
                .lp-progress-fill::after {
                    content: '';
                    position: absolute;
                    right: -5px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 12px;
                    height: 12px;
                    background: #fff;
                    border-radius: 50%;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .lp-progress-wrap:hover .lp-progress-fill::after { opacity: 1; }
                .lp-bottom-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .lp-btn {
                    background: none;
                    border: none;
                    color: #fff;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0.9;
                    transition: opacity 0.15s, transform 0.1s;
                    flex-shrink: 0;
                }
                .lp-btn:hover { opacity: 1; transform: scale(1.1); }
                .lp-btn svg { width: 20px; height: 20px; fill: #fff; }
                .lp-select { background: rgba(20,20,26,.78); color: #fff; border: 1px solid rgba(255,255,255,.22); border-radius: 6px; padding: 4px 5px; font-size: 11px; min-height: 28px; }
                .lp-select:focus { outline: 2px solid rgba(255,255,255,.55); outline-offset: 1px; }
                .lampa-player-container:fullscreen, .lampa-player-container:-webkit-full-screen { width: 100vw; height: 100vh; max-width: none; max-height: none; aspect-ratio: auto; border-radius: 0; }
                .lampa-player-container:fullscreen video, .lampa-player-container:-webkit-full-screen video { object-fit: contain; }
                @media (max-width: 600px) { .lp-select { font-size: 10px; padding-inline: 2px; } .lp-controls { padding: 8px 8px 10px; } }
                .lp-time {
                    font-size: 12px;
                    color: rgba(255,255,255,0.85);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
                    white-space: nowrap;
                    flex-shrink: 0;
                }
                .lp-spacer { flex: 1; }
                .lp-center-play {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 15;
                    pointer-events: none;
                }
                .lp-center-play-btn {
                    width: 64px;
                    height: 64px;
                    background: rgba(0,0,0,0.55);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transform: scale(0.7);
                    transition: opacity 0.25s, transform 0.25s;
                    backdrop-filter: blur(4px);
                }
                .lp-center-play-btn.show {
                    opacity: 1;
                    transform: scale(1);
                }
                .lp-center-play-btn svg { width: 28px; height: 28px; fill: #fff; }
                .lp-error { position:absolute; inset:0; z-index:20; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:24px; text-align:center; color:#fff; background:rgba(10,10,14,.88); font-size:13px; }
                .lp-error strong { font-size:16px; }
                .lp-error span { max-width:420px; opacity:.78; line-height:1.45; }
            `;
            document.head.appendChild(s);
        })();

        // SVG icons
        const LP_ICONS = {
            play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
            pause: `<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
            volOn: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
            volOff: `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
            fsEnter: `<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
            fsExit: `<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
        };

        function lpFmtTime(sec) {
            if (!isFinite(sec) || sec < 0) return '0:00';
            const total = Math.floor(sec);
            const h = Math.floor(total / 3600);
            const m = Math.floor((total % 3600) / 60);
            const s = total % 60;
            return h > 0 ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') : m + ':' + String(s).padStart(2, '0');
        }

export class LampaPlayer {
            constructor(container, options) {
                this.container = container;
                this.options = options || {};
                this.hls = null;
                this.state = { playing: false, currentTime: 0, duration: 0, volume: 0.8, muted: false, fullscreen: false, loading: true, src: null, speed: 1 };
                this.videoRef = null;
                this.containerRef = null;
                this._controlsTimer = null;
                this._centerTimer = null;
                this._init();
            }

            _init() {
                this.container.innerHTML = '';
                const wrap = document.createElement('div');
                wrap.className = 'lampa-player-container';
                this.containerRef = wrap;

                // Video element
                const v = document.createElement('video');
                v.setAttribute('crossorigin', 'anonymous');
                v.setAttribute('playsinline', '');
                v.controls = false;
                v.preload = 'metadata';
                v.poster = normalizePosterUrl(this.options.poster);
                this.videoRef = v;
                wrap.appendChild(v);

                // Spinner
                const spinner = document.createElement('div');
                spinner.className = 'lp-spinner';
                spinner.innerHTML = '<div class="lp-spinner-ring"></div>';
                this._spinner = spinner;
                wrap.appendChild(spinner);

                // Center play/pause flash
                const centerPlay = document.createElement('div');
                centerPlay.className = 'lp-center-play';
                centerPlay.innerHTML = `<div class="lp-center-play-btn" id="lpCenterBtn">${LP_ICONS.play}</div>`;
                this._centerBtn = centerPlay.querySelector('#lpCenterBtn');
                wrap.appendChild(centerPlay);

                // Controls
                const controls = document.createElement('div');
                controls.className = 'lp-controls';
                const LP_CHEVRON = '<svg class="lp-chevron" viewBox="0 0 24 24" width="10" height="10"><path d="M7 14l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                const LP_CHECK = '<svg class="lp-check" viewBox="0 0 24 24" width="14" height="14"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                const lpSpeedOption = (value, label, active) => `<button type="button" class="${active ? 'is-active' : ''}" data-speed="${value}" role="menuitemradio" aria-checked="${active}"><span>${label}</span>${LP_CHECK}</button>`;
                controls.innerHTML = `
                    <div class="lp-progress-wrap" id="lpProgress">
                        <div class="lp-progress-fill" id="lpProgressFill" style="width:0%"></div>
                    </div>
                    <div class="lp-bottom-row">
                        <button class="lp-btn" id="lpPlayBtn" title="Play/Pause">${LP_ICONS.play}</button>
                        <span class="lp-time" id="lpTime">0:00 / 0:00</span>
                        <div class="lp-spacer"></div>
                        <div class="lp-settings-wrap">
                            <div class="lp-menu-wrap">
                                <button class="lp-control-pill" id="lpSpeedBtn" title="Швидкість відтворення" aria-haspopup="true" aria-expanded="false">
                                    <span class="lp-pill-label" id="lpSpeedLabel">1x</span>${LP_CHEVRON}
                                </button>
                                <div class="lp-popover lp-speed-menu" id="lpSpeedMenu" role="menu" aria-hidden="true">
                                    <div class="lp-popover-label">Швидкість</div>
                                    ${lpSpeedOption('0.75', '0.75x', false)}
                                    ${lpSpeedOption('1', '1x', true)}
                                    ${lpSpeedOption('1.25', '1.25x', false)}
                                    ${lpSpeedOption('1.5', '1.5x', false)}
                                    ${lpSpeedOption('2', '2x', false)}
                                </div>
                            </div>
                            <div class="lp-menu-wrap" id="lpQualityWrap">
                                <button class="lp-control-pill lp-quality-pill" id="lpQualityBtn" title="Якість відео" aria-haspopup="true" aria-expanded="false">
                                    <span class="lp-pill-label" id="lpQualityLabel">Авто</span>${LP_CHEVRON}
                                </button>
                                <div class="lp-popover lp-quality-menu" id="lpQualityMenu" role="menu" aria-hidden="true"></div>
                            </div>
                        </div>
                        <button class="lp-btn" id="lpVolBtn" title="Mute">${LP_ICONS.volOn}</button>
                    </div>
                `;
                this._controls = controls;
                wrap.appendChild(controls);

                this.container.appendChild(wrap);
                this._bindEvents();
                this._showControls();
            }

            _bindEvents() {
                const v = this.videoRef;
                const wrap = this.containerRef;

                v.addEventListener('play', () => {
                    this.state.playing = true;
                    this._updatePlayBtn();
                });
                v.addEventListener('pause', () => {
                    this.state.playing = false;
                    this._updatePlayBtn();
                });
                const syncTimeState = () => {
                    this.state.currentTime = Number.isFinite(v.currentTime) ? v.currentTime : 0;
                    this.state.duration = Number.isFinite(v.duration) ? v.duration : 0;
                    this._updateProgress();
                };
                v.addEventListener('loadedmetadata', syncTimeState);
                v.addEventListener('durationchange', syncTimeState);
                v.addEventListener('timeupdate', syncTimeState);
                v.addEventListener('waiting', () => {
                    this.state.loading = true;
                    this._spinner.classList.remove('hidden');
                });
                v.addEventListener('playing', () => {
                    this.state.loading = false;
                    this._spinner.classList.add('hidden');
                    this._clearPlaybackError();
                });
                v.addEventListener('canplay', () => {
                    this.state.loading = false;
                    this._spinner.classList.add('hidden');
                    this._clearPlaybackError();
                });
                v.addEventListener('error', () => {
                    this.state.loading = false;
                    this._spinner.classList.add('hidden');
                });
                v.addEventListener('ended', () => {
                    this.state.playing = false;
                    this._updatePlayBtn();
                });

                // Click on wrap — toggle play, show controls
                wrap.addEventListener('click', e => {
                    if (e.target.closest('.lp-controls')) return;
                    this._flashCenter();
                    this.togglePlay();
                    this._showControls();
                });
                wrap.addEventListener('dblclick', e => {
                    if (e.target.closest('.lp-controls')) return;
                    this.toggleFullscreen();
                });
                wrap.addEventListener('mousemove', () => this._showControls());
                wrap.addEventListener('touchstart', () => this._showControls(), { passive: true });

                // Play button
                const playBtn = wrap.querySelector('#lpPlayBtn');
                if (playBtn) playBtn.addEventListener('click', e => { e.stopPropagation(); this._flashCenter(); this.togglePlay(); });

                // Progress bar seek
                const progress = wrap.querySelector('#lpProgress');
                if (progress) {
                    const seek = e => {
                        const rect = progress.getBoundingClientRect();
                        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        if (v.duration) v.currentTime = pct * v.duration;
                    };
                    let dragging = false;
                    progress.addEventListener('mousedown', e => { dragging = true; seek(e); e.preventDefault(); });
                    document.addEventListener('mousemove', e => { if (dragging) seek(e); });
                    document.addEventListener('mouseup', () => { dragging = false; });
                    progress.addEventListener('touchstart', e => { seek(e.touches[0]); }, { passive: true });
                    progress.addEventListener('touchmove', e => { seek(e.touches[0]); }, { passive: true });
                }

                // Volume — mute/unmute toggle only (no slider)
                const volBtn = wrap.querySelector('#lpVolBtn');
                v.volume = this.state.volume ?? 1;
                if (volBtn) volBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    v.muted = !v.muted;
                    this.state.muted = v.muted;
                    this._updateVolBtn();
                });

                // Playback speed and quality menus — class-based, animated.
                const speedBtn = wrap.querySelector('#lpSpeedBtn');
                const speedMenu = wrap.querySelector('#lpSpeedMenu');
                const speedLabel = wrap.querySelector('#lpSpeedLabel');
                const qualityBtn = wrap.querySelector('#lpQualityBtn');
                const qualityMenu = wrap.querySelector('#lpQualityMenu');
                const qualityLabel = wrap.querySelector('#lpQualityLabel');

                const setMenuOpen = (menu, btn, open) => {
                    if (!menu || !btn) return;
                    menu.classList.toggle('is-open', open);
                    menu.setAttribute('aria-hidden', String(!open));
                    btn.setAttribute('aria-expanded', String(open));
                    btn.classList.toggle('is-open', open);
                };
                const isMenuOpen = (menu) => menu && menu.classList.contains('is-open');
                const closePlayerMenus = () => {
                    setMenuOpen(speedMenu, speedBtn, false);
                    setMenuOpen(qualityMenu, qualityBtn, false);
                };

                if (speedBtn && speedMenu) speedBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const willOpen = !isMenuOpen(speedMenu);
                    setMenuOpen(qualityMenu, qualityBtn, false);
                    setMenuOpen(speedMenu, speedBtn, willOpen);
                });
                if (qualityBtn && qualityMenu) qualityBtn.addEventListener('click', e => {
                    e.stopPropagation();
                    const willOpen = !isMenuOpen(qualityMenu);
                    setMenuOpen(speedMenu, speedBtn, false);
                    this._refreshQualityMenu();
                    setMenuOpen(qualityMenu, qualityBtn, willOpen);
                });

                speedMenu?.querySelectorAll('[data-speed]').forEach(option => option.addEventListener('click', e => {
                    e.stopPropagation();
                    const rate = Number(option.dataset.speed) || 1;
                    v.playbackRate = rate;
                    this.state.speed = rate;
                    if (speedLabel) speedLabel.textContent = rate + 'x';
                    speedMenu.querySelectorAll('[data-speed]').forEach(o => {
                        const a = Number(o.dataset.speed) === rate;
                        o.classList.toggle('is-active', a);
                        o.setAttribute('aria-checked', String(a));
                    });
                    closePlayerMenus();
                }));
                qualityMenu?.addEventListener('click', e => {
                    const option = e.target.closest('[data-quality-index]');
                    if (!option) return;
                    e.stopPropagation();
                    const idx = Number(option.dataset.qualityIndex);
                    if (this.hls) this.hls.currentLevel = idx;
                    if (qualityLabel) qualityLabel.textContent = option.dataset.qualityLabel || 'Авто';
                    qualityMenu.querySelectorAll('[data-quality-index]').forEach(o => {
                        const a = o === option;
                        o.classList.toggle('is-active', a);
                        o.setAttribute('aria-checked', String(a));
                    });
                    closePlayerMenus();
                });
                document.addEventListener('click', closePlayerMenus);
                this._closePlayerMenus = closePlayerMenus;
                this._refreshQualityMenu();

                // Fullscreen — single button lives in the video topbar (works for both
                // the custom player and iframe-based sources).

                const syncFullscreenState = () => {
                    this.state.fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
                    const pageFs = document.getElementById('playerFullscreenBtn');
                    if (pageFs) {
                        pageFs.innerHTML = this.state.fullscreen ? LP_ICONS.fsExit : LP_ICONS.fsEnter;
                        pageFs.title = this.state.fullscreen ? 'Вийти з повного екрана' : 'Повний екран';
                        pageFs.setAttribute('aria-label', pageFs.title);
                        pageFs.classList.toggle('is-fullscreen', this.state.fullscreen);
                    }
                };
                document.addEventListener('fullscreenchange', syncFullscreenState);
                document.addEventListener('webkitfullscreenchange', syncFullscreenState);

                // Keyboard
                this._onKeyDown = e => {
                    const modal = document.getElementById('playerPageModal');
                    if (!modal || modal.style.display === 'none' || modal.style.display === '') return;
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    if (e.code === 'Space') { e.preventDefault(); this._flashCenter(); this.togglePlay(); this._showControls(); }
                    else if (e.code === 'ArrowRight') { e.preventDefault(); if (v.duration) v.currentTime = Math.min(v.duration, v.currentTime + 10); this._showControls(); }
                    else if (e.code === 'ArrowLeft') { e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); this._showControls(); }
                    else if (e.code === 'KeyF') { e.preventDefault(); this.toggleFullscreen(); }
                    else if (e.code === 'KeyM') { e.preventDefault(); v.muted = !v.muted; this.state.muted = v.muted; this._updateVolBtn(); }
                };
                document.addEventListener('keydown', this._onKeyDown);
            }

            _refreshQualityMenu() {
                const menu = this.containerRef?.querySelector('#lpQualityMenu');
                const labelEl = this.containerRef?.querySelector('#lpQualityLabel');
                if (!menu) return;
                const checkSvg = '<svg class="lp-check" viewBox="0 0 24 24" width="14" height="14"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
                const mkBtn = (idx, label, active) => `<button type="button" class="${active ? 'is-active' : ''}" data-quality-index="${idx}" data-quality-label="${label}" role="menuitemradio" aria-checked="${active}"><span>${label}</span>${checkSvg}</button>`;
                const levels = this.hls?.levels || [];
                if (!levels.length) {
                    menu.innerHTML = '<div class="lp-popover-label">Якість</div>' + mkBtn(-1, 'Авто', true);
                    if (labelEl) labelEl.textContent = 'Авто';
                    return;
                }
                const unique = [];
                levels.forEach((level, index) => {
                    const label = level.height ? `${level.height}p` : `Рівень ${index + 1}`;
                    if (!unique.some(item => item.label === label)) unique.push({ label, index });
                });
                unique.sort((a, b) => parseInt(b.label) - parseInt(a.label));
                menu.innerHTML = '<div class="lp-popover-label">Якість</div>' +
                    mkBtn(-1, 'Авто', true) +
                    unique.map(item => mkBtn(item.index, item.label, false)).join('');
                if (labelEl) labelEl.textContent = 'Авто';
            }

            _updatePlayBtn() {
                const btn = this.containerRef?.querySelector('#lpPlayBtn');
                if (btn) btn.innerHTML = this.state.playing ? LP_ICONS.pause : LP_ICONS.play;
            }

            _updateVolBtn() {
                const btn = this.containerRef?.querySelector('#lpVolBtn');
                const v = this.videoRef;
                if (btn) btn.innerHTML = (v && (v.muted || v.volume === 0)) ? LP_ICONS.volOff : LP_ICONS.volOn;
            }

            _updateProgress() {
                const fill = this.containerRef?.querySelector('#lpProgressFill');
                const time = this.containerRef?.querySelector('#lpTime');
                const v = this.videoRef;
                if (fill && v && v.duration) {
                    fill.style.width = (v.currentTime / v.duration * 100) + '%';
                }
                if (time && v) {
                    time.textContent = lpFmtTime(v.currentTime) + ' / ' + lpFmtTime(v.duration);
                }
            }

            _showControls() {
                const c = this._controls;
                if (!c) return;
                c.classList.remove('hidden');
                clearTimeout(this._controlsTimer);
                if (this.state.playing) {
                    this._controlsTimer = setTimeout(() => c.classList.add('hidden'), 3000);
                }
            }

            _flashCenter() {
                const btn = this._centerBtn;
                if (!btn) return;
                btn.innerHTML = this.state.playing ? LP_ICONS.pause : LP_ICONS.play;
                btn.classList.add('show');
                clearTimeout(this._centerTimer);
                this._centerTimer = setTimeout(() => btn.classList.remove('show'), 600);
            }

            loadSource(src, animeTitle, episodeTitle) {
                if (isEmbedUrl(src)) {
                    this.container.innerHTML = '';
                    const iframe = document.createElement('iframe');
                    iframe.src = src;
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('allow', 'autoplay; fullscreen');
                    iframe.style.cssText = 'width:100%;height:100%;border:none;position:absolute;top:0;left:0;';
                    const wrap = document.createElement('div');
                    wrap.className = 'lampa-player-container';
                    wrap.style.cssText = 'width:100%;aspect-ratio:16/9;background:#000;position:relative;border-radius:12px;overflow:hidden;';
                    wrap.appendChild(iframe);
                    this.container.appendChild(wrap);
                    this.containerRef = wrap;
                    if (this.hls) { this.hls.destroy(); this.hls = null; }
                    this.videoRef = null;
                    this.state.loading = false;
                    return;
                }

                if (!this.videoRef) this._init();
                // Mobile Safari/iOS needs an explicit inline media mode and a mobile UA at the source proxy.
                const media = this.videoRef;
                if (media) {
                    media.playsInline = true;
                    media.setAttribute('playsinline', '');
                    media.setAttribute('webkit-playsinline', '');
                    media.preload = 'metadata';
                }
                // Ensure https
                if (src && src.startsWith('http://')) src = 'https://' + src.slice(7);
                this.state.src = src;
                this._clearPlaybackError();
                const v = this.videoRef;
                this.state.loading = true;
                this.state.playing = false;
                this._spinner.classList.remove('hidden');
                this._updatePlayBtn();

                if (this.hls) { this.hls.destroy(); this.hls = null; }
                v.pause();
                if (!src) { this.state.loading = false; return; }

                const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
                const proxyUrl = (typeof getProxyUrl === 'function' && !src.startsWith(PROXY_URL))
                    ? getProxyUrl(src, isMobileDevice ? 'mobile' : 'desktop')
                    : src;
                const isHlsSource = /\.m3u8(?:[?#]|$)/i.test(src);

                const _startHls = () => {
                    const hls = new Hls({
                        enableWorker: false,
                        lowLatencyMode: false,
                        backBufferLength: 90,
                        maxBufferLength: 30,
                        xhrSetup: function(xhr) { xhr.withCredentials = false; }
                    });
                    this.hls = hls;
                    hls.loadSource(proxyUrl);
                    hls.attachMedia(v);
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        this._refreshQualityMenu();
                        this.state.loading = false;
                        this._spinner.classList.add('hidden');
                        v.play().catch(() => {
                            v.muted = true;
                            this.state.muted = true;
                            this._updateVolBtn();
                            v.play().catch(() => {});
                        });
                    });
                    hls.on(Hls.Events.ERROR, (ev, ed) => {
                        if (ed && ed.fatal) {
                            console.warn('[HLS fatal]', ed.type, ed.details);
                            hls.destroy(); this.hls = null;
                            this.state.loading = false;
                            this._spinner.classList.add('hidden');
                            v.src = proxyUrl; v.load();
                            v.play().catch(() => {
                            v.muted = true;
                            this.state.muted = true;
                            this._updateVolBtn();
                            v.play().catch(() => {});
                        });
                        }
                    });
                    v.addEventListener('error', () => this._showPlaybackError('Потік пошкоджений, заблокований або несумісний із цим пристроєм.'), { once: true });
                };

                if (!isHlsSource) {
                    // MP4 та інші browser-native формати не треба проганяти через HLS.js.
                    // Attach listeners before load(): Safari can emit error synchronously for a bad source.
                    const onNativeError = () => {
                        const detail = v.error?.code ? ` (код ${v.error.code})` : '';
                        this._showPlaybackError(`Відеофайл не вдалося відкрити на цьому пристрої${detail}.`);
                    };
                    v.addEventListener('error', onNativeError, { once: true });
                    v.addEventListener('canplay', () => { this.state.loading = false; this._spinner.classList.add('hidden'); }, { once: true });
                    v.src = proxyUrl;
                    v.load();
                    v.play().catch(() => {
                            v.muted = true;
                            this.state.muted = true;
                            this._updateVolBtn();
                            v.play().catch(() => {});
                        });
                } else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                    _startHls();
                } else if (v.canPlayType('application/vnd.apple.mpegurl') !== '' || v.canPlayType('audio/mpegurl') !== '') {
                    const onNativeError = () => this._showPlaybackError('HLS-потік не вдалося відкрити на цьому пристрої.');
                    v.addEventListener('error', onNativeError, { once: true });
                    v.addEventListener('canplay', () => { this.state.loading = false; this._spinner.classList.add('hidden'); }, { once: true });
                    v.src = proxyUrl; v.load();
                    v.play().catch(() => {
                            v.muted = true;
                            this.state.muted = true;
                            this._updateVolBtn();
                            v.play().catch(() => {});
                        });
                } else {
                    const sc = document.createElement('script');
                    sc.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
                    sc.onload = () => {
                        if (Hls.isSupported()) _startHls();
                        else { v.src = proxyUrl; v.load(); v.play().catch(() => {
                            v.muted = true;
                            this.state.muted = true;
                            this._updateVolBtn();
                            v.play().catch(() => {});
                        }); this.state.loading = false; this._spinner.classList.add('hidden'); }
                    };
                    sc.onerror = () => { v.src = proxyUrl; v.load(); this.state.loading = false; this._spinner.classList.add('hidden'); };
                    document.head.appendChild(sc);
                }
            }

            _clearPlaybackError() {
                this.containerRef?.querySelector('.lp-error')?.remove();
            }

            _showPlaybackError(message) {
                this.state.loading = false;
                this._spinner?.classList.add('hidden');
                if (!this.containerRef || this.containerRef.querySelector('.lp-error')) return;
                const error = document.createElement('div');
                error.className = 'lp-error';
                error.innerHTML = `<strong>Не вдалося запустити відео</strong><span>${message}</span>`;
                this.containerRef.appendChild(error);
            }

            togglePlay() {
                if (!this.videoRef) return;
                const v = this.videoRef;
                if (v.paused) v.play().catch(() => {
                            v.muted = true;
                            this.state.muted = true;
                            this._updateVolBtn();
                            v.play().catch(() => {});
                        }); else v.pause();
            }

            toggleFullscreen() {
                const target = (this.containerRef && document.body.contains(this.containerRef))
                    ? this.containerRef : this.container;
                if (!target) return;
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    const request = target.requestFullscreen || target.webkitRequestFullscreen || target.msRequestFullscreen;
                    if (request) Promise.resolve(request.call(target)).catch(() => {});
                    else if (this.videoRef?.webkitEnterFullscreen) this.videoRef.webkitEnterFullscreen();
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                }
            }

            destroy() {
                clearTimeout(this._controlsTimer);
                if (this._onKeyDown) document.removeEventListener('keydown', this._onKeyDown);
                if (this._closePlayerMenus) document.removeEventListener('click', this._closePlayerMenus);
                clearTimeout(this._centerTimer);
                if (this.hls) { this.hls.destroy(); this.hls = null; }
                if (this.videoRef) { this.videoRef.pause(); this.videoRef.removeAttribute('src'); this.videoRef.load(); }
                if (this.container) this.container.innerHTML = '';
                this.videoRef = null;
                this.containerRef = null;
                this._controls = null;
                this._spinner = null;
            }
        }


                // ====================================================================
