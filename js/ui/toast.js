// ===== TOAST ПОВІДОМЛЕННЯ =====
// Оригінальні рядки: L6292-L6300

            const toast = document.getElementById('toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.classList.add('show');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => toast.classList.remove('show'), 2200);
        }

