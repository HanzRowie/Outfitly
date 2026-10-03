/**
 * Authentication storage helpers using localStorage.
 * Keeps auth token and user persistence simple, reliable, and testable.
 */

const ACCESS_TOKEN_KEY = 'outfitly_access_token';
const REFRESH_TOKEN_KEY = 'outfitly_refresh_token';
const USER_KEY = 'outfitly_user';

export const getAccessToken = () => {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const getUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    return null;
  }
};

export const setAuthData = ({ access, refresh, user }) => {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAuthData = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
  const token = getAccessToken();
  return Boolean(token);
};
