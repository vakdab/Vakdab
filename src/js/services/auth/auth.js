/** Auth boundary. The legacy implementation remains the owner until auth migration is complete. */
export function getAuthController() {
    return window.Auth || null;
}

export function getCurrentUser() {
    return getAuthController()?.getUser?.() || null;
}

export function isAuthenticated() {
    return Boolean(getAuthController()?.isAuthenticated?.());
}

export function signOutUser() {
    return getAuthController()?.logout?.() || Promise.resolve();
}
