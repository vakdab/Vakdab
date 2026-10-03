function renderProfileAvatar() {
  const avatarEl = document.getElementById("bnProfileAvatar");
  if (!avatarEl) return;
  const profile = getProfile();
  const mediaUrl = profile.avatarVideo || profile.avatar || "";
  const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(mediaUrl);
  if (mediaUrl && isVideo) {
    avatarEl.innerHTML = `<video src="${escapeHtml4(mediaUrl)}" autoplay muted loop playsinline aria-label="\u0410\u0432\u0430\u0442\u0430\u0440\u043A\u0430"></video>`;
  } else if (mediaUrl) {
    avatarEl.innerHTML = `<img src="${escapeHtml4(mediaUrl)}" alt="\u0410\u0432\u0430\u0442\u0430\u0440\u043A\u0430">`;
  } else {
    avatarEl.textContent = getProfileDisplayName(profile).charAt(0).toUpperCase();
  }
  avatarEl.classList.toggle("has-media", Boolean(mediaUrl));
}
function initBottomNav() {
  const nav = document.getElementById("bottomNav");
  if (!nav) return;
  renderProfileAvatar();
  window.addEventListener("vakdab:profile-changed", renderProfileAvatar);
  document.getElementById("bnBack").addEventListener("click", () => {
    if (history.length > 1) {
      history.back();
    } else {
      Router.goTo("main");
    }
  });
  document.getElementById("bnHome").addEventListener("click", () => {
    Router.goTo("main");
  });
  document.getElementById("bnCatalog")?.addEventListener("click", () => {
    Router.goTo("catalog");
  });
  document.getElementById("bnTop").addEventListener("click", () => {
    Router.goTo("rating");
  });
  document.getElementById("bnProfile").addEventListener("click", () => {
    Router.goTo("profile");
  });
  function updateBottomNav(route) {
    const items = nav.querySelectorAll(".bn-item[data-route]");
    items.forEach((item) => {
      item.classList.remove("active");
      if (item.dataset.route === route) {
        item.classList.add("active");
      }
    });
  }
  const playerModal = document.getElementById("playerPageModal");
  const _origOpenPlayer = window.openPlayerPage;
  window.openPlayerPage = function(url, options = {}) {
    if (nav) nav.classList.add("hidden-nav");
    return _origOpenPlayer(url, options);
  };
  const _origClosePlayer = window.closePlayerPage;
  window.closePlayerPage = function() {
    if (nav) nav.classList.remove("hidden-nav");
    return _origClosePlayer();
  };
  function handleNavVisibility(route) {
    nav.classList.remove("hidden-nav");
    updateBottomNav(route);
  }
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1) || "main";
    const route = hash.split("?")[0];
    if (route !== "rating") {
      document.body.classList.remove("community-active");
    }
    handleNavVisibility(route);
  });
  handleNavVisibility(Router.currentRoute || "main");
}
var init_bottomNav = __esm({
  "src/js/components/navigation/bottomNav.js"() {
    init_feature_loader3();
    init_router();
    init_app_legacy();
    init_profileStorage();
    init_string();
  }
});
