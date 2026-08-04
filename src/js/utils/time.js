/** Time formatting helpers used by pages and player. */
export function padTime(value) { return String(value).padStart(2, '0'); }
export function formatDuration(seconds = 0) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(total / 60)}:${padTime(total % 60)}`;
}
