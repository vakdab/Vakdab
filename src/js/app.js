try {
  if (globalThis.Telegram?.WebApp) {
    const tg = globalThis.Telegram.WebApp;
    tg.ready();
    tg.expand();
    document.documentElement.classList.add("telegram-mini-app");
    document.body.classList.add("telegram-mini-app");

    try {
      tg.enableClosingConfirmation?.();
    } catch (_) {}

    try {
      tg.setHeaderColor?.("#0b0b12");
      tg.setBackgroundColor?.("#0b0b12");
    } catch (_) {}

    if (tg.BackButton) {
      const syncTgBackButton = () => {
        const hash = (window.location.hash || "").replace(/^#/, "");
        const isMain = !hash || hash === "main";
        const isPlayerOpen = Boolean(window.playerPageIsOpen || document.getElementById("playerPageModal")?.classList.contains("active"));
        if (isPlayerOpen || !isMain) {
          tg.BackButton.show();
        } else {
          tg.BackButton.hide();
        }
      };

      tg.BackButton.onClick(() => {
        if (window.playerPageIsOpen && typeof window.closePlayerPage === "function") {
          window.closePlayerPage();
          return;
        }
        const sheet = document.getElementById("bottomSheetOverlay");
        if (sheet?.classList.contains("open") && typeof window.closeBottomSheet === "function") {
          window.closeBottomSheet();
          return;
        }
        if (window.Router && typeof window.Router.back === "function") {
          window.Router.back();
        } else if (window.history.length > 1) {
          window.history.back();
        } else if (window.Router && typeof window.Router.goTo === "function") {
          window.Router.goTo("main");
        }
      });

      window.addEventListener("hashchange", syncTgBackButton);
      window.addEventListener("vakdab:route-change", syncTgBackButton);
      setTimeout(syncTgBackButton, 300);
    }
  }
} catch (_) {
}
var telegramStartParam = globalThis.Telegram?.WebApp?.initDataUnsafe?.start_param || "";
if (telegramStartParam === "live" && window.location.hash.slice(1) !== "live") window.location.hash = "live";
bootstrap().catch((error) => console.warn("[VakDab] app bootstrap:", error));
