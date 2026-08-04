import { getAuthService } from '../core/auth.js';
export const getCurrentUser = () => getAuthService()?.getUser?.() || null;
