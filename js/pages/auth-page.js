// ===== СТОРІНКА АВТОРИЗАЦІЇ =====
// Оригінальні рядки: L9792-L9987

import { auth } from '../config/firebase.js';
import { Auth } from '../auth/auth.js';

        // ====================================================================
        //  СТОРІНКА АВТОРИЗАЦІЇ
        // ====================================================================
export function renderAuthPage() {
            const container = document.getElementById('profilePageContainer');
            if (!container) return;
            container.innerHTML = `
            <div class="auth-card">
              <div class="mark"></div>
              <h1 id="authTitle">З поверненням</h1>
              <p class="sub" id="authSub">Увійдіть, щоб продовжити роботу з акаунтом.</p>

              <div class="switcher" id="authSwitcher">
                <div class="switcher-thumb"></div>
                <button type="button" class="active" data-mode="login">Вхід</button>
                <button type="button" data-mode="register">Реєстрація</button>
              </div>

              <button class="google-btn" type="button" id="authGoogleBtn">
                <svg viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
                  <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                </svg>
                Продовжити через Google
              </button>

              <div class="divider">або через email</div>

              <div class="panel active" id="authPanel-login">
                <form id="authLoginForm" onsubmit="return false;">
                  <div class="field">
                    <label for="loginEmail">Email</label>
                    <input id="loginEmail" type="email" placeholder="you@example.com" required autocomplete="email">
                  </div>
                  <div class="field">
                    <label for="loginPass">Пароль</label>
                    <input id="loginPass" type="password" placeholder="••••••••" required autocomplete="current-password">
                  </div>
                  <div class="row-between">
                    <label class="remember"><input type="checkbox" id="loginRemember">Запам'ятати мене</label>
                    <a href="#" onclick="showToast('Скидання пароля — звʼяжіться з підтримкою');return false;">Забули пароль?</a>
                  </div>
                  <div class="auth-error" id="authError"></div>
                  <button class="submit-btn" type="submit" id="authLoginSubmit">Увійти</button>
                </form>
              </div>

              <div class="panel" id="authPanel-register">
                <form id="authRegisterForm" onsubmit="return false;">
                  <div class="field">
                    <label for="regName">Ім'я</label>
                    <input id="regName" type="text" placeholder="Ваше ім'я" required autocomplete="name">
                  </div>
                  <div class="field">
                    <label for="regEmail">Email</label>
                    <input id="regEmail" type="email" placeholder="you@example.com" required autocomplete="email">
                  </div>
                  <div class="field">
                    <label for="regPass">Пароль</label>
                    <input id="regPass" type="password" placeholder="Мінімум 6 символів" required autocomplete="new-password" minlength="6">
                  </div>
                  <div class="auth-error" id="authErrorReg"></div>
                  <button class="submit-btn" type="submit" id="authRegisterSubmit">Створити акаунт</button>
                </form>
              </div>

              <button class="guest-btn" type="button" id="authGuestBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="8" r="4.5"/>
                </svg>
                Продовжити як гість
              </button>

              <p class="foot-note" id="authFootNote">
                Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>
              </p>
            </div>
          `;

            const switcher = document.getElementById('authSwitcher');
            const btnLogin = switcher.querySelector('[data-mode="login"]');
            const btnRegister = switcher.querySelector('[data-mode="register"]');
            const panelLogin = document.getElementById('authPanel-login');
            const panelRegister = document.getElementById('authPanel-register');
            const title = document.getElementById('authTitle');
            const sub = document.getElementById('authSub');
            const footNote = document.getElementById('authFootNote');
            const footToggle = document.getElementById('authFootToggle');

export function setAuthMode(mode) {
                btnLogin.classList.toggle('active', mode === 'login');
                btnRegister.classList.toggle('active', mode === 'register');
                switcher.classList.toggle('mode-register', mode === 'register');
                panelLogin.classList.toggle('active', mode === 'login');
                panelRegister.classList.toggle('active', mode === 'register');
                if (mode === 'login') {
                    title.textContent = 'З поверненням';
                    sub.textContent = 'Увійдіть, щоб продовжити роботу з акаунтом.';
                    footNote.innerHTML =
                        'Ще немає акаунта? <button type="button" id="authFootToggle">Зареєструватися</button>';
                } else {
                    title.textContent = 'Створити акаунт';
                    sub.textContent = 'Зареєструйтеся, щоб почати користуватися сервісом.';
                    footNote.innerHTML = 'Вже маєте акаунт? <button type="button" id="authFootToggle">Увійти</button>';
                }
                document.getElementById('authFootToggle')?.addEventListener('click', () => {
                    setAuthMode(mode === 'login' ? 'register' : 'login');
                });
                document.getElementById('authError').textContent = '';
                document.getElementById('authErrorReg').textContent = '';
            }

            btnLogin.addEventListener('click', () => setAuthMode('login'));
            btnRegister.addEventListener('click', () => setAuthMode('register'));
            footToggle.addEventListener('click', () => setAuthMode('register'));
            if (document.getElementById('authFootToggle')) {
                document.getElementById('authFootToggle').addEventListener('click', () => setAuthMode('register'));
            }

            document.getElementById('authLoginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value.trim();
                const pass = document.getElementById('loginPass').value;
                const errorEl = document.getElementById('authError');
                const submitBtn = document.getElementById('authLoginSubmit');
                errorEl.textContent = '';
                if (!email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Вхід...';
                const result = await Auth.login(email, pass);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Увійти';
                if (!result.success) {
                    errorEl.textContent = result.error || 'Помилка входу';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authRegisterForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                const name = document.getElementById('regName').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const pass = document.getElementById('regPass').value;
                const errorEl = document.getElementById('authErrorReg');
                const submitBtn = document.getElementById('authRegisterSubmit');
                errorEl.textContent = '';
                if (!name || !email || !pass) { errorEl.textContent = 'Будь ласка, заповніть усі поля.'; return; }
                if (pass.length < 6) { errorEl.textContent = 'Пароль має містити щонайменше 6 символів.'; return; }
                submitBtn.disabled = true;
                submitBtn.textContent = 'Створення...';
                const result = await Auth.register(email, pass, name);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Створити акаунт';
                if (!result.success) {
                    errorEl.textContent = result.error || 'Помилка реєстрації';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authGoogleBtn').addEventListener('click', async function() {
                this.disabled = true;
                this.textContent = 'Завантаження...';
                const result = await Auth.signInWithGoogle();
                this.disabled = false;
                this.innerHTML = `
              <svg viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c2.8 0 5.3 1 7.3 2.8l5.7-5.7C33.6 6.5 29 4.5 24 4.5c-7.7 0-14.3 4.3-17.7 10.2z"/>
                <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-1.9 13.2-5.1l-6.1-5.2c-2 1.5-4.5 2.3-7.1 2.3-5.3 0-9.6-3.6-11.2-8.4l-6.5 5C9.7 39.1 16.3 43.5 24 43.5z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l6.1 5.2C40.8 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
              </svg>
              Продовжити через Google
            `;
                if (!result.success) {
                    document.getElementById('authError').textContent = result.error || 'Помилка Google входу';
                } else {
                    renderProfilePage();
                }
            });

            document.getElementById('authGuestBtn').addEventListener('click', () => {
                Auth.setGuest(true);
                showToast('Продовжуємо як гість');
                // Не використовуємо window.Router?.goTo — хеш вже #profile і hashchange не спрацює
                // Викликаємо showProfile напряму, який перевірить isGuest() і покаже профіль
                window.Router?.showProfile();
            });

            syncLeftdockActive();
        }

