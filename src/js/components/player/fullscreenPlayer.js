const FULLSCREEN_PLAYER_STYLES = `
#vakdab-fullscreen-player{position:fixed;inset:0;z-index:2147483000;background:#000;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;overflow:hidden;user-select:none;-webkit-tap-highlight-color:transparent}
#vakdab-fullscreen-player[hidden]{display:none}
#vakdab-fullscreen-player .vfp-shell{position:relative;width:100%;height:100%;height:100dvh;max-width:1000px;margin:0 auto;background:#000;overflow:hidden;display:flex;flex-direction:column}
#vakdab-fullscreen-player video{width:100%;height:100%;display:block;object-fit:contain;background:#000;transition:object-fit .3s ease}
#vakdab-fullscreen-player .vfp-top,#vakdab-fullscreen-player .vfp-bottom{position:absolute;left:0;right:0;z-index:10;transition:opacity .3s,visibility .3s}
#vakdab-fullscreen-player .vfp-top{top:0;min-height:82px;padding:20px;background:linear-gradient(to bottom,rgba(0,0,0,.7),transparent);display:flex;justify-content:center;align-items:center;pointer-events:none}
#vakdab-fullscreen-player .vfp-top>*{pointer-events:auto}
#vakdab-fullscreen-player .vfp-bottom{bottom:0;padding:15px 20px 25px;background:linear-gradient(to top,rgba(0,0,0,.92),transparent);display:flex;flex-direction:column;gap:15px}
#vakdab-fullscreen-player .vfp-controls-hidden .vfp-top,#vakdab-fullscreen-player .vfp-controls-hidden .vfp-bottom{opacity:0;visibility:hidden;pointer-events:none}
#vakdab-fullscreen-player button{font:inherit;color:#fff;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;background:transparent;-webkit-tap-highlight-color:transparent}
#vakdab-fullscreen-player .vfp-back,#vakdab-fullscreen-player .vfp-menu-button{position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font-size:30px;line-height:1}
#vakdab-fullscreen-player .vfp-back{left:20px}.vfp-menu-button{right:20px}
#vakdab-fullscreen-player .vfp-logo{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;max-width:70%;pointer-events:none}
#vakdab-fullscreen-player .vfp-logo-title{font-size:22px;font-weight:800;letter-spacing:1px;color:#f6ad55;text-shadow:0 2px 4px #0008;font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
#vakdab-fullscreen-player .vfp-logo-title span{color:#fff}.vfp-season{font-size:14px;color:#ddd;font-weight:400}
#vakdab-fullscreen-player .vfp-next{position:absolute;right:20px;bottom:190px;z-index:15;background:rgba(0,0,0,.85);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:12px;text-align:left}
#vakdab-fullscreen-player .vfp-next-thumb{width:60px;height:34px;border-radius:4px;object-fit:cover;background:#333}.vfp-next-label{display:block;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;font-weight:700}.vfp-next-title{display:block;font-size:14px;font-weight:600;margin-top:2px}
#vakdab-fullscreen-player .vfp-progress-block{background:rgba(0,0,0,.6);backdrop-filter:blur(5px);border-radius:12px;padding:12px 15px 10px;display:flex;flex-direction:column;gap:10px}
#vakdab-fullscreen-player .vfp-time-row{display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#fff;font-variant-numeric:tabular-nums}
#vakdab-fullscreen-player .vfp-progress{width:100%;height:28px;display:flex;align-items:center;cursor:pointer}.vfp-track{width:100%;height:8px;background:rgba(255,255,255,.25);border-radius:4px;position:relative}.vfp-fill{height:100%;width:0;background:#fff;border-radius:4px;position:relative}.vfp-fill:after{content:"";position:absolute;right:-11px;top:50%;transform:translateY(-50%);width:22px;height:22px;background:#fff;border-radius:50%;box-shadow:0 2px 6px #0009}
#vakdab-fullscreen-player .vfp-controls-row{display:flex;justify-content:space-between;align-items:center;margin-top:5px;padding:0 5px}.vfp-controls-left,.vfp-controls-right{display:flex;background:rgba(255,255,255,.15);border-radius:30px;padding:4px 8px;gap:5px}.vfp-controls-right{border-radius:50%;padding:4px}.vfp-icon{width:42px;height:42px;border-radius:50%;font-size:25px}.vfp-play{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,.15)!important;font-size:30px}.vfp-icon:active,.vfp-play:active{background:rgba(255,255,255,.3)!important}
#vakdab-fullscreen-player .vfp-side-menu,#vakdab-fullscreen-player .vfp-options{position:absolute;z-index:30;background:#0f0f0f;box-shadow:-5px 0 15px #0008;transition:transform .3s;overflow-y:auto}.vfp-side-menu{top:0;right:0;width:75%;max-width:400px;height:100%;transform:translateX(100%);padding:25px 15px}.vfp-side-menu.open{transform:translateX(0)}.vfp-side-menu h2{font-size:24px;font-weight:700;padding:0 10px 15px;margin:0}.vfp-side-menu button{width:100%;justify-content:flex-start;padding:15px 12px;border-radius:8px;font-size:16px}.vfp-side-menu button:active{background:#ffffff1a}
#vakdab-fullscreen-player .vfp-options{left:0;right:0;bottom:0;max-height:80%;border-radius:20px 20px 0 0;transform:translateY(100%);padding:20px 0}.vfp-options.open{transform:translateY(0)}.vfp-options h2{font-size:20px;padding:0 25px 12px}.vfp-option{width:100%;justify-content:space-between;padding:18px 25px;font-size:16px;font-weight:600;text-align:left}.vfp-option:active{background:#ffffff1a}.vfp-option span{color:#aaa;font-weight:500}
#vakdab-fullscreen-player .vfp-lock{position:absolute;inset:0;z-index:100;background:#000;display:none;align-items:center;justify-content:center}.vfp-lock.active{display:flex}.vfp-lock button{font-size:54px;opacity:.6}
@media(max-width:600px){#vakdab-fullscreen-player .vfp-top{padding:14px 10px}.vfp-back{left:10px!important}.vfp-menu-button{right:10px!important}.vfp-bottom{padding:10px 10px 20px!important}.vfp-next{right:10px!important;bottom:185px!important}.vfp-logo-title{font-size:18px!important}.vfp-time-row{font-size:12px!important}.vfp-controls-row{padding:0!important}.vfp-icon{width:38px;height:38px}.vfp-play{width:52px;height:52px}}
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
    }

    open(video, options = {}) {
        if (!video) return;
        this.close();
        this.video = video;
        this.home = video.parentElement;
        this.wasPlaying = !video.paused;
        this.options = options;
        video.controls = false;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.disablePictureInPicture = true;

        this.root = document.createElement('div');
        this.root.id = 'vakdab-fullscreen-player';
        this.root.innerHTML = `
            <div class="vfp-shell">
                <div class="vfp-top">
                    <button class="vfp-back" data-action="close" aria-label="Назад">×</button>
                    <div class="vfp-logo"><div class="vfp-logo-title">VAK<span>DAB</span></div><div class="vfp-season"></div></div>
                    <button class="vfp-menu-button" data-action="options" aria-label="Налаштування">⋯</button>
                </div>
                <button class="vfp-next" data-action="next" aria-label="Наступна серія"><span style="font-size:22px">▶</span><span><small class="vfp-next-label">НАСТУПНА СЕРІЯ</small><strong class="vfp-next-title">Наступна серія</strong></span></button>
                <div class="vfp-bottom">
                    <div class="vfp-progress-block"><div class="vfp-time-row"><span class="vfp-current">00:00:00</span><span class="vfp-remaining">00:00:00</span></div><div class="vfp-progress"><div class="vfp-track"><div class="vfp-fill"></div></div></div></div>
                    <div class="vfp-controls-row"><div class="vfp-controls-left"><button class="vfp-icon" data-action="playlist" aria-label="Плейлист">☰</button><button class="vfp-icon" data-action="back10" aria-label="Назад 10 секунд">↶</button></div><button class="vfp-play" data-action="play" aria-label="Відтворити">▶</button><div class="vfp-controls-right"><button class="vfp-icon" data-action="forward10" aria-label="Вперед 10 секунд">↷</button><button class="vfp-icon" data-action="mute" aria-label="Звук">◖</button></div></div>
                </div>
                <aside class="vfp-side-menu"><h2>Плейлист</h2><button data-action="next">Наступна серія</button><button data-action="menu-close">Закрити</button></aside>
                <section class="vfp-options"><h2>Налаштування</h2><button class="vfp-option" data-action="speed">Швидкість <span>1x</span></button><button class="vfp-option" data-action="fit">Розмір відео <span>За замовчуванням</span></button><button class="vfp-option" data-action="loop">Повторювати відео <span>Вимкнено</span></button><button class="vfp-option" data-action="lock">Заблокувати екран</button><button class="vfp-option" data-action="options-close">Закрити</button></section>
                <div class="vfp-lock"><button data-action="unlock" aria-label="Розблокувати">♙</button></div>
            </div>`;
        document.body.appendChild(this.root);
        const shell = this.root.querySelector('.vfp-shell');
        shell.insertBefore(video, shell.firstChild);
        this.root.querySelector('.vfp-logo-title').append(document.createTextNode(''));
        this.root.querySelector('.vfp-season').textContent = options.episodeTitle || '';
        this.root.querySelector('.vfp-next-title').textContent = options.nextTitle || 'Наступна серія';

        const bind = (target, event, fn, opts) => { target.addEventListener(event, fn, opts); this.handlers.push(() => target.removeEventListener(event, fn, opts)); };
        bind(this.root, 'click', event => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if (action) this.action(action);
        });
        bind(video, 'click', () => { this.togglePlay(); this.showControls(); });
        bind(video, 'dblclick', () => this.showControls());
        bind(video, 'timeupdate', () => this.sync());
        bind(video, 'loadedmetadata', () => this.sync());
        bind(video, 'play', () => this.sync());
        bind(video, 'pause', () => this.sync());
        bind(video, 'mousemove', () => this.showControls());
        bind(video, 'touchstart', () => this.showControls(), { passive: true });
        const progress = this.root.querySelector('.vfp-progress');
        bind(progress, 'click', event => { if (!this.video.duration) return; const rect = progress.getBoundingClientRect(); this.video.currentTime = Math.max(0, Math.min(this.video.duration, ((event.clientX - rect.left) / rect.width) * this.video.duration)); });
        bind(document, 'keydown', event => { if (event.key === 'Escape') this.action('close'); if (event.code === 'Space') { event.preventDefault(); this.action('play'); } });
        this.showControls();
        this.sync();
        if (this.wasPlaying) this.video.play().catch(() => {});
    }

    togglePlay() { if (!this.video) return; this.video.paused ? this.video.play().catch(() => {}) : this.video.pause(); }
    action(action) {
        if (!this.video) return;
        if (action === 'play') this.togglePlay();
        else if (action === 'mute') this.video.muted = !this.video.muted;
        else if (action === 'back10') this.video.currentTime = Math.max(0, this.video.currentTime - 10);
        else if (action === 'forward10') this.video.currentTime = Math.min(this.video.duration || Infinity, this.video.currentTime + 10);
        else if (action === 'next') this.options.onNext?.();
        else if (action === 'playlist') this.root.querySelector('.vfp-side-menu').classList.add('open');
        else if (action === 'menu-close') this.root.querySelector('.vfp-side-menu').classList.remove('open');
        else if (action === 'options') this.root.querySelector('.vfp-options').classList.add('open');
        else if (action === 'options-close') this.root.querySelector('.vfp-options').classList.remove('open');
        else if (action === 'speed') { const values = [1, 1.25, 1.5, 2, .75, .5]; const next = values[(values.indexOf(this.video.playbackRate) + 1) % values.length]; this.video.playbackRate = next; this.root.querySelector('[data-action="speed"] span').textContent = `${next}x`; }
        else if (action === 'fit') { const fit = this.video.style.objectFit === 'contain' ? 'cover' : this.video.style.objectFit === 'cover' ? 'fill' : 'contain'; this.video.style.objectFit = fit; this.root.querySelector('[data-action="fit"] span').textContent = fit === 'contain' ? 'За замовчуванням' : fit === 'cover' ? 'Розширити' : 'Заповнити'; }
        else if (action === 'loop') { this.video.loop = !this.video.loop; this.root.querySelector('[data-action="loop"] span').textContent = this.video.loop ? 'Увімкнено' : 'Вимкнено'; }
        else if (action === 'lock') { this.root.querySelector('.vfp-options').classList.remove('open'); this.root.querySelector('.vfp-lock').classList.add('active'); this.video.pause(); }
        else if (action === 'unlock') this.root.querySelector('.vfp-lock').classList.remove('active');
        else if (action === 'close') this.close();
        this.sync();
    }

    sync() {
        if (!this.root || !this.video) return;
        const duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
        const current = Number.isFinite(this.video.currentTime) ? this.video.currentTime : 0;
        this.root.querySelector('.vfp-fill').style.width = duration ? `${Math.min(100, current / duration * 100)}%` : '0%';
        this.root.querySelector('.vfp-current').textContent = formatTime(current);
        this.root.querySelector('.vfp-remaining').textContent = `-${formatTime(Math.max(0, duration - current))}`;
        this.root.querySelector('.vfp-play').textContent = this.video.paused ? '▶' : 'Ⅱ';
    }

    exitFullscreen() { this.close(); }

    showControls() { this.root?.classList.remove('vfp-controls-hidden'); clearTimeout(this.timer); this.timer = setTimeout(() => { if (this.video && !this.video.paused) this.root?.classList.add('vfp-controls-hidden'); }, 3500); }

    close() {
        if (!this.root || !this.video) return;
        clearTimeout(this.timer);
        const video = this.video;
        const target = this.home || document.getElementById('playerPageVideo');
        video.pause();
        if (target) target.appendChild(video);
        this.handlers.splice(0).forEach(remove => remove());
        this.root.remove();
        this.root = null;
        this.video = null;
        if (this.wasPlaying) video.play().catch(() => {});
    }
}
