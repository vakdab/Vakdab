import {
    ACHIEVEMENTS, Auth, DailyStats, Router, Storage, applyThemeVariant,
    buildEffectOverlayHtml, calcTotalXP, detectDeviceInfo, editExistingProfileImage,
    editExistingProfileVideo, escapeHtml, getLevel, isGifUrl, isVideoUrl,
    profileMediaMarkup, renderProfilePage, renderStickerFaceByKey, showToast,
    syncLeftdockActive, toggleTheme
} from '../../legacy/app-legacy.js?v=20260820-hikka-proxy-fix2';

        let settingsState = { tab: 'profile', previewOpen: true };

        const PROFILE_EFFECTS = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'rain', label: 'Дощ', icon: 'fa-cloud-rain' },
            { id: 'snow', label: 'Сніг', icon: 'fa-snowflake' },
            { id: 'sparks', label: 'Іскри', icon: 'fa-star' },
            { id: 'hearts', label: 'Серця', icon: 'fa-heart' },
            { id: 'bubbles', label: 'Бульбашки', icon: 'fa-circle' }
        ];
        const PROFILE_ATMOSPHERES = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'night', label: 'Ніч', icon: 'fa-moon' },
            { id: 'light', label: 'Світло', icon: 'fa-lightbulb' },
            { id: 'fog', label: 'Туман', icon: 'fa-smog' },
            { id: 'aurora', label: 'Північне сяйво', icon: 'fa-wand-magic-sparkles' },
            { id: 'sunset', label: 'Захід сонця', icon: 'fa-sun' }
        ];
        const AVATAR_DECORATIONS = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'glow', label: 'Сяйво', icon: 'fa-certificate' },
            { id: 'double', label: 'Подвійне кільце', icon: 'fa-circle-notch' },
            { id: 'dashed', label: 'Пунктир', icon: 'fa-dot-circle' },
            { id: 'halo', label: 'Гало', icon: 'fa-sun' },
            { id: 'diamond', label: 'Діамант', icon: 'fa-gem' }
        ];
        const TAB_STYLE_OPTIONS = [
            { id: 'none', label: 'Немає', icon: 'fa-ban' },
            { id: 'underline', label: 'Підкреслення', icon: 'fa-minus' },
            { id: 'pills', label: 'Пігулки', icon: 'fa-capsules' },
            { id: 'neon', label: 'Неон', icon: 'fa-bolt' },
            { id: 'glass', label: 'Скло', icon: 'fa-gem' }
        ];
        const BANNER_EFFECTS = [
            { id: 'none', label: 'Оригінал', icon: 'fa-image' },
            { id: 'grayscale', label: 'Чорно-біле', icon: 'fa-circle-half-stroke' },
            { id: 'contrast', label: 'Контраст', icon: 'fa-bolt' },
            { id: 'muted', label: 'Приглушені', icon: 'fa-cloud' },
            { id: 'sepia', label: 'Сепія', icon: 'fa-sun' },
            { id: 'invert', label: 'Інверсія', icon: 'fa-circle-notch' },
            { id: 'blur', label: 'Розмиття', icon: 'fa-water' },
            { id: 'grain', label: 'Гранж', icon: 'fa-braille' },
            { id: 'fog', label: 'Дим', icon: 'fa-smog' }
        ];
        const THEME_VARIANTS = [
            { id: 'none', label: 'Немає', color: 'transparent' },
            { id: 'default', label: 'Чорний', color: '#0b0b0b' },
            { id: 'graphite', label: 'Графіт', color: '#4a4a4a' },
            { id: 'white', label: 'Білий', color: '#ffffff' },
            { id: 'lavender', label: 'Лавандовий', color: '#8d5bd1' },
            { id: 'ocean', label: 'Океан', color: '#277fa8' }
        ];

        function buildOptionGridHtml(groupName, options, current) {
            return '<div class="settings-option-grid">' +
                options.map(o => `
                  <button class="settings-option-item${o.id === current ? ' active' : ''}" data-group="${groupName}" data-value="${o.id}">
                    <i class="fas ${o.icon}"></i><span>${o.label}</span>
                  </button>`).join('') +
                '</div>';
        }

        function buildThemeSwatchesHtml(current) {
            return '<div class="settings-swatch-row">' +
                THEME_VARIANTS.map(v => `
                  <div class="settings-swatch${v.id === current ? ' active' : ''}" data-group="themeVariant" data-value="${v.id}">
                    <span class="settings-swatch-check"><i class="fas fa-check-circle"></i></span>
                    <span class="settings-swatch-dot" style="background:${v.color};"></span>
                    <span class="settings-swatch-bar" style="background:${v.color};"></span>
                    <span class="settings-swatch-label">${v.label}</span>
                  </div>`).join('') +
                '</div>';
        }

        function renderSettingsPreviewPanel(profile) {
            const panel = document.getElementById('settingsPreviewPanel');
            if (!panel) return;
            const bannerEffectClass = (profile.bannerEffect && profile.bannerEffect !== 'none') ? ` banner-effect-${profile.bannerEffect}` : '';
            const decorationClass = (profile.avatarDecoration && profile.avatarDecoration !== 'none') ? ` avatar-decoration-${profile.avatarDecoration}` : '';
            const stickerData = Storage.getStickers();
            const nickBadge = stickerData.nickBadge ? `<span class="settings-preview-nick-badge">${renderStickerFaceByKey(stickerData, stickerData.nickBadge)}</span>` : '';
            const avatarMarkup = profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, '', 'video avatar', profile.avatarVideoSettings) : (profile.avatar ? profileMediaMarkup(profile.avatar, '', 'avatar') : `<span class="settings-preview-avatar-fallback">${escapeHtml((profile.nickname || 'К').charAt(0).toUpperCase())}</span>`);
            panel.innerHTML = `
              <div class="settings-preview-profile">
                <div class="profile-banner settings-preview-banner${bannerEffectClass}">
                  ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, 'preview-banner-img', 'video banner', profile.bannerVideoSettings) : (profile.banner ? profileMediaMarkup(profile.banner, 'preview-banner-img', 'banner') : '')}
                  ${profile.atmosphere && profile.atmosphere !== 'none' ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ''}
                  ${profile.effect && profile.effect !== 'none' ? buildEffectOverlayHtml(profile.effect) : ''}
                  <div class="profile-banner-overlay"></div>
                </div>
                <div class="settings-preview-info">
                  <div class="settings-preview-avatar-wrap${decorationClass}"><div class="profile-avatar">${avatarMarkup}</div></div>
                  <div class="settings-preview-nick-row"><strong>${escapeHtml(profile.nickname || 'Користувач')}</strong>${nickBadge}</div>
                  <div class="settings-preview-handle">@${escapeHtml((profile.nickname || 'user').toLowerCase().replace(/\s/g, '_'))}</div>
                  <div class="settings-preview-bio${profile.bioBold ? ' is-bold' : ''}">${escapeHtml(profile.bio || 'Опис профілю не додано')}</div>
                  <button type="button" class="settings-preview-bio-btn"><i class="fas fa-align-left"></i> Опис профілю</button>
                  <div class="settings-preview-tabs profile-tabs profile-tabs--${profile.tabStyle || 'underline'}"><span class="profile-tab active">Профіль</span><span class="profile-tab">Статистика</span><span class="profile-tab">Досягнення</span></div>
                </div>
              </div>
            `;
        }

        function buildProfileTabHtml(profile, isDark) {
            return `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-lock"></i>
                <div>
                  <div class="label">Приватність</div>
                  <div class="desc">Приховати статистику та історію переглядів від інших</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsPrivacyToggle" ${profile.private ? 'checked' : ''}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>

            <div class="settings-section-title">Основне</div>
            <div class="settings-hint-text">Зміни зберігаються автоматично.</div>
            <div class="settings-field">
              <label class="settings-field-label">Нікнейм</label>
              <input type="text" id="settingsNicknameInput" maxlength="24" value="${escapeHtml(profile.nickname)}">
              <span class="settings-field-hint" id="settingsNicknameCount">${profile.nickname.length}/24</span>
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Ім'я</label>
              <input type="text" id="settingsRealNameInput" maxlength="40" placeholder="Необов'язково" value="${escapeHtml(profile.realName || '')}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">Дата народження</label>
              <div class="settings-date-row">
                <input type="date" id="settingsBirthdateInput" value="${profile.birthdate || ''}">
                <button class="settings-date-clear" id="settingsBirthdateClear" title="Очистити"><i class="fas fa-times"></i></button>
              </div>
            </div>
            <div class="settings-card settings-card--nested">
              <div class="settings-card-left">
                <i class="fas fa-birthday-cake"></i>
                <div>
                  <div class="label">Показувати день народження</div>
                  <div class="desc">День і місяць (без року). Інші зможуть привітати.</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsShowBirthdayToggle" ${profile.showBirthdate ? 'checked' : ''}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>
          `;
        }

        function buildSecurityTabHtml() {
            const authed = Auth.isAuthenticated();
            const guest = Auth.isGuest();
            const user = Auth.getUser();
            const provider = Auth.providerLabel();
            const email = authed && user?.email ? user.email : (guest ? 'Гостьовий режим — дані лише на цьому пристрої' : 'Ви не увійшли');
            const device = detectDeviceInfo(navigator.userAgent);
            const lastLogin = authed && user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString('uk-UA') : '—';
            const canResetPassword = authed && Auth.hasPasswordProvider();

            return `
            <div class="settings-card" style="opacity:${authed || guest ? 1 : 0.6};pointer-events:${authed || guest ? 'auto' : 'none'};">
              <div class="settings-card-left">
                <i class="fas fa-id-badge"></i>
                <div>
                  <div class="label">${email}</div>
                  <div class="desc">Спосіб входу: ${provider}</div>
                </div>
              </div>
            </div>

            ${canResetPassword ? `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-key"></i>
                <div>
                  <div class="label">Пароль</div>
                  <div class="desc">Надіслати лист для зміни пароля на ${escapeHtml(user.email)}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsResetPasswordBtn"><i class="fas fa-envelope"></i> Надіслати</button>
            </div>` : ''}

            <div class="settings-section-title">Цей пристрій</div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-desktop"></i>
                <div>
                  <div class="label">${device.type}${device.osVersion ? ' · ' + device.osVersion : ''}</div>
                  <div class="desc">Останній вхід: ${lastLogin}</div>
                </div>
              </div>
            </div>

            ${authed || guest ? `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-right-from-bracket"></i>
                <div>
                  <div class="label">Вийти з акаунту</div>
                  <div class="desc">${guest ? 'Завершити гостьовий сеанс' : 'Дані буде синхронізовано перед виходом'}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsLogoutBtn"><i class="fas fa-right-from-bracket"></i> Вийти</button>
            </div>` : ''}

            ${authed && !guest ? `
            <div class="settings-section-title">Небезпечна зона</div>
            <div class="settings-card settings-card--danger">
              <div class="settings-card-left">
                <i class="fas fa-triangle-exclamation"></i>
                <div>
                  <div class="label">Видалити акаунт</div>
                  <div class="desc">Незворотньо видаляє акаунт і всі дані з сервера</div>
                </div>
              </div>
              <button class="settings-toggle-btn settings-toggle-btn--danger" id="settingsDeleteAccountBtn"><i class="fas fa-trash"></i> Видалити</button>
            </div>` : ''}
          `;
        }

        function buildSiteTabHtml(isDark) {
            const nextIcon = isDark ? 'fa-sun' : 'fa-moon';
            const nextLabel = isDark ? 'Світла тема' : 'Темна тема';
            const history = Storage.getHistory();
            const bookmarks = Storage.getBookmarks();
            return `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-circle-half-stroke"></i>
                <div>
                  <div class="label">Тема інтерфейсу</div>
                  <div class="desc">${isDark ? 'Темна тема' : 'Світла тема'} — ${isDark ? 'нічний режим' : 'денний режим'}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsThemeBtn">
                <i class="fas ${nextIcon}"></i> ${nextLabel}
              </button>
            </div>

            <div class="settings-section-title">Дані</div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-download"></i>
                <div>
                  <div class="label">Експортувати мої дані</div>
                  <div class="desc">Профіль, історія (${history.length}) і закладки (${bookmarks.length}) у файл JSON</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsExportDataBtn"><i class="fas fa-file-arrow-down"></i> Завантажити</button>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-clock-rotate-left"></i>
                <div>
                  <div class="label">Очистити історію переглядів</div>
                  <div class="desc">${history.length} записів буде видалено</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsClearHistoryBtn"><i class="fas fa-broom"></i> Очистити</button>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-bookmark"></i>
                <div>
                  <div class="label">Очистити закладки</div>
                  <div class="desc">${bookmarks.length} тайтлів буде видалено зі списку</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsClearBookmarksBtn"><i class="fas fa-broom"></i> Очистити</button>
            </div>

            <div class="settings-section-title">Про сайт</div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-globe"></i>
                <div>
                  <div class="label">Джерело даних</div>
                  <div class="desc">hikka.io + mikai.me</div>
                </div>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-check"></i></span>
            </div>
            <div class="settings-card" style="opacity:0.6;pointer-events:none;">
              <div class="settings-card-left">
                <i class="fas fa-language"></i>
                <div>
                  <div class="label">Мова інтерфейсу</div>
                  <div class="desc">Українська (завжди)</div>
                </div>
              </div>
              <span style="font-size:0.75rem;color:var(--text-muted);"><i class="fas fa-flag"></i></span>
            </div>
          `;
        }

        function buildBannerFilterStripHtml(profile) {
            const src = profile.bannerVideo || profile.banner || '';
            const current = profile.bannerEffect || 'none';
            return '<div class="banner-filter-strip">' + BANNER_EFFECTS.map(o => `
                <button class="banner-filter-chip${o.id === current ? ' active' : ''}" data-group="bannerEffect" data-value="${o.id}">
                  <span class="banner-filter-thumb banner-filter-thumb--${o.id}">${src ? (isVideoUrl(src) ? `<video src="${escapeHtml(src)}" muted loop autoplay playsinline></video>` : `<img src="${escapeHtml(src)}" alt="${o.label}">`) : ''}</span>
                  <span class="banner-filter-label">${o.label}</span>
                </button>`).join('') + '</div>';
        }

        function buildStickerSummaryHtml() {
            const s = Storage.getStickers();
            return `
            <div class="settings-sticker-summary">
              <div class="settings-sticker-summary-row">
                <span class="settings-sticker-summary-label">Наліпка біля ніку</span>
                ${s.nickBadge !== null ? `<span class="settings-sticker-mini">${renderStickerFaceByKey(s, s.nickBadge)}</span>` : `<span class="settings-sticker-summary-empty">Не встановлено</span>`}
              </div>
              <button class="settings-media-btn" id="settingsOpenStickersBtn" style="margin-top:0.9rem;width:100%;justify-content:center;">
                <i class="fas fa-icons"></i> Керувати наліпкою біля ніку
              </button>
            </div>`;
        }

        function buildAppearanceTabHtml(profile) {
            const bannerSrc = profile.banner || '';
            const bannerVideoSrc = profile.bannerVideo || '';
            const avatarSrc = profile.avatar || '';
            const avatarVideoSrc = profile.avatarVideo || '';
            return `
            <div class="appearance-intro">
              <div class="appearance-intro-icon"><i class="fas fa-palette"></i></div>
              <div><h3>Налаштуйте свій профіль</h3><p>Змініть банер, аватар, кольори та ефекти. Усі зміни зберігаються автоматично.</p></div>
            </div>
            <div class="appearance-section-card">
            <div class="settings-section-title">Опис профілю</div>
            <div class="settings-field">
              <textarea id="settingsBioInput" maxlength="160" rows="3">${escapeHtml(profile.bio || '')}</textarea>
                <div class="settings-bio-tools">
                  <button type="button" class="settings-bio-bold-btn${profile.bioBold ? ' active' : ''}" id="settingsBioBoldBtn" aria-pressed="${profile.bioBold ? 'true' : 'false'}"><i class="fas fa-bold"></i> Жирний текст</button>
                  <span class="settings-bio-tool-hint">Перемикає жирний опис у профілі та прев’ю.</span>
                </div>
                <span class="settings-field-hint">До 160 символів. Зміни зберігаються автоматично.</span>
              </div>

            <div class="appearance-media-grid">
            <div class="appearance-media-block">
            <div class="settings-section-title">Банер</div>
            <div class="settings-media-card settings-media-card--banner">
              <div class="settings-media-preview--banner" id="settingsBannerPreview">
                ${bannerVideoSrc ? profileMediaMarkup(bannerVideoSrc, '', 'video banner', profile.bannerVideoSettings) : (bannerSrc ? profileMediaMarkup(bannerSrc, '', 'banner') : '')}
              </div>
              <div class="settings-media-actions" aria-label="Керування банером">
                <button class="settings-media-btn" id="settingsBannerUploadBtn"><i class="fas fa-camera"></i> Змінити</button>
                ${bannerVideoSrc ? `<button class="settings-media-btn settings-media-edit-video" id="settingsBannerEditVideoBtn"><i class="fas fa-sliders"></i> Редагувати відео</button>` : (bannerSrc && !isGifUrl(bannerSrc) ? `<button class="settings-media-btn settings-media-edit-image" id="settingsBannerEditImageBtn"><i class="fas fa-crop-simple"></i> Редагувати банер</button>` : '')}
                ${(bannerSrc || bannerVideoSrc) ? `<button class="settings-media-delete" id="settingsBannerRemoveBtn" title="Видалити банер"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>
            <div class="settings-hint-text">JPG, PNG, WebP, GIF, MP4, WebM, MOV · відео до 50 МБ</div>
            </div>
            <div class="appearance-media-block">
            <div class="settings-section-title">Аватар</div>
            <div class="settings-media-card settings-media-card--avatar">
              <div class="settings-media-preview--avatar" id="settingsAvatarPreview">${avatarVideoSrc ? profileMediaMarkup(avatarVideoSrc, '', 'video avatar', profile.avatarVideoSettings) : (avatarSrc ? profileMediaMarkup(avatarSrc, '', 'avatar') : '<i class="fas fa-user"></i>')}</div>
              <div class="settings-media-actions">
                <button class="settings-media-btn" id="settingsAvatarUploadBtn"><i class="fas fa-camera"></i> Змінити</button>
                ${avatarVideoSrc ? `<button class="settings-media-btn settings-media-edit-video" id="settingsAvatarEditVideoBtn"><i class="fas fa-sliders"></i> Редагувати відео</button>` : (avatarSrc && !isGifUrl(avatarSrc) ? `<button class="settings-media-btn settings-media-edit-image" id="settingsAvatarEditImageBtn"><i class="fas fa-crop-simple"></i> Редагувати аватарку</button>` : '')}
                ${(avatarSrc || avatarVideoSrc) ? `<button class="settings-media-delete" id="settingsAvatarRemoveBtn" title="Видалити аватар"><i class="fas fa-trash"></i></button>` : ''}
              </div>
            </div>
            <div class="settings-hint-text">JPG, PNG, WebP, GIF, MP4, WebM, MOV · відео до 50 МБ</div>
            </div>
            </div>
            </div>

            <div class="appearance-section-card appearance-preview-card">
            <button class="settings-preview-toggle-btn" id="settingsPreviewToggleBtn">
              <i class="fas fa-eye${settingsState.previewOpen ? '-slash' : ''}"></i> ${settingsState.previewOpen ? "Сховати прев'ю" : "Прев'ю"}
            </button>
            <div class="settings-preview-panel" id="settingsPreviewPanel" style="display:${settingsState.previewOpen ? 'block' : 'none'};"></div>
            </div>

            <div class="appearance-section-card">
            <div class="settings-section-title">Наліпка біля ніку</div>
            ${buildStickerSummaryHtml()}

            <div class="settings-section-title">Фільтр банера</div>
            <div class="settings-hint-text" style="margin-top:-0.5rem;">Свій колір, чорно-біле чи будь-який інший стиль — оберіть, як показувати ваш банер.</div>
            ${buildBannerFilterStripHtml(profile)}

            <div class="settings-section-title">Ефекти профілю</div>
            ${buildOptionGridHtml('effect', PROFILE_EFFECTS, profile.effect)}

            <div class="settings-section-title">Атмосфера профілю</div>
            ${buildOptionGridHtml('atmosphere', PROFILE_ATMOSPHERES, profile.atmosphere)}

            <div class="settings-section-title">Декорація аватара</div>
            ${buildOptionGridHtml('avatarDecoration', AVATAR_DECORATIONS, profile.avatarDecoration)}

            <div class="settings-section-title">Колір теми</div>
            ${buildThemeSwatchesHtml(profile.themeVariant)}

            <div class="settings-section-title">Стиль табів</div>
            ${buildOptionGridHtml('tabStyle', TAB_STYLE_OPTIONS, profile.tabStyle)}
            </div>
          `;
        }

        function wireProfileTab() {
            const privacyToggle = document.getElementById('settingsPrivacyToggle');
            if (privacyToggle) privacyToggle.addEventListener('change', () => {
                const p = getProfile();
                p.private = privacyToggle.checked;
                saveProfile(p);
                showToast(privacyToggle.checked ? 'Профіль приховано' : 'Профіль відкрито');
            });

            const nickInput = document.getElementById('settingsNicknameInput');
            const nickCount = document.getElementById('settingsNicknameCount');
            if (nickInput) {
                nickInput.addEventListener('input', () => {
                    if (nickCount) nickCount.textContent = `${nickInput.value.length}/24`;
                });
                nickInput.addEventListener('change', () => {
                    const val = nickInput.value.trim();
                    const p = getProfile();
                    if (!val) { nickInput.value = p.nickname; return; }
                    p.nickname = val;
                    saveProfile(p);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                });
            }

            const nameInput = document.getElementById('settingsRealNameInput');
            if (nameInput) nameInput.addEventListener('change', () => {
                const p = getProfile();
                p.realName = nameInput.value.trim();
                saveProfile(p);
            });

            const birthInput = document.getElementById('settingsBirthdateInput');
            const birthClear = document.getElementById('settingsBirthdateClear');
            if (birthInput) birthInput.addEventListener('change', () => {
                const p = getProfile();
                p.birthdate = birthInput.value;
                saveProfile(p);
            });
            if (birthClear) birthClear.addEventListener('click', () => {
                if (birthInput) birthInput.value = '';
                const p = getProfile();
                p.birthdate = '';
                saveProfile(p);
            });

            const birthdayToggle = document.getElementById('settingsShowBirthdayToggle');
            if (birthdayToggle) birthdayToggle.addEventListener('change', () => {
                const p = getProfile();
                p.showBirthdate = birthdayToggle.checked;
                saveProfile(p);
            });
        }

        function wireSecurityTab() {
            document.getElementById('settingsResetPasswordBtn')?.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                btn.disabled = true;
                const res = await Auth.sendPasswordReset();
                btn.disabled = false;
                showToast(res.success ? 'Лист надіслано на вашу пошту' : 'Помилка: ' + res.error);
            });

            document.getElementById('settingsLogoutBtn')?.addEventListener('click', () => {
                if (!confirm('Вийти з акаунту?')) return;
                Auth.handleExit();
            });

            document.getElementById('settingsDeleteAccountBtn')?.addEventListener('click', async () => {
                if (!confirm('Ви дійсно хочете видалити акаунт? Усі дані на сервері буде втрачено назавжди.')) return;
                const typed = prompt('Для підтвердження введіть слово ВИДАЛИТИ великими літерами:');
                if (typed !== 'ВИДАЛИТИ') { showToast('Скасовано'); return; }
                showToast('Видалення акаунту...');
                const res = await Auth.deleteAccount();
                if (res.success) {
                    showToast('Акаунт видалено');
                    Router.showProfile();
                } else if (res.error === 'requires-recent-login') {
                    showToast('З міркувань безпеки увійдіть ще раз і повторіть видалення');
                } else {
                    showToast('Помилка: ' + res.error);
                }
            });
        }

        function wireSiteTab() {
            const themeBtn = document.getElementById('settingsThemeBtn');
            if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

            document.getElementById('settingsExportDataBtn')?.addEventListener('click', () => {
                const data = {
                    exportedAt: new Date().toISOString(),
                    profile: getProfile(),
                    history: Storage.getHistory(),
                    bookmarks: Storage.getBookmarks(),
                    likes: Storage.getLikes(),
                    watchTimeSeconds: Storage.getWatchTime()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'monoanime-data-' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                showToast('Дані завантажено');
            });

            document.getElementById('settingsClearHistoryBtn')?.addEventListener('click', () => {
                if (!confirm('Очистити всю історію переглядів? Це незворотньо.')) return;
                Storage.setHistory([]);
                if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                showToast('Історію очищено');
                renderSettingsPage();
            });

            document.getElementById('settingsClearBookmarksBtn')?.addEventListener('click', () => {
                if (!confirm('Очистити всі закладки?')) return;
                Storage.setBookmarks([]);
                if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {});
                showToast('Закладки очищено');
                renderSettingsPage();
            });
        }

        function wireAppearanceTab(profile) {
            const bioInput = document.getElementById('settingsBioInput');
            if (bioInput) bioInput.addEventListener('change', () => {
                const p = getProfile();
                p.bio = bioInput.value.trim() || p.bio;
                saveProfile(p);
                if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
                if (Router.currentRoute === 'profile') renderProfilePage();
            });
            document.getElementById('settingsBioBoldBtn')?.addEventListener('click', () => {
                const p = getProfile();
                p.bioBold = !p.bioBold;
                saveProfile(p);
                const btn = document.getElementById('settingsBioBoldBtn');
                if (btn) {
                    btn.classList.toggle('active', p.bioBold);
                    btn.setAttribute('aria-pressed', p.bioBold ? 'true' : 'false');
                }
                if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
                if (Router.currentRoute === 'profile') renderProfilePage();
                showToast(p.bioBold ? 'Жирний опис увімкнено' : 'Жирний опис вимкнено');
            });

            document.getElementById('settingsBannerUploadBtn')?.addEventListener('click', () => {
                document.getElementById('bannerFileInput').click();
            });
            document.getElementById('settingsAvatarUploadBtn')?.addEventListener('click', () => {
                document.getElementById('avatarFileInput').click();
            });
            document.getElementById('settingsBannerEditVideoBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileVideo(p.bannerVideo, 'banner');
            });
            document.getElementById('settingsAvatarEditVideoBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileVideo(p.avatarVideo, 'avatar');
            });
            document.getElementById('settingsBannerEditImageBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileImage(p.banner, 'banner');
            });
            document.getElementById('settingsAvatarEditImageBtn')?.addEventListener('click', () => {
                const p = getProfile();
                editExistingProfileImage(p.avatar, 'avatar');
            });
            document.getElementById('settingsBannerRemoveBtn')?.addEventListener('click', () => {
                if (!confirm('Видалити банер?')) return;
                const p = getProfile();
                p.banner = '';
                p.bannerVideo = '';
                p.bannerVideoSettings = null;
                saveProfile(p);
                showToast('Банер видалено');
                renderSettingsPage();
                if (Router.currentRoute === 'profile') renderProfilePage();
            });
            document.getElementById('settingsAvatarRemoveBtn')?.addEventListener('click', () => {
                if (!confirm('Видалити аватар?')) return;
                const p = getProfile();
                p.avatar = '';
                p.avatarVideo = '';
                p.avatarVideoSettings = null;
                saveProfile(p);
                showToast('Аватарку видалено');
                renderSettingsPage();
                if (Router.currentRoute === 'profile') renderProfilePage();
            });

            document.getElementById('settingsOpenStickersBtn')?.addEventListener('click', () => {
                Router.goTo('stickers');
            });

            const previewBtn = document.getElementById('settingsPreviewToggleBtn');
            if (previewBtn) previewBtn.addEventListener('click', () => {
                settingsState.previewOpen = !settingsState.previewOpen;
                const panel = document.getElementById('settingsPreviewPanel');
                if (panel) panel.style.display = settingsState.previewOpen ? 'block' : 'none';
                previewBtn.innerHTML =
                    `<i class="fas fa-eye${settingsState.previewOpen ? '-slash' : ''}"></i> ${settingsState.previewOpen ? "Сховати прев'ю" : "Прев'ю"}`;
                if (settingsState.previewOpen) renderSettingsPreviewPanel(getProfile());
            });
            if (settingsState.previewOpen) renderSettingsPreviewPanel(profile);

            document.querySelectorAll('.settings-option-item, .banner-filter-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    const group = btn.dataset.group;
                    const value = btn.dataset.value;
                    const p = getProfile();
                    p[group] = value;
                    saveProfile(p);
                    document.querySelectorAll(`.settings-option-item[data-group="${group}"]`).forEach(b => b
                        .classList.toggle('active', b.dataset.value === value));
                    document.querySelectorAll(`.banner-filter-chip[data-group="${group}"]`).forEach(b => b
                        .classList.toggle('active', b.dataset.value === value));
                    if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
                    if (Router.currentRoute === 'profile') renderProfilePage();
                });
            });

            document.querySelectorAll('.settings-swatch[data-group="themeVariant"]').forEach(sw => {
                sw.addEventListener('click', () => {
                    const value = sw.dataset.value;
                    const p = getProfile();
                    p.themeVariant = value;
                    saveProfile(p);
                    applyThemeVariant(p);
                    document.querySelectorAll('.settings-swatch[data-group="themeVariant"]').forEach(s => s
                        .classList.toggle('active', s.dataset.value === value));
                });
            });
        }

        const SETTINGS_TABS = [
            { id: 'profile', label: 'Профіль', icon: 'fa-user' },
            { id: 'appearance', label: 'Вигляд', icon: 'fa-palette' },
            { id: 'security', label: 'Безпека', icon: 'fa-shield-halved' },
            { id: 'site', label: 'Сайт', icon: 'fa-sliders' }
        ];

        function buildSettingsTabContent(tab, profile, isDark) {
            if (tab === 'appearance') return buildAppearanceTabHtml(profile);
            if (tab === 'security') return buildSecurityTabHtml();
            if (tab === 'site') return buildSiteTabHtml(isDark);
            return buildProfileTabHtml(profile, isDark);
        }

        function wireSettingsTab(tab, profile) {
            if (tab === 'appearance') wireAppearanceTab(profile);
            else if (tab === 'security') wireSecurityTab();
            else if (tab === 'site') wireSiteTab();
            else wireProfileTab();
        }

        export function renderSettingsPage(initialTab) {
            const container = document.getElementById('settingsPageContainer');
            if (!container) return;
            if (SETTINGS_TABS.some(t => t.id === initialTab)) settingsState.tab = initialTab;
            const profile = getProfile();
            const isDark = Storage.getTheme() === 'dark';
            container.innerHTML = `
            <div class="settings-page-header"><h2>Налаштування</h2></div>
            <div class="settings-tabs" id="settingsTabs">
              ${SETTINGS_TABS.map(t => `
                <button class="settings-tab${settingsState.tab === t.id ? ' active' : ''}" data-tab="${t.id}"><i class="fas ${t.icon}"></i> ${t.label}</button>
              `).join('')}
            </div>
            <div id="settingsTabContent">${buildSettingsTabContent(settingsState.tab, profile, isDark)}</div>
          `;
            document.querySelectorAll('#settingsTabs .settings-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    if (tab.dataset.tab === settingsState.tab) return;
                    settingsState.tab = tab.dataset.tab;
                    renderSettingsPage();
                });
            });
            wireSettingsTab(settingsState.tab, profile);
            syncLeftdockActive();
        }

        // ====================================================================
        //  ПРОФІЛЬ
        // ====================================================================
        export function getDefaultProfile() {
            return {
                nickname: 'Користувач',
                avatar: '',
                avatarVideo: '',
                banner: '',
                bannerVideo: '',
                bio: 'Аніме ентузіаст. Дивлюсь усе підряд — від слайс-оф-лайф до психологічного трилера.',
                bioBold: false,
                realName: '',
                birthdate: '',
                showBirthdate: true,
                private: false,
                effect: 'none',
                atmosphere: 'none',
                avatarDecoration: 'none',
                themeVariant: 'default',
                tabStyle: 'underline',
                bannerEffect: 'none'
            };
        }

        export function getProfile() {
            const p = Storage.getProfile();
            const def = getDefaultProfile();
            if (!p) { Storage.setProfile(def); return def; }
            // Мердж дефолтів і нормалізація старих/пошкоджених profile fields.
            const merged = { ...def, ...p };
            ['nickname', 'avatar', 'avatarVideo', 'banner', 'bannerVideo', 'bio', 'realName', 'birthdate', 'effect', 'atmosphere', 'avatarDecoration', 'themeVariant', 'tabStyle', 'bannerEffect'].forEach(key => {
                if (typeof merged[key] !== 'string') merged[key] = def[key];
            });
            merged.nickname = merged.nickname.trim() || def.nickname;
            merged.bioBold = merged.bioBold === true;
            return merged;
        }

        export function saveProfile(data) {
            Storage.setProfile(data);
        }

        export function getProfileStats() {
            const history = Storage.getHistory();
            const bookmarks = Storage.getBookmarks();
            const uniqueAnime = new Set(history.map(h => h.animeId || h.title));
            const totalEpisodes = history.length;
            const totalWatchTime = Storage.getWatchTime() || history.reduce((sum, h) => sum + (h.duration || 0), 0);
            const minutes = Math.floor(totalWatchTime / 60);
            const achievements = getAchievements(history, bookmarks, uniqueAnime.size, totalEpisodes, totalWatchTime);
            return {
                viewed: totalEpisodes,
                bookmarks: bookmarks.length,
                achievements: achievements.filter(a => a.unlocked).length,
                totalAchievements: achievements.length,
                watchMinutes: minutes,
                totalWatchTime: totalWatchTime,
                uniqueAnime: uniqueAnime.size,
                achievementsList: achievements,
                history: history.slice(0, 50),
                historyCount: history.length,
                bookmarksList: bookmarks
            };
        }

        function getMedalWordForm(n) {
            const lastTwo = n % 100;
            const lastOne = n % 10;
            if (lastTwo >= 11 && lastTwo <= 19) return 'медалей';
            if (lastOne === 1) return 'медаль';
            if (lastOne >= 2 && lastOne <= 4) return 'медалі';
            return 'медалей';
        }

        function getAchievements(history, bookmarks, uniqueCount, totalEpisodes, totalWatchTime) {
            const xp = calcTotalXP();
            const lvl = getLevel(xp);
            const stats = {
                episodes: totalEpisodes,
                watchMinutes: Math.floor((Number(totalWatchTime) || 0) / 60),
                bookmarks: bookmarks.length,
                xp: xp,
                level: lvl,
                posts: DailyStats.getTotalPosts(),
                ratings: DailyStats.getTotalRatings()
            };
            return ACHIEVEMENTS.map(a => {
                const val = stats[a.field] || 0;
                return {
                    id: a.id,
                    name: a.name,
                    description: a.req,
                    unlocked: val >= a.need,
                    progress: Math.min(Math.floor(val / a.need * 100), 100),
                    icon: a.icon
                };
            });
        }


        // Стиснення зображення перед збереженням (щоб Firestore не падав)
        // Upload image to Cloudinary, return URL
