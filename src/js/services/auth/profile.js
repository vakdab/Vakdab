import { getStorageService } from '../../core/storage.js';

export function getUserProfile() {
    return getStorageService()?.getProfile?.() || null;
}

export function saveUserProfile(profile) {
    const storage = getStorageService();
    if (storage?._setProfile) storage._setProfile(profile);
    return profile;
}
