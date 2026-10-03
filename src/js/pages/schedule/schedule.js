function scheduleDateForOffset(offset) {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
function formatScheduleDisplayDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
}
async function fetchScheduleByOffset(offset) {
  if (scheduleState.cache[offset]) return scheduleState.cache[offset];
  if (!scheduleState.sourcePromise) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    scheduleState.sourcePromise = fetch(`${MIKAI_API_BASE}/schedule`, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    }).then(async (resp) => {
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const payload = await resp.json();
      if (payload?.ok === false) throw new Error(payload.error?.message || "Mikai API error");
      const schedule2 = payload?.result || payload;
      if (!schedule2 || typeof schedule2 !== "object") throw new Error("\u041D\u0435\u0432\u0456\u0440\u043D\u0438\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0456");
      return schedule2;
    }).catch((error) => {
      if (error?.name === "AbortError") throw new Error("\u0421\u0435\u0440\u0432\u0435\u0440 \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443 \u043D\u0435 \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0432 \u0437\u0430 8 \u0441\u0435\u043A\u0443\u043D\u0434");
      throw error;
    }).finally(() => clearTimeout(timeout)).catch((error) => {
      scheduleState.sourcePromise = null;
      throw error;
    });
  }
  const schedule = await scheduleState.sourcePromise;
  const key = MIKAI_SCHEDULE_DAY_KEYS[scheduleDateForOffset(offset).getDay()];
  const dayData = schedule?.[key] ?? schedule?.data?.[key] ?? schedule?.result?.[key];
  const data = Array.isArray(dayData) ? dayData : [];
  scheduleState.cache[offset] = data;
  return data;
}
function scheduleItemDate(item, offset) {
  const raw = item?.airing || item?.nextEpisodeAt || item?.airDate || item?.releaseDate || item?.releasedAt || item?.dateTime || item?.datetime;
  if (raw) {
    const normalized = String(raw).replace(" ", "T");
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const time = item?.time || item?.airTime || item?.broadcast?.time || item?.anime?.broadcast?.time;
  if (time && /^\d{1,2}:\d{2}/.test(String(time))) {
    const base = scheduleDateForOffset(offset);
    const [h, m] = String(time).split(":").map(Number);
    base.setHours(h, m, 0, 0);
    return base;
  }
  return null;
}
function scheduleCard(item, offset) {
  const a = item?.anime || {};
  const names = a.details?.names || {};
  const posterUid = a.media?.posterUid || "";
  const poster = posterUid ? `https://images.mikai.me/poster/small/${posterUid}.webp` : "";
  const title = names.name || names.nameNative || names.nameEnglish || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
  const titleEn = names.nameEnglish || names.nameNative || "";
  const date = scheduleItemDate(item, offset);
  const dateText = date ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date) : "\u0427\u0430\u0441 \u043D\u0435\u0432\u0456\u0434\u043E\u043C\u0438\u0439";
  const countdown = date && date.getTime() > Date.now() ? `<span class="schedule-countdown" data-time="${date.toISOString()}">${countdownText2(date)}</span>` : "";
  return `<article class="schedule-item schedule-week-item" role="button" tabindex="0" aria-label="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 ${escapeHtml5(title)}" data-title="${escapeHtml5(title)}" data-title-en="${escapeHtml5(titleEn)}" data-slug="${escapeHtml5(a.slug || "")}">
                <div class="schedule-item__poster"><img src="${escapeHtml5(poster)}" alt="${escapeHtml5(title)}" loading="lazy" onerror="this.style.opacity=0"></div>
                <div class="schedule-item__info"><div class="schedule-item__title">${escapeHtml5(title)}</div><div class="schedule-item__ep">${item?.episode ? `\u0415\u043F\u0456\u0437\u043E\u0434 ${escapeHtml5(item.episode)}` : "\u041D\u0430\u0441\u0442\u0443\u043F\u043D\u0438\u0439 \u0435\u043F\u0456\u0437\u043E\u0434"} \xB7 ${escapeHtml5(dateText)}</div>${countdown}</div><i class="fas fa-chevron-right schedule-item__arrow"></i>
            </article>`;
}
async function loadScheduleWeek() {
  const content = document.getElementById("scheduleWeekContent");
  if (!content || scheduleState.weekLoading) return;
  scheduleState.weekLoading = true;
  content.innerHTML = renderScheduleSkeleton(true);
  try {
    const results = await Promise.allSettled(Array.from({ length: 7 }, (_, i) => fetchScheduleByOffset(i)));
    if (document.getElementById("scheduleWeekContent") !== content) return;
    const successfulDays = results.filter((result) => result.status === "fulfilled");
    if (!successfulDays.length) {
      const reason = results.find((result) => result.status === "rejected")?.reason?.message || "\u0421\u0435\u0440\u0432\u0456\u0441 \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443 \u0442\u0438\u043C\u0447\u0430\u0441\u043E\u0432\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0438\u0439";
      content.innerHTML = `<div class="schedule-load-error"><i class="fas fa-triangle-exclamation"></i><span>${escapeHtml5(reason)}</span><button class="btn-outline schedule-retry" type="button">\u041E\u043D\u043E\u0432\u0438\u0442\u0438 \u0440\u043E\u0437\u043A\u043B\u0430\u0434</button></div>`;
      content.querySelector(".schedule-retry")?.addEventListener("click", () => {
        scheduleState.cache = {};
        loadScheduleWeek();
      });
      return;
    }
    const sections = results.map((result, offset) => {
      const list = result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [];
      const d = scheduleDateForOffset(offset);
      const day = new Intl.DateTimeFormat("uk-UA", { weekday: "long" }).format(d);
      return `<section class="schedule-week-day${offset === 0 ? " is-today" : ""}" data-schedule-day-offset="${offset}" id="schedule-day-${offset}"><div class="schedule-week-day__title"><strong>${day}</strong><span>${offset === 0 ? "\u0421\u044C\u043E\u0433\u043E\u0434\u043D\u0456" : formatScheduleDisplayDate(d)}</span></div><div class="schedule-week-list">${list.length ? list.map((item) => scheduleCard(item, offset)).join("") : '<div class="schedule-day-empty">\u041D\u0430 \u0446\u0435\u0439 \u0434\u0435\u043D\u044C \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443 \u043D\u0435\u043C\u0430\u0454</div>'}</div></section>`;
    }).join("");
    content.innerHTML = sections || '<div class="loader">\u041D\u0430 \u043D\u0430\u0439\u0431\u043B\u0438\u0436\u0447\u0456 \u0434\u043D\u0456 \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443 \u043D\u0435\u043C\u0430\u0454</div>';
    if (!sections) {
      content.innerHTML += '<button class="btn-outline schedule-retry" type="button">\u041E\u043D\u043E\u0432\u0438\u0442\u0438 \u0440\u043E\u0437\u043A\u043B\u0430\u0434</button>';
      content.querySelector(".schedule-retry")?.addEventListener("click", () => {
        scheduleState.cache = {};
        loadScheduleWeek();
      });
    }
    setScheduleDay(scheduleState.selectedOffset);
    content.querySelectorAll(".schedule-week-item").forEach((el) => {
      const open = () => openScheduleItemInPlayer(el.dataset.title, el);
      el.addEventListener("click", open);
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
    });
    if (scheduleState.weekTimer) clearInterval(scheduleState.weekTimer);
    scheduleState.weekTimer = setInterval(() => content.querySelectorAll(".schedule-countdown").forEach((el) => {
      const d = new Date(el.dataset.time);
      el.textContent = countdownText2(d);
    }), 6e4);
  } catch (e) {
    console.error("\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443 Mikai:", e);
    const details = e?.message ? ` (${escapeHtml5(e.message)})` : "";
    content.innerHTML = `<div class="loader">\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0440\u043E\u0437\u043A\u043B\u0430\u0434${details}. <button class="btn-outline" type="button" onclick="loadScheduleWeek()">\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0438</button></div>`;
  } finally {
    scheduleState.weekLoading = false;
  }
}
function setScheduleDay(offset) {
  const content = document.getElementById("scheduleWeekContent");
  const tabs = document.querySelectorAll(".schedule-day-selector [data-schedule-offset]");
  const nextOffset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
  scheduleState.selectedOffset = nextOffset;
  content?.querySelectorAll("[data-schedule-day-offset]").forEach((section) => {
    section.hidden = Number(section.dataset.scheduleDayOffset) !== nextOffset;
  });
  tabs.forEach((tab) => {
    const active = Number(tab.dataset.scheduleOffset) === nextOffset;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
}
function renderScheduleDaySelector() {
  const today = (/* @__PURE__ */ new Date()).getDay();
  const weekdays = [1, 2, 3, 4, 5, 6, 0];
  return `<nav class="schedule-day-selector" aria-label="\u0412\u0438\u0431\u0456\u0440 \u0434\u043D\u044F \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443" role="tablist">${weekdays.map((weekday) => {
    const offset = (weekday - today + 7) % 7;
    const active = offset === 0;
    return `<button class="schedule-day-tab${active ? " active" : ""}" type="button" role="tab" aria-selected="${active}" tabindex="${active ? "0" : "-1"}" aria-controls="schedule-day-${offset}" data-schedule-offset="${offset}"><span>${WEEKDAY_SHORT_UA[weekday]}</span></button>`;
  }).join("")}</nav>`;
}
function renderSchedulePage() {
  const container = document.getElementById("schedulePageContainer");
  if (!container) return;
  if (container.querySelector("#scheduleWeekContent")) {
    setScheduleDay(scheduleState.selectedOffset);
    return;
  }
  container.innerHTML = `
                <section class="schedule-page-hero" aria-labelledby="schedulePageTitle">
                    <div class="schedule-page-hero__ambient" aria-hidden="true"></div>
                    <div class="schedule-page-hero__copy">
                        <span class="schedule-page-kicker"><i class="fas fa-calendar-days" aria-hidden="true"></i> \u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u043E\u043D\u0491\u043E\u0457\u043D\u0433-\u0430\u043D\u0456\u043C\u0435</span>
                        <h2 id="schedulePageTitle">\u0420\u043E\u0437\u043A\u043B\u0430\u0434 \u0432\u0438\u0445\u043E\u0434\u0443 \u0441\u0435\u0440\u0456\u0439</h2>
                        <p class="schedule-page-hint">\u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C \u0443\u0432\u0430\u0433\u0443, \u0449\u043E \u0446\u0435 \u0434\u0430\u0442\u0430 \u0432\u0438\u0445\u043E\u0434\u0443 \u043D\u0430 \u0442\u0435\u043B\u0435\u0431\u0430\u0447\u0435\u043D\u043D\u0456 \u0432 \u042F\u043F\u043E\u043D\u0456\u0457, \u0443\u043A\u0440\u0430\u0457\u043D\u0441\u044C\u043A\u0456 \u0430\u0434\u0430\u043F\u0442\u0430\u0446\u0456\u0457 \u043F\u043E\u0442\u0440\u0435\u0431\u0443\u044E\u0442\u044C \u043F\u0435\u0432\u043D\u043E\u0433\u043E \u0447\u0430\u0441\u0443.</p>
                    </div>
                    <div class="schedule-page-hero__character" aria-hidden="true">
                        <img src="./app/assets/schedule/schedule-american-flag-girl.png" alt="" loading="eager" decoding="async">
                    </div>
                </section>
                ${renderScheduleDaySelector()}
                <div id="scheduleWeekContent" class="schedule-week-content"></div>
            `;
  document.querySelectorAll(".schedule-day-selector [data-schedule-offset]").forEach((tab) => {
    tab.addEventListener("click", () => setScheduleDay(tab.dataset.scheduleOffset));
    tab.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        const tabs = [...document.querySelectorAll(".schedule-day-selector [data-schedule-offset]")];
        const next = tabs[(tabs.indexOf(tab) + 1) % tabs.length];
        next.focus();
        setScheduleDay(next.dataset.scheduleOffset);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        const tabs = [...document.querySelectorAll(".schedule-day-selector [data-schedule-offset]")];
        const next = tabs[(tabs.indexOf(tab) - 1 + tabs.length) % tabs.length];
        next.focus();
        setScheduleDay(next.dataset.scheduleOffset);
      }
    });
  });
  setScheduleDay(scheduleState.selectedOffset);
  loadScheduleWeek();
}
async function loadScheduleDayContent(offset) {
  const content = document.getElementById("scheduleDayContent");
  if (!content) return;
  scheduleState.loadingOffset = offset;
  content.innerHTML = renderScheduleSkeleton(false, 5);
  try {
    const list = await fetchScheduleByOffset(offset);
    if (scheduleState.loadingOffset !== offset) return;
    if (!list.length) {
      content.innerHTML = '<div class="loader">\u041D\u0430 \u0446\u0435\u0439 \u0434\u0435\u043D\u044C \u0440\u043E\u0437\u043A\u043B\u0430\u0434\u0443 \u043D\u0435\u043C\u0430\u0454</div>';
      return;
    }
    content.innerHTML = list.map((item) => {
      const a = item.anime || {};
      const poster = a.image?.preview ? `https://animeon.club/api/uploads/images/${a.image.preview}` : "";
      const title = a.titleUa || a.titleEn || "\u0411\u0435\u0437 \u043D\u0430\u0437\u0432\u0438";
      return `
                    <div class="schedule-item" data-title="${title.replace(/"/g, "&quot;")}" data-title-en="${(a.titleEn || "").replace(/"/g, "&quot;")}" data-slug="${(a.slug || "").replace(/"/g, "&quot;")}">
                        <div class="schedule-item__poster">
                            <img src="${poster}" alt="${title}" loading="lazy" onerror="this.style.opacity=0">
                        </div>
                        <div class="schedule-item__info">
                            <div class="schedule-item__title">${title}</div>
                            <div class="schedule-item__ep">${item.episode ? item.episode + " \u0441\u0435\u0440\u0456\u044F" : ""}</div>
                        </div>
                        <i class="fas fa-chevron-right schedule-item__arrow"></i>
                    </div>`;
    }).join("");
    content.querySelectorAll(".schedule-item").forEach((el) => {
      el.addEventListener("click", () => {
        openScheduleItemInPlayer(el.dataset.title, el);
      });
    });
  } catch (err) {
    content.innerHTML = `<div class="loader"><i class="fas fa-exclamation-triangle"></i> \u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0437\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0435\u043D\u043D\u044F: ${err.message}<br><button class="btn-outline" style="margin-top:1rem;" onclick="loadScheduleDayContent(${offset})">\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0437\u043D\u043E\u0432\u0443</button></div>`;
  }
}
var escapeHtml5, countdownText2, MIKAI_API_BASE, scheduleState, WEEKDAY_SHORT_UA, MIKAI_SCHEDULE_DAY_KEYS;
var init_schedule = __esm({
  "src/js/pages/schedule/schedule.js?v=20260904-schedule-fix-v2"() {
    init_homeLegacy();
    init_skeleton();
    escapeHtml5 = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
    countdownText2 = (date) => {
      const ms = Math.max(0, new Date(date).getTime() - Date.now());
      const total = Math.floor(ms / 1e3);
      const days = Math.floor(total / 86400);
      const hours = Math.floor(total % 86400 / 3600);
      const minutes = Math.floor(total % 3600 / 60);
      return days ? `\u0447\u0435\u0440\u0435\u0437 ${days} \u0434 ${hours} \u0433\u043E\u0434` : hours ? `\u0447\u0435\u0440\u0435\u0437 ${hours} \u0433\u043E\u0434 ${minutes} \u0445\u0432` : `\u0447\u0435\u0440\u0435\u0437 ${minutes} \u0445\u0432`;
    };
    MIKAI_API_BASE = "https://api.mikai.me/v1";
    scheduleState = { dayOffset: 0, selectedOffset: 0, cache: {}, sourcePromise: null, loadingOffset: null, weekLoading: false, weekTimer: null };
    WEEKDAY_SHORT_UA = ["\u041D\u0434", "\u041F\u043D", "\u0412\u0442", "\u0421\u0440", "\u0427\u0442", "\u041F\u0442", "\u0421\u0431"];
    MIKAI_SCHEDULE_DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    window.loadScheduleWeek = loadScheduleWeek;
    window.loadScheduleDayContent = loadScheduleDayContent;
  }
});
