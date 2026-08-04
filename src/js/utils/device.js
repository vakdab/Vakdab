export const isMobileDevice = () => window.matchMedia?.('(max-width: 768px)').matches ?? false;
export const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;
