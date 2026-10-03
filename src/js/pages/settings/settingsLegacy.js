function buildOptionGridHtml(groupName, options, current) {
  return '<div class="settings-option-grid">' + options.map((o) => `
                  <button class="settings-option-item${o.id === current ? " active" : ""}" data-group="${groupName}" data-value="${o.id}">
                    <i class="fas ${o.icon}"></i><span>${o.label}</span>
                  </button>`).join("") + "</div>";
}
function renderSettingsPreviewPanel(profile) {
  const panel = document.getElementById("settingsPreviewPanel");
  if (!panel) return;
  const bannerEffectClass = profile.bannerEffect && profile.bannerEffect !== "none" ? ` banner-effect-${profile.bannerEffect}` : "";
  const decorationClass = profile.avatarDecoration && profile.avatarDecoration !== "none" ? ` avatar-decoration-${profile.avatarDecoration}` : "";
  const avatarMarkup = profile.avatarVideo ? profileMediaMarkup(profile.avatarVideo, "settings-preview-avatar-media", "video avatar", profile.avatarVideoSettings) : profile.avatar ? profileMediaMarkup(profile.avatar, "settings-preview-avatar-media", "avatar") : `<span class="settings-preview-avatar-fallback">${escapeHtml2((getProfileDisplayName(profile) || "\u041A").charAt(0).toUpperCase())}</span>`;
  const previewAvatarMarkup = avatarMarkup.replace('loading="lazy"', 'loading="eager"');
  panel.innerHTML = `
              <div class="settings-preview-profile">
                <div class="profile-banner settings-preview-banner profile-banner--${profile.bannerFormat === "wide" ? "wide" : "narrow"}${bannerEffectClass}">
                  ${profile.bannerVideo ? profileMediaMarkup(profile.bannerVideo, "preview-banner-img", "video banner", profile.bannerVideoSettings) : profile.banner ? profileMediaMarkup(profile.banner, "preview-banner-img", "banner") : ""}
                  ${profile.atmosphere && profile.atmosphere !== "none" ? `<div class="atmosphere-${profile.atmosphere}"></div>` : ""}
                  ${profile.effect && profile.effect !== "none" ? buildEffectOverlayHtml(profile.effect) : ""}
                </div>
                <div class="settings-preview-info">
                  <div class="settings-preview-avatar-wrap${decorationClass}"><div class="profile-avatar">${previewAvatarMarkup}</div></div>
                  <div class="settings-preview-nick-row"><strong>${escapeHtml2(getProfileDisplayName(profile))}</strong></div>
                  <div class="settings-preview-handle">${escapeHtml2(getProfileHandle(profile))}</div>
                  <div class="settings-preview-bio is-bold">${escapeHtml2(profile.bio || "\u041E\u043F\u0438\u0441 \u043F\u0440\u043E\u0444\u0456\u043B\u044E \u043D\u0435 \u0434\u043E\u0434\u0430\u043D\u043E")}</div>
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
                  <div class="label">\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0456\u0441\u0442\u044C</div>
                  <div class="desc">\u041F\u0440\u0438\u0445\u043E\u0432\u0430\u0442\u0438 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0443 \u0442\u0430 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0456\u0432 \u0432\u0456\u0434 \u0456\u043D\u0448\u0438\u0445</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsPrivacyToggle" ${profile.private ? "checked" : ""}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>

            <div class="settings-section-title">\u041F\u0440\u0438\u0432\u0430\u0442\u043D\u0456\u0441\u0442\u044C \u0432\u043A\u043B\u0430\u0434\u043E\u043A</div>
            <div class="settings-card settings-card--nested">
              <div class="settings-card-left">
                <i class="fas fa-clock"></i>
                <div>
                  <div class="label">\u041F\u0440\u0438\u0445\u043E\u0432\u0430\u0442\u0438 \u0456\u0441\u0442\u043E\u0440\u0456\u044E</div>
                  <div class="desc">\u0406\u043D\u0448\u0456 \u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456 \u043D\u0435 \u0431\u0430\u0447\u0438\u0442\u0438\u043C\u0443\u0442\u044C \u0432\u0430\u0448\u0443 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0456\u0432</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsHideHistoryToggle" ${profile.hideHistory ? "checked" : ""}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>
            <div class="settings-card settings-card--nested">
              <div class="settings-card-left">
                <i class="fas fa-bookmark"></i>
                <div>
                  <div class="label">\u041F\u0440\u0438\u0445\u043E\u0432\u0430\u0442\u0438 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438</div>
                  <div class="desc">\u0406\u043D\u0448\u0456 \u043A\u043E\u0440\u0438\u0441\u0442\u0443\u0432\u0430\u0447\u0456 \u043D\u0435 \u0431\u0430\u0447\u0438\u0442\u0438\u043C\u0443\u0442\u044C \u0432\u0430\u0448\u0456 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsHideBookmarksToggle" ${profile.hideBookmarks ? "checked" : ""}>
                <span class="settings-switch-slider"></span>
              </label>
            </div>

            <div class="settings-section-title">\u041E\u0441\u043D\u043E\u0432\u043D\u0435</div>
            <div class="settings-hint-text">\u0417\u043C\u0456\u043D\u0438 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u044E\u0442\u044C\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E.</div>
            <div class="settings-field">
              <label class="settings-field-label">\u041D\u0456\u043A\u043D\u0435\u0439\u043C</label>
              <input type="text" id="settingsNicknameInput" maxlength="25" placeholder="@username" value="${escapeHtml2(profile.nickname)}">
              <span class="settings-field-hint" id="settingsNicknameCount">${profile.nickname.length}/25 \xB7 \u043F\u043E\u0447\u0438\u043D\u0430\u0454\u0442\u044C\u0441\u044F \u0437 @</span>
            </div>
            <div class="settings-field">
              <label class="settings-field-label">\u0406\u043C'\u044F</label>
              <input type="text" id="settingsRealNameInput" maxlength="40" placeholder="\u041D\u0435\u043E\u0431\u043E\u0432'\u044F\u0437\u043A\u043E\u0432\u043E" value="${escapeHtml2(profile.realName || "")}">
            </div>
            <div class="settings-field">
              <label class="settings-field-label">\u0414\u0430\u0442\u0430 \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F</label>
              <div class="settings-date-row settings-date-picker" id="settingsBirthdatePicker">
                <input type="date" id="settingsBirthdateInput" value="${profile.birthdate || ""}" tabindex="-1" aria-hidden="true">
                <button type="button" class="settings-date-trigger" id="settingsBirthdateTrigger" aria-haspopup="dialog" aria-expanded="false">
                  <i class="fas fa-calendar-days" aria-hidden="true"></i>
                  <span id="settingsBirthdateLabel">${profile.birthdate ? (/* @__PURE__ */ new Date(`${profile.birthdate}T12:00:00`)).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" }) : "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0434\u0430\u0442\u0443"}</span>
                  <i class="fas fa-chevron-down" aria-hidden="true"></i>
                </button>
                <button type="button" class="settings-date-clear" id="settingsBirthdateClear" title="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438" aria-label="\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0434\u0430\u0442\u0443"><i class="fas fa-times"></i></button>
                <div class="settings-date-popover" id="settingsBirthdatePopover" role="dialog" aria-label="\u0412\u0438\u0431\u0456\u0440 \u0434\u0430\u0442\u0438" hidden>
                  <div class="settings-date-popover-head">
                    <strong id="settingsBirthdateMonth">\u041C\u0456\u0441\u044F\u0446\u044C</strong>
                    <div class="settings-date-nav">
                      <button type="button" id="settingsBirthdatePrev" aria-label="\u041F\u043E\u043F\u0435\u0440\u0435\u0434\u043D\u0456\u0439 \u043C\u0456\u0441\u044F\u0446\u044C"><i class="fas fa-chevron-left"></i></button>
                      <button type="button" id="settingsBirthdateNext" aria-label="\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u043C\u0456\u0441\u044F\u0446\u044C"><i class="fas fa-chevron-right"></i></button>
                    </div>
                  </div>
                  <div class="settings-date-weekdays" aria-hidden="true"><span>\u041F\u043D</span><span>\u0412\u0442</span><span>\u0421\u0440</span><span>\u0427\u0442</span><span>\u041F\u0442</span><span>\u0421\u0431</span><span>\u041D\u0434</span></div>
                  <div class="settings-date-grid" id="settingsBirthdateGrid"></div>
                  <div class="settings-date-popover-foot">
                    <button type="button" id="settingsBirthdateToday">\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456</button>
                    <button type="button" id="settingsBirthdateDone">\u0413\u043E\u0442\u043E\u0432\u043E</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="settings-card settings-card--nested">
              <div class="settings-card-left">
                <i class="fas fa-birthday-cake"></i>
                <div>
                  <div class="label">\u041F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0434\u0435\u043D\u044C \u043D\u0430\u0440\u043E\u0434\u0436\u0435\u043D\u043D\u044F</div>
                  <div class="desc">\u0414\u0435\u043D\u044C \u0456 \u043C\u0456\u0441\u044F\u0446\u044C (\u0431\u0435\u0437 \u0440\u043E\u043A\u0443). \u0406\u043D\u0448\u0456 \u0437\u043C\u043E\u0436\u0443\u0442\u044C \u043F\u0440\u0438\u0432\u0456\u0442\u0430\u0442\u0438.</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsShowBirthdayToggle" ${profile.showBirthdate ? "checked" : ""}>
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
  const email = authed && user?.email ? user.email : guest ? "\u0413\u043E\u0441\u0442\u044C\u043E\u0432\u0438\u0439 \u0440\u0435\u0436\u0438\u043C \u2014 \u0434\u0430\u043D\u0456 \u043B\u0438\u0448\u0435 \u043D\u0430 \u0446\u044C\u043E\u043C\u0443 \u043F\u0440\u0438\u0441\u0442\u0440\u043E\u0457" : "\u0412\u0438 \u043D\u0435 \u0443\u0432\u0456\u0439\u0448\u043B\u0438";
  const device = detectDeviceInfo(navigator.userAgent);
  const lastLogin = authed && user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString("uk-UA") : "\u2014";
  const canResetPassword = authed && Auth.hasPasswordProvider();
  return `
            <div class="settings-card${authed || guest ? "" : " settings-card--disabled"}">
              <div class="settings-card-left">
                <i class="fas fa-id-badge"></i>
                <div>
                  <div class="label">${email}</div>
                  <div class="desc">\u0421\u043F\u043E\u0441\u0456\u0431 \u0432\u0445\u043E\u0434\u0443: ${provider}</div>
                </div>
              </div>
            </div>

            ${canResetPassword ? `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-key"></i>
                <div>
                  <div class="label">\u041F\u0430\u0440\u043E\u043B\u044C</div>
                  <div class="desc">\u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u043B\u0438\u0441\u0442 \u0434\u043B\u044F \u0437\u043C\u0456\u043D\u0438 \u043F\u0430\u0440\u043E\u043B\u044F \u043D\u0430 ${escapeHtml2(user.email)}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsResetPasswordBtn"><i class="fas fa-envelope"></i> \u041D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438</button>
            </div>` : ""}

            <div class="settings-section-title">\u0426\u0435\u0439 \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439</div>
            <div class="settings-card settings-card--disabled">
              <div class="settings-card-left">
                <i class="fas fa-desktop"></i>
                <div>
                  <div class="label">${device.type}${device.osVersion ? " \xB7 " + device.osVersion : ""}</div>
                  <div class="desc">\u041E\u0441\u0442\u0430\u043D\u043D\u0456\u0439 \u0432\u0445\u0456\u0434: ${lastLogin}</div>
                </div>
              </div>
            </div>

            ${authed || guest ? `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-right-from-bracket"></i>
                <div>
                  <div class="label">\u0412\u0438\u0439\u0442\u0438 \u0437 \u0430\u043A\u0430\u0443\u043D\u0442\u0443</div>
                  <div class="desc">${guest ? "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0438 \u0433\u043E\u0441\u0442\u044C\u043E\u0432\u0438\u0439 \u0441\u0435\u0430\u043D\u0441" : "\u0414\u0430\u043D\u0456 \u0431\u0443\u0434\u0435 \u0441\u0438\u043D\u0445\u0440\u043E\u043D\u0456\u0437\u043E\u0432\u0430\u043D\u043E \u043F\u0435\u0440\u0435\u0434 \u0432\u0438\u0445\u043E\u0434\u043E\u043C"}</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsLogoutBtn"><i class="fas fa-right-from-bracket"></i> \u0412\u0438\u0439\u0442\u0438</button>
            </div>` : ""}

            ${authed && !guest ? `
            <div class="settings-section-title">\u041D\u0435\u0431\u0435\u0437\u043F\u0435\u0447\u043D\u0430 \u0437\u043E\u043D\u0430</div>
            <div class="settings-card settings-card--danger">
              <div class="settings-card-left">
                <i class="fas fa-triangle-exclamation"></i>
                <div>
                  <div class="label">\u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0430\u043A\u0430\u0443\u043D\u0442</div>
                  <div class="desc">\u041D\u0435\u0437\u0432\u043E\u0440\u043E\u0442\u043D\u044C\u043E \u0432\u0438\u0434\u0430\u043B\u044F\u0454 \u0430\u043A\u0430\u0443\u043D\u0442 \u0456 \u0432\u0441\u0456 \u0434\u0430\u043D\u0456 \u0437 \u0441\u0435\u0440\u0432\u0435\u0440\u0430</div>
                </div>
              </div>
              <button class="settings-toggle-btn settings-toggle-btn--danger" id="settingsDeleteAccountBtn"><i class="fas fa-trash"></i> \u0412\u0438\u0434\u0430\u043B\u0438\u0442\u0438</button>
            </div>` : ""}
          `;
}
function buildSiteTabHtml(isDark) {
  const history2 = Storage.getHistory();
  const bookmarks = Storage.getBookmarks();
  return `
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-circle-half-stroke"></i>
                <div>
                  <div class="label">\u0422\u0435\u043C\u0430 \u0456\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443</div>
                  <div class="desc">${isDark ? "\u0422\u0435\u043C\u043D\u0430 \u0442\u0435\u043C\u0430" : "\u0421\u0432\u0456\u0442\u043B\u0430 \u0442\u0435\u043C\u0430"} \u2014 ${isDark ? "\u043D\u0456\u0447\u043D\u0438\u0439 \u0440\u0435\u0436\u0438\u043C" : "\u0434\u0435\u043D\u043D\u0438\u0439 \u0440\u0435\u0436\u0438\u043C"}</div>
                </div>
              </div>
              <label class="switch" id="settingsThemeBtn" aria-label="\u041F\u0435\u0440\u0435\u043C\u043A\u043D\u0443\u0442\u0438 \u0442\u0435\u043C\u0443">
                <input id="themeSwitchInput" type="checkbox" ${isDark ? "checked" : ""} aria-label="\u0422\u0435\u043C\u043D\u0430 \u0442\u0435\u043C\u0430" />
                <div class="slider round">
                  <div class="sun-moon">
                    <svg id="moon-dot-1" class="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="moon-dot-2" class="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="moon-dot-3" class="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="light-ray-1" class="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="light-ray-2" class="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="light-ray-3" class="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="cloud-1" class="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="cloud-2" class="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="cloud-3" class="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="cloud-4" class="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="cloud-5" class="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                    <svg id="cloud-6" class="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50"></circle></svg>
                  </div>
                  <div class="stars">
                    <svg id="star-1" class="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                    <svg id="star-2" class="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                    <svg id="star-3" class="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                    <svg id="star-4" class="star" viewBox="0 0 20 20"><path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path></svg>
                  </div>
                </div>
              </label>
            </div>

            <div class="settings-section-title">\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F</div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-external-link-alt"></i>
                <div>
                  <div class="label">\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u0435 \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u0435\u043D\u043D\u044F \u0432 SenPlayer</div>
                  <div class="desc">\u041D\u0430 iPhone, iPad \u0456 Mac \u043D\u0430\u0442\u0438\u0441\u043A\u0430\u043D\u043D\u044F \xAB\u0412\u0456\u0434\u0442\u0432\u043E\u0440\u0438\u0442\u0438\xBB \u0430\u0431\u043E \u0432\u0438\u0431\u0456\u0440 \u0441\u0435\u0440\u0456\u0457 \u0432\u0456\u0434\u043A\u0440\u0438\u0454 \u043F\u0440\u044F\u043C\u0435 \u0432\u0456\u0434\u0435\u043E \u0432 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E\u043C\u0443 SenPlayer. \u0412\u0438\u043C\u043A\u043D\u0456\u0442\u044C, \u0449\u043E\u0431 \u0437\u0430\u043B\u0438\u0448\u0438\u0442\u0438 \u0432\u043D\u0443\u0442\u0440\u0456\u0448\u043D\u0456\u0439 \u043F\u043B\u0435\u0454\u0440; \u0434\u0436\u0435\u0440\u0435\u043B\u0430 \u0431\u0435\u0437 \u043F\u0440\u044F\u043C\u043E\u0433\u043E \u043F\u043E\u0442\u043E\u043A\u0443 \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u044E\u044E\u0442\u044C\u0441\u044F \u0442\u0443\u0442.</div>
                </div>
              </div>
              <label class="settings-switch">
                <input type="checkbox" id="settingsSenPlayerAutoLaunchToggle" ${isSenPlayerAutoLaunchEnabled() ? "checked" : ""} aria-label="\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E \u0432\u0456\u0434\u0442\u0432\u043E\u0440\u044E\u0432\u0430\u0442\u0438 \u0432\u0456\u0434\u0435\u043E \u0432 SenPlayer">
                <span class="settings-switch-slider"></span>
              </label>
            </div>

            <div class="settings-section-title">\u0414\u0430\u043D\u0456</div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-download"></i>
                <div>
                  <div class="label">\u0415\u043A\u0441\u043F\u043E\u0440\u0442\u0443\u0432\u0430\u0442\u0438 \u043C\u043E\u0457 \u0434\u0430\u043D\u0456</div>
                  <div class="desc">\u041F\u0440\u043E\u0444\u0456\u043B\u044C, \u0456\u0441\u0442\u043E\u0440\u0456\u044F (${history2.length}) \u0456 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438 (${bookmarks.length}) \u0443 \u0444\u0430\u0439\u043B JSON</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsExportDataBtn"><i class="fas fa-file-arrow-down"></i> \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438</button>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-clock-rotate-left"></i>
                <div>
                  <div class="label">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0456\u0432</div>
                  <div class="desc">${history2.length} \u0437\u0430\u043F\u0438\u0441\u0456\u0432 \u0431\u0443\u0434\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsClearHistoryBtn"><i class="fas fa-broom"></i> \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438</button>
            </div>
            <div class="settings-card">
              <div class="settings-card-left">
                <i class="fas fa-bookmark"></i>
                <div>
                  <div class="label">\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438</div>
                  <div class="desc">${bookmarks.length} \u0442\u0430\u0439\u0442\u043B\u0456\u0432 \u0431\u0443\u0434\u0435 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E \u0437\u0456 \u0441\u043F\u0438\u0441\u043A\u0443</div>
                </div>
              </div>
              <button class="settings-toggle-btn" id="settingsClearBookmarksBtn"><i class="fas fa-broom"></i> \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438</button>
            </div>

            <div class="settings-section-title">\u041F\u0440\u043E \u0441\u0430\u0439\u0442</div>
            <div class="settings-card settings-card--disabled">
              <div class="settings-card-left">
                <i class="fas fa-globe"></i>
                <div>
                  <div class="label">\u0414\u0436\u0435\u0440\u0435\u043B\u043E \u0434\u0430\u043D\u0438\u0445</div>
                  <div class="desc">hikka.io + mikai.me</div>
                </div>
              </div>
              <span class="settings-meta-note"><i class="fas fa-check"></i></span>
            </div>
            <div class="settings-card settings-card--disabled">
              <div class="settings-card-left">
                <i class="fas fa-language"></i>
                <div>
                  <div class="label">\u041C\u043E\u0432\u0430 \u0456\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0443</div>
                  <div class="desc">\u0423\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0430 (\u0437\u0430\u0432\u0436\u0434\u0438)</div>
                </div>
              </div>
              <span class="settings-meta-note"><i class="fas fa-flag"></i></span>
            </div>
          `;
}
function buildBannerFilterStripHtml(profile) {
  const src = profile.bannerVideo || profile.banner || "";
  const current = profile.bannerEffect || "none";
  return '<div class="banner-filter-strip">' + BANNER_EFFECTS.map((o) => `
                <button class="banner-filter-chip${o.id === current ? " active" : ""}" data-group="bannerEffect" data-value="${o.id}">
                  <span class="banner-filter-thumb banner-filter-thumb--${o.id}">${src ? isVideoUrl(src) ? `<video src="${escapeHtml2(src)}" muted loop autoplay playsinline></video>` : `<img src="${escapeHtml2(src)}" alt="${o.label}">` : ""}</span>
                  <span class="banner-filter-label">${o.label}</span>
                </button>`).join("") + "</div>";
}
function buildAppearanceTabHtml(profile) {
  const bannerSrc = profile.banner || "";
  const bannerVideoSrc = profile.bannerVideo || "";
  const avatarSrc = profile.avatar || "";
  const avatarVideoSrc = profile.avatarVideo || "";
  return `
            <div class="appearance-layout">
            <div class="appearance-col appearance-col--main">
            <div class="appearance-section-card">
            <div class="appearance-media-grid">
            <div class="appearance-media-block">
            <div class="settings-section-title">\u0411\u0430\u043D\u0435\u0440</div>
            <div class="settings-media-card settings-media-card--banner">
              <div class="settings-media-preview--banner${!bannerSrc && !bannerVideoSrc ? " is-empty" : ""}" id="settingsBannerPreview">
                ${bannerVideoSrc ? profileMediaMarkup(bannerVideoSrc, "", "video banner", profile.bannerVideoSettings) : bannerSrc ? profileMediaMarkup(bannerSrc, "", "banner") : ""}
              </div>
              <div class="settings-media-actions" aria-label="\u041A\u0435\u0440\u0443\u0432\u0430\u043D\u043D\u044F \u0431\u0430\u043D\u0435\u0440\u043E\u043C">
                <button class="settings-media-btn settings-media-btn--replace" id="settingsBannerUploadBtn"><i class="fas fa-camera"></i> \u0417\u043C\u0456\u043D\u0438\u0442\u0438</button>
                ${bannerVideoSrc ? `<button class="settings-media-btn settings-media-edit-video" id="settingsBannerEditVideoBtn"><i class="fas fa-sliders"></i> \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434\u0435\u043E</button>` : bannerSrc ? isGifUrl(bannerSrc) ? `<button class="settings-media-btn settings-media-edit-video" id="settingsBannerEditGifBtn"><i class="fas fa-sliders"></i> \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 GIF</button>` : `<button class="settings-media-btn settings-media-edit-image" id="settingsBannerEditImageBtn"><i class="fas fa-crop-simple"></i> \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0431\u0430\u043D\u0435\u0440</button>` : ""}
              </div>
            </div>
            <div class="settings-hint-text">JPG, PNG, WebP, GIF, MP4, WebM, MOV \xB7 \u0432\u0456\u0434\u0435\u043E \u0434\u043E 50 \u041C\u0411</div>
            </div>
            <div class="appearance-media-block">
            <div class="settings-section-title">\u0410\u0432\u0430\u0442\u0430\u0440</div>
            <div class="settings-media-card settings-media-card--avatar">
              <div class="settings-media-preview--avatar${!avatarSrc && !avatarVideoSrc ? " is-empty" : ""}" id="settingsAvatarPreview">${avatarVideoSrc ? profileMediaMarkup(avatarVideoSrc, "", "video avatar", profile.avatarVideoSettings) : avatarSrc ? profileMediaMarkup(avatarSrc, "", "avatar") : '<i class="fas fa-user"></i>'}</div>
              <div class="settings-media-actions">
                <button class="settings-media-btn settings-media-btn--replace" id="settingsAvatarUploadBtn"><i class="fas fa-camera"></i> \u0417\u043C\u0456\u043D\u0438\u0442\u0438</button>
                ${avatarVideoSrc ? `<button class="settings-media-btn settings-media-edit-video" id="settingsAvatarEditVideoBtn"><i class="fas fa-sliders"></i> \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0432\u0456\u0434\u0435\u043E</button>` : avatarSrc ? isGifUrl(avatarSrc) ? `<button class="settings-media-btn settings-media-edit-video" id="settingsAvatarEditGifBtn"><i class="fas fa-sliders"></i> \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 GIF</button>` : `<button class="settings-media-btn settings-media-edit-image" id="settingsAvatarEditImageBtn"><i class="fas fa-crop-simple"></i> \u0420\u0435\u0434\u0430\u0433\u0443\u0432\u0430\u0442\u0438 \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0443</button>` : ""}
              </div>
            </div>
            <div class="settings-hint-text">JPG, PNG, WebP, GIF, MP4, WebM, MOV \xB7 \u0432\u0456\u0434\u0435\u043E \u0434\u043E 50 \u041C\u0411</div>
            </div>
            </div>
            </div>
            </div>

            <div class="appearance-section-card">
            <div class="settings-section-title">\u041E\u043F\u0438\u0441 \u043F\u0440\u043E\u0444\u0456\u043B\u044E</div>
            <div class="settings-field">
              <textarea id="settingsBioInput" maxlength="160" rows="3" placeholder="\u0420\u043E\u0437\u043A\u0430\u0436\u0456\u0442\u044C \u043F\u0440\u043E \u0441\u0435\u0431\u0435\u2026">${escapeHtml2(profile.bio || "")}</textarea>
              <span class="settings-field-hint"><span id="settingsBioCount">${(profile.bio || "").length}</span>/160 \u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432 \xB7 \u0437\u043C\u0456\u043D\u0438 \u0437\u0431\u0435\u0440\u0456\u0433\u0430\u044E\u0442\u044C\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u043E</span>
            </div>
            </div>

            <div class="appearance-col appearance-col--side">
            <div class="appearance-section-card appearance-preview-card">
            <button class="settings-preview-toggle-btn" id="settingsPreviewToggleBtn">
              <i class="fas fa-eye${settingsState.previewOpen ? "-slash" : ""}"></i> ${settingsState.previewOpen ? "\u0421\u0445\u043E\u0432\u0430\u0442\u0438 \u043F\u0440\u0435\u0432'\u044E" : "\u041F\u0440\u0435\u0432'\u044E"}
            </button>
            <div class="settings-preview-panel" id="settingsPreviewPanel" style="display:${settingsState.previewOpen ? "block" : "none"};"></div>
            </div>
            </div>

            <div class="appearance-col appearance-col--main">
            <div class="appearance-section-card">
            <div class="settings-section-title">\u0424\u0456\u043B\u044C\u0442\u0440 \u0431\u0430\u043D\u0435\u0440\u0430</div>
            <div class="settings-hint-text" style="margin-top:-0.5rem;">\u0421\u0432\u0456\u0439 \u043A\u043E\u043B\u0456\u0440, \u0447\u043E\u0440\u043D\u043E-\u0431\u0456\u043B\u0435 \u0447\u0438 \u0431\u0443\u0434\u044C-\u044F\u043A\u0438\u0439 \u0456\u043D\u0448\u0438\u0439 \u0441\u0442\u0438\u043B\u044C \u2014 \u043E\u0431\u0435\u0440\u0456\u0442\u044C, \u044F\u043A \u043F\u043E\u043A\u0430\u0437\u0443\u0432\u0430\u0442\u0438 \u0432\u0430\u0448 \u0431\u0430\u043D\u0435\u0440.</div>
            ${buildBannerFilterStripHtml(profile)}

            <div class="settings-section-title">\u0415\u0444\u0435\u043A\u0442\u0438 \u043F\u0440\u043E\u0444\u0456\u043B\u044E</div>
            ${buildOptionGridHtml("effect", PROFILE_EFFECTS, profile.effect)}

            <div class="settings-section-title">\u0410\u0442\u043C\u043E\u0441\u0444\u0435\u0440\u0430 \u043F\u0440\u043E\u0444\u0456\u043B\u044E</div>
            ${buildOptionGridHtml("atmosphere", PROFILE_ATMOSPHERES, profile.atmosphere)}

            <div class="settings-section-title">\u0414\u0435\u043A\u043E\u0440\u0430\u0446\u0456\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u0430</div>
            ${buildOptionGridHtml("avatarDecoration", AVATAR_DECORATIONS, profile.avatarDecoration)}

            </div>
            </div>
            </div>
          `;
}
function wireProfileTab() {
  const privacyToggle = document.getElementById("settingsPrivacyToggle");
  if (privacyToggle) privacyToggle.addEventListener("change", () => {
    const p = getProfile();
    p.private = privacyToggle.checked;
    saveProfile(p);
    showToast(privacyToggle.checked ? "\u041F\u0440\u043E\u0444\u0456\u043B\u044C \u043F\u0440\u0438\u0445\u043E\u0432\u0430\u043D\u043E" : "\u041F\u0440\u043E\u0444\u0456\u043B\u044C \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E");
  });
  const nickInput = document.getElementById("settingsNicknameInput");
  const nickCount = document.getElementById("settingsNicknameCount");
  if (nickInput) {
    const updateNicknameCounter = () => {
      if (nickCount) nickCount.textContent = `${nickInput.value.length}/25 \xB7 \u043F\u043E\u0447\u0438\u043D\u0430\u0454\u0442\u044C\u0441\u044F \u0437 @`;
    };
    nickInput.addEventListener("input", updateNicknameCounter);
    nickInput.addEventListener("change", () => {
      const p = getProfile();
      const typed = nickInput.value.trim();
      const val = typed && typed !== "@" ? normalizeNickname(typed, p.nickname || "@user") : p.nickname || "@user";
      p.nickname = val;
      nickInput.value = val;
      updateNicknameCounter();
      saveProfile(p);
      if (Router.currentRoute === "profile") renderProfilePage2();
    });
    updateNicknameCounter();
  }
  const nameInput = document.getElementById("settingsRealNameInput");
  if (nameInput) nameInput.addEventListener("change", () => {
    const p = getProfile();
    p.realName = stripNicknamePrefix(nameInput.value);
    saveProfile(p);
  });
  const birthInput = document.getElementById("settingsBirthdateInput");
  const birthPicker = document.getElementById("settingsBirthdatePicker");
  const birthTrigger = document.getElementById("settingsBirthdateTrigger");
  const birthLabel = document.getElementById("settingsBirthdateLabel");
  const birthPopover = document.getElementById("settingsBirthdatePopover");
  const birthMonth = document.getElementById("settingsBirthdateMonth");
  const birthGrid = document.getElementById("settingsBirthdateGrid");
  const birthPrev = document.getElementById("settingsBirthdatePrev");
  const birthNext = document.getElementById("settingsBirthdateNext");
  const birthToday = document.getElementById("settingsBirthdateToday");
  const birthDone = document.getElementById("settingsBirthdateDone");
  const birthClear = document.getElementById("settingsBirthdateClear");
  if (birthInput && birthPicker && birthTrigger && birthLabel && birthPopover && birthMonth && birthGrid) {
    const today = /* @__PURE__ */ new Date();
    const parsedBirthdate = birthInput.value ? /* @__PURE__ */ new Date(`${birthInput.value}T12:00:00`) : new Date(2e3, 0, 1);
    let calendarDate = Number.isNaN(parsedBirthdate.getTime()) ? new Date(2e3, 0, 1) : parsedBirthdate;
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const formatIso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const formatLabel = (value) => value ? (/* @__PURE__ */ new Date(`${value}T12:00:00`)).toLocaleDateString("uk-UA", { day: "numeric", month: "long", year: "numeric" }) : "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0434\u0430\u0442\u0443";
    const closeCalendar = () => {
      birthPopover.hidden = true;
      birthTrigger.setAttribute("aria-expanded", "false");
    };
    const commitBirthdate = (value) => {
      birthInput.value = value;
      birthLabel.textContent = formatLabel(value);
      const p = getProfile();
      p.birthdate = value;
      saveProfile(p);
    };
    const renderCalendar = () => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      birthMonth.textContent = new Date(year, month, 1).toLocaleDateString("uk-UA", { month: "long", year: "numeric" });
      const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const selected = birthInput.value;
      const todayIso = formatIso(today);
      const cells = [];
      for (let i = 0; i < firstDay; i += 1) cells.push('<span class="settings-date-empty" aria-hidden="true"></span>');
      for (let day = 1; day <= daysInMonth; day += 1) {
        const current = new Date(year, month, day);
        const iso = formatIso(current);
        const isSelected = iso === selected;
        const isToday = iso === todayIso;
        const isFuture = current > today;
        cells.push(`<button type="button" class="settings-date-day${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}" data-date="${iso}"${isFuture ? " disabled" : ""} aria-label="${current.toLocaleDateString("uk-UA")}">${day}</button>`);
      }
      birthGrid.innerHTML = cells.join("");
      birthGrid.querySelectorAll("[data-date]").forEach((dayButton) => dayButton.addEventListener("click", () => {
        commitBirthdate(dayButton.dataset.date);
        renderCalendar();
      }));
    };
    birthTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = !birthPopover.hidden;
      if (isOpen) closeCalendar();
      else {
        renderCalendar();
        birthPopover.hidden = false;
        birthTrigger.setAttribute("aria-expanded", "true");
      }
    });
    birthPrev?.addEventListener("click", () => {
      calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
      renderCalendar();
    });
    birthNext?.addEventListener("click", () => {
      const next = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
      if (next <= new Date(today.getFullYear(), today.getMonth(), 1)) {
        calendarDate = next;
        renderCalendar();
      }
    });
    birthToday?.addEventListener("click", () => {
      commitBirthdate(formatIso(today));
      renderCalendar();
    });
    birthDone?.addEventListener("click", closeCalendar);
    birthClear?.addEventListener("click", () => {
      birthInput.value = "";
      birthLabel.textContent = "\u041E\u0431\u0435\u0440\u0456\u0442\u044C \u0434\u0430\u0442\u0443";
      const p = getProfile();
      p.birthdate = "";
      saveProfile(p);
      renderCalendar();
    });
    if (settingsCalendarOutsideHandler) document.removeEventListener("click", settingsCalendarOutsideHandler);
    const outsideCalendarClick = (event) => {
      if (!birthPicker.contains(event.target)) closeCalendar();
    };
    settingsCalendarOutsideHandler = outsideCalendarClick;
    document.addEventListener("click", outsideCalendarClick);
    renderCalendar();
  }
  const hideHistoryToggle = document.getElementById("settingsHideHistoryToggle");
  if (hideHistoryToggle) hideHistoryToggle.addEventListener("change", () => {
    const p = getProfile();
    p.hideHistory = hideHistoryToggle.checked;
    saveProfile(p);
    if (Auth.isAuthenticated()) Auth.syncUserData({ scope: "profile" }).catch((error) => console.warn("[VakDab] history privacy sync failed:", error));
    showToast(hideHistoryToggle.checked ? "\u0406\u0441\u0442\u043E\u0440\u0456\u044E \u043F\u0440\u0438\u0445\u043E\u0432\u0430\u043D\u043E" : "\u0406\u0441\u0442\u043E\u0440\u0456\u044E \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E");
  });
  const hideBookmarksToggle = document.getElementById("settingsHideBookmarksToggle");
  if (hideBookmarksToggle) hideBookmarksToggle.addEventListener("change", () => {
    const p = getProfile();
    p.hideBookmarks = hideBookmarksToggle.checked;
    saveProfile(p);
    if (Auth.isAuthenticated()) Auth.syncUserData({ scope: "profile" }).catch((error) => console.warn("[VakDab] bookmarks privacy sync failed:", error));
    showToast(hideBookmarksToggle.checked ? "\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438 \u043F\u0440\u0438\u0445\u043E\u0432\u0430\u043D\u043E" : "\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438 \u0432\u0456\u0434\u043A\u0440\u0438\u0442\u043E");
  });
  const birthdayToggle = document.getElementById("settingsShowBirthdayToggle");
  if (birthdayToggle) birthdayToggle.addEventListener("change", () => {
    const p = getProfile();
    p.showBirthdate = birthdayToggle.checked;
    saveProfile(p);
  });
}
function wireSecurityTab() {
  document.getElementById("settingsResetPasswordBtn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const res = await Auth.sendPasswordReset();
    btn.disabled = false;
    showToast(res.success ? "\u041B\u0438\u0441\u0442 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u043D\u043E \u043D\u0430 \u0432\u0430\u0448\u0443 \u043F\u043E\u0448\u0442\u0443" : "\u041F\u043E\u043C\u0438\u043B\u043A\u0430: " + res.error);
  });
  document.getElementById("settingsLogoutBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    Auth.handleExit();
  });
  document.getElementById("settingsDeleteAccountBtn")?.addEventListener("click", async () => {
    if (!confirm("\u0412\u0438 \u0434\u0456\u0439\u0441\u043D\u043E \u0445\u043E\u0447\u0435\u0442\u0435 \u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438 \u0430\u043A\u0430\u0443\u043D\u0442? \u0423\u0441\u0456 \u0434\u0430\u043D\u0456 \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0456 \u0431\u0443\u0434\u0435 \u0432\u0442\u0440\u0430\u0447\u0435\u043D\u043E \u043D\u0430\u0437\u0430\u0432\u0436\u0434\u0438.")) return;
    const typed = prompt("\u0414\u043B\u044F \u043F\u0456\u0434\u0442\u0432\u0435\u0440\u0434\u0436\u0435\u043D\u043D\u044F \u0432\u0432\u0435\u0434\u0456\u0442\u044C \u0441\u043B\u043E\u0432\u043E \u0412\u0418\u0414\u0410\u041B\u0418\u0422\u0418 \u0432\u0435\u043B\u0438\u043A\u0438\u043C\u0438 \u043B\u0456\u0442\u0435\u0440\u0430\u043C\u0438:");
    if (typed !== "\u0412\u0418\u0414\u0410\u041B\u0418\u0422\u0418") {
      showToast("\u0421\u043A\u0430\u0441\u043E\u0432\u0430\u043D\u043E");
      return;
    }
    showToast("\u0412\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F \u0430\u043A\u0430\u0443\u043D\u0442\u0443...");
    const res = await Auth.deleteAccount();
    if (res.success) {
      showToast("\u0410\u043A\u0430\u0443\u043D\u0442 \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043E");
      Router.showProfile();
    } else if (res.error === "requires-recent-login") {
      showToast("\u0417 \u043C\u0456\u0440\u043A\u0443\u0432\u0430\u043D\u044C \u0431\u0435\u0437\u043F\u0435\u043A\u0438 \u0443\u0432\u0456\u0439\u0434\u0456\u0442\u044C \u0449\u0435 \u0440\u0430\u0437 \u0456 \u043F\u043E\u0432\u0442\u043E\u0440\u0456\u0442\u044C \u0432\u0438\u0434\u0430\u043B\u0435\u043D\u043D\u044F");
    } else {
      showToast("\u041F\u043E\u043C\u0438\u043B\u043A\u0430: " + res.error);
    }
  });
}
function wireSiteTab() {
  const themeInput = document.getElementById("themeSwitchInput");
  if (themeInput) themeInput.addEventListener("change", toggleTheme);
  document.getElementById("settingsSenPlayerAutoLaunchToggle")?.addEventListener("change", (event) => {
    const enabled = event.currentTarget.checked;
    setSenPlayerAutoLaunchEnabled(enabled);
    showToast(enabled ? "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u0438\u0439 \u0437\u0430\u043F\u0443\u0441\u043A SenPlayer \u0443\u0432\u0456\u043C\u043A\u043D\u0435\u043D\u043E" : "\u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u043D\u0438\u0439 \u0437\u0430\u043F\u0443\u0441\u043A SenPlayer \u0432\u0438\u043C\u043A\u043D\u0435\u043D\u043E");
  });
  document.getElementById("settingsExportDataBtn")?.addEventListener("click", () => {
    const data = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      profile: getProfile(),
      history: Storage.getHistory(),
      bookmarks: Storage.getBookmarks(),
      likes: Storage.getLikes(),
      watchTimeSeconds: Storage.getWatchTime()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monoanime-data-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("\u0414\u0430\u043D\u0456 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043E");
  });
  document.getElementById("settingsClearHistoryBtn")?.addEventListener("click", () => {
    if (!confirm("\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0441\u044E \u0456\u0441\u0442\u043E\u0440\u0456\u044E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0456\u0432? \u0426\u0435 \u043D\u0435\u0437\u0432\u043E\u0440\u043E\u0442\u043D\u044C\u043E.")) return;
    Storage.setHistory([]);
    if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {
    });
    showToast("\u0406\u0441\u0442\u043E\u0440\u0456\u044E \u043E\u0447\u0438\u0449\u0435\u043D\u043E");
    renderSettingsPage();
  });
  document.getElementById("settingsClearBookmarksBtn")?.addEventListener("click", () => {
    if (!confirm("\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u0438 \u0432\u0441\u0456 \u0437\u0430\u043A\u043B\u0430\u0434\u043A\u0438?")) return;
    Storage.setBookmarks([]);
    if (Auth.isAuthenticated()) Auth.syncUserData().catch(() => {
    });
    showToast("\u0417\u0430\u043A\u043B\u0430\u0434\u043A\u0438 \u043E\u0447\u0438\u0449\u0435\u043D\u043E");
    renderSettingsPage();
  });
}
function wireAppearanceTab(profile) {
  const bioInput = document.getElementById("settingsBioInput");
  const bioCount = document.getElementById("settingsBioCount");
  if (bioInput && bioCount) bioInput.addEventListener("input", () => {
    bioCount.textContent = String(bioInput.value.length);
    if (settingsState.previewOpen) {
      renderSettingsPreviewPanel({ ...getProfile(), bio: bioInput.value, bioBold: true });
    }
  });
  if (bioInput) bioInput.addEventListener("change", () => {
    const p = getProfile();
    p.bio = bioInput.value.trim() || p.bio;
    saveProfile(p);
    if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
    if (Router.currentRoute === "profile") renderProfilePage2();
  });
  document.getElementById("settingsBannerUploadBtn")?.addEventListener("click", () => {
    document.getElementById("bannerFileInput").click();
  });
  document.getElementById("settingsAvatarUploadBtn")?.addEventListener("click", () => {
    document.getElementById("avatarFileInput").click();
  });
  document.getElementById("settingsBannerEditVideoBtn")?.addEventListener("click", () => {
    const p = getProfile();
    editExistingProfileVideo(p.bannerVideo, "banner");
  });
  document.getElementById("settingsAvatarEditVideoBtn")?.addEventListener("click", () => {
    const p = getProfile();
    editExistingProfileVideo(p.avatarVideo, "avatar");
  });
  document.getElementById("settingsBannerEditGifBtn")?.addEventListener("click", () => {
    const p = getProfile();
    editExistingProfileVideo(p.banner, "banner");
  });
  document.getElementById("settingsAvatarEditGifBtn")?.addEventListener("click", () => {
    const p = getProfile();
    editExistingProfileVideo(p.avatar, "avatar");
  });
  document.getElementById("settingsBannerEditImageBtn")?.addEventListener("click", () => {
    const p = getProfile();
    editExistingProfileImage(p.banner, "banner");
  });
  document.getElementById("settingsAvatarEditImageBtn")?.addEventListener("click", () => {
    const p = getProfile();
    editExistingProfileImage(p.avatar, "avatar");
  });
  const previewBtn = document.getElementById("settingsPreviewToggleBtn");
  if (previewBtn) previewBtn.addEventListener("click", () => {
    settingsState.previewOpen = !settingsState.previewOpen;
    const panel = document.getElementById("settingsPreviewPanel");
    if (panel) panel.style.display = settingsState.previewOpen ? "block" : "none";
    previewBtn.innerHTML = `<i class="fas fa-eye${settingsState.previewOpen ? "-slash" : ""}"></i> ${settingsState.previewOpen ? "\u0421\u0445\u043E\u0432\u0430\u0442\u0438 \u043F\u0440\u0435\u0432'\u044E" : "\u041F\u0440\u0435\u0432'\u044E"}`;
    if (settingsState.previewOpen) renderSettingsPreviewPanel(getProfile());
  });
  if (settingsState.previewOpen) renderSettingsPreviewPanel(profile);
  document.querySelectorAll(".settings-option-item, .banner-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;
      const p = getProfile();
      p[group] = value;
      saveProfile(p);
      document.querySelectorAll(`.settings-option-item[data-group="${group}"]`).forEach((b) => b.classList.toggle("active", b.dataset.value === value));
      document.querySelectorAll(`.banner-filter-chip[data-group="${group}"]`).forEach((b) => b.classList.toggle("active", b.dataset.value === value));
      if (settingsState.previewOpen) renderSettingsPreviewPanel(p);
      if (Router.currentRoute === "profile") renderProfilePage2();
    });
  });
}
function buildSettingsTabContent(tab, profile, isDark) {
  if (tab === "appearance") return buildAppearanceTabHtml(profile);
  if (tab === "security") return buildSecurityTabHtml();
  if (tab === "site") return buildSiteTabHtml(isDark);
  return buildProfileTabHtml(profile, isDark);
}
function wireSettingsTab(tab, profile) {
  if (tab === "appearance") wireAppearanceTab(profile);
  else if (tab === "security") wireSecurityTab();
  else if (tab === "site") wireSiteTab();
  else wireProfileTab();
}
function renderSettingsPage(initialTab) {
  const container = document.getElementById("settingsPageContainer");
  if (!container) return;
  if (SETTINGS_TABS.some((t) => t.id === initialTab)) settingsState.tab = initialTab;
  const profile = getProfile();
  const isDark = Storage.getTheme() === "dark";
  container.innerHTML = `
            <div class="settings-page-header">
              <div class="settings-page-heading">
                <h2>\u041D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F</h2>
                <p class="settings-page-subtitle">\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u0456\u0437\u0443\u0439\u0442\u0435 \u043F\u0440\u043E\u0444\u0456\u043B\u044C \u0456 \u0437\u0430\u0441\u0442\u043E\u0441\u0443\u043D\u043E\u043A</p>
              </div>
            </div>
            <div class="settings-tabs" id="settingsTabs">
              ${SETTINGS_TABS.map((t) => `
                <button class="settings-tab${settingsState.tab === t.id ? " active" : ""}" data-tab="${t.id}"><i class="fas ${t.icon}"></i> ${t.label}</button>
              `).join("")}
            </div>
            <div id="settingsTabContent">${buildSettingsTabContent(settingsState.tab, profile, isDark)}</div>
          `;
  document.querySelectorAll("#settingsTabs .settings-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.tab === settingsState.tab) return;
      settingsState.tab = tab.dataset.tab;
      renderSettingsPage();
    });
  });
  wireSettingsTab(settingsState.tab, profile);
  syncLeftdockActive();
}
var settingsState, settingsCalendarOutsideHandler, PROFILE_EFFECTS, PROFILE_ATMOSPHERES, AVATAR_DECORATIONS, BANNER_EFFECTS, SETTINGS_TABS;
var init_settingsLegacy = __esm({
  "src/js/pages/settings/settingsLegacy.js?v=20260927-senplayer-auto-v1"() {
    init_app_legacy();
    init_profileStorage();
    init_senPlayer();
    init_profileStorage();
    settingsState = { tab: "profile", previewOpen: true };
    settingsCalendarOutsideHandler = null;
    PROFILE_EFFECTS = [
      { id: "none", label: "\u041D\u0435\u043C\u0430\u0454", icon: "fa-ban" },
      { id: "rain", label: "\u0414\u043E\u0449", icon: "fa-cloud-rain" },
      { id: "snow", label: "\u0421\u043D\u0456\u0433", icon: "fa-snowflake" },
      { id: "sparks", label: "\u0406\u0441\u043A\u0440\u0438", icon: "fa-star" },
      { id: "hearts", label: "\u0421\u0435\u0440\u0446\u044F", icon: "fa-heart" },
      { id: "bubbles", label: "\u0411\u0443\u043B\u044C\u0431\u0430\u0448\u043A\u0438", icon: "fa-circle" }
    ];
    PROFILE_ATMOSPHERES = [
      { id: "none", label: "\u041D\u0435\u043C\u0430\u0454", icon: "fa-ban" },
      { id: "night", label: "\u041D\u0456\u0447", icon: "fa-moon" },
      { id: "light", label: "\u0421\u0432\u0456\u0442\u043B\u043E", icon: "fa-lightbulb" },
      { id: "fog", label: "\u0422\u0443\u043C\u0430\u043D", icon: "fa-smog" },
      { id: "aurora", label: "\u041F\u0456\u0432\u043D\u0456\u0447\u043D\u0435 \u0441\u044F\u0439\u0432\u043E", icon: "fa-wand-magic-sparkles" },
      { id: "sunset", label: "\u0417\u0430\u0445\u0456\u0434 \u0441\u043E\u043D\u0446\u044F", icon: "fa-sun" }
    ];
    AVATAR_DECORATIONS = [
      { id: "none", label: "\u041D\u0435\u043C\u0430\u0454", icon: "fa-ban" },
      { id: "glow", label: "\u0421\u044F\u0439\u0432\u043E", icon: "fa-certificate" },
      { id: "double", label: "\u041F\u043E\u0434\u0432\u0456\u0439\u043D\u0435 \u043A\u0456\u043B\u044C\u0446\u0435", icon: "fa-circle-notch" },
      { id: "dashed", label: "\u041F\u0443\u043D\u043A\u0442\u0438\u0440", icon: "fa-dot-circle" },
      { id: "halo", label: "\u0413\u0430\u043B\u043E", icon: "fa-sun" },
      { id: "diamond", label: "\u0414\u0456\u0430\u043C\u0430\u043D\u0442", icon: "fa-gem" }
    ];
    BANNER_EFFECTS = [
      { id: "none", label: "\u041E\u0440\u0438\u0433\u0456\u043D\u0430\u043B", icon: "fa-image" },
      { id: "grayscale", label: "\u0427\u043E\u0440\u043D\u043E-\u0431\u0456\u043B\u0435", icon: "fa-circle-half-stroke" },
      { id: "contrast", label: "\u041A\u043E\u043D\u0442\u0440\u0430\u0441\u0442", icon: "fa-bolt" },
      { id: "muted", label: "\u041F\u0440\u0438\u0433\u043B\u0443\u0448\u0435\u043D\u0456", icon: "fa-cloud" },
      { id: "sepia", label: "\u0421\u0435\u043F\u0456\u044F", icon: "fa-sun" },
      { id: "invert", label: "\u0406\u043D\u0432\u0435\u0440\u0441\u0456\u044F", icon: "fa-circle-notch" },
      { id: "blur", label: "\u0420\u043E\u0437\u043C\u0438\u0442\u0442\u044F", icon: "fa-water" },
      { id: "grain", label: "\u0413\u0440\u0430\u043D\u0436", icon: "fa-braille" },
      { id: "fog", label: "\u0414\u0438\u043C", icon: "fa-smog" }
    ];
    SETTINGS_TABS = [
      { id: "profile", label: "\u041F\u0440\u043E\u0444\u0456\u043B\u044C", icon: "fa-user" },
      { id: "appearance", label: "\u0412\u0438\u0433\u043B\u044F\u0434", icon: "fa-palette" },
      { id: "security", label: "\u0411\u0435\u0437\u043F\u0435\u043A\u0430", icon: "fa-shield-alt" },
      { id: "site", label: "\u0421\u0430\u0439\u0442", icon: "fa-sliders" }
    ];
  }
});
