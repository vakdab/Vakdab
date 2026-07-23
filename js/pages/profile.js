// ===== ПРОФІЛЬ =====
// Оригінальні рядки: L9532-L9791, L9988-L10232

import { auth, db } from '../config/firebase.js';
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Storage } from '../storage/storage.js';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../config/api.js';
import { showToast } from '../ui/toast.js';

        // ====================================================================
        //  ПРОФІЛЬ
        // ====================================================================
export function getDefaultProfile() {
            return {
                nickname: 'Користувач',
                avatar: '',
                banner: '',
                bio: 'Аніме ентузіаст. Дивлюсь усе підряд — від слайс-оф-лайф до психологічного трилера.'
            };
        }

export function getProfile() {
            const p = Storage.getProfile();
            if (p) return p;
            const def = getDefaultProfile();
            Storage.setProfile(def);
            return def;
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
            const hours = Math.floor(totalWatchTime / 3600);
            const minutes = Math.floor((totalWatchTime % 3600) / 60);
            const achievements = getAchievements(history, bookmarks, uniqueAnime.size, totalEpisodes, totalWatchTime);
            return {
                viewed: totalEpisodes,
                bookmarks: bookmarks.length,
                achievements: achievements.filter(a => a.unlocked).length,
                totalAchievements: achievements.length,
                watchHours: hours,
                watchMinutes: minutes,
                totalWatchTime: totalWatchTime,
                uniqueAnime: uniqueAnime.size,
                achievementsList: achievements,
                history: history.slice(0, 50),
                bookmarksList: bookmarks
            };
        }

export function getAchievements(history, bookmarks, uniqueCount, totalEpisodes, totalWatchTime) {
            const xp = calcTotalXP();
            const lvl = getLevel(xp);
            const stats = {
                episodes: totalEpisodes,
                watchTime: totalWatchTime,
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
export async function uploadToCloudinary(file, maxW, maxH, quality) {
            // Compress image locally, returns a Blob
            const compressedBlob = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        let w = img.width, hh = img.height;
                        if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                        if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                        canvas.width = Math.round(w);
                        canvas.height = Math.round(hh);
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        // toBlob is async and returns Blob, not dataURL
                        canvas.toBlob(blob => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas toBlob failed'));
                        }, 'image/jpeg', quality);
                    };
                    img.onerror = () => reject(new Error('Image load failed'));
                    img.src = ev.target.result;
                };
                reader.onerror = () => reject(new Error('FileReader failed'));
                reader.readAsDataURL(file);
            });

            // Upload Blob to Cloudinary
            const formData = new FormData();
            formData.append('file', compressedBlob, 'upload.jpg');
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
            const resp = await fetch(uploadUrl, { method: 'POST', body: formData, mode: 'cors', credentials: 'omit' });
            if (!resp.ok) {
                const errText = await resp.text().catch(() => '');
                throw new Error('Cloudinary upload failed: ' + resp.status + ' ' + errText.substring(0,100));
            }
            const data = await resp.json();
            if (!data.secure_url) throw new Error('Cloudinary: no secure_url in response');
            console.log('[Cloudinary] Upload OK:', data.secure_url.substring(0, 60));
            return data.secure_url;
        }

export function compressImage(file, maxW, maxH, quality, callback) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let w = img.width, hh = img.height;
                    if (w > maxW) { hh = hh * (maxW / w); w = maxW; }
                    if (hh > maxH) { w = w * (maxH / hh); hh = maxH; }
                    canvas.width = Math.round(w);
                    canvas.height = Math.round(hh);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    let result = canvas.toDataURL('image/jpeg', quality);
                    if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.4);
                    if (result.length > 500000) result = canvas.toDataURL('image/jpeg', 0.2);
                    callback(result);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        }

export function renderProfilePage() {
            const container = document.getElementById('profilePageContainer');
            if (!container) return;
            if (!window.Auth?.isAuthenticated() && !window.Auth?.isGuest()) {
                renderAuthPage();
                return;
            }
            const isGuestMode = window.Auth?.isGuest();
            const profile = getProfile();
            const stats = getProfileStats();
            container.innerHTML = `
            <div class="profile-wrapper">
              <div class="profile-banner" onclick="document.getElementById('bannerFileInput').click()">
                <img src="${profile.banner}" alt="banner" onerror="this.style.display='none'">
                <div class="profile-banner-overlay"></div>
                <div class="profile-banner-edit">
                  <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </div>
              </div>
              <div class="profile-info">
                <div class="profile-avatar-wrap" onclick="document.getElementById('avatarFileInput').click()">
                  <div class="profile-avatar">
                    <img src="${profile.avatar}" alt="avatar" onerror="this.style.display='none'; this.parentElement.querySelector('.avatar-placeholder').style.display='flex'">
                    <span class="avatar-placeholder" style="display:none;">${profile.nickname.charAt(0).toUpperCase()}</span>
                  </div>
                  <div class="profile-avatar-badge">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </div>
                </div>
                <div class="profile-nick-row">
                  <span class="profile-nick" id="profileNickText">${profile.nickname}</span>
                  <button class="profile-nick-edit-btn" onclick="profileEditNick()">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                </div>
                <div class="profile-meta">
                  <span>@${profile.nickname.toLowerCase().replace(/\s/g,'_')}</span>
                </div>
                <div class="profile-bio-row">
                  <div class="profile-bio" id="profileBioText">${profile.bio}</div>
                  <button class="profile-bio-edit-btn" onclick="profileEditBio()" title="Редагувати опис">
                    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                </div>
                <div class="profile-stats">
                  <div class="profile-stat-pill">
                    <div class="num">${stats.viewed}</div>
                    <div class="label">Переглянуто</div>
                  </div>
                  <div class="profile-stat-pill">
                    <div class="num">${stats.bookmarks}</div>
                    <div class="label">Закладки</div>
                  </div>
                  <div class="profile-stat-pill">
                    <div class="num">${stats.achievements}</div>
                    <div class="label">Досягнень</div>
                  </div>
                </div>
                <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                  <button class="btn-outline" id="profileLogoutBtn" onclick="window.Auth?.handleExit()" style="font-size:0.8rem;padding:0.3rem 1rem;min-height:36px;">
                    <i class="fas fa-sign-out-alt"></i> Вийти
                  </button>
                  
                </div>
              </div>
            </div>
            <div class="profile-tabs" id="profileTabs">
              <button class="profile-tab active" data-tab="history">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                Історія
              </button>
              <button class="profile-tab" data-tab="bookmarks">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-3.5L5 21V5z"/></svg>
                Закладки
              </button>
              <button class="profile-tab" data-tab="achievements">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11.04 2.6a1 1 0 0 1 1.92 0l1.7 5.18a1 1 0 0 0 .95.69h5.47a1 1 0 0 1 .59 1.8l-4.43 3.22a1 1 0 0 0-.36 1.12l1.7 5.18a1 1 0 0 1-1.54 1.12l-4.42-3.22a1 1 0 0 0-1.18 0l-4.42 3.22a1 1 0 0 1-1.54-1.12l1.7-5.18a1 1 0 0 0-.36-1.12L3.3 10.27a1 1 0 0 1 .59-1.8h5.47a1 1 0 0 0 .95-.69l1.7-5.18z"/></svg>
                Досягнення
              </button>
            </div>
            <div id="profilePanels">
              <div class="profile-panel active" id="profilePanel-history">
                ${renderHistoryPanel(stats.history)}
              </div>
              <div class="profile-panel" id="profilePanel-bookmarks">
                ${renderBookmarksPanel(stats.bookmarksList)}
              </div>
              <div class="profile-panel" id="profilePanel-achievements">
                ${renderAchievementsPanel(stats.achievementsList, stats.totalWatchTime)}
              </div>
            </div>
          `;
            document.querySelectorAll('.profile-tab').forEach(tab => {
                tab.addEventListener('click', function() {
                    const target = this.dataset.tab;
                    document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
                    this.classList.add('active');
                    document.getElementById('profilePanel-' + target).classList.add('active');
                });
            });
            // Guest mode: ховаємо sync кнопку, міняємо "Вийти" на "Увійти"
            if (typeof isGuestMode !== 'undefined' && isGuestMode) {
                const syncBtn = document.getElementById('profileSyncBtn');
                if (syncBtn) syncBtn.style.display = 'none';
                const logoutBtn = document.getElementById('profileLogoutBtn');
                if (logoutBtn) {
                    logoutBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Увійти';
                    logoutBtn.onclick = () => {
                        window.Auth?.setGuest(false);
                        renderAuthPage();
                    };
                }
            }
            syncLeftdockActive();
        }


        // ====================================================================
        //  ПАНЕЛІ ПРОФІЛЮ
        // ====================================================================
export function renderHistoryPanel(history) {
            if (!history || !history.length) {
                return `
              <div class="profile-empty">
                <i class="fas fa-history"></i>
                <p>Історія переглядів порожня</p>
              </div>
            `;
            }
            let html = `
            <div class="profile-panel-header">
              <span class="profile-panel-title">Історія перегляду</span>
              <span class="profile-panel-count">${history.length} серій</span>
            </div>
            <div class="profile-history-list">
          `;
            history.slice(0, 30).forEach(item => {
                const poster = item.poster || '';
                const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
                const ep = item.episode || '?';
                const season = item.season || '';
                const time = item.timestamp ? new Date(item.timestamp).toLocaleDateString('uk-UA') : 'невідомо';
                const progress = item.progress || 0;
                let epLabel = `Серія ${ep}`;
                if (season) epLabel = `Сезон ${season}, ${epLabel}`;
                html += `
              <div class="profile-history-item" onclick="openPlayerPage('${item.url || ''}')">
                <div class="profile-thumb">
                  ${poster ? `<img src="${poster}" alt="${title}" onerror="this.style.display='none'">` : ''}
                  <span class="profile-thumb-placeholder" style="${poster?'display:none;':''}">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
                  </span>
                </div>
                <div class="profile-h-info">
                  <div class="profile-h-title">${title}</div>
                  <div class="profile-h-sub">
                    <span>${epLabel}</span>
                    <span class="dot"></span>
                    <span>${time}</span>
                  </div>
                </div>
                <div class="profile-h-progress">
                  <div class="profile-h-progress-fill" style="width:${Math.min(progress,100)}%"></div>
                </div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

export function renderBookmarksPanel(bookmarks) {
            if (!bookmarks || !bookmarks.length) {
                return `
              <div class="profile-empty">
                <i class="fas fa-bookmark"></i>
                <p>Немає збережених закладок</p>
              </div>
            `;
            }
            let html = `
            <div class="profile-panel-header">
              <span class="profile-panel-title">Закладки</span>
              <span class="profile-panel-count">${bookmarks.length}</span>
            </div>
            <div class="profile-bookmark-grid">
          `;
            bookmarks.slice(0, 30).forEach(item => {
                const poster = item.poster || '';
                const rawTitle = item.title || 'Без назви';
            const title = rawTitle.length > 38 ? rawTitle.substring(0, 38) + '…' : rawTitle;
                const sub = item.episodes || '';
                html += `
              <div class="profile-bookmark-card" onclick="openPlayerPage('${item.url || ''}')">
                <div class="profile-bm-thumb">
                  ${poster ? `<img src="${poster}" alt="${title}" onerror="this.style.display='none'">` : ''}
                  <span class="profile-bm-thumb-ph" style="${poster?'display:none;':''}">
                    <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/></svg>
                  </span>
                </div>
                <div class="profile-bm-info">
                  <div class="profile-bm-title">${title}</div>
                  <div class="profile-bm-sub">${sub || 'Збережено'}</div>
                </div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

export function renderAchievementsPanel(achievements, totalWatchTime) {
            const hours = Math.floor(totalWatchTime / 3600);
            const minutes = Math.floor((totalWatchTime % 3600) / 60);
            let html = `
            <div class="profile-watch-card">
              <div class="profile-wt-label">Загальний час перегляду аніме</div>
              <div class="profile-wt-value">${hours}<span class="profile-wt-unit">год</span> ${minutes}<span class="profile-wt-unit">хв</span></div>
              <div class="profile-wt-sub">≈ ${Math.round(totalWatchTime/3600*10)/10} годин · ${Storage.getHistory().length} серій</div>
            </div>
            <div class="profile-panel-header">
              <span class="profile-panel-title">Досягнення</span>
              <span class="profile-panel-count">${achievements.filter(a=>a.unlocked).length} / ${achievements.length}</span>
            </div>
            <div class="profile-achievement-list">
          `;
            achievements.forEach(a => {
                const unlocked = a.unlocked;
                const progress = a.progress || 0;
                html += `
              <div class="profile-achievement ${unlocked?'':'locked'}">
                <div class="profile-ach-icon">${a.icon}</div>
                <div class="profile-ach-info">
                  <div class="profile-ach-name">${a.name}</div>
                  <div class="profile-ach-value">${a.description}</div>
                </div>
                <div class="profile-ach-badge">${unlocked ? 'Виконано' : (progress < 100 ? Math.round(progress)+'%' : 'Заблоковано')}</div>
              </div>
            `;
            });
            html += `</div>`;
            return html;
        }

        // ====================================================================
        //  РЕДАГУВАННЯ ПРОФІЛЮ
        // ====================================================================
export function profileEditNick() {
            const nickEl = document.getElementById('profileNickText');
            if (!nickEl) return;
            const current = nickEl.textContent;
            const input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.style.cssText =
                'font-size:20px;font-weight:700;letter-spacing:-0.5px;color:var(--text);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:2px 8px;outline:none;width:180px;font-family:inherit;';
            if (document.body.classList.contains('dark-mode')) {
                input.style.background = '#1a1a1a';
                input.style.color = '#f7f7f7';
                input.style.borderColor = '#333';
            }
            nickEl.replaceWith(input);
            input.focus();
            input.select();
            const save = () => {
                const val = input.value.trim() || current;
                const span = document.createElement('span');
                span.className = 'profile-nick';
                span.id = 'profileNickText';
                span.textContent = val;
                input.replaceWith(span);
                const profile = getProfile();
                profile.nickname = val;
                saveProfile(profile);
                const meta = document.querySelector('.profile-meta');
                if (meta) {
                    const first = meta.querySelector('span:first-child');
                    if (first) first.textContent = '@' + val.toLowerCase().replace(/\s/g, '_');
                }
                if (window.Router?.currentRoute === 'profile') renderProfilePage();
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { input.blur(); }
                if (e.key === 'Escape') { input.value = current;
                    input.blur(); }
            });
        }

export function profileEditBio() {
            const bioEl = document.getElementById('profileBioText');
            if (!bioEl) return;
            const current = bioEl.textContent;
            const textarea = document.createElement('textarea');
            textarea.value = current;
            textarea.style.cssText =
                'font-size:13px;line-height:1.6;color:var(--text-secondary);background:var(--tag-bg);border:1px solid var(--border);border-radius:8px;padding:6px 8px;outline:none;width:100%;font-family:inherit;resize:vertical;min-height:60px;';
            if (document.body.classList.contains('dark-mode')) {
                textarea.style.background = '#1a1a1a';
                textarea.style.color = '#cfcfcf';
                textarea.style.borderColor = '#333';
            }
            bioEl.replaceWith(textarea);
            textarea.focus();
            textarea.select();
            const save = () => {
                const val = textarea.value.trim() || current;
                const div = document.createElement('div');
                div.className = 'profile-bio';
                div.id = 'profileBioText';
                div.textContent = val;
                textarea.replaceWith(div);
                const profile = getProfile();
                profile.bio = val;
                saveProfile(profile);
                if (window.Router?.currentRoute === 'profile') renderProfilePage();
            };
            textarea.addEventListener('blur', save);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') { textarea.value = current;
                    textarea.blur(); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { textarea.blur(); }
            });
        }

        document.getElementById('avatarFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            showToast('Завантаження аватарки...');
            try {
                const imageUrl = await uploadToCloudinary(file, 256, 256, 0.7);
                const profile = getProfile();
                profile.avatar = imageUrl;
                saveProfile(profile);
                if (window.Router?.currentRoute === 'profile') renderProfilePage();
                showToast('Аватарку оновлено');
            } catch (err) {
                console.error('Avatar upload error:', err);
                showToast('Помилка завантаження аватарки');
            }
            e.target.value = '';
        });

        document.getElementById('bannerFileInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            showToast('Завантаження банера...');
            try {
                const imageUrl = await uploadToCloudinary(file, 1200, 400, 0.7);
                const profile = getProfile();
                profile.banner = imageUrl;
                saveProfile(profile);
                if (window.Router?.currentRoute === 'profile') renderProfilePage();
                showToast('Банер оновлено');
            } catch (err) {
                console.error('Banner upload error:', err);
                showToast('Помилка завантаження банера');
            }
            e.target.value = '';
        });

