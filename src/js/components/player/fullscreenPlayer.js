// ============================================================================
//  VAKDAB FULLSCREEN PLAYER — інтеграція кастомного плеєра користувача.
//  Розмітка і стилі 1:1 з дизайн-макетом (top-bar, bottom-bar, side-menu,
//  options-sheet, lock-overlay), підключені до реального відео (HLS),
//  серій, озвучок і якості потоку.
// ============================================================================

const FULLSCREEN_PLAYER_STYLES = `
#vakdab-fullscreen-player{position:fixed;inset:0;z-index:2147483000;background-color:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}
#vakdab-fullscreen-player[hidden]{display:none}
#vakdab-fullscreen-player *{box-sizing:border-box;margin:0;padding:0;user-select:none;-webkit-tap-highlight-color:transparent}
#vakdab-fullscreen-player .player-container{position:relative;width:100%;height:100%;height:100dvh;max-width:1000px;margin:0 auto;background:#000;overflow:hidden;display:flex;flex-direction:column}
#vakdab-fullscreen-player video{width:100%;height:100%;object-fit:contain;transition:object-fit .3s ease,transform .3s ease}
/* ВЕРХНЯ ПАНЕЛЬ */
#vakdab-fullscreen-player .top-bar{position:absolute;top:0;left:0;right:0;padding:20px;background:linear-gradient(to bottom,rgba(0,0,0,.7) 0%,transparent 100%);display:flex;justify-content:center;align-items:center;z-index:10;transition:opacity .3s;pointer-events:none}
#vakdab-fullscreen-player .top-bar>*{pointer-events:auto}
#vakdab-fullscreen-player .top-bar.hidden{opacity:0;pointer-events:none}
#vakdab-fullscreen-player .back-btn{position:absolute;left:20px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;transition:background .2s}
#vakdab-fullscreen-player .back-btn:active{background:rgba(255,255,255,.3)}
#vakdab-fullscreen-player .back-btn svg{width:26px;height:26px;fill:currentColor;margin-left:-2px}
#vakdab-fullscreen-player .logo-container{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center}
#vakdab-fullscreen-player .logo-text{font-size:22px;font-weight:800;letter-spacing:1px;color:#f6ad55;text-shadow:0 2px 4px rgba(0,0,0,.5);font-style:italic}
#vakdab-fullscreen-player .logo-text span{color:#fff}
#vakdab-fullscreen-player .season-info{font-size:14px;color:#ddd;font-weight:400;max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* НИЖНЯ ПАНЕЛЬ */
#vakdab-fullscreen-player .bottom-bar{position:absolute;bottom:0;left:0;right:0;padding:15px 20px 25px 20px;background:linear-gradient(to top,rgba(0,0,0,.9) 0%,transparent 100%);display:flex;flex-direction:column;gap:15px;z-index:10;transition:opacity .3s}
#vakdab-fullscreen-player .bottom-bar.hidden{opacity:0;pointer-events:none}
#vakdab-fullscreen-player .next-episode-card{position:absolute;right:20px;bottom:200px;background:rgba(0,0,0,.85);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:background .2s;border:1px solid rgba(255,255,255,.1);z-index:15}
#vakdab-fullscreen-player .next-episode-card:hover{background:rgba(255,255,255,.1)}
#vakdab-fullscreen-player .next-thumb{width:60px;height:34px;border-radius:4px;object-fit:cover;position:relative;background:#333}
#vakdab-fullscreen-player .next-thumb-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:20px;height:20px;background:rgba(0,0,0,.6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
#vakdab-fullscreen-player .next-episode-text{display:flex;flex-direction:column;gap:2px}
#vakdab-fullscreen-player .next-label{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;font-weight:700}
#vakdab-fullscreen-player .next-title{font-size:14px;font-weight:600}
#vakdab-fullscreen-player .progress-block{background:rgba(0,0,0,.6);backdrop-filter:blur(5px);border-radius:12px;padding:12px 15px 10px 15px;display:flex;flex-direction:column;gap:10px}
#vakdab-fullscreen-player .time-info{display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums}
#vakdab-fullscreen-player .progress-container{width:100%;height:28px;display:flex;align-items:center;cursor:pointer;touch-action:none}
#vakdab-fullscreen-player .progress-track{width:100%;height:8px;background:rgba(255,255,255,.25);border-radius:4px;position:relative;overflow:visible}
#vakdab-fullscreen-player .progress-fill{height:100%;background:#fff;width:0%;border-radius:4px;position:relative}
#vakdab-fullscreen-player .progress-thumb{position:absolute;right:-11px;top:50%;transform:translateY(-50%) scale(1);width:22px;height:22px;background:#fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.6)}
#vakdab-fullscreen-player .controls{display:flex;justify-content:space-between;align-items:center;margin-top:5px;padding:0 5px}
#vakdab-fullscreen-player .control-btn{background:none;border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:50%;transition:background .2s}
#vakdab-fullscreen-player .control-btn:active{background:rgba(255,255,255,.1)}
#vakdab-fullscreen-player .control-btn svg{width:24px;height:24px;fill:currentColor}
#vakdab-fullscreen-player .controls-left{display:flex;background:rgba(255,255,255,.15);border-radius:30px;padding:4px 8px;gap:5px}
#vakdab-fullscreen-player .play-pause-btn{background:rgba(255,255,255,.15);border-radius:50%;padding:12px;width:56px;height:56px;border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .2s}
#vakdab-fullscreen-player .play-pause-btn:active{background:rgba(255,255,255,.25)}
#vakdab-fullscreen-player .play-pause-btn svg{width:30px;height:30px;fill:currentColor}
#vakdab-fullscreen-player .controls-right{display:flex;background:rgba(255,255,255,.15);border-radius:50%;padding:4px}
/* БІЧНЕ МЕНЮ (ПЛЕЙЛИСТ) */
#vakdab-fullscreen-player .side-menu{position:absolute;top:0;right:0;width:75%;max-width:400px;height:100%;background:#0f0f0f;z-index:20;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);box-shadow:-5px 0 15px rgba(0,0,0,.5);overflow-y:auto}
#vakdab-fullscreen-player .side-menu.open{transform:translateX(0)}
#vakdab-fullscreen-player .menu-header{font-size:24px;font-weight:700;padding:25px 25px 15px 25px;color:#fff;display:flex;align-items:center;gap:15px}
#vakdab-fullscreen-player .playlist-container{display:flex;flex-direction:column;padding:0 15px 15px;gap:10px;overflow-y:auto}
#vakdab-fullscreen-player .playlist-item{display:flex;align-items:center;background:#1a1a1a;border-radius:12px;padding:10px;cursor:pointer;transition:background .2s;gap:15px;border:1px solid transparent}
#vakdab-fullscreen-player .playlist-item:hover,#vakdab-fullscreen-player .playlist-item:active{background:#2a2a2a}
#vakdab-fullscreen-player .playlist-item.active{border-color:rgba(255,255,255,.35)}
#vakdab-fullscreen-player .playlist-thumb{width:80px;height:45px;border-radius:8px;object-fit:cover;background:#333;flex-shrink:0}
#vakdab-fullscreen-player .playlist-info{flex-grow:1;display:flex;flex-direction:column;gap:4px;min-width:0}
#vakdab-fullscreen-player .playlist-title{font-size:16px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vakdab-fullscreen-player .playlist-check{color:#fff;display:none;width:24px;height:24px;flex-shrink:0}
#vakdab-fullscreen-player .playlist-item.active .playlist-check{display:block}
/* НИЖНЯ ШТОРКА НАЛАШТУВАНЬ */
#vakdab-fullscreen-player .options-sheet{position:absolute;bottom:0;left:0;width:100%;max-height:80%;background:#000;border-radius:20px 20px 0 0;z-index:30;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s cubic-bezier(.4,0,.2,1);box-shadow:0 -10px 30px rgba(0,0,0,.9);overflow:hidden}
#vakdab-fullscreen-player .options-sheet.open{transform:translateY(0)}
#vakdab-fullscreen-player .sheet-handle{width:40px;height:5px;background:rgba(255,255,255,.3);border-radius:3px;margin:12px auto 15px auto;flex-shrink:0}
#vakdab-fullscreen-player .sheet-view{display:none;flex-direction:column;padding:0 0 20px 0;overflow-y:auto}
#vakdab-fullscreen-player .sheet-view.active{display:flex}
#vakdab-fullscreen-player .opt-item{display:flex;align-items:center;padding:18px 25px;cursor:pointer;transition:background .2s;gap:15px;background:none;border:none;width:100%;text-align:left;font:inherit;color:#fff}
#vakdab-fullscreen-player .opt-item:active{background:rgba(255,255,255,.1)}
#vakdab-fullscreen-player .opt-icon{display:flex;align-items:center;justify-content:center;width:28px;height:28px;color:#fff;flex-shrink:0}
#vakdab-fullscreen-player .opt-icon svg{width:100%;height:100%;fill:currentColor}
#vakdab-fullscreen-player .opt-label{font-size:16px;font-weight:600;color:#fff;flex-grow:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vakdab-fullscreen-player .opt-value{font-size:15px;font-weight:500;color:#aaa;margin-right:10px;white-space:nowrap}
#vakdab-fullscreen-player .opt-chevron{color:#aaa;display:flex;align-items:center;justify-content:center;width:20px;height:20px;flex-shrink:0}
#vakdab-fullscreen-player .opt-chevron svg{width:100%;height:100%;fill:currentColor}
#vakdab-fullscreen-player .sheet-divider{height:1px;background:rgba(255,255,255,.1);margin:10px 25px;flex-shrink:0}
#vakdab-fullscreen-player .sub-view-header{display:flex;align-items:center;padding:0 25px 15px 25px;font-size:18px;font-weight:700;color:#fff;border-bottom:1px solid rgba(255,255,255,.1);margin-bottom:10px}
#vakdab-fullscreen-player .sub-view-header-back{cursor:pointer;display:flex;align-items:center;justify-content:center;margin-right:15px;padding:5px;margin-left:-5px;background:none;border:none;color:#fff}
#vakdab-fullscreen-player .sub-option{padding:15px 25px;font-size:16px;font-weight:600;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:none;border:none;width:100%;text-align:left;font-family:inherit}
#vakdab-fullscreen-player .sub-option:active{background:rgba(255,255,255,.1)}
#vakdab-fullscreen-player .sub-option.active{color:#fff;font-weight:700}
#vakdab-fullscreen-player .sub-option.active::after{content:'✓';font-weight:bold}
/* ПЕРЕМИКАЧІ */
#vakdab-fullscreen-player .switch{position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0}
#vakdab-fullscreen-player .switch input{opacity:0;width:0;height:0}
#vakdab-fullscreen-player .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:rgba(255,255,255,.2);transition:.3s;border-radius:34px}
#vakdab-fullscreen-player .slider:before{position:absolute;content:"";height:20px;width:20px;left:3px;bottom:3px;background-color:#fff;transition:.3s;border-radius:50%}
#vakdab-fullscreen-player input:checked+.slider{background-color:#fff}
#vakdab-fullscreen-player input:checked+.slider:before{transform:translateX(20px);background-color:#000}
/* ЕКРАН БЛОКУВАННЯ */
#vakdab-fullscreen-player .lock-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:#000;z-index:100;display:none;justify-content:center;align-items:center;cursor:pointer}
#vakdab-fullscreen-player .lock-overlay.active{display:flex}
#vakdab-fullscreen-player .lock-icon-large{width:80px;height:80px;fill:#fff;opacity:.5;transition:opacity .2s}
#vakdab-fullscreen-player .lock-overlay:hover .lock-icon-large{opacity:1}
/* LANDSCAPE */
@media (orientation:landscape){
#vakdab-fullscreen-player .options-sheet{width:60%;max-width:550px;max-height:85vh;left:50%;top:50%;bottom:auto;right:auto;border-radius:20px;transform:translate(-50%,-40%) scale(.9);opacity:0;visibility:hidden;transition:all .3s cubic-bezier(.4,0,.2,1);box-shadow:0 10px 40px rgba(0,0,0,.8);backdrop-filter:blur(15px);-webkit-backdrop-filter:blur(15px);background:rgba(0,0,0,.85);border:1px solid rgba(255,255,255,.1)}
#vakdab-fullscreen-player .options-sheet.open{transform:translate(-50%,-50%) scale(1);opacity:1;visibility:visible}
#vakdab-fullscreen-player .sheet-handle{display:none}
#vakdab-fullscreen-player .sheet-view{padding-top:15px}
#vakdab-fullscreen-player .opt-item{padding:12px 25px}
#vakdab-fullscreen-player .opt-label{font-size:15px}
#vakdab-fullscreen-player .sub-view-header{padding-top:10px}
}
@media(max-width:600px){
#vakdab-fullscreen-player .top-bar{padding:12px 10px}
#vakdab-fullscreen-player .back-btn{left:10px;width:38px;height:38px}
#vakdab-fullscreen-player .logo-text{font-size:17px}
#vakdab-fullscreen-player .season-info{font-size:12px}
#vakdab-fullscreen-player .bottom-bar{padding:10px 10px 18px}
#vakdab-fullscreen-player .next-episode-card{right:10px;bottom:185px;padding:6px 10px}
#vakdab-fullscreen-player .time-info{font-size:12px}
#vakdab-fullscreen-player .play-pause-btn{width:50px;height:50px}
#vakdab-fullscreen-player .control-btn svg{width:20px;height:20px}
}
`;

let styleInjected = false;
function ensureStyles() {
    if (styleInjected) return;
    if (!document.getElementById('vakdab-fullscreen-player-styles')) {
        const style = document.createElement('style');
        style.id = 'vakdab-fullscreen-player-styles';
        style.textContent = FULLSCREEN_PLAYER_STYLES;
        document.head.appendChild(style);
    }
    styleInjected = true;
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ICONS = {
    back: '<svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
    playlist: '<svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
    options: '<svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>',
    loop: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    cinematic: '<svg viewBox="0 0 24 24"><path d="M18 4v1h-2V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v16c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
    sleep: '<svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>',
    quality: '<svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>',
    speed: '<svg viewBox="0 0 24 24"><path d="M10 8v8l5-4-5-4zm9 4c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7 7-3.13 7-7zm-7 9c-4.96 0-9-4.04-9-9s4.04-9 9-9 9 4.04 9 9-4.04 9-9 9z"/></svg>',
    size: '<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v10H7V7z"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
};

export class VakdabFullscreenPlayer {
    constructor() {
        ensureStyles();
        this.root = null;
        this.video = null;
        this.home = null;
        this.handlers = [];
        this.hideTimer = null;
        this.wasPlaying = false;
        this.options = {};
        this.sleepTimer = null;
        this.sleepMinutes = 0;
        this.seeking = false;
    }

    open(video, options = {}) {
        if (!video) return;
        this.close(false);
        this.video = video;
        this.home = video.parentElement;
        this.wasPlaying = !video.paused;
        this.options = options;

        // Ніколи не відкриваємо нативний браузерний плеєр
        video.controls = false;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('controlslist', 'nodownload noplaybackrate nofullscreen');
        try { video.disablePictureInPicture = true; } catch (_) {}

        this.root = document.createElement('div');
        this.root.id = 'vakdab-fullscreen-player';
        this.root.innerHTML = `
            <div class="player-container">
                <div class="lock-overlay" id="vfpLockOverlay"><svg class="lock-icon-large" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></div>
                <div class="top-bar" id="vfpTopBar">
                    <button class="back-btn" id="vfpBackBtn" aria-label="Назад">${ICONS.back}</button>
                    <div class="logo-container">
                        <div class="logo-text">VAK <span>DAB</span></div>
                        <div class="season-info" id="vfpSeasonInfo"></div>
                    </div>
                </div>
                <div class="bottom-bar" id="vfpBottomBar">
                    <div class="next-episode-card" id="vfpNextCard" hidden>
                        <div style="position:relative;">
                            <img src="" alt="Next" class="next-thumb" id="vfpNextThumb">
                            <div class="next-thumb-play"><svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                        </div>
                        <div class="next-episode-text">
                            <span class="next-label">Наступна серія</span>
                            <span class="next-title" id="vfpNextTitle"></span>
                        </div>
                    </div>
                    <div class="progress-block">
                        <div class="time-info">
                            <span id="vfpCurrentTime">00:00:00</span>
                            <span id="vfpDurationTime">00:00:00</span>
                        </div>
                        <div class="progress-container" id="vfpProgressContainer">
                            <div class="progress-track">
                                <div class="progress-fill" id="vfpProgressFill" style="width:0%">
                                    <div class="progress-thumb"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="controls">
                        <div class="controls-left">
                            <button class="control-btn" id="vfpPlaylistBtn" aria-label="Плейлист">${ICONS.playlist}</button>
                            <button class="control-btn" id="vfpNextBtn" aria-label="Наступна серія">${ICONS.next}</button>
                        </div>
                        <button class="play-pause-btn" id="vfpPlayPauseBtn" aria-label="Відтворити">
                            <svg id="vfpPlayIcon" viewBox="0 0 24 24" style="display:none;">${ICONS.play.match(/<path[^>]*>/)[0]}</svg>
                            <svg id="vfpPauseIcon" viewBox="0 0 24 24">${ICONS.pause.match(/<path[^>]*>/)[0]}</svg>
                        </button>
                        <div class="controls-right">
                            <button class="control-btn" id="vfpOptionsBtn" aria-label="Налаштування">${ICONS.options}</button>
                        </div>
                    </div>
                </div>
                <div class="side-menu" id="vfpSideMenu">
                    <div class="menu-header">Плейлист</div>
                    <div class="playlist-container" id="vfpPlaylistContainer"></div>
                </div>
                <div class="options-sheet" id="vfpOptionsSheet">
                    <div class="sheet-handle"></div>
                    <div class="sheet-view active" id="vfpOptionsMainView">
                        <button class="opt-item" id="vfpLoopMenuItem">
                            <span class="opt-icon">${ICONS.loop}</span>
                            <span class="opt-label">Повторювати відео</span>
                            <label class="switch"><input type="checkbox" id="vfpLoopToggle"><span class="slider round"></span></label>
                        </button>
                        <button class="opt-item" id="vfpCinematicMenuItem">
                            <span class="opt-icon">${ICONS.cinematic}</span>
                            <span class="opt-label">Кінематографічне освітлення</span>
                            <label class="switch"><input type="checkbox" id="vfpCinematicToggle"><span class="slider round"></span></label>
                        </button>
                        <button class="opt-item" id="vfpVolumeMenuItem">
                            <span class="opt-icon">${ICONS.volume}</span>
                            <span class="opt-label">Стабілізувати гучність</span>
                            <label class="switch"><input type="checkbox" id="vfpVolumeToggle"><span class="slider round"></span></label>
                        </button>
                        <button class="opt-item" id="vfpSleepTimerMenuItem">
                            <span class="opt-icon">${ICONS.sleep}</span>
                            <span class="opt-label">Таймер сну</span>
                            <span class="opt-value" id="vfpSleepValue">Вимкнено</span>
                            <span class="opt-chevron">${ICONS.chevron}</span>
                        </button>
                        <div class="sheet-divider"></div>
                        <button class="opt-item" id="vfpQualityMenuItem">
                            <span class="opt-icon">${ICONS.quality}</span>
                            <span class="opt-label">Якість</span>
                            <span class="opt-value" id="vfpQualityValue">Авто</span>
                            <span class="opt-chevron">${ICONS.chevron}</span>
                        </button>
                        <button class="opt-item" id="vfpSpeedMenuItem">
                            <span class="opt-icon">${ICONS.speed}</span>
                            <span class="opt-label">Швидкість відтворення</span>
                            <span class="opt-value" id="vfpSpeedValue">Нормальна</span>
                            <span class="opt-chevron">${ICONS.chevron}</span>
                        </button>
                        <button class="opt-item" id="vfpSizeMenuItem">
                            <span class="opt-icon">${ICONS.size}</span>
                            <span class="opt-label">Розмір відео</span>
                            <span class="opt-value" id="vfpSizeValue">За замовчуванням</span>
                            <span class="opt-chevron">${ICONS.chevron}</span>
                        </button>
                        <div class="sheet-divider"></div>
                        <button class="opt-item" id="vfpLockMenuItem">
                            <span class="opt-icon">${ICONS.lock}</span>
                            <span class="opt-label">Заблокувати екран</span>
                            <span class="opt-chevron">${ICONS.chevron}</span>
                        </button>
                    </div>
                    <div class="sheet-view" id="vfpSpeedView">
                        <div class="sub-view-header">
                            <button class="sub-view-header-back" id="vfpBackFromSpeed" aria-label="Назад">${ICONS.back}</button>
                            Швидкість
                        </div>
                        <button class="sub-option" data-speed="0.5">0.5x</button>
                        <button class="sub-option" data-speed="0.75">0.75x</button>
                        <button class="sub-option active" data-speed="1">Нормальна (1x)</button>
                        <button class="sub-option" data-speed="1.25">1.25x</button>
                        <button class="sub-option" data-speed="1.5">1.5x</button>
                        <button class="sub-option" data-speed="2">2x</button>
                    </div>
                    <div class="sheet-view" id="vfpSizeView">
                        <div class="sub-view-header">
                            <button class="sub-view-header-back" id="vfpBackFromSize" aria-label="Назад">${ICONS.back}</button>
                            Розмір відео
                        </div>
                        <button class="sub-option active" data-size="default">За замовчуванням</button>
                        <button class="sub-option" data-size="expand">Розширити</button>
                        <button class="sub-option" data-size="fill">Заповнити</button>
                    </div>
                    <div class="sheet-view" id="vfpQualityView">
                        <div class="sub-view-header">
                            <button class="sub-view-header-back" id="vfpBackFromQuality" aria-label="Назад">${ICONS.back}</button>
                            Якість
                        </div>
                        <div id="vfpQualityOptions"></div>
                    </div>
                    <div class="sheet-view" id="vfpSleepView">
                        <div class="sub-view-header">
                            <button class="sub-view-header-back" id="vfpBackFromSleep" aria-label="Назад">${ICONS.back}</button>
                            Таймер сну
                        </div>
                        <div id="vfpSleepOptions"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(this.root);

        const shell = this.root.querySelector('.player-container');
        shell.insertBefore(video, shell.firstChild);

        this._fillHeader();
        this._renderPlaylist();
        this._refreshQualityValue();
        this._bindEvents();
        this.sync();
        this.showControls();
        if (this.wasPlaying) this.video.play().catch(() => {});
    }

    _fillHeader() {
        const info = this.root.querySelector('#vfpSeasonInfo');
        if (info) info.textContent = this.options.subtitle || this.options.title || 'VAKDAB';
    }

    _episodes() {
        return Array.isArray(this.options.episodes) ? this.options.episodes : [];
    }

    _activeEpisodeIndex() {
        const episodes = this._episodes();
        const idx = episodes.findIndex(ep => ep.active);
        return idx >= 0 ? idx : -1;
    }

    _renderPlaylist() {
        const container = this.root.querySelector('#vfpPlaylistContainer');
        if (!container) return;
        const episodes = this._episodes();
        const activeIdx = this._activeEpisodeIndex();
        const poster = this.options.poster || '';
        container.innerHTML = '';
        episodes.forEach((ep, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item${index === activeIdx ? ' active' : ''}`;
            item.innerHTML = `
                <img src="${poster}" alt="${ep.label}" class="playlist-thumb" onerror="this.style.opacity=.2">
                <div class="playlist-info"><span class="playlist-title">${ep.label}</span></div>
                <div class="playlist-check">${ICONS.check}</div>`;
            this._on(item, 'click', () => {
                this._closeMenus();
                this.options.onSelectEpisode?.(index);
            });
            container.appendChild(item);
        });

        // Картка наступної серії
        const card = this.root.querySelector('#vfpNextCard');
        const next = episodes[activeIdx + 1];
        if (card) {
            if (next) {
                this.root.querySelector('#vfpNextTitle').textContent = next.label;
                const thumb = this.root.querySelector('#vfpNextThumb');
                if (thumb && poster) thumb.src = poster;
                card.hidden = false;
            } else {
                card.hidden = true;
            }
        }
    }

    _refreshQualityValue() {
        const labelEl = this.root.querySelector('#vfpQualityValue');
        if (!labelEl) return;
        const current = this.options.getCurrentQuality?.();
        const items = this.qualityItems();
        const found = items.find(item => item.index === current);
        labelEl.textContent = found ? found.label : 'Авто';
    }

    qualityItems() {
        const raw = this.options.getQualities?.() || [];
        const items = [{ index: -1, label: 'Авто' }];
        raw.forEach(item => {
            if (!items.some(existing => existing.label === item.label)) items.push(item);
        });
        return items;
    }

    _renderQualityView() {
        const box = this.root.querySelector('#vfpQualityOptions');
        if (!box) return;
        const current = this.options.getCurrentQuality?.();
        const items = this.qualityItems();
        box.innerHTML = '';
        items.forEach(item => {
            const btn = document.createElement('button');
            btn.className = `sub-option${item.index === current ? ' active' : ''}`;
            btn.textContent = item.label;
            this._on(btn, 'click', () => {
                this.options.setQuality?.(item.index);
                this._refreshQualityValue();
                this._switchSheetView(this.root.querySelector('#vfpOptionsMainView'));
            });
            box.appendChild(btn);
        });
    }

    _sleepItems() {
        return [{ minutes: 0, label: 'Вимкнено' }, { minutes: 15, label: '15 хвилин' }, { minutes: 30, label: '30 хвилин' }, { minutes: 60, label: '1 година' }];
    }

    _renderSleepView() {
        const box = this.root.querySelector('#vfpSleepOptions');
        if (!box) return;
        box.innerHTML = '';
        this._sleepItems().forEach(item => {
            const btn = document.createElement('button');
            btn.className = `sub-option${item.minutes === this.sleepMinutes ? ' active' : ''}`;
            btn.textContent = item.label;
            this._on(btn, 'click', () => {
                this._setSleepTimer(item.minutes);
                this._switchSheetView(this.root.querySelector('#vfpOptionsMainView'));
            });
            box.appendChild(btn);
        });
    }

    _setSleepTimer(minutes) {
        clearTimeout(this.sleepTimer);
        this.sleepTimer = null;
        this.sleepMinutes = minutes;
        const label = this._sleepItems().find(item => item.minutes === minutes)?.label || 'Вимкнено';
        const valueEl = this.root.querySelector('#vfpSleepValue');
        if (valueEl) valueEl.textContent = label;
        if (minutes > 0) {
            this.sleepTimer = setTimeout(() => {
                this.video?.pause();
                this._setSleepTimer(0);
                this._renderSleepView();
            }, minutes * 60 * 1000);
        }
    }

    _switchSheetView(view) {
        this.root.querySelectorAll('.sheet-view').forEach(v => v.classList.remove('active'));
        view?.classList.add('active');
    }

    _closeMenus() {
        this.root.querySelector('#vfpSideMenu')?.classList.remove('open');
        this.root.querySelector('#vfpOptionsSheet')?.classList.remove('open');
    }

    _on(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        this.handlers.push(() => target.removeEventListener(type, handler, options));
    }

    _bindEvents() {
        const video = this.video;
        const root = this.root;
        const $ = selector => root.querySelector(selector);

        const topBar = $('#vfpTopBar');
        const bottomBar = $('#vfpBottomBar');
        const sideMenu = $('#vfpSideMenu');
        const optionsSheet = $('#vfpOptionsSheet');
        const lockOverlay = $('#vfpLockOverlay');
        const playIcon = $('#vfpPlayIcon');
        const pauseIcon = $('#vfpPauseIcon');

        const togglePlay = () => {
            if (!this.video) return;
            if (this.video.paused) this.video.play().catch(() => {});
            else this.video.pause();
        };
        const setPlayIcons = paused => {
            playIcon.style.display = paused ? 'block' : 'none';
            pauseIcon.style.display = paused ? 'none' : 'block';
        };

        // Керування з панелей
        this._on($('#vfpPlayPauseBtn'), 'click', e => { e.stopPropagation(); togglePlay(); this.showControls(); });
        this._on($('#vfpBackBtn'), 'click', e => { e.stopPropagation(); this.close(); });
        this._on($('#vfpPlaylistBtn'), 'click', e => {
            e.stopPropagation();
            optionsSheet.classList.remove('open');
            sideMenu.classList.add('open');
            this.showControls(0);
        });
        this._on($('#vfpOptionsBtn'), 'click', e => {
            e.stopPropagation();
            sideMenu.classList.remove('open');
            optionsSheet.classList.add('open');
            this._switchSheetView($('#vfpOptionsMainView'));
            this.showControls(0);
        });
        this._on($('#vfpNextBtn'), 'click', e => { e.stopPropagation(); this.options.onNext?.(); this.showControls(); });
        this._on($('#vfpNextCard'), 'click', e => { e.stopPropagation(); this.options.onNext?.(); this.showControls(); });

        // Тап по відео: play/pause + показ/приховування панелей
        this._on(video, 'click', () => {
            if (lockOverlay.classList.contains('active')) return;
            sideMenu.classList.remove('open');
            optionsSheet.classList.remove('open');
            togglePlay();
            const hidden = topBar.classList.toggle('hidden');
            bottomBar.classList.toggle('hidden', hidden);
        });
        this._on(video, 'mousemove', () => this.showControls());
        this._on(video, 'touchstart', () => this.showControls(), { passive: true });

        // Синхронізація стану відео
        this._on(video, 'play', () => { setPlayIcons(false); this.showControls(); });
        this._on(video, 'pause', () => setPlayIcons(true));
        this._on(video, 'timeupdate', () => this.sync());
        this._on(video, 'loadedmetadata', () => this.sync());
        this._on(video, 'durationchange', () => this.sync());
        setPlayIcons(video.paused);

        // Прогрес: клік і перетягування
        const progressContainer = $('#vfpProgressContainer');
        const seekTo = clientX => {
            if (!this.video || !this.video.duration) return;
            const rect = progressContainer.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            this.video.currentTime = pos * this.video.duration;
            this.sync();
        };
        this._on(progressContainer, 'mousedown', e => { this.seeking = true; seekTo(e.clientX); e.preventDefault(); });
        this._on(progressContainer, 'touchstart', e => { this.seeking = true; seekTo(e.touches[0].clientX); }, { passive: true });
        this._on(document, 'mousemove', e => { if (this.seeking) seekTo(e.clientX); });
        this._on(document, 'touchmove', e => { if (this.seeking) seekTo(e.touches[0].clientX); }, { passive: true });
        this._on(document, 'mouseup', () => { this.seeking = false; });
        this._on(document, 'touchend', () => { this.seeking = false; });

        // Налаштування: швидкість
        this._on($('#vfpSpeedMenuItem'), 'click', () => {
            this._switchSheetView($('#vfpSpeedView'));
            root.querySelectorAll('#vfpSpeedView .sub-option').forEach(opt => {
                opt.classList.toggle('active', parseFloat(opt.dataset.speed) === (this.video?.playbackRate || 1));
            });
        });
        this._on($('#vfpBackFromSpeed'), 'click', () => this._switchSheetView($('#vfpOptionsMainView')));
        root.querySelectorAll('#vfpSpeedView .sub-option').forEach(opt => {
            this._on(opt, 'click', () => {
                const speed = parseFloat(opt.dataset.speed);
                if (this.video) this.video.playbackRate = speed;
                $('#vfpSpeedValue').textContent = speed === 1 ? 'Нормальна' : `${speed}x`;
                root.querySelectorAll('#vfpSpeedView .sub-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this._switchSheetView($('#vfpOptionsMainView'));
            });
        });

        // Налаштування: розмір відео
        this._on($('#vfpSizeMenuItem'), 'click', () => this._switchSheetView($('#vfpSizeView')));
        this._on($('#vfpBackFromSize'), 'click', () => this._switchSheetView($('#vfpOptionsMainView')));
        root.querySelectorAll('#vfpSizeView .sub-option').forEach(opt => {
            this._on(opt, 'click', () => {
                const sizeType = opt.dataset.size;
                if (this.video) {
                    this.video.style.transform = 'none';
                    if (sizeType === 'default') this.video.style.objectFit = 'contain';
                    if (sizeType === 'expand') this.video.style.objectFit = 'cover';
                    if (sizeType === 'fill') this.video.style.objectFit = 'fill';
                }
                $('#vfpSizeValue').textContent = opt.textContent;
                root.querySelectorAll('#vfpSizeView .sub-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this._switchSheetView($('#vfpOptionsMainView'));
            });
        });

        // Налаштування: якість (реальні рівні HLS)
        this._on($('#vfpQualityMenuItem'), 'click', () => { this._renderQualityView(); this._switchSheetView($('#vfpQualityView')); });
        this._on($('#vfpBackFromQuality'), 'click', () => this._switchSheetView($('#vfpOptionsMainView')));

        // Налаштування: таймер сну
        this._on($('#vfpSleepTimerMenuItem'), 'click', () => { this._renderSleepView(); this._switchSheetView($('#vfpSleepView')); });
        this._on($('#vfpBackFromSleep'), 'click', () => this._switchSheetView($('#vfpOptionsMainView')));

        // Перемикачі
        this._on($('#vfpLoopToggle'), 'change', function () { if (video) video.loop = this.checked; });
        const cinematicToggle = $('#vfpCinematicToggle');
        this._on(cinematicToggle, 'change', function () {
            if (!video) return;
            video.style.filter = this.checked ? 'brightness(0.8) contrast(1.2)' : 'none';
        });
        this._on($('#vfpVolumeToggle'), 'change', function () {
            if (!video) return;
            video.volume = this.checked ? 0.8 : 1.0;
        });

        // Блокування екрана
        this._on($('#vfpLockMenuItem'), 'click', () => {
            video?.pause();
            optionsSheet.classList.remove('open');
            sideMenu.classList.remove('open');
            lockOverlay.classList.add('active');
        });
        this._on(lockOverlay, 'click', () => lockOverlay.classList.remove('active'));

        // Клавіатура
        this._on(document, 'keydown', event => {
            if (!this.root) return;
            if (event.key === 'Escape') {
                if (lockOverlay.classList.contains('active')) { lockOverlay.classList.remove('active'); return; }
                if (sideMenu.classList.contains('open') || optionsSheet.classList.contains('open')) { this._closeMenus(); return; }
                this.close();
            }
        });
    }

    sync() {
        if (!this.root || !this.video) return;
        const duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
        const current = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;
        const percent = duration ? (current / duration) * 100 : 0;
        this.root.querySelector('#vfpProgressFill').style.width = `${Math.min(100, Math.max(0, percent))}%`;
        this.root.querySelector('#vfpCurrentTime').textContent = formatTime(current);
        const remaining = Math.max(0, duration - current);
        this.root.querySelector('#vfpDurationTime').textContent = duration
            ? `${formatTime(duration)} · Залишилось ${formatTime(remaining)}`
            : '00:00:00';
        const playIcon = this.root.querySelector('#vfpPlayIcon');
        const pauseIcon = this.root.querySelector('#vfpPauseIcon');
        if (playIcon && pauseIcon) {
            playIcon.style.display = this.video.paused ? 'block' : 'none';
            pauseIcon.style.display = this.video.paused ? 'none' : 'block';
        }
    }

    exitFullscreen() { this.close(); }

    showControls(stickyMs = 3500) {
        if (!this.root) return;
        const topBar = this.root.querySelector('#vfpTopBar');
        const bottomBar = this.root.querySelector('#vfpBottomBar');
        const sideMenu = this.root.querySelector('#vfpSideMenu');
        const optionsSheet = this.root.querySelector('#vfpOptionsSheet');
        topBar?.classList.remove('hidden');
        bottomBar?.classList.remove('hidden');
        clearTimeout(this.hideTimer);
        if (stickyMs > 0) {
            this.hideTimer = setTimeout(() => {
                if (!this.video || this.video.paused) return;
                if (sideMenu?.classList.contains('open') || optionsSheet?.classList.contains('open')) return;
                topBar?.classList.add('hidden');
                bottomBar?.classList.add('hidden');
            }, stickyMs);
        }
    }

    close(restore = true) {
        clearTimeout(this.hideTimer);
        clearTimeout(this.sleepTimer);
        this.sleepTimer = null;
        this.sleepMinutes = 0;
        if (!this.root) return;
        const video = this.video;
        this.handlers.splice(0).forEach(remove => remove());
        if (video) {
            video.style.filter = '';
            const target = this.home || document.getElementById('playerPageVideo');
            if (restore && target && target !== video.parentElement) target.appendChild(video);
            if (restore && this.wasPlaying) video.play().catch(() => {});
        }
        this.root.remove();
        this.root = null;
        this.video = null;
        this.home = null;
        this.options = {};
    }
}
