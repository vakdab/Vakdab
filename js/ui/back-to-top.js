// ===== КНОПКА "ВГОРУ" =====
// Оригінальні рядки: L11055-L11064

        // ====================================================================
        //  КНОПКА "ВГОРУ"
        // ====================================================================
        const backToTopBtn = document.getElementById('backToTopBtn');

export function updateBackToTop() { if (window.scrollY > 500) backToTopBtn.classList.add('visible');
            else backToTopBtn.classList.remove('visible'); }
        backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
        window.addEventListener('scroll', updateBackToTop, { passive: true });

