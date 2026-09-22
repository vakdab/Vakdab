const PLAYER_CSS = `
        /* ====== ЗМІННІ КОЛЬОРІВ ====== */
        :root {
            --bg-color: #000;
            --text-color: #ffffff;
            --text-secondary: #aaaaaa;
            --menu-bg: #0f0f0f;
            --btn-bg: rgba(255, 255, 255, 0.15);
            --btn-hover: rgba(255, 255, 255, 0.25);
            --accent-color: #ffffff;
            --item-bg: #1a1a1a;
            --sheet-bg: #000000;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-color);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
        }

        .player-container {
            position: relative;
            width: 100%;
            height: 100%;
            max-width: none;
            min-width: 0;
            min-height: 0;
            background: #000;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        video {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            transition: transform 0.3s ease;
            background: #000;
        }

        /* ====== ВЕРХНЯ ПАНЕЛЬ ====== */
        .top-bar {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            padding: 20px;
            background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
            transition: opacity 0.3s;
            pointer-events: none;
        }

        .top-bar > * { pointer-events: auto; }
        .top-bar.hidden { opacity: 0; pointer-events: none; }

        .back-btn {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #fff;
            transition: background 0.2s;
        }

        .back-btn:active { background: rgba(255, 255, 255, 0.3); }
        .back-btn svg { width: 26px; height: 26px; fill: currentColor; margin-left: -2px; }

        .logo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            text-align: center;
        }

        .logo-text {
            font-size: 22px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #f6ad55;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
            font-style: italic;
        }

        .logo-text span { color: #fff; }

        .season-info {
            font-size: 14px;
            color: #ddd;
            font-weight: 400;
        }

        /* ====== НИЖНЯ ПАНЕЛЬ ====== */
        .bottom-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 15px 20px 25px 20px;
            background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%);
            display: flex;
            flex-direction: column;
            gap: 15px;
            z-index: 10;
            transition: opacity 0.3s;
        }

        .bottom-bar.hidden { opacity: 0; pointer-events: none; }

        .next-episode-card {
            position: absolute;
            right: 20px;
            bottom: 190px;
            background: rgba(0, 0, 0, 0.85);
            border-radius: 8px;
            padding: 8px 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid rgba(255,255,255,0.1);
            z-index: 15;
        }

        .next-episode-card:hover { background: rgba(255, 255, 255, 0.1); }

        .next-thumb {
            width: 60px;
            height: 34px;
            border-radius: 4px;
            object-fit: cover;
            position: relative;
            background: #333;
        }

        .next-thumb-play {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            background: rgba(0,0,0,0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
        }

        .next-episode-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .next-label {
            font-size: 11px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
        }

        .next-title {
            font-size: 14px;
            font-weight: 600;
        }

        .progress-block {
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(5px);
            border-radius: 12px;
            padding: 12px 15px 10px 15px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .time-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: 600;
            color: #fff;
        }

        .progress-container {
            width: 100%;
            height: 28px;
            display: flex;
            align-items: center;
            cursor: pointer;
        }

        .progress-track {
            width: 100%;
            height: 8px;
            background: rgba(255, 255, 255, 0.25);
            border-radius: 4px;
            position: relative;
            overflow: visible;
        }

        .progress-fill {
            height: 100%;
            background: var(--accent-color);
            width: 0%;
            border-radius: 4px;
            position: relative;
        }

        .progress-thumb {
            position: absolute;
            right: -11px;
            top: 50%;
            transform: translateY(-50%) scale(1);
            width: 22px;
            height: 22px;
            background: #fff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.6);
        }

        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 5px;
            padding: 0 5px;
        }

        .control-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
            min-height: 44px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.24);
            color: var(--text-color);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            border-radius: 12px;
            transition: background 0.2s, border-color 0.2s, transform 0.15s;
        }

        .control-btn:hover,
        .control-btn:focus-visible { background: rgba(255, 255, 255, 0.26); border-color: rgba(255, 255, 255, 0.6); outline: none; }
        .control-btn:active { background: rgba(255, 255, 255, 0.32); transform: scale(.94); }
        .control-btn svg { width: 24px; height: 24px; fill: currentColor; }

        .controls-left {
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.58);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 4px;
            gap: 6px;
        }

        .play-pause-btn {
            background: var(--btn-bg);
            border-radius: 50%;
            padding: 12px;
            width: 56px;
            height: 56px;
            min-width: 56px;
            min-height: 56px;
            border: 1px solid rgba(255, 255, 255, 0.72);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s, transform 0.15s;
        }

        .play-pause-btn:hover,
        .play-pause-btn:focus-visible { background: rgba(255, 255, 255, 0.28); outline: none; }
        .play-pause-btn:active { background: var(--btn-hover); transform: scale(.94); }
        .play-pause-btn svg { width: 30px; height: 30px; fill: currentColor; }

        .controls-right {
            display: flex;
            align-items: center;
            background: rgba(0, 0, 0, 0.58);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            padding: 4px;
        }

        /* ====== БІЧНЕ МЕНЮ (Плейлист) ====== */
        .side-menu {
            position: absolute;
            top: 0;
            right: 0;
            width: 75%;
            max-width: 400px;
            height: 100%;
            background: var(--menu-bg);
            z-index: 20;
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: -5px 0 15px rgba(0,0,0,0.5);
            overflow-y: auto;
        }

        .side-menu.open { transform: translateX(0); }

        .menu-header {
            font-size: 24px;
            font-weight: 700;
            padding: 25px 25px 15px 25px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .playlist-container {
            display: flex;
            flex-direction: column;
            padding: 0 15px;
            gap: 10px;
        }

        .playlist-item {
            display: flex;
            align-items: center;
            background: var(--item-bg);
            border-radius: 12px;
            padding: 10px;
            cursor: pointer;
            transition: background 0.2s;
            gap: 15px;
            border: 1px solid transparent;
        }

        .playlist-item:hover, .playlist-item:active { background: #2a2a2a; }
        .playlist-item.active { border-color: rgba(255, 255, 255, 0.35); }

        .playlist-thumb {
            width: 80px;
            height: 45px;
            border-radius: 8px;
            object-fit: cover;
            background: #333;
        }

        .playlist-info { flex-grow: 1; display: flex; flex-direction: column; gap: 4px; }
        .playlist-title { font-size: 16px; font-weight: 600; color: #fff; }
        .playlist-check { color: var(--accent-color); display: none; width: 24px; height: 24px; }
        .playlist-item.active .playlist-check { display: block; }

        /* ====== НИЖНЯ ШТОРКА НАЛАШТУВАНЬ (ПОРТРЕТ) ====== */
        .options-sheet {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            max-height: 80%;
            background: var(--sheet-bg);
            border-radius: 20px 20px 0 0;
            z-index: 30;
            display: flex;
            flex-direction: column;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 -10px 30px rgba(0,0,0,0.9);
            overflow: hidden;
        }

        .options-sheet.open { transform: translateY(0); }

        .sheet-handle {
            width: 40px;
            height: 5px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
            margin: 12px auto 15px auto;
            flex-shrink: 0;
        }

        .sheet-view {
            display: none;
            flex-direction: column;
            padding: 0 0 20px 0;
            overflow-y: auto;
        }

        .sheet-view.active { display: flex; }

        .opt-item {
            display: flex;
            align-items: center;
            padding: 18px 25px;
            cursor: pointer;
            transition: background 0.2s;
            gap: 15px;
        }

        .opt-item:active { background: rgba(255, 255, 255, 0.1); }

        .opt-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            color: #fff;
            flex-shrink: 0;
        }

        .opt-icon svg { width: 100%; height: 100%; fill: currentColor; }

        .opt-label {
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            flex-grow: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .opt-value {
            font-size: 15px;
            font-weight: 500;
            color: var(--text-secondary);
            margin-right: 10px;
        }

        .opt-chevron {
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 20px;
            height: 20px;
        }

        .opt-chevron svg { width: 100%; height: 100%; fill: currentColor; }

        /* Підменю (Швидкість, Розмір) */
        .sub-view-header {
            display: flex;
            align-items: center;
            padding: 0 25px 15px 25px;
            font-size: 18px;
            font-weight: 700;
            color: #fff;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 10px;
        }
        
        .sub-view-header-back {
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            padding: 5px;
            margin-left: -5px;
        }

        .sub-option {
            padding: 15px 25px;
            font-size: 16px;
            font-weight: 600;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .sub-option:active { background: rgba(255, 255, 255, 0.1); }
        .sub-option.active { color: var(--accent-color); font-weight: 700; }
        .sub-option.active::after { content: '✓'; font-weight: bold; }

        /* ====== ПЕРЕМИКАЧІ (TOGGLES) ====== */
        .switch {
            position: relative;
            display: inline-block;
            width: 46px;
            height: 26px;
            flex-shrink: 0;
        }

        .switch input { opacity: 0; width: 0; height: 0; }

        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.2);
            transition: .3s;
            border-radius: 34px;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }

        input:checked + .slider {
            background-color: #ffffff;
        }

        input:checked + .slider:before {
            transform: translateX(20px);
            background-color: #000;
        }

        /* ====== ЕКРАН БЛОКУВАННЯ ====== */
        .lock-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            z-index: 100;
            display: none;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }

        .lock-overlay.active { display: flex; }

        .lock-icon-large {
            width: 80px;
            height: 80px;
            fill: #fff;
            opacity: 0.5;
            transition: opacity 0.2s;
        }

        .lock-overlay:hover .lock-icon-large { opacity: 1; }


        /* =================================================================
           АДАПТАЦІЯ ПІД ГОРИЗОНТАЛЬНУ ОРІЄНТАЦІЮ (LANDSCAPE)
           ================================================================= */
        @media (orientation: landscape) {
            .options-sheet {
                /* Робимо модальне вікно по центру */
                width: 60%;
                max-width: 550px;
                max-height: 85vh;
                left: 50%;
                top: 50%;
                bottom: auto;
                right: auto;
                border-radius: 20px;
                /* Початковий стан для анімації */
                transform: translate(-50%, -40%) scale(0.9);
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 10px 40px rgba(0,0,0,0.8);
                /* Додаємо фон, щоб відео не відволікало */
                backdrop-filter: blur(15px);
                -webkit-backdrop-filter: blur(15px);
                background: rgba(0, 0, 0, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .options-sheet.open {
                /* Кінцевий стан для анімації */
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
                visibility: visible;
            }

            /* Прибираємо смужку-хендл, бо це вже не шторка знизу */
            .sheet-handle {
                display: none;
            }

            .sheet-view {
                padding-top: 15px;
            }

            /* Зменшуємо відступи для економії місця */
            .opt-item {
                padding: 12px 25px;
            }

            .opt-label {
                font-size: 15px;
            }
            
            .sub-view-header {
                padding-top: 10px;
            }

            /* Fullscreen on iPhone/iPad landscape: controls stay inside the
               safe area and remain visible over bright video frames. */
            .top-bar {
                padding: max(10px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) 16px max(14px, env(safe-area-inset-left));
            }
            .back-btn { left: max(14px, env(safe-area-inset-left)); width: 42px; height: 42px; }
            .bottom-bar {
                padding: 10px max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
                gap: 8px;
            }
            .progress-block { padding: 9px 12px 7px; gap: 7px; border-radius: 12px; }
            .time-info { font-size: 12px; }
            .progress-container { height: 24px; }
            .progress-track { height: 6px; }
            .progress-thumb { width: 18px; height: 18px; right: -9px; }
            .controls { margin-top: 0; padding: 0 2px; }
            .control-btn { width: 40px; height: 40px; min-width: 40px; min-height: 40px; border-radius: 11px; }
            .control-btn svg { width: 21px; height: 21px; }
            .play-pause-btn { width: 48px; height: 48px; min-width: 48px; min-height: 48px; padding: 9px; }
            .play-pause-btn svg { width: 25px; height: 25px; }
            .controls-left, .controls-right { border-radius: 13px; padding: 3px; gap: 4px; }
            .next-episode-card { right: max(14px, env(safe-area-inset-right)); bottom: 142px; max-width: min(320px, calc(100% - 28px)); }
        }

    `;
const PLAYER_HTML = `

<div class="player-container" id="playerContainer">
<!-- ЕКРАН БЛОКУВАННЯ -->
    <div class="lock-overlay" id="lockOverlay">
        <svg class="lock-icon-large" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
    </div>

    <!-- ВЕРХНЯ ПАНЕЛЬ -->
    <div class="top-bar" id="topBar">
        <button class="back-btn" onclick="history.back()">
            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </button>
        <div class="logo-container">
            <div class="logo-text">ВАН <span>ПІС</span></div>
            <div class="season-info" id="seasonInfo">Сезон 1 • Серія 1</div>
        </div>
    </div>

    <!-- НИЖНЯ ПАНЕЛЬ -->
    <div class="bottom-bar" id="bottomBar">
        
        <div class="next-episode-card" id="nextEpisodeCard">
            <div style="position: relative;">
                <img src="" alt="Next" class="next-thumb" id="nextThumb">
                <div class="next-thumb-play">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
            </div>
            <div class="next-episode-text">
                <span class="next-label">НАСТУПНА СЕРІЯ</span>
                <span class="next-title" id="nextEpisodeTitle">Серія 2</span>
            </div>
        </div>

        <div class="progress-block">
            <div class="time-info">
                <span id="currentTime">00:00:00</span>
                <span id="durationTime">00:00:00 - Залишилось 0 х.</span>
            </div>
            <div class="progress-container" id="progressContainer">
                <div class="progress-track">
                    <div class="progress-fill" id="progressFill">
                        <div class="progress-thumb"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="controls">
            <div class="controls-left">
                <button class="control-btn" id="playlistBtn">
                    <svg viewBox="0 0 24 24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>
                </button>
                <button class="control-btn" id="nextBtn">
                    <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
            </div>
            
            <button class="play-pause-btn" id="playPauseBtn">
                <svg id="playIcon" viewBox="0 0 24 24" style="display: none;"><path d="M8 5v14l11-7z"/></svg>
                <svg id="pauseIcon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>

            <div class="controls-right">
                <button class="control-btn" id="optionsBtn">
                    <svg viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- БІЧНЕ МЕНЮ (Плейлист) -->
    <div class="side-menu" id="sideMenu">
        <div class="menu-header">Плейлист</div>
        <div class="playlist-container" id="playlistContainer"></div>
    </div>

    <!-- НИЖНЯ ШТОРКА / МОДАЛЬНЕ ВІКНО НАЛАШТУВАНЬ -->
    <div class="options-sheet" id="optionsSheet">
        <div class="sheet-handle"></div>

        <!-- ГОЛОВНЕ МЕНЮ НАЛАШТУВАНЬ -->
        <div class="sheet-view active" id="optionsMainView">
            
            <!-- Повторювати відео (Новий пункт) -->
            <div class="opt-item" id="loopMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                </div>
                <div class="opt-label">Повторювати відео</div>
                <label class="switch">
                    <input type="checkbox" id="loopToggle">
                    <span class="slider round"></span>
                </label>
            </div>

            <!-- Кінематографічне освітлення (Новий пункт) -->
            <div class="opt-item" id="cinematicMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M18 4v1h-2V4c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v1H6V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v16c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1h2v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>
                </div>
                <div class="opt-label">Кінематографічне освітлення</div>
                <label class="switch">
                    <input type="checkbox" id="cinematicToggle" checked>
                    <span class="slider round"></span>
                </label>
            </div>

            <!-- Стабілізувати гучність (Новий пункт) -->
            <div class="opt-item" id="volumeMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                </div>
                <div class="opt-label">Стабілізувати гучність</div>
                <label class="switch">
                    <input type="checkbox" id="volumeToggle">
                    <span class="slider round"></span>
                </label>
            </div>

            <!-- Таймер сну (Новий пункт) -->
            <div class="opt-item" id="sleepTimerMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
                </div>
                <div class="opt-label">Таймер сну</div>
                <div class="opt-value">Вимкнено</div>
                <div class="opt-chevron"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></div>
            </div>

            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 10px 25px;"></div>

            <!-- Якість -->
            <div class="opt-item" id="qualityMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>
                </div>
                <div class="opt-label">Якість</div>
                <div class="opt-value" id="currentQualityValue">Авто (1080p60)</div>
                <div class="opt-chevron"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></div>
            </div>

            <!-- Швидкість -->
            <div class="opt-item" id="speedMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M10 8v8l5-4-5-4zm9 4c0-3.87-3.13-7-7-7s-7 3.13-7 7 3.13 7 7 7 7-3.13 7-7zm-7 9c-4.96 0-9-4.04-9-9s4.04-9 9-9 9 4.04 9 9-4.04 9-9 9z"/></svg>
                </div>
                <div class="opt-label">Швидкість відтворення</div>
                <div class="opt-value" id="currentSpeedValue">Нормальна</div>
                <div class="opt-chevron"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></div>
            </div>

            <!-- Розмір відео -->
            <div class="opt-item" id="sizeMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v10H7V7z"/></svg>
                </div>
                <div class="opt-label">Розмір відео</div>
                <div class="opt-value" id="currentSizeValue">За замовчуванням</div>
                <div class="opt-chevron"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></div>
            </div>

            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 10px 25px;"></div>

            <!-- Довідка й відгуки -->
            <div class="opt-item" id="helpMenuItem">
                <div class="opt-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                </div>
                <div class="opt-label">Довідка й відгуки</div>
                <div class="opt-chevron"><svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg></div>
            </div>
        </div>

        <!-- ПІДМЕНЮ: ШВИДКІСТЬ -->
        <div class="sheet-view" id="speedView">
            <div class="sub-view-header">
                <div class="sub-view-header-back" id="backFromSpeed">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </div>
                Швидкість
            </div>
            <div class="sub-option" data-speed="0.5">0.5x</div>
            <div class="sub-option" data-speed="0.75">0.75x</div>
            <div class="sub-option active" data-speed="1">Нормальна (1x)</div>
            <div class="sub-option" data-speed="1.25">1.25x</div>
            <div class="sub-option" data-speed="1.5">1.5x</div>
            <div class="sub-option" data-speed="2">2x</div>
        </div>

        <!-- ПІДМЕНЮ: РОЗМІР ВІДЕО -->
        <div class="sheet-view" id="sizeView">
            <div class="sub-view-header">
                <div class="sub-view-header-back" id="backFromSize">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                </div>
                Розмір відео
            </div>
            <div class="sub-option active" data-size="default">За замовчуванням</div>
            <div class="sub-option" data-size="expand">Розширити</div>
            <div class="sub-option" data-size="fill">Заповнити</div>
        </div>

    </div>
</div>

`;

let styleInjected = false;
function ensureHostStyle() {
    if (styleInjected) return;
    styleInjected = true;
}
function fmtTime(value) {
    if (!Number.isFinite(value) || value < 0) return '00:00:00';
    const total = Math.floor(value);
    return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
const LOCK_SVG = '<svg class="lock-icon-large" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>';

export class VakdabFullscreenPlayer {
    constructor() { ensureHostStyle(); this.root = null; this.shadow = null; this.video = null; this.home = null; this.options = {}; this.cleanups = []; this.hideTimer = null; this.wasPlaying = false; this.sleepTimer = null; }
    q(selector) { return this.shadow?.querySelector(selector); }
    qa(selector) { return this.shadow ? Array.from(this.shadow.querySelectorAll(selector)) : []; }
    on(target, event, handler, opts) { target?.addEventListener(event, handler, opts); this.cleanups.push(() => target?.removeEventListener(event, handler, opts)); }

    open(video, options = {}) {
        if (!video) return;
        this.close(false);
        this.video = video; this.home = video.parentElement; this.options = options; this.wasPlaying = !video.paused;
        video.controls = false; video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', ''); video.setAttribute('controlslist', 'nodownload noplaybackrate nofullscreen');
        try { video.disablePictureInPicture = true; } catch (_) {}
        this.root = document.createElement('div'); this.root.id = 'vakdab-fullscreen-player';
        this.root.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#000;display:block;overflow:hidden;';
        this.shadow = this.root.attachShadow({mode:'open'});
        this.shadow.innerHTML = `<style>${PLAYER_CSS}</style>${PLAYER_HTML}`;
        document.body.appendChild(this.root);
        const container = this.q('#playerContainer');
        container.insertBefore(video, container.firstChild);
        this.q('#lockOverlay').insertAdjacentHTML('beforeend', LOCK_SVG);
        this.q('#seasonInfo').textContent = options.subtitle || options.title || '';
        this.bind(); this.renderPlaylist(); this.renderQuality(); this.sync(); this.showControls();
        if (this.wasPlaying) this.video.play().catch(() => {});
    }

    bind() {
        const v=this.video, root=this.shadow, q=s=>this.q(s);
        const toggle=()=>v.paused ? v.play().catch(()=>{}) : v.pause();
        const closeMenus=()=>{q('#sideMenu')?.classList.remove('open');q('#optionsSheet')?.classList.remove('open');};
        this.on(q('#playPauseBtn'),'click',e=>{e.stopPropagation();toggle();this.showControls();});
        this.on(q('#backBtn') || root.querySelector('.back-btn'),'click',e=>{e.stopPropagation();this.close();});
        this.on(q('#playlistBtn'),'click',e=>{e.stopPropagation();q('#optionsSheet').classList.remove('open');q('#sideMenu').classList.add('open');this.showControls(0);});
        this.on(q('#optionsBtn'),'click',e=>{e.stopPropagation();q('#sideMenu').classList.remove('open');q('#optionsSheet').classList.add('open');this.showControls(0);});
        this.on(q('#nextBtn'),'click',e=>{e.stopPropagation();this.options.onNext?.();});
        this.on(q('#nextEpisodeCard'),'click',e=>{e.stopPropagation();this.options.onNext?.();});
        this.on(v,'click',()=>{closeMenus();toggle();q('#topBar').classList.toggle('hidden');q('#bottomBar').classList.toggle('hidden');});
        this.on(v,'mousemove',()=>this.showControls()); this.on(v,'touchstart',()=>this.showControls(),{passive:true});
        ['play','pause','timeupdate','loadedmetadata','durationchange'].forEach(event=>this.on(v,event,()=>this.sync()));
        const progress=q('#progressContainer');
        const seek=x=>{if(!v.duration)return;const r=progress.getBoundingClientRect();v.currentTime=Math.max(0,Math.min(v.duration,((x-r.left)/r.width)*v.duration));this.sync();};
        this.on(progress,'click',e=>seek(e.clientX)); this.on(progress,'touchstart',e=>seek(e.touches[0].clientX),{passive:true});
        this.on(q('#speedMenuItem'),'click',()=>this.sheet(q('#speedView')));this.on(q('#backFromSpeed'),'click',()=>this.sheet(q('#optionsMainView')));
        this.qa('#speedView .sub-option').forEach(opt=>this.on(opt,'click',()=>{v.playbackRate=Number(opt.dataset.speed);q('#currentSpeedValue').textContent=Number(opt.dataset.speed)===1?'Нормальна':`${opt.dataset.speed}x`;this.sheet(q('#optionsMainView'));}));
        this.on(q('#sizeMenuItem'),'click',()=>this.sheet(q('#sizeView')));this.on(q('#backFromSize'),'click',()=>this.sheet(q('#optionsMainView')));
        this.qa('#sizeView .sub-option').forEach(opt=>this.on(opt,'click',()=>{v.style.objectFit=opt.dataset.size==='expand'?'cover':opt.dataset.size==='fill'?'fill':'contain';q('#currentSizeValue').textContent=opt.textContent;this.sheet(q('#optionsMainView'));}));
        this.on(q('#qualityMenuItem'),'click',()=>this.renderQuality(true));
        this.on(q('#loopToggle'),'change',e=>{v.loop=e.target.checked;});
        this.on(q('#cinematicToggle'),'change',e=>{v.style.filter=e.target.checked?'brightness(.8) contrast(1.2)':'none';});
        this.on(q('#volumeToggle'),'change',e=>{v.volume=e.target.checked?.8:1;});
        this.on(q('#sleepTimerMenuItem'),'click',()=>this.sleep());
        this.on(q('#helpMenuItem'),'click',()=>this.options.onHelp?.());
        this.on(q('#lockScreenMenuItem'),'click',()=>{v.pause();q('#optionsSheet').classList.remove('open');q('#lockOverlay').classList.add('active');});
        this.on(q('#lockOverlay'),'click',()=>q('#lockOverlay').classList.remove('active'));
        this.on(document,'keydown',e=>{if(!this.root)return;if(e.key==='Escape')this.close();if(e.code==='Space'){e.preventDefault();toggle();}});
    }
    sheet(view){this.qa('.sheet-view').forEach(x=>x.classList.remove('active'));view?.classList.add('active');}
    sleep(){clearTimeout(this.sleepTimer);const values=[0,15,30,60];const current=Number(this.q('#sleepTimerMenuItem .opt-value')?.dataset.minutes||0);const next=values[(values.indexOf(current)+1)%values.length];const label=next===0?'Вимкнено':next<60?`${next} хвилин`:'1 година';const value=this.q('#sleepTimerMenuItem .opt-value');if(value){value.textContent=label;value.dataset.minutes=String(next);}if(next)this.sleepTimer=setTimeout(()=>this.video?.pause(),next*60000);}
    renderPlaylist(){const box=this.q('#playlistContainer');if(!box)return;const eps=this.options.episodes||[];box.innerHTML='';eps.forEach((ep,i)=>{const item=document.createElement('div');item.className=`playlist-item${ep.active?' active':''}`;item.innerHTML=`<img src="${this.options.poster||''}" alt="${ep.label}" class="playlist-thumb"><div class="playlist-info"><span class="playlist-title">${ep.label}</span></div><div class="playlist-check"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>`;this.on(item,'click',()=>{this.close();this.options.onSelectEpisode?.(i);});box.appendChild(item);});const active=eps.findIndex(e=>e.active),next=eps[active+1],card=this.q('#nextEpisodeCard');if(next){card.style.display='flex';this.q('#nextEpisodeTitle').textContent=next.label;}else card.style.display='none';}
    renderQuality(open=false){
        const levels=[{index:-1,label:'Авто'},...(this.options.getQualities?.()||[])];
        const item=this.q('#qualityMenuItem .opt-value');
        const current=this.options.getCurrentQuality?.() ?? -1;
        const currentItem=levels.find(x=>x.index===current)||levels[0];
        if(item)item.textContent=currentItem.label;
        if(!open)return;
        const nextIndex=(levels.findIndex(x=>x.index===current)+1)%levels.length;
        const next=levels[nextIndex]||levels[0];
        this.options.setQuality?.(next.index);
        if(item)item.textContent=next.label;
    }
    sync(){if(!this.root||!this.video)return;const v=this.video,d=Number.isFinite(v.duration)?v.duration:0,c=Number.isFinite(v.currentTime)?v.currentTime:0;const fill=this.q('#progressFill');if(fill)fill.style.width=`${d?c/d*100:0}%`;const now=this.q('#currentTime');if(now)now.textContent=fmtTime(c);const dur=this.q('#durationTime');if(dur)dur.textContent=d?`${fmtTime(d)} - Залишилось ${fmtTime(Math.max(0,d-c))}`:'00:00:00';const play=this.q('#playIcon'),pause=this.q('#pauseIcon');if(play&&pause){play.style.display=v.paused?'block':'none';pause.style.display=v.paused?'none':'block';}}
    showControls(ms=3500){if(!this.root)return;this.q('#topBar')?.classList.remove('hidden');this.q('#bottomBar')?.classList.remove('hidden');clearTimeout(this.hideTimer);if(ms>0)this.hideTimer=setTimeout(()=>{if(this.video&&!this.video.paused&&!this.q('#sideMenu')?.classList.contains('open')&&!this.q('#optionsSheet')?.classList.contains('open')){this.q('#topBar')?.classList.add('hidden');this.q('#bottomBar')?.classList.add('hidden');}},ms);}
    exitFullscreen(){this.close();}
    _exitNativeVideoFullscreen(){
        const v=this.video;
        try { if(v?.webkitDisplayingFullscreen && typeof v.webkitExitFullscreen === 'function') v.webkitExitFullscreen(); } catch (_) {}
        try { if(document.fullscreenElement && typeof document.exitFullscreen === 'function') document.exitFullscreen(); } catch (_) {}
    }
    close(restore=true){
        clearTimeout(this.hideTimer); clearTimeout(this.sleepTimer);
        if(!this.root)return;
        const v=this.video;
        // iOS can keep AVPlayer alive after pause. Exit WebKit fullscreen before reparenting.
        this._exitNativeVideoFullscreen();
        this.cleanups.splice(0).forEach(fn=>fn());
        if(v&&restore){
            v.pause(); v.controls=false; v.style.filter='';
            if(this.home&&!this.home.contains(v))this.home.appendChild(v);
            if(this.wasPlaying)v.play().catch(()=>{});
        }
        this.root.remove(); this.root=null; this.shadow=null; this.video=null; this.home=null; this.options={};
    }
}
