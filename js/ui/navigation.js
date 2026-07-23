import { Router } from "../router/router.js";

export function initBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;
  document.getElementById('bnBack').addEventListener('click', () => {
    if (history.length > 1) history.back();
    else Router.goTo('main');
  });
  document.getElementById('bnHome').addEventListener('click', () => Router.goTo('main'));
  document.getElementById('bnTop').addEventListener('click', () => Router.goTo('rating'));
  document.getElementById('bnProfile').addEventListener('click', () => Router.goTo('profile'));

  function update(route) {
    nav.querySelectorAll('.bn-item[data-route]').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });
    const isCommunity = document.getElementById('rgPanelCommunity')?.classList.contains('active');
    if (route === 'rating' && isCommunity) nav.classList.add('hidden-nav');
    else nav.classList.remove('hidden-nav');
  }

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'main';
    const route = hash.split('?')[0];
    if (route !== 'rating') document.body.classList.remove('community-active');
    update(route);
  });
  update(Router.currentRoute || 'main');
}
