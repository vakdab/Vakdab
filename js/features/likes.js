// ===== ЛАЙК / ДИЗЛАЙК =====
// Оригінальні рядки: L10741-L10809

import { auth, db } from '../config/firebase.js';
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { Storage } from '../storage/storage.js';
import { renderProfilePage } from '../pages/profile.js';
import { showToast } from '../ui/toast.js';

        // ====================================================================
        //  ЛАЙК / ДИЗЛАЙК
        // ====================================================================
export function updateLikeButton() {
            const btn = document.getElementById('likeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'like') {
                btn.classList.add('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up" style="color:#00ff88;"></i>';
            } else {
                btn.classList.remove('liked');
                btn.innerHTML = '<i class="fas fa-thumbs-up"></i>';
            }
        }

export function updateDislikeButton() {
            const btn = document.getElementById('dislikeBtn');
            if (!btn) return;
            const likes = Storage.getLikes();
            const url = playerPageCurrentAnimeUrl;
            if (url && likes[url] === 'dislike') {
                btn.classList.add('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down" style="color:#ff4444;"></i>';
            } else {
                btn.classList.remove('disliked');
                btn.innerHTML = '<i class="fas fa-thumbs-down"></i>';
            }
        }

export function toggleLike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'like') {
                delete likes[url];
                Storage.setLikes(likes);
                showToast('Лайк скасовано');
            } else {
                likes[url] = 'like';
                Storage.setLikes(likes);
                DailyStats.increment('likesToday', 1);
                DailyStats.addTotalRating();
                showToast('Лайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (window.Router?.currentRoute === 'profile') renderProfilePage();
        }

export function toggleDislike() {
            const url = playerPageCurrentAnimeUrl;
            if (!url) { showToast('Немає аніме для оцінки'); return; }
            const likes = Storage.getLikes();
            if (likes[url] === 'dislike') {
                delete likes[url];
                Storage.setLikes(likes);
                showToast('Дизлайк скасовано');
            } else {
                likes[url] = 'dislike';
                Storage.setLikes(likes);
                showToast('Дизлайк');
            }
            updateLikeButton();
            updateDislikeButton();
            if (window.Router?.currentRoute === 'profile') renderProfilePage();
        }


// Expose to window for cross-module access (circular dep resolution)
window.updateLikeButton = updateLikeButton;
window.updateDislikeButton = updateDislikeButton;
window.toggleLike = toggleLike;
window.toggleDislike = toggleDislike;
