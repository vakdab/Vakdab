/** Compatibility access point while auth is isolated from the legacy runtime. */
export const getAuthService = () => window.Auth || null;
