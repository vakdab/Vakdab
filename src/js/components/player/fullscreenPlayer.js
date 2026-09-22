const FULLSCREEN_PLAYER_STYLES = `
#vakdab-fullscreen-player{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;overflow:hidden}
#vakdab-fullscreen-player[hidden]{display:none}
#vakdab-fullscreen-player .vfp-shell{position:relative;width:100%;height:100%;background:#000;overflow:hidden}
#vakdab-fullscreen-player video{width:100%;height:100%;display:block;object-fit:contain;background:#000}
#vakdab-fullscreen-player .vfp-top,#vakdab-fullscreen-player .vfp-bottom{position:absolute;left:0;right:0;z-index:3;padding:16px 20px;transition:opacity .25s,transform .25s}
#vakdab-fullscreen-player .vfp-top{top:0;background:linear-gradient(#000d,transparent)}
#vakdab-fullscreen-player .vfp-bottom{bottom:0;padding-top:48px;background:linear-gradient(transparent,#000e)}
#vakdab-fullscreen-player .vfp-controls-hidden .vfp-top,#vakdab-fullscreen-player .vfp-controls-hidden .vfp-bottom{opacity:0;pointer-events:none}
#vakdab-fullscreen-player .vfp-row{display:flex;align-items:center;gap:12px}
#vakdab-fullscreen-player .vfp-title{font-size:18px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
#vakdab-fullscreen-player button{border:0;color:#fff;cursor:pointer;background:transparent;display:inline-flex;align-items:center;justify-content:center}
#vakdab-fullscreen-player .vfp-icon{width:38px;height:38px;border-radius:50%;background:#ffffff26;font-size:20px}
#vakdab-fullscreen-player .vfp-progress{height:20px;display:flex;align-items:center;cursor:pointer;margin-bottom:8px}
#vakdab-fullscreen-player .vfp-track{width:100%;height:4px;background:#ffffff4d;border-radius:3px;overflow:visible}
#vakdab-fullscreen-player .vfp-fill{height:100%;width:0;background:#fff;border-radius:3px;position:relative}
#vakdab-fullscreen-player .vfp-fill:after{content:"";position:absolute;right:-6px;top:50%;width:12px;height:12px;border-radius:50%;background:#fff;transform:translateY(-50%);opacity:0}
#vakdab-fullscreen-player .vfp-progress:hover .vfp-fill:after{opacity:1}
#vakdab-fullscreen-player .vfp-time{font-size:13px;color:#bbb;white-space:nowrap;font-variant-numeric:tabular-nums}
#vakdab-fullscreen-player .vfp-spacer{flex:1}
#vakdab-fullscreen-player .vfp-play{width:56px;height:56px;border-radius:50%;background:#ffffff26;font-size:28px}
#vakdab-fullscreen-player .vfp-volume{width:90px;accent-color:#fff}
#vakdab-fullscreen-player .vfp-menu{position:absolute;top:0;right:0;width:min(380px,82%);height:100%;background:#0f0f0f;z-index:5;transform:translateX(100%);transition:transform .25s;box-shadow:-8px 0 20px #0008;padding:24px 16px}
#vakdab-fullscreen-player .vfp-menu.open{transform:translateX(0)}
#vakdab-fullscreen-player .vfp-menu h2{font-size:24px;font-weight:400;margin:0 0 18px;padding:0 10px}
#vakdab-fullscreen-player .vfp-menu button{width:100%;justify-content:flex-start;padding:15px 12px;border-radius:8px;font-size:16px;background:transparent}
#vakdab-fullscreen-player .vfp-menu button:hover,#vakdab-fullscreen-player .vfp-menu button.active{background:#ffffff12}
@media(max-width:600px){#vakdab-fullscreen-player .vfp-top,#vakdab-fullscreen-player .vfp-bottom{padding-left:10px;padding-right:10px}#vakdab-fullscreen-player .vfp-title{font-size:14px}.vfp-volume{width:60px!important}.vfp-time{font-size:11px!important}}
`;

let styleInjected = false;
function ensureStyles() {
    if (styleInjected) return;
    const style = document.createElement('style');
    style.id = 'vakdab-fullscreen-player-styles';
    style.textContent = FULLSCREEN_PLAYER_STYLES;
    document.head.appendChild(style);
    styleInjected = true;
}
function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) return '00:00:00';
    const s = Math.floor(value);
    return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export class VakdabFullscreenPlayer {
    constructor() {
        ensureStyles();
        this.root = null;
        this.video = null;
        this.home = null;
        this.timer = null;
        this.handlers = [];
        this._onFullscreenChange = () => {
            if (this.root && !document.fullscreenElement && !document.webkitFullscreenElement && this.root.style.display !== 'none') this.close();
        };
        document.addEventListener('fullscreenchange', this._onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    }

    open(video, options = {}) {
        if (!video) return;
        this.close(false);
        this.video = video;
        this.home = video.parentElement;
        this.wasPlaying = !video.paused;
        this.options = options;
        this.root = document.createElement('div');
        this.root.id = 'vakdab-fullscreen-player';
        this.root.innerHTML = `
            <div class="vfp-shell">
                <video playsinline></video>
                <div class="vfp-top"><div class="vfp-row"><button class="vfp-icon" data-action="close" aria-label="Назад">‹</button><div class="vfp-title"></div><button class="vfp-icon" data-action="menu" aria-label="Меню">⋮</button></div></div>
                <div class="vfp-bottom"><div class="vfp-progress"><div class="vfp-track"><div class="vfp-fill"></div></div></div><div class="vfp-row"><button class="vfp-icon" data-action="playlist" aria-label="Плейлист">☰</button><button class="vfp-icon" data-action="next" aria-label="Наступна серія">›|</button><button class="vfp-play" data-action="play" aria-label="Відтворити">▶</button><span class="vfp-time">00:00:00 / 00:00:00</span><span class="vfp-spacer"></span><button class="vfp-icon" data-action="mute" aria-label="Звук">◖</button><input class="vfp-volume" type="range" min="0" max="1" step=".05" value=".8" aria-label="Гучність"><button class="vfp-icon" data-action="exit" aria-label="Вийти з fullscreen">⛶</button></div></div>
                <aside class="vfp-menu"><h2>Ще</h2><button data-action="speed">Швидкість: <span>1x</span></button><button data-action="fit">Розмір відео: <span>За замовчуванням</span></button><button data-action="menu-close">Закрити</button></aside>
            </div>`;
        document.body.appendChild(this.root);
        const shell = this.root.querySelector('.vfp-shell');
        this.root.querySelector('.vfp-title').textContent = options.title || '';
        // Keep playback inside VakDab's custom UI. Never expose native browser controls.
        video.controls = false;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('controlslist', 'nodownload noplaybackrate nofullscreen');
        video.disablePictureInPicture = true;
        shell.insertBefore(video, shell.firstChild);
        this.video = video;
        const bind = (target, event, fn, opts) => { target.addEventListener(event, fn, opts); this.handlers.push(() => target.removeEventListener(event, fn, opts)); };
        bind(this.root, 'click', e => { const action = e.target.closest('[data-action]')?.dataset.action; if (action) this.action(action); else this.showControls(); });
        bind(this.video, 'timeupdate', () => this.sync());
        bind(this.video, 'loadedmetadata', () => this.sync());
        bind(this.video, 'play', () => this.sync());
        bind(this.video, 'pause', () => this.sync());
        bind(this.video, 'mousemove', () => this.showControls());
        bind(this.video, 'dblclick', () => this.action('exit'));
        const progress = this.root.querySelector('.vfp-progress');
        bind(progress, 'click', e => { if (!this.video.duration) return; const r = progress.getBoundingClientRect(); this.video.currentTime = ((e.clientX - r.left) / r.width) * this.video.duration; });
        bind(this.root.querySelector('.vfp-volume'), 'input', e => { this.video.volume = Number(e.target.value); this.video.muted = this.video.volume === 0; });
        bind(document, 'keydown', e => { if (e.key === 'Escape') this.action('exit'); if (e.code === 'Space') { e.preventDefault(); this.action('play'); } });
        this.showControls();
        if (this.wasPlaying) this.video.play().catch(() => {});
        const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
        if (request) Promise.resolve(request.call(shell)).catch(() => {});
        this.sync();
    }

    action(action) {
        if (!this.video) return;
        if (action === 'play') this.video.paused ? this.video.play().catch(() => {}) : this.video.pause();
        else if (action === 'mute') this.video.muted = !this.video.muted;
        else if (action === 'next') this.options.onNext?.();
        else if (action === 'menu' || action === 'playlist') this.root.querySelector('.vfp-menu').classList.add('open');
        else if (action === 'menu-close' || action === 'close') this.exitFullscreen();
        else if (action === 'exit') this.exitFullscreen();
        else if (action === 'speed') { const speeds = [1, 1.25, 1.5, 2, .75, .5]; const next = speeds[(speeds.indexOf(this.video.playbackRate) + 1) % speeds.length]; this.video.playbackRate = next; this.root.querySelector('[data-action="speed"] span').textContent = `${next}x`; }
        else if (action === 'fit') { const fit = this.video.style.objectFit === 'contain' ? 'cover' : this.video.style.objectFit === 'cover' ? 'fill' : 'contain'; this.video.style.objectFit = fit; this.root.querySelector('[data-action="fit"] span').textContent = fit === 'contain' ? 'За замовчуванням' : fit === 'cover' ? 'Розширити' : 'Заповнити'; }
        this.sync();
    }
    sync() {
        if (!this.root || !this.video) return;
        this.root.querySelector('.vfp-fill').style.width = this.video.duration ? `${this.video.currentTime / this.video.duration * 100}%` : '0%';
        this.root.querySelector('.vfp-time').textContent = `${formatTime(this.video.currentTime)} / ${formatTime(this.video.duration)}`;
        this.root.querySelector('.vfp-play').textContent = this.video.paused ? '▶' : 'Ⅱ';
        this.root.querySelector('.vfp-volume').value = String(this.video.volume);
    }
    showControls() { this.root?.classList.remove('vfp-controls-hidden'); clearTimeout(this.timer); this.timer = setTimeout(() => { if (this.video && !this.video.paused) this.root?.classList.add('vfp-controls-hidden'); }, 3200); }
    exitFullscreen() { if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); else this.close(); }
    close(exitBrowserFullscreen = true) {
        if (!this.root || !this.video) return;
        clearTimeout(this.timer);
        const video = this.video;
        const target = this.home || document.getElementById('playerPageVideo');
        const shouldResume = this.wasPlaying;
        video.pause();
        if (target) target.appendChild(video);
        this.handlers.splice(0).forEach(remove => remove());
        this.root.remove();
        this.root = null;
        this.video = null;
        if (shouldResume) video.play().catch(() => {});
        if (exitBrowserFullscreen && (document.fullscreenElement || document.webkitFullscreenElement)) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
}
