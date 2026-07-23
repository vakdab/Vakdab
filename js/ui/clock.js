// ===== ГОДИННИК =====
// Оригінальні рядки: L7424-L7441

        // ====================================================================
        //  ГОДИННИК
        // ====================================================================
        let clockTimer = null;

        export function updateClock() {
            const clock = document.getElementById('agnativeTopnavClock');
            if (!clock) return;
            const d = new Date();
            clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        }

        export function startClock() {
            updateClock();
            if (clockTimer) return;
            clockTimer = setInterval(updateClock, 20000);
        }

