const btn = document.getElementById('backToTopBtn');
export function updateBackToTop() {
  if (window.scrollY > 500) btn.classList.add('visible');
  else btn.classList.remove('visible');
}
btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
window.addEventListener('scroll', updateBackToTop, { passive: true });
