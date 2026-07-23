export function openBottomSheet(mode) {
  bottomSheetMode = mode || 'full';
  buildBottomSheetData();
  document.getElementById('bottomSheetOverlay').classList.add('open');
}
export function closeBottomSheet() {
  document.getElementById('bottomSheetOverlay').classList.remove('open');
}
