/** Compatibility access point for the existing local storage service. */
export const getStorageService = () => window.Storage || null;
